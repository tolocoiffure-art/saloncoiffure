export type BrandKey =
  | 'pedro'
  | 'lausanne'
  | 'urgent'
  | 'debarras'
  | 'transport'
  | 'videmaison'
  | 'videsuccession'
  | 'nettoyagesuccession'
  | 'etatdeslieux'
  | 'lausannenettoyage'
  | 'laclemanexperience'
  | 'tolo-coiffure'
  | 'maisoncortes'
  | 'ateliermemoire'
  | 'tonsiteweb';

/**
 * Map request host to a brand key. Default to "pedro" if unknown.
 */
export function getBrandFromHost(host: string | null | undefined): BrandKey {
  const value = (host || '').toLowerCase();
  if (!value) return 'pedro';

  if (value.includes('lausannedemenagement.ch')) return 'lausanne';
  if (value.includes('demenagementurgent.ch')) return 'urgent';
  if (value.includes('debarraslausanne.ch')) return 'debarras';
  if (value.includes('transportmeubles.ch')) return 'transport';
  if (value.includes('videmaison.ch')) return 'videmaison';
  if (value.includes('videsuccession.ch')) return 'videsuccession';
  if (value.includes('nettoyagesuccession.ch')) return 'nettoyagesuccession';
  if (value.includes('etatdeslieuxlausanne.ch')) return 'etatdeslieux';
  if (value.includes('lausannenettoyage.ch')) return 'lausannenettoyage';
  if (value.includes('laclemanexperience.ch')) return 'laclemanexperience';
  if (value.includes('tolocoiffure.ch')) return 'tolo-coiffure';
  if (value.includes('maisoncortes.')) return 'maisoncortes';
  if (value.includes('ateliermemoire.ch')) return 'ateliermemoire';
  if (value.includes('tonsiteweb.ch') || value.includes('tonwebsite.ch')) return 'tonsiteweb';
  return 'pedro';
}
