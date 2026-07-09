import { useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  UploadFile as UploadFileIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type WizardStepProps } from '../../schemas/wizard.schema';

// Labels and hints live in i18n under wizard.docs.items.<key>
type DocKey =
  | 'id_card'
  | 'site_plan'
  | 'attestation'
  | 'judgment'
  | 'notarial_act'
  | 'release_deed';

// Mirrors server/src/modules/applications/workflow.ts requiredDocTypes():
// registrar-direct types operate on an already-surveyed parcel, so no site
// plan or attestation is demanded for them.
function docsForType(type: string | undefined): DocKey[] {
  switch (type) {
    case 'PARTITION':
      return ['id_card', 'site_plan', 'attestation', 'judgment'];
    case 'PARTIAL_ALIENATION':
      return ['id_card', 'site_plan', 'attestation', 'notarial_act'];
    case 'TOTAL_ALIENATION':
    case 'MORTGAGE':
      return ['id_card', 'notarial_act'];
    case 'MORTGAGE_RELEASE':
      return ['id_card', 'release_deed'];
    default:
      return ['id_card', 'site_plan', 'attestation'];
  }
}

function FileField({
  label,
  hint,
  fieldKey,
  initialName,
  chooseLabel,
  changeLabel,
  onFile,
}: {
  label: string;
  hint: string;
  fieldKey: string;
  initialName: string | null;
  chooseLabel: string;
  changeLabel: string;
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
            {filename ? changeLabel : chooseLabel}
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
  const { t } = useTranslation();
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
        {t('wizard.docs.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('wizard.docs.subtitle')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        {appType === 'TOTAL_ALIENATION' || appType === 'MORTGAGE'
          ? t('wizard.docs.reqDirect')
          : appType === 'MORTGAGE_RELEASE'
            ? t('wizard.docs.reqRelease')
            : t('wizard.docs.reqDefault')}
        {appType === 'PARTITION' && t('wizard.docs.reqPartition')}
        {appType === 'PARTIAL_ALIENATION' && t('wizard.docs.reqPartial')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {requiredDocs.map((key) => {
          const existing = docValues?.[key];
          return (
            <FileField
              key={key}
              fieldKey={key}
              label={t(`wizard.docs.items.${key}.label`)}
              hint={t(`wizard.docs.items.${key}.hint`)}
              chooseLabel={t('wizard.docs.chooseFile')}
              changeLabel={t('wizard.docs.changeFile')}
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
          <Typography sx={{ fontWeight: 600 }}>{t('wizard.docs.others')}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('wizard.docs.othersHint')}
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
              {t('wizard.docs.addDocs')}
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
