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
import { useTranslation } from 'react-i18next';
import type { AppTypeValue } from '../schemas/wizard.schema';

// ─── SDD 8.2 — The six formal statutory tracks of the Cameroonian land regime ──
// Legal basis: Ordinance No. 74-1 of 6 July 1974 governing land tenure;
// Decree No. 76-165 of 27 April 1976 (as amended by Decree No. 2005-481 of
// 16 December 2005) on conditions for obtaining land certificates; Decree
// No. 76-166 of 27 April 1976 on the management of national lands; and the
// OHADA Uniform Act on Securities (2010) for mortgage inscriptions.
//
// The long-form legal content is kept bilingual inline (rather than in
// i18n.ts) so each track's EN and FR versions stay side by side.

interface Bi {
  en: string;
  fr: string;
}

interface RegistrationTrack {
  wizardType: AppTypeValue;
  title: Bi;
  frenchTitle: string; // statutory French name — shown as-is in both languages
  icon: SvgIconComponent;
  duration: Bi;
  fees: Bi;
  description: Bi;
  steps: Bi[];
  documents: Bi[];
  misunderstanding: Bi;
}

const TRACKS: RegistrationTrack[] = [
  {
    wizardType: 'DIRECT_REGISTRATION',
    title: { en: 'Direct Registration', fr: 'Immatriculation Directe' },
    frenchTitle: 'Immatriculation Directe',
    icon: AppRegistrationIcon,
    duration: { en: '~6 Months', fr: '~6 mois' },
    fees: {
      en: 'Survey fees + administrative stamps',
      fr: 'Frais de bornage + timbres administratifs',
    },
    description: {
      en: 'The first-time registration of unregistered land. Under Ordinance No. 74-1 of 6 July 1974 and Decree No. 76-165 of 27 April 1976, persons and customary communities who peacefully occupied or exploited land before 5 August 1974 may apply to convert that occupation into a full Land Certificate (Titre Foncier) — the only legal proof of land ownership in Cameroon.',
      fr: 'La première immatriculation d’un terrain non encore enregistré. En vertu de l’Ordonnance n° 74-1 du 6 juillet 1974 et du Décret n° 76-165 du 27 avril 1976, les personnes et communautés coutumières qui occupaient ou exploitaient paisiblement un terrain avant le 5 août 1974 peuvent demander la transformation de cette occupation en un véritable Titre Foncier — seule preuve légale de la propriété foncière au Cameroun.',
    },
    steps: [
      {
        en: 'File the application (Demande d’Immatriculation) in the prescribed form with the Sub-Divisional Officer (Sous-Préfet) of the area where the land is situated.',
        fr: 'Déposer la Demande d’Immatriculation, sur le formulaire prescrit, auprès du Sous-Préfet de la localité où se trouve le terrain.',
      },
      {
        en: 'The Consultative Board (Commission Consultative), chaired by the Sub-Divisional Officer, visits the land to verify effective occupation and development (mise en valeur) prior to 5 August 1974.',
        fr: 'La Commission Consultative, présidée par le Sous-Préfet, se rend sur le terrain pour constater l’occupation effective et la mise en valeur antérieures au 5 août 1974.',
      },
      {
        en: 'A sworn government surveyor demarcates the boundaries, plants boundary marks, and draws up the official site plan approved by the Surveys Department (Cadastre).',
        fr: 'Un géomètre assermenté procède au bornage, implante les bornes et dresse le plan officiel approuvé par le Cadastre.',
      },
      {
        en: 'An extract of the application is published in the official bulletin, opening the statutory 30-day period during which any interested party may lodge an opposition or a demand for inscription of right.',
        fr: 'Un extrait de la demande est publié au bulletin officiel, ouvrant le délai légal de 30 jours pendant lequel toute personne intéressée peut former opposition ou demander l’inscription d’un droit.',
      },
      {
        en: 'If no opposition is sustained, the Land Registrar (Conservateur Foncier) registers the parcel in the Land Register and issues the Land Certificate in the applicant’s name.',
        fr: 'Si aucune opposition n’est retenue, le Conservateur Foncier inscrit la parcelle au Livre Foncier et délivre le Titre Foncier au nom du demandeur.',
      },
    ],
    documents: [
      {
        en: 'Certified copy of the applicant’s National Identity Card (or Certificate of Incorporation for legal entities)',
        fr: 'Copie certifiée de la Carte Nationale d’Identité du demandeur (ou du certificat d’immatriculation pour les personnes morales)',
      },
      {
        en: 'Sketch / site plan (croquis) of the parcel showing its boundaries and neighbours',
        fr: 'Croquis / plan de situation de la parcelle indiquant ses limites et ses voisins',
      },
      {
        en: 'Proof of occupation or development before 5 August 1974 (attestation of the traditional authority, land tax receipts, evidence of buildings, crops or other mise en valeur)',
        fr: 'Preuve de l’occupation ou de la mise en valeur avant le 5 août 1974 (attestation de l’autorité traditionnelle, quittances d’impôt foncier, preuves de constructions, cultures ou autre mise en valeur)',
      },
    ],
    misunderstanding: {
      en: 'Many citizens believe a customary “sale agreement” or a chief’s attestation is itself proof of ownership. It is not. Since the 1974 Ordinance, only the Land Certificate confers legal ownership — customary occupation merely gives you the right to APPLY for registration, and unregistered land remains national land administered by the State.',
      fr: 'Beaucoup de citoyens croient qu’un « acte de vente » coutumier ou une attestation de chef vaut preuve de propriété. C’est faux. Depuis l’Ordonnance de 1974, seul le Titre Foncier confère la propriété légale — l’occupation coutumière donne uniquement le droit de DEMANDER l’immatriculation, et le terrain non immatriculé demeure une dépendance du domaine national géré par l’État.',
    },
  },
  {
    wizardType: 'PARTIAL_ALIENATION',
    title: { en: 'Partial Alienation / Subdivision', fr: 'Aliénation Partielle / Morcellement' },
    frenchTitle: 'Morcellement',
    icon: ContentCutIcon,
    duration: { en: '~1 Month', fr: '~1 mois' },
    fees: {
      en: '~15% of asset value (registration duties, notary fees, mutation taxes)',
      fr: '~15 % de la valeur du bien (droits d’enregistrement, frais de notaire, taxes de mutation)',
    },
    description: {
      en: 'The sale or transfer of a portion of an already-titled parcel. The mother title is “morcelé” (split): the severed portion is excised, given its own survey plan, and registered as a brand-new Land Certificate in the buyer’s name, while the remainder stays on the seller’s annotated title.',
      fr: 'La vente ou le transfert d’une portion d’une parcelle déjà titrée. Le titre mère est morcelé : la portion détachée est distraite, dotée de son propre plan de bornage et enregistrée comme un nouveau Titre Foncier au nom de l’acquéreur, tandis que le reste demeure sur le titre annoté du vendeur.',
    },
    steps: [
      {
        en: 'The parties appear before a Notary Public, who drafts the authentic deed of partial transfer (acte de vente partielle) — private agreements cannot transfer titled land.',
        fr: 'Les parties se présentent devant un Notaire, qui dresse l’acte authentique de vente partielle — les actes sous seing privé ne peuvent pas transférer un terrain titré.',
      },
      {
        en: 'A sworn surveyor demarcates the portion sold and produces a subdivision plan (plan de morcellement) which must be checked and approved by the Surveys Department (Cadastre).',
        fr: 'Un géomètre assermenté délimite la portion vendue et établit un plan de morcellement qui doit être vérifié et approuvé par le Cadastre.',
      },
      {
        en: 'Registration duties and mutation taxes (cumulatively about 15% of the declared value) are assessed and paid at the Taxation Office, and the deed is registered.',
        fr: 'Les droits d’enregistrement et taxes de mutation (environ 15 % cumulés de la valeur déclarée) sont liquidés et payés au Centre des Impôts, et l’acte est enregistré.',
      },
      {
        en: 'The Notary deposits the complete file at the Land Registry, where the Registrar verifies it against the mother title and any inscribed charges or oppositions.',
        fr: 'Le Notaire dépose le dossier complet à la Conservation Foncière, où le Conservateur le vérifie par rapport au titre mère et aux charges ou oppositions inscrites.',
      },
      {
        en: 'The Land Registrar excises the portion from the mother title, opens a new Land Certificate in the buyer’s name, and annotates the reduced area on the seller’s title.',
        fr: 'Le Conservateur Foncier distrait la portion du titre mère, ouvre un nouveau Titre Foncier au nom de l’acquéreur et annote la superficie réduite sur le titre du vendeur.',
      },
    ],
    documents: [
      {
        en: 'Certified copy of the mother Land Certificate (Titre Foncier) of the seller',
        fr: 'Copie certifiée du Titre Foncier mère du vendeur',
      },
      {
        en: 'Notarized deed of partial transfer (acte notarié de vente partielle)',
        fr: 'Acte notarié de vente partielle',
      },
      {
        en: 'Subdivision survey plan approved by the Surveys Department (Cadastre)',
        fr: 'Plan de morcellement approuvé par le Cadastre',
      },
    ],
    misunderstanding: {
      en: 'The public commonly assumes that a private sale agreement signed before witnesses — or even stamped by a local authority — transfers the portion of land. Under Cameroonian law, any transaction on titled land is VOID unless it is established by notarial deed and entered in the Land Register. Until the new certificate is created, the buyer owns nothing.',
      fr: 'Le public croit souvent qu’un acte de vente sous seing privé signé devant témoins — même visé par une autorité locale — transfère la portion de terrain. En droit camerounais, toute transaction sur un terrain titré est NULLE si elle n’est pas constatée par acte notarié et inscrite au Livre Foncier. Tant que le nouveau titre n’est pas créé, l’acquéreur ne possède rien.',
    },
  },
  {
    wizardType: 'TOTAL_ALIENATION',
    title: { en: 'Total Alienation / Transfer', fr: 'Aliénation Totale / Mutation' },
    frenchTitle: 'Mutation Totale',
    icon: SwapHorizIcon,
    duration: { en: '2–3 Weeks', fr: '2–3 semaines' },
    fees: {
      en: '15% cumulative transfer rate on the declared value',
      fr: '15 % de droits cumulés de mutation sur la valeur déclarée',
    },
    description: {
      en: 'The transfer of an entire titled parcel from one owner to another — by sale, gift or exchange. No new title is created: the existing Land Certificate is “muted”, meaning the Land Register entry is updated to record the new owner. It is the fastest transaction on titled land because the parcel’s boundaries and survey are already established.',
      fr: 'Le transfert d’une parcelle titrée entière d’un propriétaire à un autre — par vente, donation ou échange. Aucun nouveau titre n’est créé : le Titre Foncier existant est « muté », c’est-à-dire que l’inscription au Livre Foncier est mise à jour au nom du nouveau propriétaire. C’est la transaction la plus rapide sur terrain titré, car les limites et le bornage de la parcelle sont déjà établis.',
    },
    steps: [
      {
        en: 'Seller and buyer appear before a Notary Public, who verifies the seller’s title and drafts the authentic deed of total transfer (acte de vente).',
        fr: 'Vendeur et acquéreur se présentent devant un Notaire, qui vérifie le titre du vendeur et dresse l’acte authentique de vente.',
      },
      {
        en: 'The deed is registered at the Taxation Office and the cumulative transfer duties (registration duty, stamp duty and related taxes totalling about 15%) are paid.',
        fr: 'L’acte est enregistré au Centre des Impôts et les droits cumulés de mutation (droit d’enregistrement, timbre et taxes connexes, environ 15 %) sont payés.',
      },
      {
        en: 'The Notary transmits the registered deed and the complete transfer file to the competent Land Registry (Conservation Foncière).',
        fr: 'Le Notaire transmet l’acte enregistré et le dossier complet de mutation à la Conservation Foncière compétente.',
      },
      {
        en: 'The Land Registrar verifies the authenticity of the title and checks for inscribed mortgages, seizures or oppositions that could block the transfer.',
        fr: 'Le Conservateur Foncier vérifie l’authenticité du titre et recherche les hypothèques, saisies ou oppositions inscrites susceptibles de bloquer la mutation.',
      },
      {
        en: 'The mutation is entered in the Land Register: the certificate record now bears the buyer’s name, and an updated copy (duplicatum) is issued to the new owner.',
        fr: 'La mutation est inscrite au Livre Foncier : le titre porte désormais le nom de l’acquéreur et un duplicatum à jour est remis au nouveau propriétaire.',
      },
    ],
    documents: [
      {
        en: 'The seller’s Land Certificate (Titre Foncier) or certified copy thereof',
        fr: 'Le Titre Foncier du vendeur ou sa copie certifiée',
      },
      {
        en: 'Notarized deed of sale / transfer (acte de vente notarié) signed by both parties',
        fr: 'Acte de vente notarié signé par les deux parties',
      },
      {
        en: 'Receipt of payment of the transfer duties issued by the Taxation Office',
        fr: 'Quittance de paiement des droits de mutation délivrée par le Centre des Impôts',
      },
    ],
    misunderstanding: {
      en: 'Buyers often believe that physically holding the seller’s title document — or paying the full price — makes them the owner. It does not. Ownership passes only at the moment the mutation is entered in the Land Register by the Conservateur Foncier. A seller who still appears in the Register can legally sell the same land twice; the registered buyer always wins.',
      fr: 'Les acquéreurs croient souvent que détenir physiquement le titre du vendeur — ou avoir payé l’intégralité du prix — les rend propriétaires. C’est faux. La propriété n’est transférée qu’au moment où la mutation est inscrite au Livre Foncier par le Conservateur Foncier. Un vendeur qui figure encore au Livre peut légalement vendre deux fois le même terrain ; l’acquéreur inscrit l’emporte toujours.',
    },
  },
  {
    wizardType: 'STATE_LAND',
    title: { en: 'State Land Concession', fr: 'Concession de Terres Domaniales' },
    frenchTitle: 'Concession de Terres Domaniales',
    icon: AccountBalanceIcon,
    duration: { en: '12–24 Months', fr: '12–24 mois' },
    fees: {
      en: 'Annual lease rent assessed per square metre',
      fr: 'Redevance annuelle calculée au mètre carré',
    },
    description: {
      en: 'The allocation of unoccupied national land by the State under Decree No. 76-166 of 27 April 1976. The applicant first receives a provisional concession (maximum 5 years) conditioned on a development project; only after the promised development (mise en valeur) is verified can the land be converted into a definitive grant or long lease.',
      fr: 'L’attribution par l’État de dépendances non occupées du domaine national, en vertu du Décret n° 76-166 du 27 avril 1976. Le demandeur reçoit d’abord une concession provisoire (5 ans maximum) conditionnée à un projet de mise en valeur ; ce n’est qu’après vérification de la mise en valeur promise que le terrain peut être converti en concession définitive ou en bail emphytéotique.',
    },
    steps: [
      {
        en: 'Submit an application to the local Lands Service (Service des Domaines), accompanied by a detailed development / investment project for the parcel requested.',
        fr: 'Déposer une demande auprès du Service des Domaines local, accompagnée d’un projet détaillé de mise en valeur / d’investissement pour la parcelle sollicitée.',
      },
      {
        en: 'The Consultative Board inspects the land, confirms it is free of prior claims, and forwards a reasoned report through the Senior Divisional Officer to the Ministry in charge of Lands.',
        fr: 'La Commission Consultative inspecte le terrain, confirme qu’il est libre de toute revendication antérieure et transmet un rapport motivé, par la voie du Préfet, au Ministère chargé des Domaines.',
      },
      {
        en: 'A provisional concession is granted — by order of the Minister for areas up to 50 hectares, or by Presidential decree for areas above 50 hectares — for a maximum of five years.',
        fr: 'Une concession provisoire est accordée — par arrêté du Ministre pour les superficies jusqu’à 50 hectares, ou par décret présidentiel au-delà de 50 hectares — pour une durée maximale de cinq ans.',
      },
      {
        en: 'The concessionaire develops the land as promised and pays the annual rent; at term, the Consultative Board returns to verify that the mise en valeur has actually been carried out.',
        fr: 'Le concessionnaire met le terrain en valeur comme promis et paie la redevance annuelle ; au terme, la Commission Consultative revient vérifier que la mise en valeur a réellement été réalisée.',
      },
      {
        en: 'Upon a favourable verification report, the provisional concession is converted into a definitive grant or long lease, which is then registered with the Land Registrar.',
        fr: 'Sur rapport de vérification favorable, la concession provisoire est convertie en concession définitive ou en bail emphytéotique, ensuite enregistré auprès du Conservateur Foncier.',
      },
    ],
    documents: [
      {
        en: 'Completed application form with proof of identity (National ID Card, or Articles of Incorporation for companies)',
        fr: 'Formulaire de demande rempli avec justificatif d’identité (CNI, ou statuts pour les sociétés)',
      },
      {
        en: 'Site plan / sketch identifying the parcel of national land requested',
        fr: 'Plan de situation / croquis identifiant la parcelle du domaine national sollicitée',
      },
      {
        en: 'Detailed development programme (programme de mise en valeur) with evidence of financial capacity',
        fr: 'Programme détaillé de mise en valeur avec preuves de capacité financière',
      },
    ],
    misunderstanding: {
      en: 'Applicants frequently assume that paying the annual rent makes the land permanently theirs. A provisional concession is strictly conditional: if the promised development is not carried out within the deadline, the State withdraws the concession WITHOUT compensation for the rent already paid. Ownership only ever arises from the definitive grant and its registration.',
      fr: 'Les demandeurs supposent souvent que payer la redevance annuelle rend le terrain définitivement leur. Une concession provisoire est strictement conditionnelle : si la mise en valeur promise n’est pas réalisée dans le délai, l’État retire la concession SANS remboursement des redevances déjà payées. La propriété ne naît que de la concession définitive et de son enregistrement.',
    },
  },
  {
    wizardType: 'PARTITION',
    title: { en: 'Property Partition', fr: 'Partage de Propriété' },
    frenchTitle: 'Partage',
    icon: CallSplitIcon,
    duration: { en: '1–2 Months', fr: '1–2 mois' },
    fees: {
      en: 'Fixed administrative tax + notary adjustments (soulte)',
      fr: 'Taxe administrative fixe + soultes calculées par le notaire',
    },
    description: {
      en: 'The division of a jointly-owned titled parcel — most often inherited family land held in indivision — into separate individual lots, each receiving its own Land Certificate. Partition may be amicable (by notarial deed signed by all co-owners) or judicial (ordered by the competent court when the co-owners disagree).',
      fr: 'La division d’une parcelle titrée détenue en copropriété — le plus souvent un terrain familial hérité en indivision — en lots individuels distincts, chacun recevant son propre Titre Foncier. Le partage peut être amiable (par acte notarié signé de tous les indivisaires) ou judiciaire (ordonné par le tribunal compétent en cas de désaccord).',
    },
    steps: [
      {
        en: 'All co-owners (or heirs, with the judgment or notarial act establishing their capacity) agree on the division and sign a partition deed before a Notary — or obtain a partition judgment from the competent court.',
        fr: 'Tous les indivisaires (ou héritiers, munis du jugement ou de l’acte notarié établissant leur qualité) s’accordent sur la division et signent un acte de partage devant Notaire — ou obtiennent un jugement de partage du tribunal compétent.',
      },
      {
        en: 'A sworn surveyor demarcates each allotted share on the ground and draws up a partition plan approved by the Surveys Department (Cadastre).',
        fr: 'Un géomètre assermenté délimite chaque lot attribué sur le terrain et dresse un plan de partage approuvé par le Cadastre.',
      },
      {
        en: 'The fixed administrative registration tax is paid, together with any notary-computed balancing payments (soultes) where lots are of unequal value.',
        fr: 'La taxe administrative fixe d’enregistrement est payée, ainsi que les éventuelles soultes calculées par le notaire lorsque les lots sont de valeur inégale.',
      },
      {
        en: 'The Notary deposits the partition deed (or court judgment), the approved plan and the original title at the Land Registry for verification.',
        fr: 'Le Notaire dépose l’acte de partage (ou le jugement), le plan approuvé et le titre original à la Conservation Foncière pour vérification.',
      },
      {
        en: 'The Land Registrar cancels or annotates the original joint title and opens a separate Land Certificate in the name of each co-owner for his or her individual lot.',
        fr: 'Le Conservateur Foncier annule ou annote le titre indivis d’origine et ouvre un Titre Foncier distinct au nom de chaque indivisaire pour son lot individuel.',
      },
    ],
    documents: [
      {
        en: 'The existing joint Land Certificate (Titre Foncier) covering the parcel',
        fr: 'Le Titre Foncier indivis existant couvrant la parcelle',
      },
      {
        en: 'Notarized partition deed signed by all co-owners, or the final court partition judgment',
        fr: 'Acte de partage notarié signé de tous les indivisaires, ou jugement définitif de partage',
      },
      {
        en: 'Partition survey plan approved by the Surveys Department (Cadastre)',
        fr: 'Plan de partage approuvé par le Cadastre',
      },
    ],
    misunderstanding: {
      en: 'Heirs commonly believe that a family meeting resolution — even one signed by the family head and witnessed — legally divides the land. It does not. Until the partition is registered, every heir owns only an undivided share of the WHOLE parcel, and none of them can lawfully sell, mortgage or fence off “their” portion.',
      fr: 'Les héritiers croient souvent qu’une résolution de conseil de famille — même signée par le chef de famille devant témoins — divise légalement le terrain. C’est faux. Tant que le partage n’est pas enregistré, chaque héritier ne possède qu’une quote-part indivise de TOUTE la parcelle, et aucun ne peut légalement vendre, hypothéquer ou clôturer « sa » portion.',
    },
  },
  {
    wizardType: 'MORTGAGE',
    title: { en: 'Mortgage Inscription', fr: 'Inscription d’Hypothèque' },
    frenchTitle: 'Hypothèque',
    icon: AccountBalanceWalletIcon,
    duration: { en: '3–5 Days', fr: '3–5 jours' },
    fees: {
      en: '0.5% – 1% of the loan capital secured',
      fr: '0,5 % – 1 % du capital garanti',
    },
    description: {
      en: 'The inscription of a mortgage charge on a titled parcel as security for a loan, governed by the OHADA Uniform Act on Securities (2010). Only registered land (land covered by a Titre Foncier) can be mortgaged in Cameroon, and the charge only takes effect against third parties from the date of its inscription in the Land Register.',
      fr: 'L’inscription d’une hypothèque sur une parcelle titrée en garantie d’un prêt, régie par l’Acte Uniforme OHADA sur les Sûretés (2010). Seuls les terrains immatriculés (couverts par un Titre Foncier) peuvent être hypothéqués au Cameroun, et la sûreté n’est opposable aux tiers qu’à compter de son inscription au Livre Foncier.',
    },
    steps: [
      {
        en: 'The borrower (owner) and the lender sign the mortgage deed (acte d’hypothèque) before a Notary Public, referencing the Land Certificate offered as security.',
        fr: 'L’emprunteur (propriétaire) et le prêteur signent l’acte d’hypothèque devant Notaire, en référence au Titre Foncier offert en garantie.',
      },
      {
        en: 'The mortgage deed is registered at the Taxation Office and the inscription fee (0.5%–1% of the secured capital) is paid.',
        fr: 'L’acte d’hypothèque est enregistré au Centre des Impôts et les frais d’inscription (0,5 %–1 % du capital garanti) sont payés.',
      },
      {
        en: 'The Notary or creditor deposits the deed and the title reference at the Land Registry with a request for inscription.',
        fr: 'Le Notaire ou le créancier dépose l’acte et la référence du titre à la Conservation Foncière avec une réquisition d’inscription.',
      },
      {
        en: 'The Land Registrar verifies the borrower’s title and any prior charges, then inscribes the hypothèque against the Land Certificate with its rank (first, second charge, etc.).',
        fr: 'Le Conservateur Foncier vérifie le titre de l’emprunteur et les charges antérieures, puis inscrit l’hypothèque sur le Titre Foncier avec son rang (premier, deuxième rang, etc.).',
      },
      {
        en: 'A certificate of inscription is delivered to the creditor; upon full repayment of the loan, a release (mainlevée) is signed and the inscription is struck from the Register.',
        fr: 'Un certificat d’inscription est remis au créancier ; au remboursement intégral du prêt, une mainlevée est signée et l’inscription est radiée du Livre.',
      },
    ],
    documents: [
      {
        en: 'The Land Certificate (Titre Foncier) of the property offered as security, or its certified copy',
        fr: 'Le Titre Foncier du bien offert en garantie, ou sa copie certifiée',
      },
      {
        en: 'Notarized mortgage deed (acte d’hypothèque) signed by borrower and lender',
        fr: 'Acte d’hypothèque notarié signé par l’emprunteur et le prêteur',
      },
      {
        en: 'The loan agreement or other evidence of the debt being secured',
        fr: 'La convention de prêt ou toute autre preuve de la créance garantie',
      },
    ],
    misunderstanding: {
      en: 'Landowners often fear that signing a mortgage transfers their land to the bank. It does not. The owner keeps both the title and possession of the land; the creditor merely acquires the right to have the property sold by court order if the loan is not repaid. Conversely, many are surprised to learn that UNTITLED land cannot be mortgaged at all — banks will not lend against a customary holding.',
      fr: 'Les propriétaires craignent souvent que signer une hypothèque transfère leur terrain à la banque. C’est faux. Le propriétaire conserve le titre et la possession du terrain ; le créancier acquiert seulement le droit de faire vendre le bien par décision de justice si le prêt n’est pas remboursé. À l’inverse, beaucoup découvrent avec surprise qu’un terrain NON TITRÉ ne peut pas du tout être hypothéqué — les banques ne prêtent pas sur une possession coutumière.',
    },
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
  const { t, i18n } = useTranslation();

  // Picks the current language's variant of a bilingual string
  const L = (v: Bi) => (i18n.language.startsWith('fr') ? v.fr : v.en);

  const track = TRACKS[activeIndex];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        {t('how.overline')}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: { xs: '1.7rem', md: '2.1rem' } }}
      >
        {t('how.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 760 }}>
        {t('how.subtitle')}
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
          {TRACKS.map((tr) => {
            const Icon = tr.icon;
            return (
              <Tab
                key={tr.wizardType}
                icon={<Icon fontSize="small" />}
                iconPosition="start"
                label={L(tr.title)}
              />
            );
          })}
        </Tabs>

        {/* Active track detail */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {L(track.title)}
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
              {L(track.description)}
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {t('how.procedure')}
            </Typography>
            <List disablePadding sx={{ mb: 3 }}>
              {track.steps.map((step, i) => (
                <ListItem key={i} alignItems="flex-start" disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 44, mt: 0.25 }}>
                    <StepNumber n={i + 1} />
                  </ListItemIcon>
                  <ListItemText primary={L(step)} slotProps={{ primary: { variant: 'body2' } }} />
                </ListItem>
              ))}
            </List>

            <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>{t('how.misunderstanding')}</AlertTitle>
              {L(track.misunderstanding)}
            </Alert>

            <Button
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(`/apply?type=${track.wizardType}`)}
            >
              {t('how.startCta')}
            </Button>
          </Box>

          {/* Facts sidebar */}
          <Card
            variant="outlined"
            sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0, alignSelf: 'flex-start' }}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('how.atAGlance')}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('how.duration')}
                  </Typography>
                  <Chip label={L(track.duration)} size="small" color="primary" variant="outlined" />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, my: 1.5 }}>
                <PaymentsIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('how.fees')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {L(track.fees)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
                {t('how.checklist')}
              </Typography>
              <List dense disablePadding>
                {track.documents.map((doc, i) => (
                  <ListItem key={i} alignItems="flex-start" disableGutters sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                      <TaskAltIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={L(doc)}
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
          {t('how.legalNote')}
        </Typography>
      </Paper>
    </Container>
  );
}
