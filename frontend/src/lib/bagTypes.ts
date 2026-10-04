import type { Order } from '../types'

// Keep the customer's catalogue labels exactly as supplied.
export const bagTypes = [
  'D cut 65gsm', 'Stiching non woven', 'Roto bag', 'Metalic Bopp',
  'Box bag machine made', 'Taffeta bag', 'Paper bag', 'Cottan bag', 'Other',
] as const

const aliases: Record<string, string> = {
  'Stiching non woven': 'stitching nonwoven',
  'Metalic Bopp': 'metallic bopp',
  'Cottan bag': 'cotton bag',
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function bagTypeSuggestions(query: string, orders: Pick<Order, 'bagType'>[], legacyValue = ''): string[] {
  const counts = new Map<string, number>()
  for (const order of orders) {
    if (order.bagType) counts.set(order.bagType, (counts.get(order.bagType) ?? 0) + 1)
  }
  const choices: string[] = [...bagTypes]
  // Existing orders must not lose a previously saved type just by being edited.
  if (legacyValue && !choices.includes(legacyValue)) choices.push(legacyValue)
  const words = normalize(query).split(' ').filter(Boolean)
  return choices
    .filter(choice => words.every(word => normalize(`${choice} ${aliases[choice] ?? ''}`).includes(word)))
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || choices.indexOf(a) - choices.indexOf(b))
}

export function bagSpecification(form: FormData) {
  const gsm = String(form.get('gsm') ?? '').trim()
  return { gsm: gsm ? Number(gsm) : null, bagColor: String(form.get('bagColor') ?? '').trim() || null }
}
