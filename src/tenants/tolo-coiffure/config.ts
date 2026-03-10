const calendlyUrl = 'https://calendly.com/43insidethebox/90min';
const whatsappNumberLocal = '0779421225';
const whatsappNumberIntl = '41779421225';
const whatsappMessage = encodeURIComponent('Bonjour Tolo Coiffure, je souhaite réserver un rendez-vous.');
const whatsappUrl = `https://wa.me/${whatsappNumberIntl}?text=${whatsappMessage}`;

export const toloCoiffureConfig = {
  slug: 'tolo-coiffure',
  domain: 'tolocoiffure.ch',
  phone: whatsappNumberLocal,
  phoneIntlDisplay: '+41 77 942 12 25',
  telHref: whatsappUrl,
  email: 'contact@tolocoiffure.ch',
  address: 'Rue Pré-du-Marché 6, 1004 Lausanne',
  bookingUrl: calendlyUrl || whatsappUrl,
  bookingChannel: calendlyUrl ? 'calendly' : 'whatsapp',
  bookingLabel: calendlyUrl ? 'Réserver en ligne' : 'Écrire sur WhatsApp',
  calendlyUrl,
  whatsappUrl,
  googleReviewsUrl:
    'https://www.google.com/maps/place/tolo+coiffure/@46.5234737,6.6305082,18.31z/data=!4m6!3m5!1s0x478c2fcf179a9b4d:0xe750f51e57e837c2!8m2!3d46.5235379!4d6.6312928!16s%2Fg%2F11w4g32xhb?hl=fr',
  mapEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2761.604931783173!2d6.629121576793354!3d46.5235379711126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478c2fcf179a9b4d%3A0xe750f51e57e837c2!2sTolo%20Coiffure!5e0!3m2!1sen!2sch!4v1700000000000!5m2!1sen!2sch',
  mapLink:
    'https://www.google.com/maps/place/tolo+coiffure/@46.5234737,6.6305082,18.31z/data=!4m6!3m5!1s0x478c2fcf179a9b4d:0xe750f51e57e837c2!8m2!3d46.5235379!4d6.6312928!16s%2Fg%2F11w4g32xhb',
};

export type ToloCoiffureConfig = typeof toloCoiffureConfig;
