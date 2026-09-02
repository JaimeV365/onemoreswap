import { getAlbum, getAlbumIds } from '../lib/catalogue'
import styles from './AlbumPicker.module.css'

type AlbumPickerProps = {
  value: string
  onChange: (albumId: string) => void
}

export function AlbumPicker({ value, onChange }: AlbumPickerProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Album</span>
      <div className={styles.options}>
        {getAlbumIds().map((id) => {
          const album = getAlbum(id)!
          return (
            <button
              key={id}
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
              <span className={styles.meta}>{album.manufacturer} · {album.total} stickers</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
