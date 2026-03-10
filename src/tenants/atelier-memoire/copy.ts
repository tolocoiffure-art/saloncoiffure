export type AtelierLocale = 'fr' | 'en' | 'de' | 'it';

export const defaultAtelierLocale: AtelierLocale = 'fr';

type PricingItem = { title: string; price: string; bullets: string[] };

type Copy = {
  meta: { title: string; description: string };
  nav: { home: string; pricing: string; contact: string; legal: string };
  hero: { title: string; subtitle: string; note: string };
  whatWeDo: string[];
  how: string[];
  pricingTeaser: { title: string; footnote: string; items: PricingItem[] };
  reassurance: string[];
  actions: { primary: string; secondary: string; tertiary: string };
  pipeline: {
    intakeTitle: string;
    onlineTitle: string;
    onlineSteps: string[];
    mailTitle: string;
    mailSteps: string[];
    paymentTitle: string;
    paymentItems: string[];
    revisionTitle: string;
    revisionItems: string[];
  };
  contact: {
    title: string;
    subtitle: string;
    uploadLabel: string;
    linkLabel: string;
    serviceLabel: string;
    services: { value: string; label: string }[];
    methodLabel: string;
    methods: { value: string; label: string }[];
    paymentLabel: string;
    payments: { value: string; label: string }[];
    photoCountLabel: string;
    metadataTitle: string;
    addressLabel: string;
    submit: string;
    optional: string;
  };
  legal: { title: string; paragraphs: string[] };
};

