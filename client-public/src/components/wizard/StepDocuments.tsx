import { useRef, useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { UploadFile as UploadFileIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
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
  const { setValue } = form;

  function handleFile(key: DocKey, file: File | null) {
    setValue(`documents.${key}`, file ?? undefined);
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Supporting Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Upload scans or photographs of the required documents. Accepted formats: PDF, JPG, PNG.
      </Typography>
      <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 3 }}>
        Files are saved locally for review. Upload to the registry server will be completed on Day 9.
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
    </Box>
  );
}
