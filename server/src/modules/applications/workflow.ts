// ─── Legal workflow state machine ───────────────────────────────────────────
// Encodes the statutory routing of each application type so that the generic
// /transition endpoint can no longer move a file to an arbitrary status.
//
// Three statutory tracks:
//
//  FULL (immatriculation) — DIRECT_REGISTRATION, STATE_LAND, TRANSFORMATION
//    SUBMITTED → RECEIPTED → PUBLISHED → SURVEYED → REGIONAL_REVIEW
//    → OPPOSITION_WINDOW (mandatory 30-day window after the avis de clôture)
//    → CLEARED → TITLE_ISSUED
//
//  SURVEY, NO OPPOSITION — PARTIAL_ALIENATION (morcellement), PARTITION
//    The parent parcel is already titled, so no public opposition window is
//    required — but new boundaries must be demarcated:
//    SUBMITTED → RECEIPTED → PUBLISHED → SURVEYED → REGIONAL_REVIEW → CLEARED
//    → TITLE_ISSUED
//    PARTITION additionally requires a court judgment / notarial partition
//    deed at submission (see REQUIRED_DOCS).
//
//  NOTARIAL FAST-TRACK — TOTAL_ALIENATION (mutation totale), MORTGAGE
//    The parcel and its survey already exist; the notarial act goes directly
//    to the Conservateur Foncier, bypassing public notice and opposition:
//    SUBMITTED → RECEIPTED → CLEARED → TITLE_ISSUED
//
// Statuses set exclusively by dedicated endpoints (never via /transition):
//   SURVEYED           — POST /applications/:id/survey        (surveyor)
//   OPPOSITION_WINDOW  — POST /applications/:id/regional-approve
//   TITLE_ISSUED       — POST /applications/:id/issue-title   (registrar)

export const FAST_TRACK_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE']);
export const NO_OPPOSITION_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);

export function requiresOppositionWindow(type: string): boolean {
  return !FAST_TRACK_TYPES.has(type) && !NO_OPPOSITION_TYPES.has(type);
}

// Documents that must be uploaded before an application can be submitted.
// PARTITION (inheritance / co-ownership division) legally requires the court
// partition judgment or notarial inheritance certificate; alienations and
// mortgages of titled land are void without a notarial act.
export function requiredDocTypes(type: string): { doc_type: string; label: string }[] {
  const base = [
    { doc_type: 'ID_CARD', label: 'ID card' },
    { doc_type: 'SITE_PLAN', label: 'Site Plan' },
  ];
  if (type === 'PARTITION') {
    return [...base, { doc_type: 'JUDGMENT', label: 'Court judgment / inheritance certificate' }];
  }
  if (type === 'TOTAL_ALIENATION' || type === 'PARTIAL_ALIENATION' || type === 'MORTGAGE') {
    return [...base, { doc_type: 'NOTARIAL_ACT', label: 'Notarial act (acte notarié)' }];
  }
  return base;
}

// Note: the admin role is deliberately absent — Admin is IT oversight and
// executive monitoring only, and never processes land applications.
const SDO = 'sub_divisional_officer';
const DELEGATE = 'divisional_delegate';
const REGISTRAR = 'registrar';
const REGIONAL = 'regional_delegate';

interface TransitionRule {
  to: string;
  roles: string[];
}

// Allowed transitions through the generic /transition endpoint, per current
// status. Rules are further narrowed by application type below.
function rulesFor(type: string, from: string): TransitionRule[] {
  const fast = FAST_TRACK_TYPES.has(type);

  switch (from) {
    case 'SUBMITTED':
      return [
        { to: 'RECEIPTED', roles: [SDO] },
        { to: 'REJECTED', roles: [SDO] },
        { to: 'QUERIED', roles: [SDO] },
      ];

    case 'RECEIPTED':
      if (fast) {
        // Notarial file goes straight to the Conservateur Foncier
        return [
          { to: 'CLEARED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
          { to: 'QUERIED', roles: [REGISTRAR, SDO] },
        ];
      }
      return [
        { to: 'PUBLISHED', roles: [SDO] },
        { to: 'QUERIED', roles: [SDO] },
      ];

    case 'PUBLISHED':
      // SURVEYED is reachable only via the survey endpoint
      return [{ to: 'QUERIED', roles: [SDO] }];

    case 'SURVEYED':
      return [
        { to: 'REGIONAL_REVIEW', roles: [DELEGATE] },
        { to: 'QUERIED', roles: [DELEGATE] },
      ];

    case 'REGIONAL_REVIEW':
      if (NO_OPPOSITION_TYPES.has(type)) {
        // Titled parent parcel — no public opposition window required
        return [
          { to: 'CLEARED', roles: [REGISTRAR, REGIONAL] },
          { to: 'REJECTED', roles: [REGISTRAR, REGIONAL] },
          { to: 'QUERIED', roles: [REGISTRAR, REGIONAL] },
        ];
      }
      // First registrations MUST pass through the opposition window,
      // which is opened via /regional-approve — not via /transition.
      return [
        { to: 'REJECTED', roles: [REGISTRAR, REGIONAL] },
        { to: 'QUERIED', roles: [REGISTRAR, REGIONAL] },
      ];

    case 'OPPOSITION_WINDOW':
      return [
        { to: 'CLEARED', roles: [REGISTRAR] },
        { to: 'QUERIED', roles: [REGISTRAR] },
      ];

    case 'CLEARED':
      // TITLE_ISSUED is reachable only via the issue-title endpoint
      return [{ to: 'QUERIED', roles: [REGISTRAR] }];

    case 'QUERIED':
      // After correction the SDO re-opens the file at the receipt stage
      return [
        { to: 'RECEIPTED', roles: [SDO] },
        { to: 'REJECTED', roles: [SDO] },
      ];

    // Terminal or citizen-owned states — no officer transitions
    case 'DRAFT':
    case 'TITLE_ISSUED':
    case 'REJECTED':
    default:
      return [];
  }
}

export type TransitionCheck = { ok: true } | { ok: false; status: number; message: string };

export function checkTransition(
  type: string,
  from: string,
  to: string,
  role: string,
): TransitionCheck {
  if (from === 'DRAFT') {
    return {
      ok: false,
      status: 409,
      message: 'Draft applications belong to the citizen and cannot be processed by officers.',
    };
  }

  const rules = rulesFor(type, from);
  const rule = rules.find((r) => r.to === to);

  if (!rule) {
    return {
      ok: false,
      status: 409,
      message: `Illegal transition: ${from} → ${to} is not permitted for ${type} applications.`,
    };
  }

  if (!rule.roles.includes(role)) {
    return {
      ok: false,
      status: 403,
      message: `Forbidden: the ${from} → ${to} step is reserved for another office.`,
    };
  }

  return { ok: true };
}
