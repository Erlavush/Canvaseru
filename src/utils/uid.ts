/** Generates a short random unique ID */
export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
