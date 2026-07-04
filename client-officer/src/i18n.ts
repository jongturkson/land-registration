import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Cameroon is bilingual — every officer-facing label ships in EN and FR.
const resources = {
  en: {
    translation: {
      shell: {
        appTitle: 'Land Registry — Officer Portal',
        signOut: 'Sign out',
        nav: {
          dashboard: 'Applications',
          titles: 'Title Registry',
          audit: 'Audit Ledger',
          analytics: 'Analytics',
        },
      },
      common: {
        cancel: 'Cancel',
        confirm: 'Confirm',
        processing: 'Processing…',
        close: 'Close',
        back: '← Back',
        actions: 'Actions',
        status: 'Status',
        loadFailed: 'Failed to load data. Please try again.',
        actionFailed: 'Action failed. Please try again.',
        notes: 'Notes (optional)',
        required: 'This field is required',
      },
      statuses: {
        DRAFT: 'Draft',
        SUBMITTED: 'Submitted',
        RECEIPTED: 'Receipted',
        PUBLISHED: 'Public Notice',
        BOARD_SCHEDULED: 'Board Scheduled',
        SURVEY_ORDERED: 'Survey Ordered',
        SURVEYED: 'Surveyed',
        REGIONAL_REVIEW: 'Regional Review',
        OPPOSITION_WINDOW: 'Opposition Window',
        CLEARED: 'Cleared',
        TITLE_ISSUED: 'Title Issued',
        COMPLETED: 'Registered',
        QUERIED: 'Queried',
        REJECTED: 'Rejected',
      },
      audit: {
        title: 'Cryptographic Audit Ledger',
        subtitle:
          'Digital Livre Foncier — append-only SHA-256 hash chain. Every mutation of the register is chained to the previous entry; any tampering breaks the chain.',
        runCheck: 'Run Cryptographic Integrity Check',
        checking: 'Verifying chain…',
        chainValid: 'CHAIN INTACT',
        chainBroken: 'TAMPERING DETECTED',
        brokenAt: 'Chain broken at block index {{index}}.',
        columns: {
          seq: 'Seq',
          occurredAt: 'Timestamp',
          event: 'Event',
          entity: 'Entity',
          entityId: 'Entity ID',
          actorRole: 'Actor Role',
          payload: 'Payload',
          prevHash: 'Prev Hash',
          selfHash: 'Self Hash',
        },
      },
      titles: {
        title: 'Title Registry (Livre Foncier)',
        subtitle:
          'All valid land certificates — registry consultation. Mutations, mortgages, releases and subdivisions are executed only through citizen applications.',
        readOnlyNote:
          'This register is read-only. Every change (transfer, mortgage, mainlevée, morcellement) must arrive as an application and be executed through the application workflow. The sole direct act is the ministerial cancellation of a title.',
        empty: 'No valid titles in the register yet.',
        columns: {
          titleNo: 'Title No.',
          owner: 'Current Owner',
          division: 'Division',
          area: 'Area',
          issuedAt: 'Issued',
          encumbrances: 'Encumbrances',
        },
        mortgaged: 'MORTGAGED',
        downloadBtn: 'Certificate',
        cancelBtn: 'Cancel Title',
        cancelDialog: {
          title: 'Ministerial Cancellation — Title {{titleNo}}',
          warning:
            'This is an irreversible statutory act. The title will be marked CANCELLED in the register and will fail public verification. The record is preserved — never deleted.',
          body: 'Current owner: {{owner}}. Cancellation of a land title can only follow an order of the Minister of State Property and Land Tenure. Record the ministerial order reference below.',
          orderRef: 'Ministerial order reference',
          reason: 'Grounds / observations (optional)',
          confirmLabel:
            'I confirm I hold the ministerial order directing the cancellation of this title, and I understand this act cannot be undone.',
          submit: 'Cancel This Title',
          success: 'Title {{titleNo}} cancelled and the act appended to the ledger.',
        },
      },
      disputes: {
        cardTitle: 'Oppositions / Disputes',
        cardSubtitle: 'Oppositions filed during the statutory 30-day window',
        none: 'No oppositions have been filed against this application.',
        activeWarning:
          '{{count}} active opposition(s). Title issuance is blocked until each is lifted (mainlevée).',
        filedBy: 'Filed by',
        contact: 'Contact',
        grounds: 'Grounds',
        filedAt: 'Filed on',
        resolvedAt: 'Resolved on',
        resolutionNotes: 'Resolution notes',
        resolveBtn: 'Resolve Dispute',
        resolveDialog: {
          title: 'Resolve Opposition (Mainlevée)',
          body: 'Record how this opposition was settled. Once every active opposition is resolved, the title can be issued.',
          notes: 'Resolution notes',
          outcome: 'Outcome',
          resolved: 'Resolved (mainlevée granted)',
          withdrawn: 'Withdrawn by opponent',
          submit: 'Confirm Resolution',
        },
        issueBlocked: 'Blocked — active opposition(s) must be lifted first',
      },
      analytics: {
        title: 'Registry Analytics',
        subtitle: 'Operational overview of the land registration system',
        kpi: {
          totalApplications: 'Total Applications',
          validTitles: 'Valid Titles',
          activeDisputes: 'Active Disputes',
          titledParcels: 'Titled Parcels Mapped',
        },
        pieTitle: 'Applications by Status',
        mapTitle: 'Registered Parcels (Valid Titles)',
        mapEmpty: 'No titled parcels with geometry to display yet.',
        owner: 'Owner',
        area: 'Area',
      },
    },
  },
  fr: {
    translation: {
      shell: {
        appTitle: 'Registre Foncier — Portail des Agents',
        signOut: 'Déconnexion',
        nav: {
          dashboard: 'Demandes',
          titles: 'Registre des Titres',
          audit: 'Livre d’Audit',
          analytics: 'Analytique',
        },
      },
      common: {
        cancel: 'Annuler',
        confirm: 'Confirmer',
        processing: 'Traitement…',
        close: 'Fermer',
        back: '← Retour',
        actions: 'Actions',
        status: 'Statut',
        loadFailed: 'Échec du chargement des données. Veuillez réessayer.',
        actionFailed: 'L’action a échoué. Veuillez réessayer.',
        notes: 'Notes (facultatif)',
        required: 'Ce champ est obligatoire',
      },
      statuses: {
        DRAFT: 'Brouillon',
        SUBMITTED: 'Soumise',
        RECEIPTED: 'Récépissé délivré',
        PUBLISHED: 'Avis public',
        BOARD_SCHEDULED: 'Commission programmée',
        SURVEY_ORDERED: 'Bornage commandé',
        SURVEYED: 'Bornage effectué',
        REGIONAL_REVIEW: 'Examen régional',
        OPPOSITION_WINDOW: 'Délai d’opposition',
        CLEARED: 'Dossier apuré',
        TITLE_ISSUED: 'Titre délivré',
        COMPLETED: 'Inscrite au registre',
        QUERIED: 'Requête émise',
        REJECTED: 'Rejetée',
      },
      audit: {
        title: 'Livre d’Audit Cryptographique',
        subtitle:
          'Livre Foncier numérique — chaîne de hachage SHA-256 en écriture seule. Chaque mutation du registre est chaînée à l’entrée précédente ; toute falsification rompt la chaîne.',
        runCheck: 'Lancer la Vérification d’Intégrité Cryptographique',
        checking: 'Vérification de la chaîne…',
        chainValid: 'CHAÎNE INTACTE',
        chainBroken: 'FALSIFICATION DÉTECTÉE',
        brokenAt: 'Chaîne rompue au bloc d’indice {{index}}.',
        columns: {
          seq: 'Séq',
          occurredAt: 'Horodatage',
          event: 'Événement',
          entity: 'Entité',
          entityId: 'ID Entité',
          actorRole: 'Rôle de l’acteur',
          payload: 'Données',
          prevHash: 'Hachage préc.',
          selfHash: 'Hachage propre',
        },
      },
      titles: {
        title: 'Registre des Titres (Livre Foncier)',
        subtitle:
          'Tous les titres fonciers valides — consultation du registre. Les mutations, hypothèques, mainlevées et morcellements ne s’exécutent que par voie de demande.',
        readOnlyNote:
          'Ce registre est en consultation seule. Toute modification (mutation, hypothèque, mainlevée, morcellement) doit arriver sous forme de demande et être exécutée par le circuit des demandes. Le seul acte direct est l’annulation ministérielle d’un titre.',
        empty: 'Aucun titre valide dans le registre pour le moment.',
        columns: {
          titleNo: 'N° du Titre',
          owner: 'Propriétaire actuel',
          division: 'Département',
          area: 'Superficie',
          issuedAt: 'Délivré le',
          encumbrances: 'Charges',
        },
        mortgaged: 'HYPOTHÉQUÉ',
        downloadBtn: 'Certificat',
        cancelBtn: 'Annuler le Titre',
        cancelDialog: {
          title: 'Annulation Ministérielle — Titre {{titleNo}}',
          warning:
            'Acte statutaire irréversible. Le titre sera marqué ANNULÉ au registre et échouera à la vérification publique. L’enregistrement est conservé — jamais supprimé.',
          body: 'Propriétaire actuel : {{owner}}. L’annulation d’un titre foncier ne peut résulter que d’un arrêté du Ministre des Domaines, du Cadastre et des Affaires Foncières. Consignez la référence de l’arrêté ci-dessous.',
          orderRef: 'Référence de l’arrêté ministériel',
          reason: 'Motifs / observations (facultatif)',
          confirmLabel:
            'Je confirme détenir l’arrêté ministériel ordonnant l’annulation de ce titre et je comprends que cet acte est irréversible.',
          submit: 'Annuler ce Titre',
          success: 'Titre {{titleNo}} annulé et l’acte ajouté au registre.',
        },
      },
      disputes: {
        cardTitle: 'Oppositions / Litiges',
        cardSubtitle: 'Oppositions déposées pendant le délai légal de 30 jours',
        none: 'Aucune opposition n’a été déposée contre cette demande.',
        activeWarning:
          '{{count}} opposition(s) active(s). La délivrance du titre est bloquée jusqu’à mainlevée de chacune.',
        filedBy: 'Déposée par',
        contact: 'Contact',
        grounds: 'Motifs',
        filedAt: 'Déposée le',
        resolvedAt: 'Résolue le',
        resolutionNotes: 'Notes de résolution',
        resolveBtn: 'Résoudre le Litige',
        resolveDialog: {
          title: 'Résoudre l’Opposition (Mainlevée)',
          body: 'Consignez la manière dont cette opposition a été réglée. Une fois toutes les oppositions actives résolues, le titre pourra être délivré.',
          notes: 'Notes de résolution',
          outcome: 'Issue',
          resolved: 'Résolue (mainlevée accordée)',
          withdrawn: 'Retirée par l’opposant',
          submit: 'Confirmer la Résolution',
        },
        issueBlocked: 'Bloqué — mainlevée requise sur les oppositions actives',
      },
      analytics: {
        title: 'Analytique du Registre',
        subtitle: 'Vue opérationnelle du système d’immatriculation foncière',
        kpi: {
          totalApplications: 'Total des Demandes',
          validTitles: 'Titres Valides',
          activeDisputes: 'Litiges Actifs',
          titledParcels: 'Parcelles Titrées Cartographiées',
        },
        pieTitle: 'Demandes par Statut',
        mapTitle: 'Parcelles Immatriculées (Titres Valides)',
        mapEmpty: 'Aucune parcelle titrée avec géométrie à afficher pour le moment.',
        owner: 'Propriétaire',
        area: 'Superficie',
      },
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
