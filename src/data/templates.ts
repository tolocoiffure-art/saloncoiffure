export type TemplateModel = 'frontend' | 'experience' | 'boutique' | 'backend_light' | 'backend_heavy' | 'engine';

export type PlanCode = '999' | '1249' | '1500' | 'avance';

export type TemplateDefinition = {
  id: string;
  models: TemplateModel[];
  plans: PlanCode[] | [];
  tags?: string[];
};

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // Frontend variants (plans 999 / 1249 / 1500)
  { id: 'pedro', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['moving'] },
  { id: 'lausanne', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['moving'] },
  { id: 'urgent', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['moving', 'urgent'] },
  { id: 'debarras', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['clearance'] },
  { id: 'transport', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['transport'] },
  { id: 'videmaison', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['clearance'] },
  { id: 'videsuccession', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['clearance'] },
  { id: 'nettoyagesuccession', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['cleaning'] },
  { id: 'lausannenettoyage', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['cleaning'] },
  { id: 'etatdeslieux', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['inspection'] },
  { id: 'ateliermemoire', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['restoration'] },
  { id: 'tolo-coiffure', models: ['frontend'], plans: ['999', '1249', '1500'], tags: ['beauty'] },

  // Model-specific (no 999/1249/1500)
  { id: 'laclemanexperience', models: ['experience'], plans: [] },
  { id: 'maison-cortes', models: ['boutique', 'backend_light'], plans: ['avance'] },

  // TonSiteWeb engine / backend-light (Avancé)
  { id: 'tonsiteweb', models: ['backend_light', 'engine'], plans: ['avance'] },
];
