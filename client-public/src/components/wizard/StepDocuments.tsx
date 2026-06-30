import { useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  UploadFile as UploadFileIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useWatch } from 'react-hook-form';
import { type WizardStepProps } from '../../schemas/wizard.schema';

const REQUIRED_DOCS = [
  {
    key: 'id_card' as const,
    label: 'National ID Card',
    hint: 'Front and back scan or photograph of your valid ID card.',
  },
  {
    key: 'site_plan' as const,
    label: 'Site / Survey Plan',
    hint: 'Certified copy of the existing or proposed survey plan.',
  },
  {
    key: 'attestation' as const,
    label: 'Attestation of Ownership',
    hint: 'Village chief attestation or equivalent proof of occupation.',
  },
] as const;

type DocKey = (typeof REQUIRED_DOCS)[number]['key'];

function FileField({
  label,
  hint,
  fieldKey,
  onFile,
}: {
  label: string;
  hint: string;
  fieldKey: string;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);

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
        ID Card and Site Plan are required before you can submit. Attestation is optional.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {REQUIRED_DOCS.map(({ key, label, hint }) => (
          <FileField
            key={key}
            fieldKey={key}
            label={label}
            hint={hint}
            onFile={(file) => handleFile(key, file)}
          />
        ))}
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
