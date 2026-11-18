export const springs = {
  press: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 1 },
  panel: { type: 'spring' as const, stiffness: 360, damping: 34, mass: 1 },
  rubber: { type: 'spring' as const, stiffness: 260, damping: 23, mass: 1 },
  layout: { type: 'spring' as const, stiffness: 450, damping: 42, mass: 1 },
};

export function rubberBand(distance: number, limit = 72): number {
  return Math.sign(distance) * limit * (1 - Math.exp(-Math.abs(distance) / limit));
}
