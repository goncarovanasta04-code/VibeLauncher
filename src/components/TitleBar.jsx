import styles from './TitleBar.module.css'
import { X, Minus, Square, Palette } from 'lucide-react'
import logoIcon from '../assets/icon.png'

export default function TitleBar({ onOpenThemes }) {
  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <img src={logoIcon} alt="VibeLauncher" className={styles.brandIcon} />
        <span className={styles.brandName}>VibeLauncher</span>
      </div>

      <div className={styles.quickLinks}>
        <button
          type="button"
          className={styles.titleActionBtn}
          onClick={onOpenThemes}
          title="Сменить тему оформления и фон"
        >
          <Palette size={13} />
          <span>Темы</span>
        </button>
      </div>

      <div className={styles.dragArea} />

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => window.vibe?.minimize()}
          title="Свернуть"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => window.vibe?.maximize()}
          title="Развернуть"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          className={`${styles.ctrl} ${styles.ctrlClose}`}
          onClick={() => window.vibe?.close()}
          title="Закрыть"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
