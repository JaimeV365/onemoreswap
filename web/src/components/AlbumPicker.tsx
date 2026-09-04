import { useEffect, useMemo, useRef, useState } from 'react'
import { getAlbum } from '../lib/catalogue'
import {
  albumsAvailableToAdd,
  disableAlbum,
  enableAlbum,
  loadEnabledAlbums,
} from '../lib/enabledAlbums'
import { ConfirmDialog } from './ConfirmDialog'
import { FolderOpenIcon } from './icons'
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
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [hideId, setHideId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const available = useMemo(() => albumsAvailableToAdd(enabled), [enabled])
  const current = value ? getAlbum(value) : null
  const hideAlbum = hideId ? getAlbum(hideId) : null

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setAdding(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setAdding(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
    setOpen(false)
  }

  const confirmHide = () => {
    if (!hideId) return
    sync(disableAlbum(hideId))
    setHideId(null)
  }

  const selectAlbum = (id: string) => {
    onChange(id)
    setOpen(false)
    setAdding(false)
  }

  const folderPanel = (
    <div className={styles.panel} role="dialog" aria-label="Albums">
      {!enabled.length ? (
        <p className={styles.empty}>Add the albums you collect — only those will show here.</p>
      ) : (
        <ul className={styles.list}>
          {enabled.map((id) => {
            const album = getAlbum(id)
            if (!album) return null
            return (
              <li key={id} className={styles.listRow}>
                <button
                  type="button"
                  className={[
                    styles.option,
                    styles[album.accent],
                    value === id ? styles.active : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectAlbum(id)}
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
              </li>
            )
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div className={styles.addSection}>
          {!adding ? (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              Add album
            </button>
          ) : (
            <div className={styles.addMenu}>
              <span className={styles.addLabel}>Choose an album to track</span>
              {available.map((id) => {
                const album = getAlbum(id)!
                return (
                  <button
                    key={id}
                    type="button"
                    className={[styles.option, styles[album.accent]].join(' ')}
                    onClick={() => addAlbum(id)}
                  >
                    <span className={styles.name}>{album.name}</span>
                    <span className={styles.meta}>
                      {album.manufacturer} · {album.total} stickers
                    </span>
                  </button>
                )
              })}
              <button
                type="button"
                className={styles.cancelAdd}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!available.length && !enabled.length && (
        <p className={styles.empty}>No albums available.</p>
      )}
    </div>
  )

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          {current ? (
            <>
              <span className={styles.title}>{current.name}</span>
              <span className={styles.subtitle}>
                {current.manufacturer} · {current.total} stickers
              </span>
            </>
          ) : (
            <>
              <span className={styles.title}>No album selected</span>
              <span className={styles.subtitle}>Open the folder to add one</span>
            </>
          )}
        </div>
        <button
          type="button"
          className={[styles.folderBtn, open ? styles.folderBtnOpen : ''].filter(Boolean).join(' ')}
          aria-expanded={open}
          aria-controls="album-folder-panel"
          aria-label={open ? 'Close albums folder' : 'Open albums folder'}
          onClick={() => {
            setOpen((v) => !v)
            if (open) setAdding(false)
          }}
        >
          <FolderOpenIcon size={20} />
          <span>Albums</span>
        </button>
      </div>

      {open && (
        <div id="album-folder-panel">{folderPanel}</div>
      )}

      {/* Empty profile: open folder by default once */}
      {!enabled.length && !open && (
        <button
          type="button"
          className={styles.emptyPrompt}
          onClick={() => setOpen(true)}
        >
          Open albums folder to get started
        </button>
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
