// Mirror of the server-side legal state machine (server/src/modules/applications/workflow.ts)
// used to render the correct procedural track, phase grouping and "next step"
// guidance for each application type.

export const FULL_TYPES = new Set(['DIRECT_REGISTRATION', 'STATE_LAND', 'TRANSFORMATION']);
export const CARVE_OUT_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);
export const DIRECT_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE', 'MORTGAGE_RELEASE']);

export type Track = 'FULL' | 'CARVE_OUT' | 'DIRECT';

export function trackFor(type: string): Track {
  if (CARVE_OUT_TYPES.has(type)) return 'CARVE_OUT';
  if (DIRECT_TYPES.has(type)) return 'DIRECT';
  return 'FULL';
}

export interface WorkflowStep {
  status: string;
  label: string;
  /** Phase I establishes the ground truth; Phase II is registration proper */
  phase: 1 | 2;
}

const FULL_STEPS: WorkflowStep[] = [
  { status: 'SUBMITTED', label: 'Submitted', phase: 1 },
  { status: 'RECEIPTED', label: 'Récépissé', phase: 1 },
  { status: 'PUBLISHED', label: 'Public Notice', phase: 1 },
  { status: 'SURVEYED', label: 'Bornage', phase: 1 },
  { status: 'REGIONAL_REVIEW', label: 'Regional Review', phase: 2 },
  { status: 'OPPOSITION_WINDOW', label: '30-Day Opposition', phase: 2 },
  { status: 'CLEARED', label: 'Cleared', phase: 2 },
  { status: 'TITLE_ISSUED', label: 'Title Issued', phase: 2 },
];

// Registrar-led carve-out (morcellement of a titled mother parcel): the file
// goes straight to the Conservateur, who commissions the survey himself.
const CARVE_OUT_STEPS: WorkflowStep[] = [
  { status: 'SUBMITTED', label: 'Submitted to Registrar', phase: 2 },
  { status: 'SURVEY_ORDERED', label: 'Survey Commissioned', phase: 1 },
  { status: 'SURVEYED', label: 'Child Parcel Demarcated', phase: 1 },
  { status: 'CLEARED', label: 'Cleared', phase: 2 },
  { status: 'TITLE_ISSUED', label: 'Child Title Issued', phase: 2 },
];

// Registrar-direct (mutation totale / hypothèque / mainlevée): no new title —
// the existing title is mutated when the Registrar executes the registration.
const DIRECT_STEPS: WorkflowStep[] = [
  { status: 'SUBMITTED', label: 'Submitted to Registrar', phase: 2 },
  { status: 'CLEARED', label: 'Deed Verified', phase: 2 },
  { status: 'COMPLETED', label: 'Registered in Livre Foncier', phase: 2 },
];

export function stepsFor(type: string): WorkflowStep[] {
  const track = trackFor(type);
  return track === 'DIRECT' ? DIRECT_STEPS : track === 'CARVE_OUT' ? CARVE_OUT_STEPS : FULL_STEPS;
}

export function nextStepText(type: string, status: string): string {
  const track = trackFor(type);
  switch (status) {
    case 'SUBMITTED':
      if (track === 'CARVE_OUT')
        return 'Next step: the Conservateur Foncier verifies the notarial act / partition judgment and the mother title, then commissions the carve-out survey.';
      if (track === 'DIRECT')
        return 'Next step: the Conservateur Foncier verifies the notarial deed against the title — this type goes directly to the Conservation Foncière.';
      return 'Next step: the Sub-Divisional Officer verifies the file and issues the Récépissé.';
    case 'RECEIPTED':
      return 'Next step: the SDO orders the public notice and convenes the Consultative Commission.';
    case 'PUBLISHED':
      return 'Next step: awaiting the Consultative Commission site visit and the sworn surveyor’s Procès-Verbal de Bornage.';
    case 'SURVEY_ORDERED':
      return 'Next step: the sworn surveyor demarcates the child parcel inside the mother title’s boundary and files the Procès-Verbal de Bornage.';
    case 'SURVEYED':
      return track === 'CARVE_OUT'
        ? 'Next step: the Conservateur Foncier verifies the carve-out survey and clears the file for issuance of the child title.'
        : 'Next step: the Divisional Delegate verifies the dossier and forwards it to the Regional Delegation.';
    case 'REGIONAL_REVIEW':
      return 'Next step: the Conservateur Foncier publishes the avis de clôture de bornage, opening the statutory 30-day opposition window.';
    case 'OPPOSITION_WINDOW':
      return 'Next step: the 30-day window must elapse; any opposition filed must be lifted (mainlevée) before the file can be cleared.';
    case 'CLEARED':
      if (track === 'DIRECT')
        return 'Next step: the Conservateur Foncier executes the registration — the mutation, hypothèque or mainlevée is entered on the existing title.';
      if (track === 'CARVE_OUT')
        return 'Next step: the Conservateur Foncier issues the child title and reduces the mother parcel accordingly.';
      return 'Next step: the Conservateur Foncier enters the parcel in the Livre Foncier and issues the Land Certificate.';
    case 'TITLE_ISSUED':
      return track === 'CARVE_OUT'
        ? 'Registration complete — the child title has been issued and the mother parcel reduced.'
        : 'Registration complete — the Land Certificate has been issued.';
    case 'COMPLETED':
      return 'Registration complete — the entry has been executed on the existing title in the Livre Foncier.';
    case 'QUERIED':
      return track === 'FULL'
        ? 'File queried — awaiting correction; the SDO re-opens it at the receipt stage once resolved.'
        : 'File queried — awaiting correction; the Conservateur Foncier re-opens it once resolved.';
    case 'REJECTED':
      return 'Application rejected — no further processing.';
    default:
      return '';
  }
}
