import styles from './TitleBar.module.css'
import { X, Minus, Square, Palette } from 'lucide-react'
import logoIcon from '../assets/icon.png'
import { useLanguage } from '../context/LanguageContext'

export default function TitleBar({ onOpenThemes }) {
  const { t } = useLanguage()

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
          title={t('titlebar_themes_tip')}
        >
          <Palette size={13} />
          <span>{t('titlebar_themes')}</span>
        </button>
      </div>

      <div className={styles.dragArea} />

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => window.vibe?.minimize()}
          title={t('titlebar_minimize')}
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => window.vibe?.maximize()}
          title={t('titlebar_maximize')}
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          className={`${styles.ctrl} ${styles.ctrlClose}`}
          onClick={() => window.vibe?.close()}
          title={t('titlebar_close')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
