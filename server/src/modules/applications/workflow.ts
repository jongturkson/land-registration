// ─── Legal workflow state machine ───────────────────────────────────────────
// Encodes the statutory routing of each application type so that the generic
// /transition endpoint can no longer move a file to an arbitrary status.
//
// Three statutory tracks:
//
//  FULL (immatriculation) — DIRECT_REGISTRATION, STATE_LAND, TRANSFORMATION
//    First registration of untitled land: reception desk, public notice,
//    survey, regional review and the mandatory opposition window.
//    SUBMITTED → RECEIPTED → PUBLISHED → SURVEYED → REGIONAL_REVIEW
//    → OPPOSITION_WINDOW → CLEARED → TITLE_ISSUED
//
//  CARVE-OUT (registrar-led morcellement) — PARTIAL_ALIENATION, PARTITION
//    The mother parcel is already titled, so the file goes straight to the
//    Conservateur Foncier — no SDO reception, no public notice, no opposition
//    window. The Registrar verifies the notarial act / partition judgment and
//    the mother title, commissions the survey (the child parcel is carved out
//    of the mother polygon), then issues the child title and reduces the
//    mother parcel:
//    SUBMITTED → SURVEY_ORDERED → SURVEYED → CLEARED → TITLE_ISSUED
//
//  REGISTRAR-DIRECT — TOTAL_ALIENATION, MORTGAGE, MORTGAGE_RELEASE
//    The parcel and its survey already exist; the notarial deed goes directly
//    to the Conservateur Foncier who verifies it and executes the register
//    entry (ownership mutation, encumbrance inscription or mainlevée). No new
//    title is issued — the existing title is mutated:
//    SUBMITTED → CLEARED → COMPLETED
//
// Statuses set exclusively by dedicated endpoints (never via /transition):
//   SURVEYED           — POST /applications/:id/survey        (surveyor)
//   OPPOSITION_WINDOW  — POST /applications/:id/regional-approve
//   TITLE_ISSUED       — POST /applications/:id/issue-title   (registrar)
//   COMPLETED          — POST /applications/:id/execute       (registrar)

export const FULL_TYPES = new Set(['DIRECT_REGISTRATION', 'STATE_LAND', 'TRANSFORMATION']);
export const CARVE_OUT_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);
export const DIRECT_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE', 'MORTGAGE_RELEASE']);

// Types that operate on an existing title — the application MUST reference it
export const SOURCE_TITLE_TYPES = new Set([...CARVE_OUT_TYPES, ...DIRECT_TYPES]);

export type Track = 'FULL' | 'CARVE_OUT' | 'DIRECT';

export function trackFor(type: string): Track {
  if (CARVE_OUT_TYPES.has(type)) return 'CARVE_OUT';
  if (DIRECT_TYPES.has(type)) return 'DIRECT';
  return 'FULL';
}

export function requiresOppositionWindow(type: string): boolean {
  return FULL_TYPES.has(type);
}

// Documents that must be uploaded before an application can be submitted.
// PARTITION legally requires the court partition judgment or notarial
// inheritance certificate; alienations and mortgages of titled land are void
// without a notarial act; a mainlevée requires the creditor's release deed.
// Registrar-direct types operate on an already-surveyed parcel, so no site
// plan is demanded.
export function requiredDocTypes(type: string): { doc_type: string; label: string }[] {
  const idCard = { doc_type: 'ID_CARD', label: 'ID card' };
  const sitePlan = { doc_type: 'SITE_PLAN', label: 'Site Plan' };
  const notarialAct = { doc_type: 'NOTARIAL_ACT', label: 'Notarial act (acte notarié)' };

  switch (type) {
    case 'PARTITION':
      return [
        idCard,
        sitePlan,
        { doc_type: 'JUDGMENT', label: 'Court judgment / inheritance certificate' },
      ];
    case 'PARTIAL_ALIENATION':
      return [idCard, sitePlan, notarialAct];
    case 'TOTAL_ALIENATION':
    case 'MORTGAGE':
      return [idCard, notarialAct];
    case 'MORTGAGE_RELEASE':
      return [
        idCard,
        { doc_type: 'RELEASE_DEED', label: "Creditor's release deed (mainlevée notariée)" },
      ];
    default:
      // First registrations
      return [idCard, sitePlan];
  }
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
// status. Rules are narrowed by the application's statutory track.
function rulesFor(type: string, from: string): TransitionRule[] {
  const track = trackFor(type);

  // ── Registrar-led carve-out (morcellement of a titled mother parcel) ─────
  if (track === 'CARVE_OUT') {
    switch (from) {
      case 'SUBMITTED':
        // Registrar verifies the act + mother title, then commissions the survey
        return [
          { to: 'SURVEY_ORDERED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
          { to: 'QUERIED', roles: [REGISTRAR] },
        ];
      case 'SURVEY_ORDERED':
        // SURVEYED is reachable only via the survey endpoint
        return [{ to: 'QUERIED', roles: [REGISTRAR] }];
      case 'SURVEYED':
        return [
          { to: 'CLEARED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
          { to: 'QUERIED', roles: [REGISTRAR] },
        ];
      case 'CLEARED':
        // TITLE_ISSUED is reachable only via the issue-title endpoint
        return [{ to: 'QUERIED', roles: [REGISTRAR] }];
      case 'QUERIED':
        // After correction the file re-opens on the Conservateur's desk
        return [
          { to: 'SUBMITTED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
        ];
      default:
        return [];
    }
  }

  // ── Registrar-direct (mutation totale, hypothèque, mainlevée) ────────────
  if (track === 'DIRECT') {
    switch (from) {
      case 'SUBMITTED':
        return [
          { to: 'CLEARED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
          { to: 'QUERIED', roles: [REGISTRAR] },
        ];
      case 'CLEARED':
        // COMPLETED is reachable only via the execute endpoint
        return [{ to: 'QUERIED', roles: [REGISTRAR] }];
      case 'QUERIED':
        return [
          { to: 'SUBMITTED', roles: [REGISTRAR] },
          { to: 'REJECTED', roles: [REGISTRAR] },
        ];
      default:
        return [];
    }
  }

  // ── Full first-registration track ─────────────────────────────────────────
  switch (from) {
    case 'SUBMITTED':
      return [
        { to: 'RECEIPTED', roles: [SDO] },
        { to: 'REJECTED', roles: [SDO] },
        { to: 'QUERIED', roles: [SDO] },
      ];

    case 'RECEIPTED':
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
    case 'COMPLETED':
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
