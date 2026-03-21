import type { ImageMetadata } from 'astro';

type GalleryLayout = 'large' | 'tall' | 'wide' | 'square';

export type ToloImageItem = {
  id: string;
  src: ImageMetadata;
  alt: string;
  filename: string;
};

export type GalleryItem = ToloImageItem & {
  layout: GalleryLayout;
};

type GalleryData = {
  heroImage: ToloImageItem | null;
  gallery: GalleryItem[];
  fullGallery: GalleryItem[];
  locationImage: ToloImageItem | null;
  atelierInteriorImage: ToloImageItem | null;
  atelierDetailImage: ToloImageItem | null;
};

const imageModules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/tolocoiffure_images/*.{png,jpg,jpeg,webp,avif}');

const heroPriority = ['balayage_soft_lights', 'balayage_soft_waves', 'elegant_profile_soft_waves', 'brunette_to_blonde', 'pefect_bob'];
const locationPriority = ['brunette_to_blonde', 'hair_color_correction', 'elegant_profile_soft_waves', 'curly_woman', 'pefect_bob'];
const atelierInteriorPriority = ['curly_woman', 'elegant_profile_soft_waves', 'pefect_bob', 'hair_transformation_keratin'];
const atelierDetailPriority = ['closeup_scissors_men_hair', 'ultra_detail_beard', 'classic_fade', 'grey_blending_specialist'];
const layoutCycle: GalleryLayout[] = ['large', 'tall', 'square', 'wide', 'square', 'tall'];
const homePinnedOrder = ['brunette_to_blonde', 'classic_fade', 'distinguished_middle_age_man', 'balayage_soft_waves2'];
const homeExcluded = new Set(['pefect_bob', 'elegant_profile_soft_waves']);

const manualAlt: Record<string, string> = {
  balayage_soft_lights: 'Balayage signature aux reflets doux',
  balayage_soft_waves: 'Balayage ondulé, finition lumineuse',
  balayage_soft_waves2: 'Balayage naturel aux tons beige doré',
  balayage_soft_waves3: 'Balayage fondu, transitions ultra douces',
  balayage_soft_waves4: 'Balayage glossy, lumière uniforme',
  balayage_soft_waves21: 'Balayage premium, effet soleil maîtrisé',
  elegant_profile_soft_waves: 'Profil élégant avec ondulations naturelles',
  pefect_bob: 'Coupe bob précise avec finition soignée',
  classic_fade: 'Classic fade propre avec contours nets',
  closeup_scissors_men_hair: 'Détail coupe homme aux ciseaux',
  distinguished_middle_age_man: 'Coupe homme élégante et mature',
  grey_blending_specialist: 'Travail expert sur cheveux poivre et sel',
  hair_color_correction: 'Correction couleur avec rendu naturel',
  hair_transformation_keratin: 'Transformation capillaire avec soin kératine',
  man_refined_business: 'Look homme raffiné, finition professionnelle',
  ultra_detail_beard: 'Finition barbe ultra précise',
  brunette_to_blonde: 'Transition brune vers blond lumineux',
  curly_woman: 'Coiffure femme sur cheveux bouclés',
  elegant_male: 'Style homme élégant en lumière studio',
};

const toBaseName = (filepath: string) => filepath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'image';
const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const toAltFromName = (name: string) => {
  if (manualAlt[name]) return manualAlt[name];
  const clean = name.replace(/\d+/g, ' ').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean;
};

async function buildSourceList(): Promise<ToloImageItem[]> {
  const loaded = await Promise.all(
    Object.entries(imageModules).map(async ([path, load]) => {
      const base = toBaseName(path);
      try {
        const mod = await load();
        return {
          id: toSlug(base),
          src: mod.default,
          alt: toAltFromName(base),
          filename: base,
        } satisfies ToloImageItem;
      } catch {
        // Handles transient rename/delete races while dev server watches image files.
        return null;
      }
    })
  );

  return loaded
    .filter((item): item is ToloImageItem => !!item)
    .sort((a, b) => a.filename.localeCompare(b.filename, 'fr', { sensitivity: 'base', numeric: true }));
}

function pickFromPool(pool: ToloImageItem[], priority: string[]): ToloImageItem | null {
  if (!pool.length) return null;
  const lowerPriority = priority.map((p) => p.toLowerCase());
  const found =
    lowerPriority
      .map((needle) => pool.find((item) => item.filename.toLowerCase().includes(needle)))
      .find(Boolean) ?? pool[0];

  const idx = pool.findIndex((item) => item.id === found.id);
  if (idx >= 0) pool.splice(idx, 1);
  return found;
}

function withLayouts(items: ToloImageItem[]): GalleryItem[] {
  return items.map((item, index) => ({
    ...item,
    layout: layoutCycle[index % layoutCycle.length],
  }));
}

const canonicalStem = (filename: string) => filename.toLowerCase().replace(/\d+$/, '');

function reorderMensLooks(items: ToloImageItem[]): ToloImageItem[] {
  const confident = items.find((item) => item.filename.toLowerCase() === 'confident_man');
  const elegant = items.find((item) => item.filename.toLowerCase() === 'elegant_male');
  const rebuilt: ToloImageItem[] = [];

  for (const item of items) {
    const name = item.filename.toLowerCase();

    if (name === 'confident_man') continue;
    if (name === 'elegant_male') {
      rebuilt.push(confident ?? item);
      continue;
    }
    if (name === 'man_refined_business') {
      if (elegant) rebuilt.push(elegant);
      continue;
    }
    rebuilt.push(item);
  }

  const seen = new Set<string>();
  return rebuilt.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function swapElegantMaleWithPrevious(items: ToloImageItem[]): ToloImageItem[] {
  const index = items.findIndex((item) => item.filename.toLowerCase() === 'elegant_male');
  if (index <= 0) return items;
  const next = [...items];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

function swapLastTwo(items: ToloImageItem[]): ToloImageItem[] {
  if (items.length < 2) return items;
  const next = [...items];
  const last = next.length - 1;
  [next[last - 1], next[last]] = [next[last], next[last - 1]];
  return next;
}

function buildHomeGallery(items: ToloImageItem[]): GalleryItem[] {
  const seen = new Set<string>();
  const curated: ToloImageItem[] = [];
  const leftovers: ToloImageItem[] = [];

  for (const item of items) {
    const key = canonicalStem(item.filename);
    if (seen.has(key)) {
      leftovers.push(item);
      continue;
    }
    seen.add(key);
    curated.push(item);
  }

  // Keep homepage visually diverse first; then pad with leftovers if too short.
  const minCount = 8;
  const list = curated.length >= minCount ? curated : [...curated, ...leftovers.slice(0, minCount - curated.length)];

  // Keep manual curation first, then preserve the natural order of the remaining images.
  const filtered = list.filter((item) => !homeExcluded.has(item.filename.toLowerCase()));
  const pinned = homePinnedOrder
    .map((name) => items.find((item) => item.filename.toLowerCase() === name))
    .filter((item): item is ToloImageItem => !!item && !homeExcluded.has(item.filename.toLowerCase()));
  const pinnedIds = new Set(pinned.map((item) => item.id));
  const pinnedNames = new Set(homePinnedOrder);
  const remaining = filtered.filter((item) => !pinnedIds.has(item.id) && !pinnedNames.has(item.filename.toLowerCase()));
  const reorderedRemaining = reorderMensLooks(remaining);
  const balancedRemaining = swapElegantMaleWithPrevious(reorderedRemaining);
  const finalOrder = swapLastTwo([...pinned, ...balancedRemaining]);

  return withLayouts(finalOrder);
}

export async function getToloGalleryData(): Promise<GalleryData> {
  const sourceList = await buildSourceList();
  const pool = [...sourceList];

  const heroCandidate = pickFromPool(pool, heroPriority);
  const locationImage = pickFromPool(pool, locationPriority) || heroCandidate;
  const atelierInteriorImage = pickFromPool(pool, atelierInteriorPriority) || heroCandidate;
  const atelierDetailImage = pickFromPool(pool, atelierDetailPriority) || heroCandidate;

  const gallery = buildHomeGallery(pool);
  const fullGallery = withLayouts(sourceList);

  return {
    heroImage: heroCandidate,
    gallery,
    fullGallery,
    locationImage,
    atelierInteriorImage,
    atelierDetailImage,
  };
}
