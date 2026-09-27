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
        <button
          type="button"
          className={`${styles.titleActionBtn} ${styles.discordBtn}`}
          onClick={() => window.vibe?.openExternal?.('https://discord.gg/VC79KJWQQy')}
          title="Discord-сервер VibeLauncher"
          aria-label="Открыть Discord-сервер VibeLauncher"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={styles.discordIcon}>
            <path fill="currentColor" d="M19.54 4.64A16.2 16.2 0 0 0 15.5 3.4l-.5 1a15.2 15.2 0 0 0-6 0l-.5-1a16.3 16.3 0 0 0-4.05 1.25C1.89 8.43 1.2 12.1 1.54 15.73A16.2 16.2 0 0 0 6.5 18.25l1.2-1.63a9.55 9.55 0 0 1-1.9-.92l.46-.36c3.67 1.72 7.8 1.72 11.42 0l.57.45c-.6.36-1.24.67-1.9.92l1.2 1.63a16.1 16.1 0 0 0 4.96-2.52c.4-4.2-.67-7.84-2.98-11.18ZM8.84 13.5c-1.02 0-1.85-.94-1.85-2.1s.82-2.1 1.85-2.1c1.04 0 1.87.95 1.85 2.1 0 1.16-.82 2.1-1.85 2.1Zm6.32 0c-1.02 0-1.85-.94-1.85-2.1s.82-2.1 1.85-2.1c1.04 0 1.87.95 1.85 2.1 0 1.16-.81 2.1-1.85 2.1Z" />
          </svg>
          <span>Discord</span>
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
