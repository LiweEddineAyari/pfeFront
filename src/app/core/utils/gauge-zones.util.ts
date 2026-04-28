export type GaugePhase = 'tol' | 'ale' | 'app';

export interface GaugeZone {
  key: GaugePhase;
  label: string;
  color: string;
  value: number;
}

const GAUGE_ZONE_CONFIG: Record<GaugePhase, { label: string; color: string }> = {
  app: { label: 'App', color: '#ef4444' },
  ale: { label: 'Ale', color: '#facc15' },
  tol: { label: 'Tol', color: '#22c55e' },
};

export function getGaugeZones(
  seuilTolerance: number,
  seuilAlerte: number,
  seuilAppetence: number
): GaugeZone[] {
  const zones = [
    { key: 'tol' as const, value: seuilTolerance },
    { key: 'ale' as const, value: seuilAlerte },
    { key: 'app' as const, value: seuilAppetence },
  ];

  return zones
    .map((zone, index) => ({
      ...zone,
      label: GAUGE_ZONE_CONFIG[zone.key].label,
      color: GAUGE_ZONE_CONFIG[zone.key].color,
      order: index,
    }))
    .sort((a, b) => (a.value - b.value) || (a.order - b.order))
    .map(({ order, ...zone }) => zone);
}
