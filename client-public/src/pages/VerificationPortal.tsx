import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { COLORS } from '../theme';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Encumbrance {
  id: string;
  kind: string;
  party: string | null;
  status: string;
  recorded_at: string;
  cleared_at: string | null;
}

interface VerifyResult {
  title_no: string;
  volume: string | null;
  folio: string | null;
  division: string;
  nature: string | null;
  status: string;
  issued_at: string | null;
  owner: { full_name: string; ancestors: string | null; birth_place: string | null } | null;
  encumbrances: Encumbrance[];
}

type RequesterType = 'INDIVIDUAL' | 'COMPANY';
type Provider = 'MOMO' | 'ORANGE_MONEY';
type PayStage = 'idle' | 'paying' | 'verifying';

// ─── Constants ──────────────────────────────────────────────────────────────

const FEES: Record<RequesterType, number> = {
  INDIVIDUAL: 31000,
  COMPANY: 62000,
};

const PROVIDER_LABEL: Record<Provider, string> = {
  MOMO: 'MTN Mobile Money',
  ORANGE_MONEY: 'Orange Money',
};

const GREEN = '#1B7F3B';
const RED = '#B4232A';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VerificationPortal() {
  const [titleNo, setTitleNo] = useState('');
  const [volume, setVolume] = useState('');
  const [folio, setFolio] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [requesterType, setRequesterType] = useState<RequesterType>('INDIVIDUAL');
  const [provider, setProvider] = useState<Provider>('MOMO');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<PayStage>('idle');
  const [modalError, setModalError] = useState<string | null>(null);

  const [result, setResult] = useState<VerifyResult | null>(null);

  // QR auto-load: ?title_no=&volume=&folio= pre-fills the search. The Payment
  // Modal only auto-opens when all three mandatory coordinates are present
  // (a full QR scan); otherwise the user completes the missing field(s) first.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('title_no');
    const v = params.get('volume');
    const f = params.get('folio');
    if (t) setTitleNo(t);
    if (v) setVolume(v);
    if (f) setFolio(f);
    if (t?.trim() && v?.trim() && f?.trim()) {
      setModalOpen(true);
    }
  }, []);

  function openPayment() {
    if (!titleNo.trim()) {
      setSearchError('Please enter a Land Title Number to verify.');
      return;
    }
    if (!volume.trim()) {
      setSearchError('Please enter the Volume. Title Number, Volume and Folio are all required.');
      return;
    }
    if (!folio.trim()) {
      setSearchError('Please enter the Folio. Title Number, Volume and Folio are all required.');
      return;
    }
    setSearchError(null);
    setModalError(null);
    setModalOpen(true);
  }

  function closePayment() {
    if (stage !== 'idle') return; // don't allow closing mid-transaction
    setModalOpen(false);
    setModalError(null);
  }

  async function handlePayAndVerify() {
    if (!phone.trim()) {
      setModalError('Please enter the phone number to be charged.');
      return;
    }
    setModalError(null);

    try {
      // 1. Mock Mobile Money charge (≈2s USSD PIN prompt)
      setStage('paying');
      const payRes = await api.post<{ success: boolean; transaction_id: string }>(
        '/payments/simulate',
        { phone: phone.trim(), amount: FEES[requesterType], provider },
      );

      if (!payRes.data?.success || !payRes.data.transaction_id) {
        throw new Error('Payment was not completed.');
      }

      // 2. Paid — now fetch the certificate of ownership
      setStage('verifying');
      const verifyRes = await api.post<VerifyResult>('/titles/verify', {
        title_no: titleNo.trim(),
        volume: volume.trim(),
        folio: folio.trim(),
        transaction_id: payRes.data.transaction_id,
        requester_type: requesterType,
      });

      setResult(verifyRes.data);
      setModalOpen(false);
      setStage('idle');
    } catch (err: unknown) {
      setStage('idle');
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setModalError(
            'No land title was found with that number. Please check the number and try again.',
          );
        } else if (err.response?.status === 402) {
          setModalError('Payment is required before verification.');
        } else {
          setModalError(
            (err.response?.data as { message?: string } | undefined)?.message ??
              'Verification failed. Please try again.',
          );
        }
      } else {
        setModalError('Something went wrong. Please try again.');
      }
    }
  }

  function verifyAnother() {
    setResult(null);
    setTitleNo('');
    setVolume('');
    setFolio('');
    setPhone('');
    setStage('idle');
    setModalError(null);
  }

  function handleDownload() {
    if (!result) return;
    const html = buildCertificateHtml(result);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate-of-Ownership-${result.title_no}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const isValid = result?.status === 'VALID';
  const busy = stage !== 'idle';

  return (
    <Box>
      {/* Print stylesheet — isolate the certificate when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ownership-certificate, #ownership-certificate * { visibility: visible !important; }
          #ownership-certificate {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Hero + search ─────────────────────────────────────────────────── */}
      {!result && (
        <Box
          sx={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, #16385a 100%)`,
            color: 'white',
            py: { xs: 6, sm: 9 },
            px: 2,
          }}
        >
          <Container maxWidth="md" sx={{ textAlign: 'center' }}>
            <VerifiedIcon sx={{ fontSize: 52, opacity: 0.9, mb: 1 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: "'Lora', serif", fontWeight: 700, mb: 1.5 }}
            >
              Verify a Land Title
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9, mb: 4 }}>
              Obtain an official Digital Certificate of Ownership for any registered parcel.
            </Typography>

            <Paper
              elevation={8}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 1.5,
                maxWidth: 680,
                mx: 'auto',
                borderRadius: 2,
              }}
            >
              <TextField
                fullWidth
                required
                label="Land Title Number"
                placeholder="e.g. TF-2026-12345"
                value={titleNo}
                onChange={(e) => setTitleNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openPayment();
                }}
                error={!!searchError && !titleNo.trim()}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
                  },
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1.5,
                }}
              >
                <TextField
                  label="Volume"
                  required
                  placeholder="e.g. 116"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openPayment();
                  }}
                  error={!!searchError && !!titleNo.trim() && !volume.trim()}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Folio"
                  required
                  placeholder="e.g. 42"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openPayment();
                  }}
                  error={!!searchError && !!titleNo.trim() && !!volume.trim() && !folio.trim()}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={openPayment}
                  sx={{
                    px: 4,
                    whiteSpace: 'nowrap',
                    bgcolor: COLORS.accent,
                    '&:hover': { bgcolor: '#a5322a' },
                  }}
                >
                  Verify
                </Button>
              </Box>
            </Paper>
            {searchError && (
              <Typography variant="body2" sx={{ mt: 2, color: '#ffd9d5' }}>
                {searchError}
              </Typography>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 3, opacity: 0.75 }}>
              Title Number, Volume and Folio are all required. A statutory search fee applies —
              payable by MTN Mobile Money or Orange Money.
            </Typography>
          </Container>
        </Box>
      )}

      {/* ── Certificate of Ownership ──────────────────────────────────────── */}
      {result && (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
          {/* Action bar (hidden on print) */}
          <Box className="no-print" sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mb: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
              Download
            </Button>
            <Button variant="contained" onClick={verifyAnother} sx={{ bgcolor: COLORS.primary }}>
              Verify Another
            </Button>
          </Box>

          <Paper
            id="ownership-certificate"
            elevation={6}
            sx={{
              p: { xs: 3, sm: 5 },
              border: `2px solid ${COLORS.primary}`,
              position: 'relative',
            }}
          >
            {/* Letterhead */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: 'text.secondary' }}>
                Republic of Cameroon · Ministry of State Property &amp; Land Tenure
              </Typography>
              <Typography variant="h4" sx={{ fontFamily: "'Lora', serif", fontWeight: 700, mt: 1 }}>
                Digital Certificate of Ownership
              </Typography>
              <Typography variant="subtitle2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Attestation Numérique de Propriété
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Status badge */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 6,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: isValid ? GREEN : RED,
                  color: 'white',
                  boxShadow: `0 4px 14px ${isValid ? 'rgba(27,127,59,0.4)' : 'rgba(180,35,42,0.4)'}`,
                }}
              >
                <Typography
                  sx={{ fontSize: { xs: '2rem', sm: '2.8rem' }, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}
                >
                  {isValid ? 'VALID' : (result.status || 'CANCELLED').toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {isValid
                  ? 'This land title is registered and in good standing.'
                  : 'This land title is no longer valid.'}
              </Typography>
            </Box>

            {/* Title identifiers */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Field label="Title Number" value={result.title_no} mono />
              <Field label="Volume" value={result.volume ?? '—'} mono />
              <Field label="Folio" value={result.folio ?? '—'} mono />
              <Field label="Division" value={result.division} />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Owner */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.primary, mb: 1 }}>
              Registered Owner (Titulaire)
            </Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {result.owner?.full_name ?? 'Not on record'}
              </Typography>
              {result.owner?.ancestors && (
                <Typography variant="body2" color="text.secondary">
                  Child of {result.owner.ancestors}
                </Typography>
              )}
              {result.owner?.birth_place && (
                <Typography variant="body2" color="text.secondary">
                  Born at {result.owner.birth_place}
                </Typography>
              )}
            </Box>
            {result.nature && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Property: {result.nature}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Encumbrances */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.primary, mb: 1.5 }}>
              Encumbrances &amp; Legal Charges
            </Typography>
            {result.encumbrances.length === 0 ? (
              <Alert severity="success" variant="outlined" icon={<VerifiedIcon />}>
                No active encumbrances. Title is clear.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: COLORS.surfaceTint }}>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Party</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Recorded</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.encumbrances.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.kind}</TableCell>
                        <TableCell>{e.party ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={e.status}
                            size="small"
                            color={e.status === 'ACTIVE' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatDate(e.recorded_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Footer */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Issued on {formatDate(result.issued_at)} · Verified on{' '}
                {new Date().toLocaleString('en-GB')}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                This is a computer-generated certificate produced by the Land Registration Portal.
                Its authenticity may be re-confirmed at any time using the Title Number above.
              </Typography>
            </Box>
          </Paper>
        </Container>
      )}

      {/* ── Payment modal ─────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onClose={closePayment} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}>
          Search Fee Payment
          <Typography variant="body2" color="text.secondary">
            Title No. {titleNo || '—'}
            {volume.trim() && ` · Vol. ${volume.trim()}`}
            {folio.trim() && ` · Folio ${folio.trim()}`}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {busy ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress size={56} sx={{ color: COLORS.accent, mb: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stage === 'paying'
                  ? 'Prompting user for PIN… please check your phone.'
                  : 'Payment received. Retrieving certificate…'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {stage === 'paying'
                  ? `A payment request has been sent to ${phone} via ${PROVIDER_LABEL[provider]}.`
                  : 'Please wait a moment.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {modalError && <Alert severity="error">{modalError}</Alert>}

              {/* Requester type / fee */}
              <FormControl>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Requester Type</FormLabel>
                <RadioGroup
                  value={requesterType}
                  onChange={(e) => setRequesterType(e.target.value as RequesterType)}
                >
                  <FormControlLabel
                    value="INDIVIDUAL"
                    control={<Radio />}
                    label="Individual (31,000 FCFA)"
                  />
                  <FormControlLabel
                    value="COMPANY"
                    control={<Radio />}
                    label="Company / Institution (62,000 FCFA)"
                  />
                </RadioGroup>
              </FormControl>

              <Divider />

              {/* Provider */}
              <FormControl>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Payment Method</FormLabel>
                <RadioGroup value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
                  <FormControlLabel value="MOMO" control={<Radio />} label="MTN Mobile Money" />
                  <FormControlLabel value="ORANGE_MONEY" control={<Radio />} label="Orange Money" />
                </RadioGroup>
              </FormControl>

              {/* Phone */}
              <TextField
                label="Phone Number"
                placeholder="6XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
              />

              {/* Amount summary */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: COLORS.surfaceTint, borderColor: COLORS.accent }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Amount to pay
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.accent }}>
                    {FEES[requesterType].toLocaleString()} FCFA
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closePayment} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handlePayAndVerify()}
            disabled={busy}
            sx={{ bgcolor: COLORS.accent, '&:hover': { bgcolor: '#a5322a' }, px: 3 }}
          >
            {busy ? 'Processing…' : `Pay & Verify`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Sub-components / helpers ───────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 700,
          fontFamily: mono ? "'IBM Plex Mono', 'Courier New', monospace" : undefined,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// Standalone, self-contained certificate for the "Download" action
function buildCertificateHtml(r: VerifyResult): string {
  const valid = r.status === 'VALID';
  const badgeColor = valid ? GREEN : RED;
  const rows =
    r.encumbrances.length === 0
      ? `<p style="padding:12px;border:1px solid ${GREEN};border-radius:6px;color:${GREEN};background:#eaf6ee">No active encumbrances. Title is clear.</p>`
      : `<table style="width:100%;border-collapse:collapse;margin-top:8px">
           <thead><tr style="background:${COLORS.surfaceTint};text-align:left">
             <th style="padding:8px;border:1px solid #ddd">Type</th>
             <th style="padding:8px;border:1px solid #ddd">Party</th>
             <th style="padding:8px;border:1px solid #ddd">Status</th>
             <th style="padding:8px;border:1px solid #ddd">Recorded</th>
           </tr></thead>
           <tbody>${r.encumbrances
             .map(
               (e) =>
                 `<tr>
                    <td style="padding:8px;border:1px solid #ddd">${e.kind}</td>
                    <td style="padding:8px;border:1px solid #ddd">${e.party ?? '—'}</td>
                    <td style="padding:8px;border:1px solid #ddd">${e.status}</td>
                    <td style="padding:8px;border:1px solid #ddd">${formatDate(e.recorded_at)}</td>
                  </tr>`,
             )
             .join('')}</tbody>
         </table>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Certificate of Ownership · ${r.title_no}</title>
<style>
  body{font-family:'Public Sans',Arial,sans-serif;color:${COLORS.ink};margin:0;padding:32px;background:#f4f4f4}
  .cert{max-width:760px;margin:0 auto;background:#fff;border:2px solid ${COLORS.primary};padding:40px}
  .center{text-align:center}
  .badge{display:inline-block;padding:12px 48px;border-radius:8px;background:${badgeColor};color:#fff;font-size:40px;font-weight:800;letter-spacing:.1em}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}
  .label{font-size:12px;color:#666}
  .value{font-weight:700;font-family:'Courier New',monospace}
  h1{font-family:Georgia,serif;margin:6px 0}
  hr{border:none;border-top:1px solid #ddd;margin:24px 0}
  .muted{color:#666;font-size:12px}
  @media print{body{background:#fff;padding:0}.cert{border:2px solid ${COLORS.primary}}}
</style></head>
<body><div class="cert">
  <div class="center">
    <div style="letter-spacing:.18em;font-size:12px;color:#666;text-transform:uppercase">Republic of Cameroon · Ministry of State Property &amp; Land Tenure</div>
    <h1>Digital Certificate of Ownership</h1>
    <div style="font-style:italic;color:#666">Attestation Numérique de Propriété</div>
  </div>
  <hr/>
  <div class="center"><span class="badge">${valid ? 'VALID' : (r.status || 'CANCELLED').toUpperCase()}</span></div>
  <div class="grid">
    <div><div class="label">Title Number</div><div class="value">${r.title_no}</div></div>
    <div><div class="label">Volume</div><div class="value">${r.volume ?? '—'}</div></div>
    <div><div class="label">Folio</div><div class="value">${r.folio ?? '—'}</div></div>
    <div><div class="label">Division</div><div class="value" style="font-family:inherit">${r.division}</div></div>
  </div>
  <hr/>
  <div style="font-weight:700;color:${COLORS.primary}">Registered Owner (Titulaire)</div>
  <div style="font-size:20px;font-weight:700">${r.owner?.full_name ?? 'Not on record'}</div>
  ${r.owner?.ancestors ? `<div class="muted">Child of ${r.owner.ancestors}</div>` : ''}
  ${r.nature ? `<div class="muted">Property: ${r.nature}</div>` : ''}
  <hr/>
  <div style="font-weight:700;color:${COLORS.primary};margin-bottom:8px">Encumbrances &amp; Legal Charges</div>
  ${rows}
  <hr/>
  <div class="center muted">Issued on ${formatDate(r.issued_at)} · Verified on ${new Date().toLocaleString('en-GB')}<br/>
  Computer-generated certificate — Land Registration Portal.</div>
</div></body></html>`;
}
