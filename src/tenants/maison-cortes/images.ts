import type { ImageMetadata } from 'astro';

import geneveChain01 from '~/assets/maisoncortes_images/geneve-chain-01.png';
import genevePendant03 from '~/assets/maisoncortes_images/geneve-pendant-03.png';
import geneveRing02 from '~/assets/maisoncortes_images/geneve-ring-02.png';
import lausanneBracelet01 from '~/assets/maisoncortes_images/lausanne-bracelet-01.png';
import lausanneRing02 from '~/assets/maisoncortes_images/lausanne-ring-02.png';
import luganoBracelet02 from '~/assets/maisoncortes_images/lugano-bracelet-02.png';
import luganoChain01 from '~/assets/maisoncortes_images/lugano-chain-01.png';
import luganoRing03 from '~/assets/maisoncortes_images/lugano-ring-03.png';
import luganoRing04 from '~/assets/maisoncortes_images/lugano-ring-04.png';
import luganoRing05 from '~/assets/maisoncortes_images/lugano-ring-05.png';
import luganoWatch01 from '~/assets/maisoncortes_images/lugano-watch-01.png';
import zermattRing02 from '~/assets/maisoncortes_images/zermatt-ring-02.png';
import zermattWatch01 from '~/assets/maisoncortes_images/zermatt-watch-01.png';
import zurichChain02 from '~/assets/maisoncortes_images/zurich-chain-02.png';
import zurichEarrings02 from '~/assets/maisoncortes_images/zurich-earrings-02.png';
import zurichRing01 from '~/assets/maisoncortes_images/zurich-ring-01.png';
import zurichRing02 from '~/assets/maisoncortes_images/zurich-ring-02.png';

type ImageEntry = {
  src: ImageMetadata;
  alt: string;
};

export const maisonCortesImages: Record<string, ImageEntry> = {
  'lugano-bracelet-02': { src: luganoBracelet02, alt: 'Maison Cortes Lugano Bracelet 02' },
  'lugano-chain-01': { src: luganoChain01, alt: 'Maison Cortes Lugano Chain 01' },
  'lugano-ring-03': { src: luganoRing03, alt: 'Maison Cortes Lugano Ring 03' },
  'lugano-ring-04': { src: luganoRing04, alt: 'Maison Cortes Lugano Ring 04' },
  'lugano-ring-05': { src: luganoRing05, alt: 'Maison Cortes Lugano Ring 05' },
  'lugano-watch-01': { src: luganoWatch01, alt: 'Maison Cortes Lugano Watch 01' },
  'geneve-pendant-03': { src: genevePendant03, alt: 'Maison Cortes Geneve Pendant 03' },
  'geneve-chain-01': { src: geneveChain01, alt: 'Maison Cortes Geneve Chain 01' },
  'geneve-ring-02': { src: geneveRing02, alt: 'Maison Cortes Geneve Ring 02' },
  'zurich-ring-01': { src: zurichRing01, alt: 'Maison Cortes Zurich Ring 01' },
  'zurich-ring-02': { src: zurichRing02, alt: 'Maison Cortes Zurich Ring 02' },
  'zurich-earrings-02': { src: zurichEarrings02, alt: 'Maison Cortes Zurich Earrings 02' },
  'zurich-chain-02': { src: zurichChain02, alt: 'Maison Cortes Zurich Chain 02' },
  'lausanne-bracelet-01': { src: lausanneBracelet01, alt: 'Maison Cortes Lausanne Bracelet 01' },
  'lausanne-ring-02': { src: lausanneRing02, alt: 'Maison Cortes Lausanne Ring 02' },
  'zermatt-watch-01': { src: zermattWatch01, alt: 'Maison Cortes Zermatt Watch 01' },
  'zermatt-ring-02': { src: zermattRing02, alt: 'Maison Cortes Zermatt Ring 02' },
};

export const getMaisonCortesImage = (productId: string): ImageEntry | null => maisonCortesImages[productId] ?? null;
