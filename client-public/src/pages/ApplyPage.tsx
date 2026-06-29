import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Path } from 'react-hook-form';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { WizardSchema, type WizardFormData } from '../schemas/wizard.schema';
import StepType from '../components/wizard/StepType';
import StepOwner from '../components/wizard/StepOwner';
import StepLand from '../components/wizard/StepLand';
import StepDocuments from '../components/wizard/StepDocuments';
import StepReview from '../components/wizard/StepReview';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import api from '../lib/api';

const STEP_LABELS = ['Type', 'Owner', 'Land', 'Documents', 'Review'];

const STEP_FIELDS: Record<number, Path<WizardFormData>[]> = {
  0: ['type'],
  1: ['owner.full_name', 'owner.address', 'owner.id_card_no', 'owner.id_delivered_on'],
  2: ['land.plot_no', 'land.block_no', 'land.subdivision', 'land.division'],
  3: [],
};

export default function ApplyPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date>(new Date());

  const form = useForm<WizardFormData>({
    resolver: zodResolver(WizardSchema),
    defaultValues: {
      owner: {
        full_name: '',
        address: '',
        id_card_no: '',
        id_delivered_on: '',
        acting_on_behalf: false,
        behalf_name: '',
        behalf_id: '',
        behalf_address: '',
      },
      land: {
        title_no: '',
        plot_no: '',
        block_no: '',
        subdivision: '',
        division: '',
        area_main: '',
        area_partition: '',
      },
      documents: {},
      consent: false,
    },
    mode: 'onTouched',
  });

  async function handleNext() {
    const fields = STEP_FIELDS[activeStep] ?? [];
    if (fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    setActiveStep((s) => s + 1);
  }

  function handleBack() {
    setActiveStep((s) => s - 1);
  }

  const DOC_TYPE_MAP: Record<string, string> = {
    id_card: 'ID_CARD',
    site_plan: 'SITE_PLAN',
    attestation: 'ATTESTATION',
  };

  async function onSubmit(data: WizardFormData) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Create draft application
      const createRes = await api.post<{ id: string }>('/applications', { type: data.type });
      const applicationId = createRes.data.id;

      // 2. Upload each attached document via multipart/form-data
      const docEntries = (Object.entries(data.documents) as [string, unknown][]).filter(
        ([, file]) => file instanceof File,
      ) as [string, File][];

      for (const [key, file] of docEntries) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', DOC_TYPE_MAP[key] ?? key.toUpperCase());
        await api.post(`/applications/${applicationId}/documents`, formData);
      }

      // 3. Submit — backend enforces ID_CARD + SITE_PLAN are present
      const submitRes = await api.post<{ reference_no: string }>(
        `/applications/${applicationId}/submit`,
        {},
      );

      setSubmittedAt(new Date());
      setReferenceNo(submitRes.data.reference_no);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setSubmitError(
            'Authentication required. Please log in as a citizen before submitting.',
          );
        } else {
          const msg =
            (err.response?.data as { message?: string } | undefined)?.message ??
            'Submission failed. Please try again.';
          setSubmitError(msg);
        }
      } else {
        setSubmitError('Network error. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (referenceNo) {
    return (
      <AcknowledgementReceipt
        referenceNo={referenceNo}
        applicantName={form.getValues('owner.full_name')}
        date={submittedAt}
      />
    );
  }

  const steps = [
    <StepType key="type" form={form} />,
    <StepOwner key="owner" form={form} />,
    <StepLand key="land" form={form} />,
    <StepDocuments key="docs" form={form} />,
    <StepReview key="review" form={form} submitError={submitError} />,
  ];

  const isLastStep = activeStep === STEP_LABELS.length - 1;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}
      >
        Online Pre-Application
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Complete all 5 steps. On submission you will receive a Récépissé reference number to
        present at the Divisional Registry, Buea.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEP_LABELS.map((label, idx) => (
          <Step key={label} completed={activeStep > idx}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={2} sx={{ p: { xs: 2.5, sm: 4 } }}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {steps[activeStep]}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || submitting}
            >
              Back
            </Button>

            <Typography variant="caption" color="text.secondary">
              Step {activeStep + 1} of {STEP_LABELS.length}
            </Typography>

            {isLastStep ? (
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={submitting}
                startIcon={
                  submitting ? <CircularProgress size={16} color="inherit" /> : undefined
                }
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
