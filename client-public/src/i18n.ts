import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Cameroon is bilingual (EN/FR) — citizens pick the language they understand best.
const resources = {
  en: {
    translation: {
      nav: {
        brand: 'Land Registration Portal',
        howItWorks: 'How It Works',
        verify: 'Verify Title',
        bulletin: 'Public Bulletin',
        myApplications: 'My Applications',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        register: 'Register',
      },
      welcome: {
        title: 'Land Registration Portal',
        republic: 'Republic of Cameroon',
        registry: 'Divisional Registry, Buea — South West Region',
        pitch:
          'Apply for your Titre Foncier online. Submit your pre-application, upload supporting documents, and receive a Récépissé — all from your device.',
        continueApplication: 'Continue My Application',
        createAccount: 'Create Account',
        signIn: 'Sign In',
        track: 'Track Application',
        featuresTitle: 'Everything you need to register your land title',
        features: {
          preApp: {
            title: 'Online Pre-Application',
            desc: 'Fill your Demande de Titre Foncier from home, step by step, in both languages.',
          },
          gps: {
            title: 'GPS Land Location',
            desc: "Pin your land's exact coordinates on an interactive map of the Fako Division.",
          },
          receipt: {
            title: 'Instant Récépissé',
            desc: 'Receive your reference number immediately upon submission — no queuing required.',
          },
          trackFeat: {
            title: 'Track Your Application',
            desc: 'Check your application status at any time using your Récépissé reference number.',
          },
        },
        howTitle: 'How it works',
        steps: {
          one: 'Create a free account with your name and email.',
          two: 'Fill in the 5-step pre-application wizard.',
          three: 'Receive your Récépissé reference number instantly.',
          four: 'Present the receipt at the Divisional Registry, Buea.',
        },
        getStarted: "Get Started — It's Free",
        footer:
          '© {{year}} Republic of Cameroon — Ministry of State Property, Surveys and Land Tenure',
      },
      bulletin: {
        overline: 'Republic of Cameroon — Divisional Registry, Buea',
        title: 'Public Digital Bulletin',
        subtitle: 'Bulletin des Avis Fonciers',
        windowTitle: '30-Day Opposition Window',
        windowBody:
          "Each notice below opens a statutory 30-day period, counted from its publication date, during which any interested party may lodge a formal opposition or a demand for inscription of right against the parcel concerned. You may file your opposition online using the button on the notice, or in person at the Divisional Registry office before the window closes — claims received after this deadline will not be considered.",
        published: 'Published',
        loadError: 'Unable to load the bulletin right now. Please try again shortly.',
        empty: 'No notices have been published yet.',
        fileOpposition: 'File Opposition',
        windowClosed: 'Opposition window closed',
        notice: {
          claimant: 'Claimant (requérant)',
          type: 'Application type',
          location: 'Location',
          locality: 'Locality (lieu-dit)',
          plot: 'Plot No.',
          block: 'Block No.',
          area: 'Area',
          nature: 'Nature of property',
          boundaries: 'Boundaries (limites)',
          north: 'North',
          south: 'South',
          east: 'East',
          west: 'West',
          types: {
            DIRECT_REGISTRATION: 'Direct Registration',
            PARTIAL_ALIENATION: 'Partial Alienation (Subdivision)',
            TOTAL_ALIENATION: 'Total Alienation (Transfer)',
            STATE_LAND: 'State Land Concession',
            PARTITION: 'Partition',
            MORTGAGE: 'Mortgage',
            TRANSFORMATION: 'Transformation',
          },
        },
        oppositionDialog: {
          title: 'File an Opposition — {{reference}}',
          body: 'Your opposition will be registered against this application and reviewed by the Land Registrar (Conservateur Foncier). Title issuance is blocked until your opposition is examined and lifted. Knowingly filing a false claim is punishable by law.',
          name: 'Your full name',
          contact: 'Contact (phone or email)',
          grounds: 'Grounds for opposition — describe your claim to this land',
          groundsHelp: 'At least 10 characters. Be specific: nature of your right, boundaries concerned, supporting documents you hold.',
          submit: 'Submit Opposition',
          submitting: 'Submitting…',
          success:
            'Your opposition has been filed. The application is blocked from title issuance until the Registrar examines your claim. Keep the reference number for follow-up.',
          cancel: 'Cancel',
        },
      },
    },
  },
  fr: {
    translation: {
      nav: {
        brand: 'Portail d’Immatriculation Foncière',
        howItWorks: 'Comment Ça Marche',
        verify: 'Vérifier un Titre',
        bulletin: 'Bulletin Public',
        myApplications: 'Mes Demandes',
        signIn: 'Connexion',
        signOut: 'Déconnexion',
        register: 'S’inscrire',
      },
      welcome: {
        title: 'Portail d’Immatriculation Foncière',
        republic: 'République du Cameroun',
        registry: 'Conservation Foncière Départementale, Buea — Région du Sud-Ouest',
        pitch:
          'Demandez votre Titre Foncier en ligne. Soumettez votre pré-demande, téléversez vos pièces justificatives et recevez un Récépissé — le tout depuis votre appareil.',
        continueApplication: 'Poursuivre ma Demande',
        createAccount: 'Créer un Compte',
        signIn: 'Connexion',
        track: 'Suivre ma Demande',
        featuresTitle: 'Tout ce qu’il faut pour immatriculer votre terrain',
        features: {
          preApp: {
            title: 'Pré-demande en Ligne',
            desc: 'Remplissez votre Demande de Titre Foncier depuis chez vous, étape par étape, dans les deux langues.',
          },
          gps: {
            title: 'Localisation GPS du Terrain',
            desc: 'Placez les coordonnées exactes de votre terrain sur une carte interactive du Département du Fako.',
          },
          receipt: {
            title: 'Récépissé Instantané',
            desc: 'Recevez votre numéro de référence dès la soumission — sans file d’attente.',
          },
          trackFeat: {
            title: 'Suivi de votre Demande',
            desc: 'Consultez l’état de votre demande à tout moment grâce au numéro de votre Récépissé.',
          },
        },
        howTitle: 'Comment ça marche',
        steps: {
          one: 'Créez un compte gratuit avec votre nom et votre e-mail.',
          two: 'Remplissez l’assistant de pré-demande en 5 étapes.',
          three: 'Recevez immédiatement le numéro de référence de votre Récépissé.',
          four: 'Présentez le récépissé à la Conservation Foncière de Buea.',
        },
        getStarted: 'Commencer — C’est Gratuit',
        footer:
          '© {{year}} République du Cameroun — Ministère des Domaines, du Cadastre et des Affaires Foncières',
      },
      bulletin: {
        overline: 'République du Cameroun — Conservation Foncière Départementale, Buea',
        title: 'Bulletin Numérique Public',
        subtitle: 'Bulletin des Avis Fonciers',
        windowTitle: 'Délai d’Opposition de 30 Jours',
        windowBody:
          'Chaque avis ci-dessous ouvre un délai légal de 30 jours, compté à partir de sa date de publication, pendant lequel toute personne intéressée peut former une opposition ou une demande d’inscription de droit contre la parcelle concernée. Vous pouvez déposer votre opposition en ligne via le bouton de l’avis, ou en personne au bureau de la Conservation Foncière avant l’expiration du délai — les réclamations reçues après cette échéance ne seront pas prises en compte.',
        published: 'Publié le',
        loadError: 'Impossible de charger le bulletin pour le moment. Veuillez réessayer sous peu.',
        empty: 'Aucun avis n’a encore été publié.',
        fileOpposition: 'Former une Opposition',
        windowClosed: 'Délai d’opposition expiré',
        notice: {
          claimant: 'Requérant',
          type: 'Type de demande',
          location: 'Localisation',
          locality: 'Lieu-dit',
          plot: 'N° de lot',
          block: 'N° de bloc',
          area: 'Superficie',
          nature: 'Nature de l’immeuble',
          boundaries: 'Limites',
          north: 'Nord',
          south: 'Sud',
          east: 'Est',
          west: 'Ouest',
          types: {
            DIRECT_REGISTRATION: 'Immatriculation Directe',
            PARTIAL_ALIENATION: 'Aliénation Partielle (Morcellement)',
            TOTAL_ALIENATION: 'Aliénation Totale (Mutation)',
            STATE_LAND: 'Concession sur Terrain Domanial',
            PARTITION: 'Partage',
            MORTGAGE: 'Hypothèque',
            TRANSFORMATION: 'Transformation',
          },
        },
        oppositionDialog: {
          title: 'Former une Opposition — {{reference}}',
          body: 'Votre opposition sera enregistrée contre cette demande et examinée par le Conservateur Foncier. La délivrance du titre est bloquée jusqu’à l’examen et la mainlevée de votre opposition. Toute réclamation sciemment fausse est punie par la loi.',
          name: 'Votre nom complet',
          contact: 'Contact (téléphone ou e-mail)',
          grounds: 'Motifs de l’opposition — décrivez votre droit sur ce terrain',
          groundsHelp:
            'Au moins 10 caractères. Soyez précis : nature de votre droit, limites concernées, pièces justificatives en votre possession.',
          submit: 'Soumettre l’Opposition',
          submitting: 'Envoi en cours…',
          success:
            'Votre opposition a été enregistrée. La délivrance du titre est bloquée jusqu’à l’examen de votre réclamation par le Conservateur. Conservez le numéro de référence pour le suivi.',
          cancel: 'Annuler',
        },
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
