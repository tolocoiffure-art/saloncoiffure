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
        "Je suis arrivé avec juste une idée abstraite de ce que je voulais. Ils ont pu lire dans mes pensées et fournir un meilleur travail que ce que j'avais imaginé. merci pour la transformation. je suis fan 😍",
      author: 'Sara Guerreiro',
      stars: 5,
      when: 'Il y a 1 an',
      reviewerMeta: 'Guide local · 55 avis · 51 photos',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote:
        "Coiffeur très compétent et à l'écoute. Je suis arrivé avec une idée de nouvelle coupe et il m'a fait ce que je désirais. Je conseille 👍",
      author: 'Loris Lecci',
      stars: 5,
      when: 'Il y a 11 mois',
      reviewerMeta: '11 avis · 1 photo',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote:
        "Merci beaucoup pour ces superbes coiffures ! A chaque fois que je vais je suis hyper contente du résultat ! On peut aller avec ou sans rendez-vous, et ce n'est pas cher ! Clairement le meilleur de Lausanne pour moi !!! Je recommande !!!",
      author: 'Sabrina Sbai',
      stars: 5,
      when: 'Il y a 10 mois',
      reviewerMeta: '1 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote:
        "J'étais chez Ali aujourd'hui. Sympathique et professionnel. Je lui ai demandé de couper 2 cm et il a coupé 2 cm. On peut pas en dire autant de tous les coiffeurs! Et en plus il a repris ma coupe et je suis très contente du résultat. Je le recommande",
      author: 'Michèle Aristidelle',
      stars: 5,
      when: 'Il y a 10 mois',
      reviewerMeta: '3 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
    {
      quote: 'Super coiffeur, très professionnel et accueillant 👍 au top',
      author: 'Benjamin Kurmann',
      stars: 5,
      when: 'Il y a 1 an',
      reviewerMeta: '2 avis',
      link: toloCoiffureConfig.googleReviewsUrl,
    },
  ],
  footer: {
    note: 'Atelier de coiffure haut de gamme à Lausanne. Coloration, balayage, coupe éditoriale, soins profonds.',
  },
};

export type ToloContent = typeof toloContent;