export const atelierCopy: Record<AtelierLocale, Copy> = {
  fr: {
    meta: {
      title: 'Atelier Mémoire — Restauration de photographies anciennes',
      description:
        'Restauration, colorisation naturelle et édition archive de photos anciennes. Envoi en ligne ou par courrier. Révisions incluses.',
    },
    nav: { home: 'Accueil', pricing: 'Prix', contact: 'Contact', legal: 'Mentions légales' },
    hero: {
      title: 'Restauration de photographies anciennes.',
      subtitle: 'Avec soin et retenue.',
      note: 'Si le résultat ne semble pas juste, nous le révisons.',
    },
    whatWeDo: [
      'Réparation des déchirures et dommages',
      'Amélioration de la netteté et du contraste',
      'Colorisation naturelle (optionnelle)',
      'Livraison numérique, prête à conserver ou partager',
    ],
    how: ['Vous nous envoyez la photo', 'Nous la restaurons avec soin', 'Vous recevez le résultat'],
    pricingTeaser: {
      title: 'Tarifs par photographie',
      footnote:
        'Première photo CHF 49. Chaque photo supplémentaire -10% sur la précédente jusqu’à un minimum de CHF 10 (jusqu’à 100 photos). Paiement carte ou facture.',
      items: [
        {
          title: 'Restauration + colorisation',
          price: 'CHF 49',
          bullets: [
            'Première photo CHF 49',
            'Chaque suivante -10% sur la précédente (min CHF 10)',
            'Jusqu’à 100 photos par commande',
          ],
        },
      ],
    },
    reassurance: [
      'Chaque photo est traitée individuellement',
      'Révisions incluses',
      'Paiement par carte ou facture',
      'Fichiers supprimés après livraison',
    ],
    actions: {
      primary: 'Envoyer une photo',
      secondary: 'Demander une facture',
      tertiary: 'Poser une question',
    },
    pipeline: {
      intakeTitle: 'Envoi en ligne ou par courrier',
      onlineTitle: 'En ligne',
      onlineSteps: ['JPG ou PNG suffisent', 'Scan ou photo de votre tirage', 'Lien WeTransfer/Drive accepté'],
      mailTitle: 'Courrier',
      mailSteps: [
        'Vous envoyez l’original (courrier suivi conseillé)',
        'Nous scannons, restaurons, renvoyons l’original',
        'Livraison numérique par email',
      ],
      paymentTitle: 'Paiement',
      paymentItems: ['Carte via Stripe', 'Facture / QR-bill', 'TWINT (optionnel)'],
      revisionTitle: 'Révisions incluses',
      revisionItems: ['1–2 ajustements si le rendu ne semble pas juste', 'Sans frais supplémentaires'],
    },
    contact: {
      title: 'Contact et envoi',
      subtitle: 'Vous pouvez nous contacter si vous préférez procéder par email ou courrier.',
      uploadLabel: 'Joindre des fichiers (optionnel)',
      linkLabel: 'Lien de transfert (WeTransfer, Drive…) (optionnel)',
      serviceLabel: 'Service souhaité',
      services: [{ value: 'restauration', label: 'Restauration + colorisation' }],
      methodLabel: 'Mode d’envoi',
      methods: [
        { value: 'online', label: 'En ligne (upload ou lien)' },
        { value: 'mail', label: 'Courrier postal' },
        { value: 'unsure', label: 'Je ne sais pas, guidez-moi' },
      ],
      paymentLabel: 'Paiement',
      payments: [
        { value: 'card', label: 'Carte (Stripe)' },
        { value: 'invoice', label: 'Facture / QR-bill' },
        { value: 'twint', label: 'TWINT' },
      ],
      photoCountLabel: 'Nombre de photos',
      metadataTitle: 'Coordonnées (pour suivi et retour éventuel)',
      addressLabel: 'Adresse de retour (si envoi postal)',
      submit: 'Envoyer',
      optional: 'Optionnel',
    },
    legal: {
      title: 'Mentions légales',
      paragraphs: [
        'Atelier Mémoire — atelier de restauration d’images, Lausanne (Suisse).',
        'Données : les fichiers reçus sont utilisés uniquement pour la restauration et supprimés après livraison finale.',
        'Paiement : carte (Stripe), facture/QR-bill. Aucun abonnement.',
        'Originals : tout original envoyé par courrier est renvoyé à l’adresse fournie, en suivi.',
      ],
    },
  },
  en: {
    meta: {
      title: 'Atelier Mémoire — Restoration of old photographs',
      description:
        'Restoration, natural colorization and archive-grade edits for old photos. Send online or by mail. Revisions included.',
    },
    nav: { home: 'Home', pricing: 'Pricing', contact: 'Contact', legal: 'Legal' },
    hero: {
      title: 'Restoration of old photographs.',
      subtitle: 'With care and restraint.',
      note: 'If the result doesn’t feel right, we revise it.',
    },
    whatWeDo: [
      'Repair tears and damage',
      'Improve sharpness and contrast',
      'Natural colorization (optional)',
      'Digital delivery, ready to keep or share',
    ],
    how: ['You send the photo', 'We restore it carefully', 'You receive the result'],
    pricingTeaser: {
      title: 'Pricing per photo',
      footnote:
        'First photo CHF 49. Each additional photo -10% on the previous one down to a minimum of CHF 10 (up to 100 photos). Card or invoice.',
      items: [
        {
          title: 'Restoration + colorization',
          price: 'CHF 49',
          bullets: ['First photo CHF 49', 'Each next photo -10% vs previous (min CHF 10)', 'Up to 100 photos per order'],
        },
      ],
    },
    reassurance: [
      'Each photo handled individually',
      'Revisions included',
      'Card or invoice payment',
      'Files deleted after delivery',
    ],
    actions: {
      primary: 'Send a photo',
      secondary: 'Request an invoice',
      tertiary: 'Ask a question',
    },
    pipeline: {
      intakeTitle: 'Send online or by mail',
      onlineTitle: 'Online',
      onlineSteps: ['JPG or PNG is fine', 'Scan or phone picture of your print', 'WeTransfer/Drive link accepted'],
      mailTitle: 'Mail',
      mailSteps: ['Send the original (tracked mail recommended)', 'We scan, restore, return the original', 'Digital delivery by email'],
      paymentTitle: 'Payment',
      paymentItems: ['Card via Stripe', 'Invoice / QR-bill', 'TWINT (optional)'],
      revisionTitle: 'Revisions included',
      revisionItems: ['1–2 adjustments if the result feels off', 'No extra fees'],
    },
    contact: {
      title: 'Contact & send',
      subtitle: 'You can proceed online or by mail. Email is welcome if you prefer.',
      uploadLabel: 'Attach files (optional)',
      linkLabel: 'Transfer link (WeTransfer, Drive…) (optional)',
      serviceLabel: 'Requested service',
      services: [{ value: 'restauration', label: 'Restoration + colorization' }],
      methodLabel: 'Delivery method',
      methods: [
        { value: 'online', label: 'Online (upload or link)' },
        { value: 'mail', label: 'Mail' },
        { value: 'unsure', label: 'Not sure, guide me' },
      ],
      paymentLabel: 'Payment',
      payments: [
        { value: 'card', label: 'Card (Stripe)' },
        { value: 'invoice', label: 'Invoice / QR-bill' },
        { value: 'twint', label: 'TWINT' },
      ],
      photoCountLabel: 'Number of photos',
      metadataTitle: 'Contact and return details',
      addressLabel: 'Return address (if mailing originals)',
      submit: 'Send',
      optional: 'Optional',
    },
    legal: {
      title: 'Legal',
      paragraphs: [
        'Atelier Mémoire — image restoration studio, Lausanne (Switzerland).',
        'Data: files are used only for restoration and deleted after final delivery.',
        'Payment: card (Stripe), invoice/QR-bill. No subscriptions.',
        'Originals: any mailed original is returned to the provided address, tracked.',
      ],
    },
  },
  de: {
    meta: {
      title: 'Atelier Mémoire — Restaurierung alter Fotografien',
      description:
        'Restaurierung, natürliche Kolorierung und Archiv-Bearbeitung alter Fotos. Online oder per Post. Revisionen inbegriffen.',
    },
    nav: { home: 'Start', pricing: 'Preise', contact: 'Kontakt', legal: 'Rechtliches' },
    hero: {
      title: 'Restaurierung alter Fotografien.',
      subtitle: 'Mit Sorgfalt und Zurückhaltung.',
      note: 'Wenn das Ergebnis nicht stimmig wirkt, revidieren wir es.',
    },
    whatWeDo: [
      'Risse und Schäden reparieren',
      'Schärfe und Kontrast verbessern',
      'Natürliche Kolorierung (optional)',
      'Digitale Lieferung, bereit zum Aufbewahren oder Teilen',
    ],
    how: ['Sie senden das Foto', 'Wir restaurieren sorgfältig', 'Sie erhalten das Ergebnis'],
    pricingTeaser: {
      title: 'Preise pro Foto',
      footnote:
        'Erstes Foto CHF 49. Jedes weitere Foto -10% gegenüber dem vorherigen bis mind. CHF 10 (bis 100 Fotos). Karte oder Rechnung.',
      items: [
        {
          title: 'Restaurierung + Kolorierung',
          price: 'CHF 49',
          bullets: ['Erstes Foto CHF 49', 'Jedes weitere -10% vs. vorheriges (mind. CHF 10)', 'Bis 100 Fotos pro Auftrag'],
        },
      ],
    },
    reassurance: [
      'Jedes Foto wird einzeln behandelt',
      'Revisionen inbegriffen',
      'Zahlung per Karte oder Rechnung',
      'Dateien nach Lieferung gelöscht',
    ],
    actions: {
      primary: 'Foto senden',
      secondary: 'Rechnung anfragen',
      tertiary: 'Frage stellen',
    },
    pipeline: {
      intakeTitle: 'Online oder per Post senden',
      onlineTitle: 'Online',
      onlineSteps: ['JPG oder PNG ausreichend', 'Scan oder Handyfoto Ihres Abzugs', 'WeTransfer/Drive-Link möglich'],
      mailTitle: 'Post',
      mailSteps: ['Original zusenden (A-Post/Tracking empfohlen)', 'Wir scannen, restaurieren, senden zurück', 'Digitale Lieferung per E-Mail'],
      paymentTitle: 'Zahlung',
      paymentItems: ['Karte via Stripe', 'Rechnung / QR-Bill', 'TWINT (optional)'],
      revisionTitle: 'Revisionen',
      revisionItems: ['1–2 Anpassungen, falls nötig', 'Keine Zusatzkosten'],
    },
    contact: {
      title: 'Kontakt & Versand',
      subtitle: 'Per E-Mail oder Post, wie Sie möchten.',
      uploadLabel: 'Dateien anhängen (optional)',
      linkLabel: 'Transfer-Link (WeTransfer, Drive…) (optional)',
      serviceLabel: 'Gewünschter Service',
      services: [{ value: 'restauration', label: 'Restaurierung + Kolorierung' }],
      methodLabel: 'Versandart',
      methods: [
        { value: 'online', label: 'Online (Upload oder Link)' },
        { value: 'mail', label: 'Post' },
        { value: 'unsure', label: 'Unsicher, bitte führen' },
      ],
      paymentLabel: 'Zahlung',
      payments: [
        { value: 'card', label: 'Karte (Stripe)' },
        { value: 'invoice', label: 'Rechnung / QR-Bill' },
        { value: 'twint', label: 'TWINT' },
      ],
      photoCountLabel: 'Anzahl Fotos',
      metadataTitle: 'Kontakt- und Rücksende-Daten',
      addressLabel: 'Rücksendeadresse (bei Postversand)',
      submit: 'Senden',
      optional: 'Optional',
    },
    legal: {
      title: 'Rechtliches',
      paragraphs: [
        'Atelier Mémoire — Bildrestaurierungsatelier, Lausanne (Schweiz).',
        'Daten: Dateien nur zur Restaurierung genutzt und nach finaler Lieferung gelöscht.',
        'Zahlung: Karte (Stripe), Rechnung/QR-Bill. Keine Abos.',
        'Originale: Per Post gesendete Originale werden an die angegebene Adresse zurückgeschickt (Tracking).',
      ],
    },
  },
  it: {
    meta: {
      title: 'Atelier Mémoire — Restauro di fotografie antiche',
      description:
        'Restauro, colorizzazione naturale e editing archivio per foto antiche. Invio online o per posta. Revisioni incluse.',
    },
    nav: { home: 'Home', pricing: 'Prezzi', contact: 'Contatto', legal: 'Note legali' },
    hero: {
      title: 'Restauro di fotografie antiche.',
      subtitle: 'Con cura e misura.',
      note: 'Se il risultato non convince, lo rivediamo.',
    },
    whatWeDo: [
      'Riparazione di strappi e danni',
      'Miglioramento nitidezza e contrasto',
      'Colorizzazione naturale (opzionale)',
      'Consegna digitale, pronta da conservare o condividere',
    ],
    how: ['Ci inviate la foto', 'La restauriamo con cura', 'Ricevete il risultato'],
    pricingTeaser: {
      title: 'Prezzi per foto',
      footnote:
        'Prima foto CHF 49. Ogni foto successiva -10% rispetto alla precedente fino a un minimo di CHF 10 (fino a 100 foto). Carta o fattura.',
      items: [
        {
          title: 'Restauro + colorizzazione',
          price: 'CHF 49',
          bullets: ['Prima foto CHF 49', 'Ogni successiva -10% vs. precedente (min CHF 10)', 'Fino a 100 foto per ordine'],
        },
      ],
    },
    reassurance: [
      'Ogni foto trattata singolarmente',
      'Revisioni incluse',
      'Pagamento con carta o fattura',
      'File eliminati dopo la consegna',
    ],
    actions: {
      primary: 'Invia una foto',
      secondary: 'Richiedi fattura',
      tertiary: 'Fai una domanda',
    },
    pipeline: {
      intakeTitle: 'Invio online o per posta',
      onlineTitle: 'Online',
      onlineSteps: ['Bastano JPG o PNG', 'Scanner o foto del tuo originale', 'Link WeTransfer/Drive accettato'],
      mailTitle: 'Posta',
      mailSteps: ['Spedisci l’originale (consigliata raccomandata)', 'Scansioniamo, restauriamo, rinviamo l’originale', 'Invio digitale via email'],
      paymentTitle: 'Pagamento',
      paymentItems: ['Carta tramite Stripe', 'Fattura / QR-bill', 'TWINT (opzionale)'],
      revisionTitle: 'Revisioni incluse',
      revisionItems: ['1–2 aggiustamenti se necessario', 'Senza costi aggiuntivi'],
    },
    contact: {
      title: 'Contatto e invio',
      subtitle: 'Potete procedere online o per posta. Email sempre benvenuta.',
      uploadLabel: 'Allega file (opzionale)',
      linkLabel: 'Link di trasferimento (WeTransfer, Drive…) (opzionale)',
      serviceLabel: 'Servizio richiesto',
      services: [{ value: 'restauration', label: 'Restauro + colorizzazione' }],
      methodLabel: 'Modalità di invio',
      methods: [
        { value: 'online', label: 'Online (upload o link)' },
        { value: 'mail', label: 'Posta' },
        { value: 'unsure', label: 'Non so, guidatemi' },
      ],
      paymentLabel: 'Pagamento',
      payments: [
        { value: 'card', label: 'Carta (Stripe)' },
        { value: 'invoice', label: 'Fattura / QR-bill' },
        { value: 'twint', label: 'TWINT' },
      ],
      photoCountLabel: 'Numero di foto',
      metadataTitle: 'Contatti e indirizzo di ritorno',
      addressLabel: 'Indirizzo di ritorno (se invio postale)',
      submit: 'Invia',
      optional: 'Opzionale',
    },
    legal: {
      title: 'Note legali',
      paragraphs: [
        'Atelier Mémoire — atelier di restauro immagini, Losanna (Svizzera).',
        'Dati: file usati solo per il restauro e cancellati dopo la consegna finale.',
        'Pagamento: carta (Stripe), fattura/QR-bill. Nessun abbonamento.',
        'Originali: ogni originale spedito per posta è restituito all’indirizzo indicato, con tracciamento.',
      ],
    },
  },
};

export function getAtelierCopy(locale: string): Copy {
  const key = (['fr', 'en', 'de', 'it'].includes(locale) ? locale : defaultAtelierLocale) as AtelierLocale;
  return atelierCopy[key];
}
