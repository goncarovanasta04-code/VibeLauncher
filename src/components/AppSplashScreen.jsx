import { useState, useEffect } from 'react'
import launcherIcon from '../assets/icon.png'
import packageInfo from '../../package.json'
import styles from './AppSplashScreen.module.css'

/**
 * Compact rectangular startup splash screen.
 * Modern, sleek horizontal layout with liquid glass styling, live initialization steps,
 * and high-performance smooth animations.
 */
export default function AppSplashScreen({ onReady }) {
  const [progress, setProgress] = useState(15)
  const [statusText, setStatusText] = useState('Инициализация ядра...')
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    const runInitSequence = async () => {
      try {
        // Step 1: Load settings
        if (!isMounted) return
        setStatusText('Загрузка конфигурации...')
        setProgress(30)
        await window.vibe?.storeGet('settings')

        // Step 2: Initialize Theme & Profile
        await new Promise((r) => setTimeout(r, 200))
        if (!isMounted) return
        setStatusText('Проверка профиля игрока...')
        setProgress(60)
        await window.vibe?.storeGet('profile')

        // Step 3: Scan installed Minecraft builds
        await new Promise((r) => setTimeout(r, 220))
        if (!isMounted) return
        setStatusText('Синхронизация игровых сборок...')
        setProgress(85)
        await window.vibe?.getLocalVersions?.()

        // Step 4: Finalize
        await new Promise((r) => setTimeout(r, 180))
        if (!isMounted) return
        setStatusText('Готово к запуску!')
        setProgress(100)

        await new Promise((r) => setTimeout(r, 250))
        if (!isMounted) return
        setFadingOut(true)

        setTimeout(() => {
          if (isMounted) onReady?.()
        }, 450)
      } catch (err) {
        console.error('[SplashScreen] Init error:', err)
        setFadingOut(true)
        setTimeout(() => {
          if (isMounted) onReady?.()
        }, 200)
      }
    }

    runInitSequence()

    return () => {
      isMounted = false
    }
  }, [onReady])

  return (
    <div className={`${styles.splashOverlay} ${fadingOut ? styles.splashFadeOut : ''}`}>
      {/* Compact Rectangular Glass Splash Card */}
      <div className={styles.splashCard}>
        <div className={styles.ambientGlow} />

        {/* Left: Compact Glowing Icon */}
        <div className={styles.iconCol}>
          <div className={styles.iconGlowHalo} />
          <img src={launcherIcon} alt="VibeLauncher" className={styles.launcherIcon} />
        </div>

        {/* Right: Content Column */}
        <div className={styles.contentCol}>
          <div className={styles.headerRow}>
            <div className={styles.titleWrap}>
              <span className={styles.titleBold}>VIBE</span>
              <span className={styles.titleThin}>LAUNCHER</span>
            </div>
            <span className={styles.versionPill}>v{packageInfo.version}</span>
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusText}>{statusText}</span>
            <span className={styles.pctText}>{progress}%</span>
          </div>

          {/* Slim Neon Progress Bar */}
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }}>
              <div className={styles.progressGlowHead} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
