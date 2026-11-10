const tools = [
  { id: 'parser', prompt: /eeprom|ethercat|\b(sii|esi|bin)\b|转储/i, file: /\.bin$/i },
  { id: 'replay', prompt: /机器人|回放|关节|日志|姿态|骨架|波形|\b(ros[12]?|bag|mcap|sqlite|urdf|stl|imu|jointstate)\b/i, file: /\.(bag|active|mcap|db3|log|txt|urdf|stl|dae|obj|xacro)$/i },
  { id: 'convert', prompt: /\b(kicad|altium|specctra|eagle|pads|eda|pcb)\b|原理图|电路|布线/i, file: /\.(pcbdoc|schdoc|prjpcb|dsn|ses|asc|brd|sch|edif)$/i },
]

export function resolveTool(prompt, files = []) {
  const matches = tools.filter((tool) => tool.prompt.test(prompt) || files.some((file) => tool.file.test(file.name)))
  if (matches.length !== 1) return null
  if (matches[0].id === 'parser' && files.length > 1) return null
  return matches[0].id
}

// Keep attachments in memory only; each tool still validates files on arrival.
let pending = null

export function queueFiles(toolId, files) {
  pending = { toolId, files: Array.from(files) }
}

export function takeQueuedFiles(toolId) {
  if (pending?.toolId !== toolId) return []
  const files = pending.files
  pending = null
  return files
}
