import { toloCoiffureConfig } from './config';

export const toloContent = {
  hero: {
    srH1: 'Coiffeur à Lausanne Centre',
    title: 'Couleur raffinée.\nPrécision maîtrisée.',
    subtitle: 'Atelier de coiffure — Lausanne Centre',
    cta: 'Réserver un rendez-vous',
    imageAlt: 'Balayage signature aux reflets doux',
  },
  signature: {
    title: 'Notre signature',
    paragraphs: [
      'Consultation personnalisée pour comprendre votre couleur, votre rythme et vos attentes.',
      'Coloration et balayage réalisés avec un contrôle millimétré des reflets et des transitions.',
      'Priorité à la santé du cheveu : protocoles protecteurs, soins profonds et finitions soyeuses.',
      'Chaque détail compte : placements précis, polissage des lignes, temps de pause maîtrisé.',
    ],
  },
  location: {
    heading: 'Au cœur de Lausanne.',
    subheading: 'Une adresse reconnue pour son savoir-faire.',
    imageAlt: 'Extérieur du salon au centre de Lausanne',
  },
  testimonials: [
    {
      quote:
        "L'une des meilleures coupes de cheveux à Lausanne. L'équipe est souriante, professionnelle, ponctuelle et très gentille.",
      author: 'Yaser Shahbazi',
      stars: 5,
      when: 'Il y a 1 an',
      reviewerMeta: '4 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote: 'Super.',
      author: 'Mehdi Heidari',
      stars: 5,
      when: 'Il y a 1 an',
      reviewerMeta: '1 avis · 11 photos',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote:
        "Un salon absolument exceptionnel. L'accueil est chaleureux, l'ambiance très agréable et la qualité de service dépasse les attentes.",
      author: 'Ghulam Sakhi Mirzaie',
      stars: 5,
      when: 'Il y a 4 mois',
      reviewerMeta: '1 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote: "Super, je suis venue sans rendez-vous et la coupe était incroyable. Je recommande vivement.",
      author: 'Kimberlyn Holguin',
      stars: 5,
      when: 'Il y a 3 mois',
      reviewerMeta: '7 avis · 2 photos',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote:
        "Très satisfait de ma visite. L'équipe est attentive, le service est excellent et le résultat est au-delà de mes attentes.",
      author: 'Azim Mohammad',
      stars: 5,
      when: 'Il y a 4 mois',
      reviewerMeta: '2 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
  ],
  footer: {
    note: 'Atelier de coiffure haut de gamme à Lausanne. Coloration, balayage, coupe éditoriale, soins profonds.',
  },
};

export type ToloContent = typeof toloContent;
