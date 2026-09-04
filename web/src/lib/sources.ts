import { notifyLocalDataChanged } from './localDataEvents'
import { scopedStorageKey } from './profileScope'

const BUILTIN = ['WhatsApp', 'Facebook', 'Friend'] as const
const STORAGE_BASE = 'onemoreswap-sources-v1'

export type BuiltinSource = (typeof BUILTIN)[number]

export function builtinSources(): string[] {
  return [...BUILTIN]
}

export function loadCustomSources(): string[] {
  try {
    const raw =
      localStorage.getItem(scopedStorageKey(STORAGE_BASE)) ||
      localStorage.getItem(STORAGE_BASE)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data
      .map((s) => String(s).trim())
      .filter((s) => s && !BUILTIN.includes(s as BuiltinSource))
  } catch {
    return []
  }
}

function saveCustomSources(list: string[]) {
  localStorage.setItem(scopedStorageKey(STORAGE_BASE), JSON.stringify(list))
  notifyLocalDataChanged()
}

export function allSources(): string[] {
  return [...BUILTIN, ...loadCustomSources()]
}

export function addCustomSource(name: string): string[] {
  const cleaned = name.trim()
  if (!cleaned) return loadCustomSources()
  if (BUILTIN.includes(cleaned as BuiltinSource)) return loadCustomSources()
  const next = [...new Set([...loadCustomSources(), cleaned])]
  saveCustomSources(next)
  return next
}

export function renameCustomSource(from: string, to: string): string[] {
  const cleaned = to.trim()
  if (!cleaned || BUILTIN.includes(from as BuiltinSource)) return loadCustomSources()
  const next = loadCustomSources()
    .map((s) => (s === from ? cleaned : s))
    .filter((s) => s && !BUILTIN.includes(s as BuiltinSource))
  saveCustomSources([...new Set(next)])
  return loadCustomSources()
}

export function removeCustomSource(name: string): string[] {
  if (BUILTIN.includes(name as BuiltinSource)) return loadCustomSources()
  const next = loadCustomSources().filter((s) => s !== name)
  saveCustomSources(next)
  return next
}

export function isBuiltinSource(name: string): boolean {
  return BUILTIN.includes(name as BuiltinSource)
}
