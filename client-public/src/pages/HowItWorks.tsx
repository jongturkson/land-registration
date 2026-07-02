import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { SvgIconComponent } from '@mui/icons-material';
import type { AppTypeValue } from '../schemas/wizard.schema';

// ─── SDD 8.2 — The six formal statutory tracks of the Cameroonian land regime ──
// Legal basis: Ordinance No. 74-1 of 6 July 1974 governing land tenure;
// Decree No. 76-165 of 27 April 1976 (as amended by Decree No. 2005-481 of
// 16 December 2005) on conditions for obtaining land certificates; Decree
// No. 76-166 of 27 April 1976 on the management of national lands; and the
// OHADA Uniform Act on Securities (2010) for mortgage inscriptions.

interface RegistrationTrack {
  wizardType: AppTypeValue;
  title: string;
  frenchTitle: string;
  icon: SvgIconComponent;
  duration: string;
  fees: string;
  description: string;
  steps: string[];
  documents: string[];
  misunderstanding: string;
}

const TRACKS: RegistrationTrack[] = [
  {
    wizardType: 'DIRECT_REGISTRATION',
    title: 'Direct Registration',
    frenchTitle: 'Immatriculation Directe',
    icon: AppRegistrationIcon,
    duration: '~6 Months',
    fees: 'Survey fees + administrative stamps',
    description:
      'The first-time registration of unregistered land. Under Ordinance No. 74-1 of 6 July 1974 and Decree No. 76-165 of 27 April 1976, persons and customary communities who peacefully occupied or exploited land before 5 August 1974 may apply to convert that occupation into a full Land Certificate (Titre Foncier) — the only legal proof of land ownership in Cameroon.',
    steps: [
      'File the application (Demande d’Immatriculation) in the prescribed form with the Sub-Divisional Officer (Sous-Préfet) of the area where the land is situated.',
      'The Consultative Board (Commission Consultative), chaired by the Sub-Divisional Officer, visits the land to verify effective occupation and development (mise en valeur) prior to 5 August 1974.',
      'A sworn government surveyor demarcates the boundaries, plants boundary marks, and draws up the official site plan approved by the Surveys Department (Cadastre).',
      'An extract of the application is published in the official bulletin, opening the statutory 30-day period during which any interested party may lodge an opposition or a demand for inscription of right.',
      'If no opposition is sustained, the Land Registrar (Conservateur Foncier) registers the parcel in the Land Register and issues the Land Certificate in the applicant’s name.',
    ],
    documents: [
      'Certified copy of the applicant’s National Identity Card (or Certificate of Incorporation for legal entities)',
      'Sketch / site plan (croquis) of the parcel showing its boundaries and neighbours',
      'Proof of occupation or development before 5 August 1974 (attestation of the traditional authority, land tax receipts, evidence of buildings, crops or other mise en valeur)',
    ],
    misunderstanding:
      'Many citizens believe a customary “sale agreement” or a chief’s attestation is itself proof of ownership. It is not. Since the 1974 Ordinance, only the Land Certificate confers legal ownership — customary occupation merely gives you the right to APPLY for registration, and unregistered land remains national land administered by the State.',
  },
  {
    wizardType: 'PARTIAL_ALIENATION',
    title: 'Partial Alienation / Subdivision',
    frenchTitle: 'Morcellement',
    icon: ContentCutIcon,
    duration: '~1 Month',
    fees: '~15% of asset value (registration duties, notary fees, mutation taxes)',
    description:
      'The sale or transfer of a portion of an already-titled parcel. The mother title is “morcelé” (split): the severed portion is excised, given its own survey plan, and registered as a brand-new Land Certificate in the buyer’s name, while the remainder stays on the seller’s annotated title.',
    steps: [
      'The parties appear before a Notary Public, who drafts the authentic deed of partial transfer (acte de vente partielle) — private agreements cannot transfer titled land.',
      'A sworn surveyor demarcates the portion sold and produces a subdivision plan (plan de morcellement) which must be checked and approved by the Surveys Department (Cadastre).',
      'Registration duties and mutation taxes (cumulatively about 15% of the declared value) are assessed and paid at the Taxation Office, and the deed is registered.',
      'The Notary deposits the complete file at the Land Registry, where the Registrar verifies it against the mother title and any inscribed charges or oppositions.',
      'The Land Registrar excises the portion from the mother title, opens a new Land Certificate in the buyer’s name, and annotates the reduced area on the seller’s title.',
    ],
    documents: [
      'Certified copy of the mother Land Certificate (Titre Foncier) of the seller',
      'Notarized deed of partial transfer (acte notarié de vente partielle)',
      'Subdivision survey plan approved by the Surveys Department (Cadastre)',
    ],
    misunderstanding:
      'The public commonly assumes that a private sale agreement signed before witnesses — or even stamped by a local authority — transfers the portion of land. Under Cameroonian law, any transaction on titled land is VOID unless it is established by notarial deed and entered in the Land Register. Until the new certificate is created, the buyer owns nothing.',
  },
  {
    wizardType: 'TOTAL_ALIENATION',
    title: 'Total Alienation / Transfer',
    frenchTitle: 'Mutation Totale',
    icon: SwapHorizIcon,
    duration: '2–3 Weeks',
    fees: '15% cumulative transfer rate on the declared value',
    description:
      'The transfer of an entire titled parcel from one owner to another — by sale, gift or exchange. No new title is created: the existing Land Certificate is “muted”, meaning the Land Register entry is updated to record the new owner. It is the fastest transaction on titled land because the parcel’s boundaries and survey are already established.',
    steps: [
      'Seller and buyer appear before a Notary Public, who verifies the seller’s title and drafts the authentic deed of total transfer (acte de vente).',
      'The deed is registered at the Taxation Office and the cumulative transfer duties (registration duty, stamp duty and related taxes totalling about 15%) are paid.',
      'The Notary transmits the registered deed and the complete transfer file to the competent Land Registry (Conservation Foncière).',
      'The Land Registrar verifies the authenticity of the title and checks for inscribed mortgages, seizures or oppositions that could block the transfer.',
      'The mutation is entered in the Land Register: the certificate record now bears the buyer’s name, and an updated copy (duplicatum) is issued to the new owner.',
    ],
    documents: [
      'The seller’s Land Certificate (Titre Foncier) or certified copy thereof',
      'Notarized deed of sale / transfer (acte de vente notarié) signed by both parties',
      'Receipt of payment of the transfer duties issued by the Taxation Office',
    ],
    misunderstanding:
      'Buyers often believe that physically holding the seller’s title document — or paying the full price — makes them the owner. It does not. Ownership passes only at the moment the mutation is entered in the Land Register by the Conservateur Foncier. A seller who still appears in the Register can legally sell the same land twice; the registered buyer always wins.',
  },
  {
    wizardType: 'STATE_LAND',
    title: 'State Land Concession',
    frenchTitle: 'Concession de Terres Domaniales',
    icon: AccountBalanceIcon,
    duration: '12–24 Months',
    fees: 'Annual lease rent assessed per square metre',
    description:
      'The allocation of unoccupied national land by the State under Decree No. 76-166 of 27 April 1976. The applicant first receives a provisional concession (maximum 5 years) conditioned on a development project; only after the promised development (mise en valeur) is verified can the land be converted into a definitive grant or long lease.',
    steps: [
      'Submit an application to the local Lands Service (Service des Domaines), accompanied by a detailed development / investment project for the parcel requested.',
      'The Consultative Board inspects the land, confirms it is free of prior claims, and forwards a reasoned report through the Senior Divisional Officer to the Ministry in charge of Lands.',
      'A provisional concession is granted — by order of the Minister for areas up to 50 hectares, or by Presidential decree for areas above 50 hectares — for a maximum of five years.',
      'The concessionaire develops the land as promised and pays the annual rent; at term, the Consultative Board returns to verify that the mise en valeur has actually been carried out.',
      'Upon a favourable verification report, the provisional concession is converted into a definitive grant or long lease, which is then registered with the Land Registrar.',
    ],
    documents: [
      'Completed application form with proof of identity (National ID Card, or Articles of Incorporation for companies)',
      'Site plan / sketch identifying the parcel of national land requested',
      'Detailed development programme (programme de mise en valeur) with evidence of financial capacity',
    ],
    misunderstanding:
      'Applicants frequently assume that paying the annual rent makes the land permanently theirs. A provisional concession is strictly conditional: if the promised development is not carried out within the deadline, the State withdraws the concession WITHOUT compensation for the rent already paid. Ownership only ever arises from the definitive grant and its registration.',
  },
  {
    wizardType: 'PARTITION',
    title: 'Property Partition',
    frenchTitle: 'Partage',
    icon: CallSplitIcon,
    duration: '1–2 Months',
    fees: 'Fixed administrative tax + notary adjustments (soulte)',
    description:
      'The division of a jointly-owned titled parcel — most often inherited family land held in indivision — into separate individual lots, each receiving its own Land Certificate. Partition may be amicable (by notarial deed signed by all co-owners) or judicial (ordered by the competent court when the co-owners disagree).',
    steps: [
      'All co-owners (or heirs, with the judgment or notarial act establishing their capacity) agree on the division and sign a partition deed before a Notary — or obtain a partition judgment from the competent court.',
      'A sworn surveyor demarcates each allotted share on the ground and draws up a partition plan approved by the Surveys Department (Cadastre).',
      'The fixed administrative registration tax is paid, together with any notary-computed balancing payments (soultes) where lots are of unequal value.',
      'The Notary deposits the partition deed (or court judgment), the approved plan and the original title at the Land Registry for verification.',
      'The Land Registrar cancels or annotates the original joint title and opens a separate Land Certificate in the name of each co-owner for his or her individual lot.',
    ],
    documents: [
      'The existing joint Land Certificate (Titre Foncier) covering the parcel',
      'Notarized partition deed signed by all co-owners, or the final court partition judgment',
      'Partition survey plan approved by the Surveys Department (Cadastre)',
    ],
    misunderstanding:
      'Heirs commonly believe that a family meeting resolution — even one signed by the family head and witnessed — legally divides the land. It does not. Until the partition is registered, every heir owns only an undivided share of the WHOLE parcel, and none of them can lawfully sell, mortgage or fence off “their” portion.',
  },
  {
    wizardType: 'MORTGAGE',
    title: 'Mortgage Inscription',
    frenchTitle: 'Hypothèque',
    icon: AccountBalanceWalletIcon,
    duration: '3–5 Days',
    fees: '0.5% – 1% of the loan capital secured',
    description:
      'The inscription of a mortgage charge on a titled parcel as security for a loan, governed by the OHADA Uniform Act on Securities (2010). Only registered land (land covered by a Titre Foncier) can be mortgaged in Cameroon, and the charge only takes effect against third parties from the date of its inscription in the Land Register.',
    steps: [
      'The borrower (owner) and the lender sign the mortgage deed (acte d’hypothèque) before a Notary Public, referencing the Land Certificate offered as security.',
      'The mortgage deed is registered at the Taxation Office and the inscription fee (0.5%–1% of the secured capital) is paid.',
      'The Notary or creditor deposits the deed and the title reference at the Land Registry with a request for inscription.',
      'The Land Registrar verifies the borrower’s title and any prior charges, then inscribes the hypothèque against the Land Certificate with its rank (first, second charge, etc.).',
      'A certificate of inscription is delivered to the creditor; upon full repayment of the loan, a release (mainlevée) is signed and the inscription is struck from the Register.',
    ],
    documents: [
      'The Land Certificate (Titre Foncier) of the property offered as security, or its certified copy',
      'Notarized mortgage deed (acte d’hypothèque) signed by borrower and lender',
      'The loan agreement or other evidence of the debt being secured',
    ],
    misunderstanding:
      'Landowners often fear that signing a mortgage transfers their land to the bank. It does not. The owner keeps both the title and possession of the land; the creditor merely acquires the right to have the property sold by court order if the loan is not repaid. Conversely, many are surprised to learn that UNTITLED land cannot be mortgaged at all — banks will not lend against a customary holding.',
  },
];

