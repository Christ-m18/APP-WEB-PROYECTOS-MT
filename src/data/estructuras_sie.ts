export interface VoltajeOption {
  label: string
  value: string
}

export const VOLTAJES: VoltajeOption[] = [
  {
    label: 'Trifásico / Bifásico 12.47/7.2 kV',
    value: 'trifasico_bifasico',
  },
  {
    label: 'Monofásico 7.2 kV',
    value: 'monofasico',
  },
]
