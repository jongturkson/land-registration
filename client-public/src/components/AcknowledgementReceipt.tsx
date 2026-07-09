import { Print as PrintIcon } from '@mui/icons-material';
import { Box, Button, Container, Divider, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type Props = {
  referenceNo: string;
  applicantName: string;
  date: Date;
};

const VERMILION = '#C0392B';

function Seal() {
  return (
    <Box
      sx={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        border: `4px solid ${VERMILION}`,
        boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${VERMILION}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 3,
        color: VERMILION,
        textAlign: 'center',
        px: 1,
      }}
    >
      {/* Scales of justice emblem */}
      <svg width="40" height="40" viewBox="0 0 24 24" fill={VERMILION}>
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
      </svg>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, fontSize: '6.5px', lineHeight: 1.2, letterSpacing: '0.04em', mt: 0.5 }}
      >
        REPUBLIC OF CAMEROON
      </Typography>
    </Box>
  );
}

export default function AcknowledgementReceipt({ referenceNo, applicantName, date }: Props) {
  const { t } = useTranslation();
  const formattedDate = date.toLocaleDateString('fr-CM', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 2,
          '@media print': { display: 'none' },
        }}
      >
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
          {t('wizard.receipt.print')}
        </Button>
      </Box>

      <Paper
        elevation={6}
        sx={{
          p: { xs: 3, sm: 5 },
          border: `3px double ${VERMILION}`,
          textAlign: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 8,
            border: `1px solid ${VERMILION}`,
            borderRadius: '4px',
            opacity: 0.25,
            pointerEvents: 'none',
          },
        }}
      >
        <Seal />

        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', letterSpacing: '0.15em' }}
        >
          Republic of Cameroon
        </Typography>

        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontFamily: "'Lora', serif", fontWeight: 700, mt: 0.5 }}
        >
          {t('wizard.receipt.title')}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontStyle: 'italic' }}>
          Récépissé de Demande de Titre Foncier
        </Typography>

        <Divider sx={{ my: 3, borderColor: VERMILION, opacity: 0.35 }} />

        {/* Reference number */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Reference No. / Numéro de Référence
        </Typography>
        <Typography
          sx={{
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
            fontSize: { xs: '1.6rem', sm: '2.2rem' },
            fontWeight: 700,
            color: VERMILION,
            letterSpacing: '0.08em',
            my: 1,
          }}
        >
          {referenceNo}
        </Typography>

        <Divider sx={{ my: 3, borderColor: VERMILION, opacity: 0.35 }} />

        {/* Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Applicant / Demandeur
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {applicantName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('wizard.receipt.dateSubmitted')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formattedDate}
            </Typography>
          </Box>
        </Box>

        {/* Notice */}
        <Paper
          variant="outlined"
          sx={{ p: 2, backgroundColor: '#fbeef0', borderColor: VERMILION, borderRadius: 1 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: VERMILION, mb: 0.5 }}>
            {t('wizard.receipt.noticeTitle')}
          </Typography>
          <Typography variant="body2">{t('wizard.receipt.noticeBody')}</Typography>
        </Paper>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mt: 3, fontSize: '10px', letterSpacing: '0.05em' }}
        >
          {t('wizard.receipt.footer')}
        </Typography>
      </Paper>
    </Container>
  );
}