// ─── Tab panel content for the active track ────────────────────────────────

function StepNumber({ n }: { n: number }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {n}
    </Box>
  );
}

export default function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const track = TRACKS[activeIndex];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="overline" color="text.secondary">
        Republic of Cameroon — Ministry of State Property, Surveys and Land Tenure
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}
      >
        How Registration Works
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 760 }}>
        Cameroonian land law recognises six formal statutory tracks, each with its own
        procedure, timeline and fees. Select the track that matches your situation to see
        exactly what to expect — then start your application online.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Track selector — vertical on desktop, horizontal scrollable on mobile */}
        <Tabs
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          value={activeIndex}
          onChange={(_e, v: number) => setActiveIndex(v)}
          sx={{
            flexShrink: 0,
            minWidth: { md: 260 },
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: { xs: 'divider', md: 'divider' },
            '& .MuiTab-root': {
              alignItems: { md: 'flex-start' },
              textAlign: { md: 'left' },
              textTransform: 'none',
              minHeight: 56,
            },
          }}
        >
          {TRACKS.map((t) => {
            const Icon = t.icon;
            return (
              <Tab
                key={t.wizardType}
                icon={<Icon fontSize="small" />}
                iconPosition="start"
                label={t.title}
              />
            );
          })}
        </Tabs>

        {/* Active track detail */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {track.title}
            </Typography>
            <Typography
              variant="subtitle1"
              color="primary.main"
              gutterBottom
              sx={{ fontStyle: 'italic', fontFamily: "'Lora', serif" }}
            >
              {track.frenchTitle}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {track.description}
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              The Procedure, Step by Step
            </Typography>
            <List disablePadding sx={{ mb: 3 }}>
              {track.steps.map((step, i) => (
                <ListItem key={i} alignItems="flex-start" disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 44, mt: 0.25 }}>
                    <StepNumber n={i + 1} />
                  </ListItemIcon>
                  <ListItemText primary={step} slotProps={{ primary: { variant: 'body2' } }} />
                </ListItem>
              ))}
            </List>

            <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>Common Misunderstanding</AlertTitle>
              {track.misunderstanding}
            </Alert>

            <Button
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(`/apply?type=${track.wizardType}`)}
            >
              Start This Application Online
            </Button>
          </Box>

          {/* Facts sidebar */}
          <Card
            variant="outlined"
            sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0, alignSelf: 'flex-start' }}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                AT A GLANCE
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Typical Duration
                  </Typography>
                  <Chip label={track.duration} size="small" color="primary" variant="outlined" />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, my: 1.5 }}>
                <PaymentsIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Fees
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {track.fees}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
                Document Checklist
              </Typography>
              <List dense disablePadding>
                {track.documents.map((doc, i) => (
                  <ListItem key={i} alignItems="flex-start" disableGutters sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                      <TaskAltIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc}
                      slotProps={{ primary: { variant: 'body2' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{ mt: 5, p: 2.5, bgcolor: 'action.hover', borderStyle: 'dashed' }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Legal note:</strong> the procedures above are governed by Ordinance No. 74-1
          of 6 July 1974, Decree No. 76-165 and Decree No. 76-166 of 27 April 1976 (as amended
          by Decree No. 2005-481 of 16 December 2005), and the OHADA Uniform Act on Securities.
          Durations are administrative estimates and may vary by division. This page is an
          educational summary and does not constitute legal advice.
        </Typography>
      </Paper>
    </Container>
  );
}
