// src/mocks/astro-icon.ts

// fake config expected by astro-icon
export const config = {
  collections: {},
  defaultClass: "",
  iconDir: "",
};

// default export placeholder (used as <Icon />)
export default function Icon() {
  return `<svg width="1" height="1" style="display:none"></svg>`;
}
