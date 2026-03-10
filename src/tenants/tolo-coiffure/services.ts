export type ServiceItem = {
  name: string;
  price: string;
  description?: string;
  duration?: string;
};

export type ServiceCategory = {
  title: string;
  items: ServiceItem[];
};

export type ServiceGenderKey = 'femme' | 'homme';

export type ServicePanel = {
  title: string;
  categories: ServiceCategory[];
};

export const toloServicePanels: Record<ServiceGenderKey, ServicePanel> = {
  femme: {
    title: 'Femme',
    categories: [
      {
        title: 'Coupes',
        items: [
          { name: 'Coupe Frange', price: '10 CHF' },
          { name: 'Coupe Femme', price: '38 CHF' },
          { name: 'Coupe Fille (0–11 ans)', price: '25 CHF' },
          { name: 'Coupe Fille (11–16 ans)', price: '35 CHF' },
        ],
      },
      {
        title: 'Brushing / Séchage',
        items: [
          { name: 'Brushing Cheveux Court', price: '35 CHF' },
          { name: 'Brushing Cheveux Mi-Long', price: '40 CHF' },
          { name: 'Brushing Cheveux Long', price: '45 CHF' },
          { name: 'Brushing Cheveux Très Long', price: '50 CHF' },
          { name: 'Séchage', price: '15 CHF' },
          { name: 'Shampoing + Mise en plis', price: '45 CHF' },
        ],
      },
      {
        title: 'Mèches',
        items: [
          { name: 'Mèches au papier – Cheveux Mi-Long', price: '150 CHF' },
          { name: 'Mèches au papier – Cheveux Long', price: '180 CHF' },
          { name: 'Mèches demi-tête – Cheveux Court', price: '90 CHF' },
          { name: 'Mèches tête entière – Cheveux Courtes', price: '120 CHF' },
          { name: 'Mèches Repousse', price: '130 CHF' },
        ],
      },
      {
        title: 'Lissage',
        items: [
          { name: 'Lissage Indien Cheveux Court', price: '175 CHF' },
          { name: 'Lissage Indien Cheveux Mi-Long', price: '275 CHF' },
          { name: 'Lissage Indien Cheveux Long', price: '299 CHF' },
          { name: 'Lissage Indien Cheveux Très Long', price: '335 CHF' },
        ],
      },
      {
        title: 'Soins',
        items: [
          { name: 'Masque / Massage', price: '10 CHF' },
          { name: 'Mousse', price: '5 CHF' },
        ],
      },
      {
        title: 'Permanente',
        items: [
          { name: 'Permanente Demi-Tête Cheveux Courtes', price: '95 CHF' },
          { name: 'Permanente Cheveux Longs', price: '249 CHF' },
          { name: 'Permanente Cheveux Mi-Longs', price: '165 CHF' },
          { name: 'Permanente Tête Entière Cheveux Court + Coupe + Brushing', price: '170 CHF' },
          { name: 'Permanente Cheveux Court sans Coupe Brushing', price: '129 CHF' },
        ],
      },
      {
        title: 'Chignon / Mariage',
        items: [
          { name: 'Chignon + Tresse Simple (Court)', price: '55 CHF' },
          { name: 'Chignon + Tresse Simple (Mi-Long)', price: '65 CHF' },
          { name: 'Chignon Tresse Simple (Long)', price: '75 CHF' },
          { name: 'Coiffure Mariée avec 1 essai', price: '150 CHF' },
        ],
      },
    ],
  },
  homme: {
    title: 'Homme',
    categories: [
      {
        title: 'Coupes',
        items: [
          { name: 'Coupe Homme', price: '28 CHF' },
          { name: 'Coupe Garçon (0–11 ans)', price: '20 CHF' },
          { name: 'Coupe Garçon (11–16 ans)', price: '24 CHF' },
          { name: 'Coupe Nuque', price: '10 CHF' },
          { name: 'Coupe Tondeuse', price: '20 CHF' },
        ],
      },
      {
        title: 'Barbe',
        items: [{ name: 'Tailler de Barbe + Raser', price: '15 CHF' }],
      },
    ],
  },
};

const previewFromPanel = (panel: ServicePanel, limit: number): ServiceItem[] =>
  panel.categories
    .flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        description: category.title,
      }))
    )
    .slice(0, limit);

export const toloServices: { femme: ServiceCategory; homme: ServiceCategory } = {
  femme: {
    title: toloServicePanels.femme.title,
    items: previewFromPanel(toloServicePanels.femme, 8),
  },
  homme: {
    title: toloServicePanels.homme.title,
    items: previewFromPanel(toloServicePanels.homme, 6),
  },
};

export const bookingCta = 'Réserver un rendez-vous';
