export const toloCoiffureTheme = {
  brandKey: 'tolo-coiffure',
  colors: {
    background: '#F5EFE8', // warm ivory
    surface: '#F1E7DC',
    text: '#2B1D14', // deep espresso
    muted: '#5B4A3D',
    accent: '#C8B38A', // muted gold
    line: 'rgba(43,29,20,0.12)',
    dark: '#1D140E',
  },
  typography: {
    heading: "'Playfair Display', serif",
    body: "'Inter', 'Inter Variable', system-ui, -apple-system, sans-serif",
  },
  layout: {
    maxWidth: '1100px',
    sectionGap: '110px',
  },
};

export type ToloCoiffureTheme = typeof toloCoiffureTheme;
