import { useMemo, useState } from 'react'
import { getAlbum } from '../lib/catalogue'
import {
  albumsAvailableToAdd,
  disableAlbum,
  enableAlbum,
  loadEnabledAlbums,
} from '../lib/enabledAlbums'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './AlbumPicker.module.css'

type AlbumPickerProps = {
  value: string
  onChange: (albumId: string) => void
  onEnabledChange?: (enabled: string[]) => void
  allowRemove?: boolean
}

export function AlbumPicker({
  value,
  onChange,
  onEnabledChange,
  allowRemove = true,
}: AlbumPickerProps) {
  const [enabled, setEnabled] = useState(() => loadEnabledAlbums())
  const [adding, setAdding] = useState(false)
  const [hideId, setHideId] = useState<string | null>(null)

  const available = useMemo(() => albumsAvailableToAdd(enabled), [enabled])
  const hideAlbum = hideId ? getAlbum(hideId) : null

  const sync = (next: string[]) => {
    setEnabled(next)
    onEnabledChange?.(next)
    if (next.length && !next.includes(value)) onChange(next[0]!)
    if (!next.length) onChange('')
  }

  const addAlbum = (id: string) => {
    sync(enableAlbum(id))
    onChange(id)
    setAdding(false)
  }

  const confirmHide = () => {
    if (!hideId) return
    sync(disableAlbum(hideId))
    setHideId(null)
  }

  const addMenu = (
    <div className={styles.addMenu}>
      <span className={styles.addLabel}>Choose an album to track</span>
      {available.map((id) => {
        const album = getAlbum(id)!
        return (
          <button
            key={id}
            type="button"
            className={[styles.option, styles[album.accent], styles.addOption].join(' ')}
            onClick={() => addAlbum(id)}
          >
            <span className={styles.name}>{album.name}</span>
            <span className={styles.meta}>
              {album.manufacturer} · {album.total} stickers
            </span>
          </button>
        )
      })}
      {enabled.length > 0 && (
        <button type="button" className={styles.cancelAdd} onClick={() => setAdding(false)}>
          Cancel
        </button>
      )}
    </div>
  )

  if (!enabled.length) {
    return (
      <div className={styles.wrap}>
        <span className={styles.label}>Album</span>
        <div className={styles.empty}>
          <p>Add the albums you collect — only those will show here.</p>
        </div>
        {available.length ? addMenu : <p className={styles.empty}>No albums available.</p>}
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Album</span>
      <div className={styles.options}>
        {enabled.map((id) => {
          const album = getAlbum(id)
          if (!album) return null
          return (
            <div key={id} className={styles.optionWrap}>
              <button
                type="button"
                className={[
                  styles.option,
                  styles[album.accent],
                  value === id ? styles.active : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onChange(id)}
              >
                <span className={styles.name}>{album.name}</span>
                <span className={styles.meta}>
                  {album.manufacturer} · {album.total} stickers
                </span>
              </button>
              {allowRemove && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => setHideId(id)}
                  aria-label={`Hide ${album.name}`}
                >
                  Hide
                </button>
              )}
            </div>
          )
        })}
      </div>

      {available.length > 0 && (
        <div className={styles.addRow}>
          {!adding ? (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              Add album
            </button>
          ) : (
            addMenu
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!hideId}
        title={`Hide “${hideAlbum?.name || hideId}” from this profile?`}
        body="Sticker data stays on this device — you can add the album again later."
        confirmLabel="Hide album"
        cancelLabel="Keep"
        danger
        onConfirm={confirmHide}
        onCancel={() => setHideId(null)}
      />
    </div>
  )
}
