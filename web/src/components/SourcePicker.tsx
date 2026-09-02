import { useEffect, useState } from 'react'
import {
  addCustomSource,
  allSources,
  isBuiltinSource,
  loadCustomSources,
  removeCustomSource,
  renameCustomSource,
} from '../lib/sources'
import styles from './SourcePicker.module.css'

type SourcePickerProps = {
  value: string
  onChange: (source: string) => void
}

export function SourcePicker({ value, onChange }: SourcePickerProps) {
  const [sources, setSources] = useState(() => allSources())
  const [mode, setMode] = useState<'pick' | 'add' | 'edit'>('pick')
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    setSources(allSources())
  }, [])

  const refresh = () => setSources(allSources())

  const startAdd = () => {
    setMode('add')
    setDraft('')
    setEditing(null)
  }

  const startEdit = (name: string) => {
    if (isBuiltinSource(name)) return
    setMode('edit')
    setEditing(name)
    setDraft(name)
  }

  const cancel = () => {
    setMode('pick')
    setDraft('')
    setEditing(null)
  }

  const commitAdd = () => {
    const name = draft.trim()
    if (!name) return
    addCustomSource(name)
    refresh()
    onChange(name)
    cancel()
  }

  const commitEdit = () => {
    if (!editing) return
    const name = draft.trim()
    if (!name) return
    renameCustomSource(editing, name)
    refresh()
    if (value === editing) onChange(name)
    cancel()
  }

  const remove = (name: string) => {
    if (!confirm(`Remove custom source “${name}”?`)) return
    removeCustomSource(name)
    refresh()
    if (value === name) onChange(allSources()[0] || 'WhatsApp')
    cancel()
  }

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className={styles.wrap}>
        <span className={styles.label}>{mode === 'add' ? 'New source' : 'Edit source'}</span>
        <div className={styles.row}>
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. School group"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') mode === 'add' ? commitAdd() : commitEdit()
              if (e.key === 'Escape') cancel()
            }}
          />
          <button type="button" className={styles.btn} onClick={mode === 'add' ? commitAdd : commitEdit}>
            Save
          </button>
          <button type="button" className={styles.btnGhost} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const customs = loadCustomSources()

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Source</span>
      <div className={styles.row}>
        <select
          className={styles.select}
          value={sources.includes(value) ? value : sources[0]}
          onChange={(e) => {
            if (e.target.value === '__add__') {
              startAdd()
              return
            }
            onChange(e.target.value)
          }}
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="__add__">＋ Add source…</option>
        </select>
        {customs.includes(value) && (
          <>
            <button type="button" className={styles.btnGhost} onClick={() => startEdit(value)}>
              Edit
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => remove(value)}>
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  )
}
