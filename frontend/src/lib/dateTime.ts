const indiaDate = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
})
const indiaTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
})

function parsedDate(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDate(value?: string) {
  const parsed = parsedDate(value)
  return parsed ? indiaDate.format(parsed) : 'Not recorded'
}

export function formatDateTime(value?: string) {
  const parsed = parsedDate(value)
  return parsed ? `${indiaDate.format(parsed)} · ${indiaTime.format(parsed)} IST` : 'Not recorded'
}
