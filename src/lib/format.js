export function hex(value, width = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const text = Number(value).toString(16).toUpperCase()
  return `0x${width ? text.padStart(width, '0') : text}`
}

export function hexBytes(bytes, limit = 8) {
  if (!bytes || bytes.length === 0) return '—'
  const end = Math.min(bytes.length, limit)
  const shown = []
  for (let i = 0; i < end; i++) {
    shown.push(bytes[i].toString(16).toUpperCase().padStart(2, '0'))
  }
  return shown.join(' ') + (bytes.length > limit ? ' …' : '')
}

export function formatBytes(count) {
  if (count === null || count === undefined) return '—'
  if (count < 1024) return `${count} B`
  if (count < 1024 * 1024) {
    const value = count / 1024
    return `${Number.isInteger(value) ? value : value.toFixed(1)} KiB`
  }
  return `${(count / 1024 / 1024).toFixed(1)} MiB`
}

export function parseHexValue(text) {
  const cleaned = String(text ?? '')
    .trim()
    .replace(/^(?:#x|0x)/i, '')
    .replace(/[^0-9a-f]/gi, '')
  return cleaned ? parseInt(cleaned, 16) : 0
}

export function parseDecValue(text, fallback = 0) {
  const value = Number.parseInt(String(text ?? '').trim(), 10)
  return Number.isFinite(value) ? value : fallback
}

// Clamp an input event's value and write the normalized text back, so an
// invalid entry does not keep its raw text when the model value stays equal.
export function normalizedHex(event, bits = 16) {
  const parsed = parseHexValue(event.target.value)
  const value = bits >= 32 ? parsed >>> 0 : parsed & ((1 << bits) - 1)
  event.target.value = hex(value, bits / 4)
  return value
}

export function normalizedDec(event, max = 0xffff) {
  const value = Math.min(Math.max(parseDecValue(event.target.value), 0), max)
  event.target.value = String(value)
  return value
}

export function formatTime(seconds) {
  const sign = seconds < 0 ? '-' : ''
  const value = Math.abs(seconds)
  const minutes = Math.floor(value / 60)
  const rest = value - minutes * 60
  return `${sign}${minutes}:${rest.toFixed(2).padStart(5, '0')}`
}

export function jointColor(name) {
  const text = String(name)
  if (text.startsWith('left') || text.endsWith('_L')) return '#5b8cff'
  if (text.startsWith('right') || text.endsWith('_R')) return '#f5b942'
  return '#c4b5fd'
}

// SII strings are single-byte Latin-1; anything above 0xFF becomes `?`.
export function latin1Bytes(text) {
  const bytes = []
  for (const char of String(text ?? '')) {
    const code = char.codePointAt(0)
    bytes.push(code <= 0xff ? code : 0x3f)
  }
  return bytes
}

export function stringByteLength(text) {
  return latin1Bytes(text).length
}

// Packs up to four port nibbles into the SII General `portsWord`.
export function portsWord(ports) {
  let word = 0
  for (let index = 0; index < Math.min(ports?.length || 0, 4); index++) {
    word |= (Number(ports[index]) & 0x0f) << (index * 4)
  }
  return word
}
