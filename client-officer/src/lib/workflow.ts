// Mirror of the server-side legal state machine (server/src/modules/applications/workflow.ts)
// used to render the correct procedural track, phase grouping and "next step"
// guidance for each application type.

export const FAST_TRACK_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE']);
export const NO_OPPOSITION_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);

export type Track = 'FULL' | 'NO_OPPOSITION' | 'FAST';

export function trackFor(type: string): Track {
  if (FAST_TRACK_TYPES.has(type)) return 'FAST';
  if (NO_OPPOSITION_TYPES.has(type)) return 'NO_OPPOSITION';
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

const NO_OPPOSITION_STEPS: WorkflowStep[] = FULL_STEPS.filter(
  (s) => s.status !== 'OPPOSITION_WINDOW',
);

const FAST_STEPS: WorkflowStep[] = [
  { status: 'SUBMITTED', label: 'Submitted', phase: 2 },
  { status: 'RECEIPTED', label: 'Récépissé', phase: 2 },
  { status: 'CLEARED', label: 'Notarial Act Verified', phase: 2 },
  { status: 'TITLE_ISSUED', label: 'Mutation Registered', phase: 2 },
];

export function stepsFor(type: string): WorkflowStep[] {
  const track = trackFor(type);
  return track === 'FAST' ? FAST_STEPS : track === 'NO_OPPOSITION' ? NO_OPPOSITION_STEPS : FULL_STEPS;
}

export function nextStepText(type: string, status: string): string {
  const track = trackFor(type);
  switch (status) {
    case 'SUBMITTED':
      return 'Next step: the Sub-Divisional Officer verifies the file and issues the Récépissé.';
    case 'RECEIPTED':
      return track === 'FAST'
        ? 'Next step: the Conservateur Foncier verifies the notarial act and clears the file — no public notice is required for this type.'
        : 'Next step: the SDO orders the public notice and convenes the Consultative Commission.';
    case 'PUBLISHED':
      return 'Next step: awaiting the Consultative Commission site visit and the sworn surveyor’s Procès-Verbal de Bornage.';
    case 'SURVEYED':
      return 'Next step: the Divisional Delegate verifies the dossier and forwards it to the Regional Delegation.';
    case 'REGIONAL_REVIEW':
      return track === 'FULL'
        ? 'Next step: the Conservateur Foncier publishes the avis de clôture de bornage, opening the statutory 30-day opposition window.'
        : 'Next step: the Conservateur Foncier clears the file for registration — subdivisions of titled land do not pass through the opposition window.';
    case 'OPPOSITION_WINDOW':
      return 'Next step: the 30-day window must elapse; any opposition filed must be lifted (mainlevée) before the file can be cleared.';
    case 'CLEARED':
      return 'Next step: the Conservateur Foncier enters the parcel in the Livre Foncier and issues the Land Certificate.';
    case 'TITLE_ISSUED':
      return 'Registration complete — the Land Certificate has been issued.';
    case 'QUERIED':
      return 'File queried — awaiting correction; the SDO re-opens it at the receipt stage once resolved.';
    case 'REJECTED':
      return 'Application rejected — no further processing.';
    default:
      return '';
  }
}
