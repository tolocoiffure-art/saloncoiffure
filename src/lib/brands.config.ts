import type { BrandKey } from './brand';

export type BrandProfile = {
  key: BrandKey;
  name: string;
  domain: string;
  shortName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  legalOperator?: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fonts?: {
    sans?: string;
    heading?: string;
    serif?: string;
  };
  hero?: {
    image?: string;
    overlay?: string;
    texture?: string;
  };
  theme?: {
    bg?: string;
    gradient?: string;
    accent?: string;
    surface?: string;
    card?: string;
    shadow?: string;
    pattern?: string;
  };
};

const shared = {
  phone: '+41 76 798 27 93',
  whatsapp: 'https://wa.me/41767982793',
  email: 'contact@lausannedemenagement.ch',
  legalOperator: 'Pedro Déménagement',
};

export const BRANDS: Record<BrandKey, BrandProfile> = {
  tonsiteweb: {
    key: 'tonsiteweb',
    name: 'TonSiteWeb.ch',
    shortName: 'TonSiteWeb',
    domain: 'tonsiteweb.ch',
    seoTitle: 'TonSiteWeb.ch — Sites vitrines suisses pour l’Arc lémanique',
    seoDescription: 'Sites vitrines clés-en-main pour PME et indépendants de l’Arc lémanique.',
    primaryColor: '#0f172a',
    secondaryColor: '#2563eb',
    fonts: { sans: 'Inter Variable', heading: 'Space Grotesk' },
    theme: {
      accent: '#1e3a8a',
    },
    ...shared,
    phone: '+41 76 798 27 93',
    email: 'support@tonsiteweb.ch',
    legalOperator: 'TonSiteWeb Sàrl',
  },
  pedro: {
    key: 'pedro',
    name: 'Pedro Déménagement',
    shortName: 'Pedro',
    domain: 'pedrodemenagement.ch',
    seoTitle: 'Pedro Déménagement — Déménagements en Suisse romande',
    seoDescription:
      'Équipe locale, protections complètes et planning maîtrisé pour vos déménagements en Suisse romande.',
    primaryColor: '#0f172a',
    secondaryColor: '#1e40af',
    fonts: { sans: 'Inter Variable', heading: 'Space Grotesk' },
    theme: {
      accent: '#1e3a8a',
    },
    ...shared,
  },
  lausanne: {
    key: 'lausanne',
    name: 'Déménagement Lausanne',
    shortName: 'Lausanne Déménagement',
    domain: 'lausannedemenagement.ch',
    seoTitle: 'Déménagement Lausanne — Votre déménagement local',
    seoDescription:
      'Déménagement Lausanne & Vaud : accès en ville assurés, protections professionnelles, service transparent et fiable.',
    primaryColor: '#1e3a8a',
    secondaryColor: '#0ea5e9',
    fonts: { sans: 'Manrope', heading: 'Archivo' },
    theme: {
      accent: '#1e3a8a',
      gradient: 'linear-gradient(135deg, #ffffffae 0%, #ffffff9d 60%, #ffffff9d 100%)',
      surface: 'rgba(14,165,233,0.08)',
      card: 'rgba(14,165,233,0.1)',
    },
    ...shared,
  },
  urgent: {
    key: 'urgent',
    name: 'Déménagement Urgent',
    shortName: 'Urgent',
    domain: 'demenagementurgent.ch',
    seoTitle: 'Déménagement Urgent — Intervention rapide',
    seoDescription:
      'Déménagements urgents en Suisse romande : intervention rapide, équipe formée, protections sol/murs et véhicule spécialisé.',
    primaryColor: '#b91c1c',
    secondaryColor: '#f97316',
    fonts: { sans: 'Archivo', heading: 'Bebas Neue' },
    theme: {
      bg: '#0b0f1a',
      gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #f97316 100%)',
      accent: '#b91c1c',
      surface: 'rgba(239,68,68,0.08)',
      card: 'rgba(15,15,20,0.75)',
      shadow: '0 25px 70px -35px rgba(239,68,68,0.65)',
    },
    ...shared,
  },
  debarras: {
    key: 'debarras',
    name: 'Débarras Lausanne',
    shortName: 'Débarras',
    domain: 'debarraslausanne.ch',
    seoTitle: 'Débarras Lausanne — Service complet et rapide',
    seoDescription:
      'Débarras d’appartements, caves et locaux à Lausanne et environs. Tri, manutention et évacuation rapides.',
    primaryColor: '#065f46',
    secondaryColor: '#10b981',
    fonts: { sans: 'DM Sans', heading: 'Playfair Display' },
    theme: {
      gradient: 'radial-gradient(circle at 10% 20%, #0f766e 0%, #022c22 45%, #0f172a 100%)',
      accent: '#0f766e',
      surface: 'rgba(16,185,129,0.08)',
      card: 'rgba(6,95,70,0.16)',
      shadow: '0 22px 60px -30px rgba(16,185,129,0.6)',
    },
    ...shared,
  },
  transport: {
    key: 'transport',
    name: 'Transport Meubles',
    shortName: 'Transport',
    domain: 'transportmeubles.ch',
    seoTitle: 'Transport de meubles — Suisse romande',
    seoDescription: 'Transport sécurisé de meubles, emballage et arrimage renforcé.',
    primaryColor: '#1f2a44',
    secondaryColor: '#f2b045',
    fonts: { sans: 'Space Grotesk', heading: 'Space Grotesk' },
    theme: {
      bg: '#0c1020',
      gradient: 'linear-gradient(135deg, #0b1220 0%, #111827 45%, #1f2a44 85%)',
      accent: '#c8a15a',
      surface: 'rgba(31,42,68,0.18)',
      card: 'rgba(15,20,34,0.9)',
      shadow: '0 24px 70px -42px rgba(15,23,42,0.55)',
      pattern: 'radial-gradient(circle at 22% 18%, rgba(242,176,69,0.10) 0, transparent 32%)',
    },
    ...shared,
  },
  videmaison: {
    key: 'videmaison',
    name: 'Vide Maison',
    shortName: 'Vide Maison',
    domain: 'videmaison.ch',
    seoTitle: 'Vide maison — Désencombrement complet',
    seoDescription: 'Vidage complet, tri et évacuation rapide, protections incluses.',
    primaryColor: '#b45309',
    secondaryColor: '#c58f55',
    fonts: { sans: 'DM Sans', heading: 'Cormorant Garamond', serif: 'Cormorant Garamond' },
    theme: {
      bg: '#f8f1e6',
      gradient: 'linear-gradient(135deg, #f2e6d8 0%, #e4c6a4 52%, #c58f55 100%)',
      accent: '#a86f3b',
      surface: 'rgba(193,154,107,0.08)',
      card: 'rgba(255, 253, 249, 0.96)',
      shadow: '0 16px 52px -42px rgba(124,45,18,0.34)',
      pattern: 'radial-gradient(circle at 18% 12%, rgba(193,154,107,0.08) 0, transparent 24%)',
    },
    ...shared,
  },
  videsuccession: {
    key: 'videsuccession',
    name: 'Vide Succession',
    shortName: 'Vide Succession',
    domain: 'videsuccession.ch',
    seoTitle: 'Vide succession — Gestion délicate et rapide',
    seoDescription: 'Tri, débarras et coordination administrative pour successions.',
    primaryColor: '#0f172a',
    secondaryColor: '#d97706',
    fonts: { sans: 'Manrope', heading: 'Playfair Display', serif: 'Playfair Display' },
    theme: {
      bg: '#0b0c14',
      gradient: 'radial-gradient(circle at 10% 10%, #1f2937 0%, #0b0c14 40%, #000000 100%)',
      accent: '#b07a37',
      surface: 'rgba(217,119,6,0.12)',
      card: 'rgba(15,17,27,0.85)',
      shadow: '0 30px 90px -45px rgba(217,119,6,0.65)',
    },
    ...shared,
  },
  nettoyagesuccession: {
    key: 'nettoyagesuccession',
    name: 'Nettoyage Succession',
    shortName: 'Nettoyage',
    domain: 'nettoyagesuccession.ch',
    seoTitle: 'Nettoyage succession — Remise en état complète',
    seoDescription: 'Nettoyage complet après succession, remise en état prête à louer/vendre.',
    primaryColor: '#0f766e',
    secondaryColor: '#22d3ee',
    fonts: { sans: 'Work Sans', heading: 'Space Grotesk' },
    theme: {
      bg: '#f8fbfd',
      gradient: 'linear-gradient(135deg, #ecfeff 0%, #67e8f9 45%, #0f172a 100%)',
      accent: '#0f766e',
      surface: 'rgba(103,232,249,0.12)',
      card: '#ffffff',
      shadow: '0 18px 55px -35px rgba(15,118,110,0.5)',
      pattern: 'radial-gradient(circle at 70% 10%, rgba(103,232,249,0.15) 0, transparent 35%)',
    },
    ...shared,
  },
  lausannenettoyage: {
    key: 'lausannenettoyage',
    name: 'Nettoyage Lausanne',
    shortName: 'Nettoyage Lausanne',
    domain: 'lausannenettoyage.ch',
    seoTitle: 'Nettoyage Lausanne — Appartements, bureaux, remise en état',
    seoDescription:
      'Nettoyage complet à Lausanne : remises en état, bureaux et fin de chantier, avec contrôle qualité.',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0f172a',
    fonts: { sans: 'Work Sans', heading: 'Space Grotesk' },
    theme: {
      bg: '#f7fbff',
      gradient: 'linear-gradient(135deg, #fff 0%, #fff 45%, #fff 100%)',
      accent: '#0369a1',
      surface: 'rgba(224,242,254,0.18)',
      card: '#ffffff',
      shadow: '0 22px 70px -45px rgba(14,165,233,0.55)',
      pattern: 'radial-gradient(circle at 15% 20%, rgba(14, 165, 233, 1) 0, transparent 90%)',
    },
    ...shared,
  },
  laclemanexperience: {
    key: 'laclemanexperience',
    name: 'Lac Léman Experience',
    shortName: 'Lac Léman',
    domain: 'laclemanexperience.ch',
    seoTitle: 'Expériences Lac Léman — Croisières privées, vignobles UNESCO, tables d’hôtes',
    seoDescription:
      'Croisières au coucher du soleil, vignobles UNESCO, tables d’hôtes et échappées alpines. Expériences premium autour du Léman.',
    primaryColor: '#0f766e',
    secondaryColor: '#1e293b',
    fonts: { sans: 'Manrope', heading: 'Playfair Display', serif: 'Playfair Display' },
    theme: {
      bg: '#f8fafc',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #e0f2f1 45%, #e2e8f0 100%)',
      accent: '#0f766e',
      surface: 'rgba(15,118,110,0.08)',
      card: 'rgba(255, 255, 255, 0.94)',
      shadow: '0 20px 60px -35px rgba(15,118,110,0.35)',
      pattern: 'radial-gradient(circle at 14% 18%, rgba(253,230,138,0.16) 0, transparent 28%)',
    },
    ...shared,
    legalOperator: 'Lac Léman Experience',
    email: 'contact@laclemanexperience.ch',
  },
  etatdeslieux: {
    key: 'etatdeslieux',
    name: 'État des lieux Lausanne',
    shortName: 'État des lieux',
    domain: 'etatdeslieuxlausanne.ch',
    seoTitle: 'État des lieux Lausanne — Constat précis et rapide',
    seoDescription: 'États des lieux locatifs, rapports photo et délai court.',
    primaryColor: '#1e3a8a',
    secondaryColor: '#0ea5e9',
    fonts: { sans: 'Manrope', heading: 'Archivo' },
    theme: {
      accent: '#1e3a8a',
      gradient: 'linear-gradient(135deg, #ffffffae 0%, #ffffff9d 60%, #ffffff9d 100%)',
      surface: 'rgba(14,165,233,0.08)',
      card: 'rgba(14,165,233,0.1)',
      shadow: '0 22px 70px -45px rgba(14,165,233,0.35)',
    },
    ...shared,
  },
  maisoncortes: {
    key: 'maisoncortes',
    name: 'Maison Cortes',
    shortName: 'Maison Cortes',
    domain: 'maisoncortes.ch',
    seoTitle: 'Maison Cortes — Objets en laiton plaqué or',
    seoDescription: 'Sélection courte d’objets architecturaux en laiton plaqué or. CHF uniquement.',
    primaryColor: '#111111',
    secondaryColor: '#6B6B6B',
    fonts: { sans: 'Libre Baskerville', heading: 'Libre Baskerville', serif: 'Libre Baskerville' },
    theme: {
      bg: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      accent: '#111111',
      pattern: 'none',
      shadow: 'none',
    },
    legalOperator: 'Maison Cortes',
    email: 'contact@maisoncortes.ch',
  },
  ateliermemoire: {
    key: 'ateliermemoire',
    name: 'Atelier Mémoire',
    shortName: 'Atelier Mémoire',
    domain: 'ateliermemoire.ch',
    seoTitle: 'Atelier Mémoire — Restauration de photographies anciennes',
    seoDescription:
      'Restauration et colorisation naturelle de photos anciennes. Révisions incluses. Envoi en ligne ou par courrier.',
    primaryColor: '#e8e8e4',
    secondaryColor: '#c7a374',
    fonts: { sans: 'Inter', heading: 'Libre Baskerville', serif: 'Libre Baskerville' },
    theme: {
      bg: '#0b0f14',
      surface: '#131824',
      card: '#131824',
      accent: '#c7a374',
      pattern: 'none',
      shadow: '0 16px 48px -32px rgba(0,0,0,0.45)',
    },
    email: 'bonjour@ateliermemoire.ch',
    legalOperator: 'Atelier Mémoire',
  },
  'tolo-coiffure': {
    key: 'tolo-coiffure',
    name: 'Tolo Coiffure',
    shortName: 'Tolo',
    domain: 'tolocoiffure.ch',
    seoTitle: 'Tolo Coiffure — Coiffeur à Lausanne Centre',
    seoDescription:
      'Atelier de coiffure haut de gamme à Lausanne : colorations précises, coupes éditoriales, soins profonds.',
    primaryColor: '#2B1D14',
    secondaryColor: '#C8B38A',
    fonts: { sans: 'Inter', heading: 'Playfair Display', serif: 'Playfair Display' },
    theme: {
      bg: '#F5EFE8',
      surface: '#F1E7DC',
      card: '#F5EFE8',
      accent: '#C8B38A',
      pattern: 'none',
      shadow: '0 18px 60px -42px rgba(43, 29, 20, 0.18)',
    },
    phone: '0779421225',
    email: 'tolocoiffure@gmail.com',
    legalOperator: 'Tolo Coiffure',
  },
};
