import { useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  UploadFile as UploadFileIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useWatch } from 'react-hook-form';
import { type WizardStepProps } from '../../schemas/wizard.schema';

const ID_CARD_DOC = {
  key: 'id_card' as const,
  label: 'National ID Card',
  hint: 'Front and back scan or photograph of your valid ID card.',
};

const SITE_PLAN_DOC = {
  key: 'site_plan' as const,
  label: 'Site / Survey Plan',
  hint: 'Certified copy of the existing or proposed survey plan.',
};

const ATTESTATION_DOC = {
  key: 'attestation' as const,
  label: 'Attestation of Ownership',
  hint: 'Village chief attestation or equivalent proof of occupation.',
};

// Statutory extras per application type — required before submission
const JUDGMENT_DOC = {
  key: 'judgment' as const,
  label: 'Court Judgment / Inheritance Certificate',
  hint: 'The partition judgment or notarial inheritance certificate establishing the heirs and their shares. Required for partition applications.',
};

const NOTARIAL_ACT_DOC = {
  key: 'notarial_act' as const,
  label: 'Notarial Act (Acte Notarié)',
  hint: 'The notarized deed of sale, transfer or mortgage. Private agreements have no legal effect on titled land.',
};

const RELEASE_DEED_DOC = {
  key: 'release_deed' as const,
  label: "Creditor's Release Deed (Mainlevée Notariée)",
  hint: "The creditor's notarized deed confirming the secured debt is settled and consenting to the release of the mortgage.",
};

type DocKey =
  | typeof ID_CARD_DOC.key
  | typeof SITE_PLAN_DOC.key
  | typeof ATTESTATION_DOC.key
  | typeof JUDGMENT_DOC.key
  | typeof NOTARIAL_ACT_DOC.key
  | typeof RELEASE_DEED_DOC.key;

// Mirrors server/src/modules/applications/workflow.ts requiredDocTypes():
// registrar-direct types operate on an already-surveyed parcel, so no site
// plan or attestation is demanded for them.
function docsForType(type: string | undefined) {
  switch (type) {
    case 'PARTITION':
      return [ID_CARD_DOC, SITE_PLAN_DOC, ATTESTATION_DOC, JUDGMENT_DOC];
    case 'PARTIAL_ALIENATION':
      return [ID_CARD_DOC, SITE_PLAN_DOC, ATTESTATION_DOC, NOTARIAL_ACT_DOC];
    case 'TOTAL_ALIENATION':
    case 'MORTGAGE':
      return [ID_CARD_DOC, NOTARIAL_ACT_DOC];
    case 'MORTGAGE_RELEASE':
      return [ID_CARD_DOC, RELEASE_DEED_DOC];
    default:
      return [ID_CARD_DOC, SITE_PLAN_DOC, ATTESTATION_DOC];
  }
}

function FileField({
  label,
  hint,
  fieldKey,
  initialName,
  onFile,
}: {
  label: string;
  hint: string;
  fieldKey: string;
  initialName: string | null;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Seed from the persisted form value so a chosen file still shows when the
  // user navigates back to this step. The field remounts on step change and
  // would otherwise appear empty even though the File is still in form state.
  const [filename, setFilename] = useState<string | null>(initialName);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFilename(file?.name ?? null);
    onFile(file);
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {filename ? (
          <CheckCircleIcon color="success" fontSize="small" />
        ) : (
          <UploadFileIcon color="action" fontSize="small" />
        )}
        <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
      </Box>

      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
        {/* Hidden native input */}
        <input
          ref={inputRef}
          id={fieldKey}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        {/* label wraps the Button so clicking triggers the file dialog */}
        <label htmlFor={fieldKey} style={{ cursor: 'pointer' }}>
          <Button component="span" variant="outlined" size="small" startIcon={<UploadFileIcon />}>
            {filename ? 'Change File' : 'Choose File'}
          </Button>
        </label>

        {filename && (
          <Chip
            label={filename}
            size="small"
            color="success"
            variant="outlined"
            onDelete={() => {
              setFilename(null);
              onFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          />
        )}
      </Box>
    </Paper>
  );
}

export default function StepDocuments({ form }: WizardStepProps) {
  const { setValue, control } = form;
  const otherInputRef = useRef<HTMLInputElement>(null);
  const others = (useWatch({ control, name: 'documents.others' }) as File[] | undefined) ?? [];
  const docValues = useWatch({ control, name: 'documents' }) as
    | Record<string, unknown>
    | undefined;
  const appType = useWatch({ control, name: 'type' }) as string | undefined;
  const requiredDocs = docsForType(appType);

  function handleFile(key: DocKey, file: File | null) {
    setValue(`documents.${key}`, file ?? undefined);
  }

  function handleAddOthers(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setValue('documents.others', [...others, ...picked]);
    if (otherInputRef.current) otherInputRef.current.value = '';
  }

  function removeOther(index: number) {
    setValue(
      'documents.others',
      others.filter((_, i) => i !== index),
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Supporting Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Upload scans or photographs of the required documents. Accepted formats: PDF, JPG, PNG.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        {appType === 'TOTAL_ALIENATION' || appType === 'MORTGAGE'
          ? 'ID Card and the Notarial Act are required before you can submit — the parcel is already on the register, so no site plan is needed.'
          : appType === 'MORTGAGE_RELEASE'
            ? "ID Card and the creditor's Release Deed are required before you can submit."
            : 'ID Card and Site Plan are required before you can submit. Attestation is optional.'}
        {appType === 'PARTITION' &&
          ' Partition applications also require the court judgment or inheritance certificate.'}
        {appType === 'PARTIAL_ALIENATION' &&
          ' Partial alienations also require the notarial act (acte notarié).'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {requiredDocs.map(({ key, label, hint }) => {
          const existing = docValues?.[key];
          return (
            <FileField
              key={key}
              fieldKey={key}
              label={label}
              hint={hint}
              initialName={existing instanceof File ? existing.name : null}
              onFile={(file) => handleFile(key, file)}
            />
          );
        })}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Any other supporting documents the applicant wishes to attach */}
      <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFileIcon color="action" fontSize="small" />
          <Typography sx={{ fontWeight: 600 }}>Other Supporting Documents</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Optionally attach any additional documents — land agreement, tax receipts, sworn
          declarations, photographs, etc. You can add as many as you need.
        </Typography>

        <Box sx={{ mt: 0.5 }}>
          <input
            ref={otherInputRef}
            id="other-docs"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            style={{ display: 'none' }}
            onChange={handleAddOthers}
          />
          <label htmlFor="other-docs" style={{ cursor: 'pointer' }}>
            <Button component="span" variant="outlined" size="small" startIcon={<AddIcon />}>
              Add Document(s)
            </Button>
          </label>
        </Box>

        {others.length > 0 && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {others.map((file, i) => (
              <Chip
                key={`${file.name}-${i}`}
                icon={<CheckCircleIcon />}
                label={file.name}
                color="success"
                variant="outlined"
                onDelete={() => removeOther(i)}
                sx={{ justifyContent: 'space-between' }}
              />
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
