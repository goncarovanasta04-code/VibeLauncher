import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Versions from './pages/Versions'
import LoginModal from './components/LoginModal'
import SettingsModal from './components/SettingsModal'
import ModsModal from './components/ModsModal'
import ChangelogModal from './components/ChangelogModal'
import UpdateModal from './components/UpdateModal'
import ThemesModal from './components/ThemesModal'
import WelcomeModal from './components/WelcomeModal'
import AppSplashScreen from './components/AppSplashScreen'
import Monochrome3DBackground from './components/Monochrome3DBackground'
import { applyTheme, getCurrentTheme } from './utils/themeManager'
import LiquidGlassShader from './components/LiquidGlassShader'
import bgVideo from './assets/bg.mp4'
import bgImage from './assets/bg.jpg'
import packageInfo from '../package.json'
import { useLanguage } from './context/LanguageContext'
import styles from './App.module.css'

export default function App() {
  const { t } = useLanguage()
  const [appReady, setAppReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [localVersions, setLocalVersions] = useState([])
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showVersionsManager, setShowVersionsManager] = useState(false)
  const [showModsModal, setShowModsModal] = useState(false)
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [showThemesModal, setShowThemesModal] = useState(false)
  const [autoUpdateInfo, setAutoUpdateInfo] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [disableVideoBg, setDisableVideoBg] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => getCurrentTheme())
  const [bgLayers, setBgLayers] = useState({
    current: getCurrentTheme()?.bgImage || bgImage,
    prev: null,
    fading: false,
  })
  const videoRef = useRef(null)
  const cardRef = useRef(null)

  const checkSettings = async () => {
    const s = await window.vibe?.storeGet('settings')
    if (s?.potatoMode) {
      setDisableVideoBg(true)
      setEnableAnimations(false)
    } else {
      if (s?.disableVideoBg !== undefined) {
        setDisableVideoBg(Boolean(s.disableVideoBg))
      }
      if (s?.enableAnimations !== undefined) {
        setEnableAnimations(Boolean(s.enableAnimations))
      }
    }
  }

  const refreshLocalVersions = async () => {
    const locRes = await window.vibe?.getLocalVersions()
    if (locRes?.ok && locRes.versions) {
      setLocalVersions(locRes.versions)
    }
  }

  // Ensure video autoplays reliably in Electron & pauses when window is minimized/hidden or game is running
  useEffect(() => {
    const shouldPlay = !disableVideoBg && enableAnimations && !isGameRunning
    if (videoRef.current) {
      if (shouldPlay) {
        videoRef.current.defaultMuted = true
        videoRef.current.muted = true
        videoRef.current.play().catch(() => {
          console.warn('[App] Video autoplay prevented or unavailable')
        })
      } else {
        videoRef.current.pause()
      }
    }

    const handleVisibility = () => {
      if (document.hidden || isGameRunning || !enableAnimations) {
        videoRef.current?.pause()
      } else if (!disableVideoBg) {
        videoRef.current?.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [disableVideoBg, enableAnimations, isGameRunning])

  // Listen to immediate theme changes and crossfade background wallpapers
  useEffect(() => {
    const onThemeChange = (e) => {
      const newTheme = e.detail
      if (newTheme) {
        setCurrentTheme(newTheme)
        const nextBg = newTheme.bgImage || bgImage
        setBgLayers((old) => {
          if (old.current === nextBg) return old
          return {
            current: nextBg,
            prev: old.current,
            fading: true,
          }
        })
        setTimeout(() => {
          setBgLayers((old) => ({
            ...old,
            prev: null,
            fading: false,
          }))
        }, 800)
      }
    }
    window.addEventListener('vibe-theme-changed', onThemeChange)
    return () => window.removeEventListener('vibe-theme-changed', onThemeChange)
  }, [])

  // Load saved profile & local versions on start
  useEffect(() => {
    const load = async () => {
      // Apply saved theme (default to minimal-3d flying cubes)
      const savedTheme = await window.vibe?.storeGet('settings.theme')
      if (savedTheme && savedTheme !== 'glacier-ice') {
        applyTheme(savedTheme)
      } else {
        applyTheme('minimal-3d')
        window.vibe?.storeSet?.('settings.theme', 'minimal-3d')
      }

      await checkSettings()
      await loadAccountsAndProfile()

      await refreshLocalVersions()

      // Check first-time onboarding tutorial
      try {
        const onboardingDone = await window.vibe?.storeGet('settings.onboardingCompleted')
        const lsDone = localStorage.getItem('vibelauncher_onboarding_done')
        if (!onboardingDone && !lsDone) {
          setShowWelcomeModal(true)
        }
      } catch (e) {}

      // Silent background check for updates after 3s
      setTimeout(async () => {
        try {
          const updateRes = await window.vibe?.checkForUpdates()
          if (updateRes?.available) {
            setAutoUpdateInfo(updateRes)
          }
        } catch (e) {}
      }, 3000)
    }
    load()

    // Sync game running status directly with Minecraft process window state
    const handleGameStarted = () => setIsGameRunning(true)
    const handleGameStopped = () => setIsGameRunning(false)
    window.vibe?.onGameStarted?.(handleGameStarted)
    window.vibe?.onGameStopped?.(handleGameStopped)

    return () => {
      window.vibe?.offGameStarted?.()
      window.vibe?.offGameStopped?.()
    }
  }, [])

  const loadAccountsAndProfile = async () => {
    // 1. Profile
    let saved = await window.vibe?.storeGet('profile')
    if (!saved || !saved.username) {
      try {
        const ls = localStorage.getItem('vibelauncher_profile')
        if (ls) saved = JSON.parse(ls)
      } catch (e) {}
    }
    if (saved && saved.username) {
      setProfile(saved)
    }

    // 2. Accounts list
    let savedAccs = await window.vibe?.storeGet('accounts')
    if (!Array.isArray(savedAccs) || savedAccs.length === 0) {
      try {
        const ls = localStorage.getItem('vibelauncher_accounts')
        if (ls) savedAccs = JSON.parse(ls)
      } catch (e) {}
    }
    if (Array.isArray(savedAccs) && savedAccs.length > 0) {
      const valid = savedAccs.filter((a) => a && a.username)
      setAccounts(valid)
      if (!saved && valid.length > 0) {
        setProfile(valid[0])
        window.vibe?.storeSet('profile', valid[0])
        try {
          localStorage.setItem('vibelauncher_profile', JSON.stringify(valid[0]))
        } catch (e) {}
      }
    } else if (saved && saved.username) {
      setAccounts([saved])
      window.vibe?.storeSet('accounts', [saved])
      try {
        localStorage.setItem('vibelauncher_accounts', JSON.stringify([saved]))
      } catch (e) {}
    }
  }

  const handleLogin = (newProfile) => {
    setProfile(newProfile)
    window.vibe?.storeSet('profile', newProfile)
    try {
      localStorage.setItem('vibelauncher_profile', JSON.stringify(newProfile))
    } catch (e) {}

    setAccounts((prev) => {
      const list = Array.isArray(prev) ? prev : []
      const filtered = list.filter(
        (a) => !(a.username === newProfile.username && a.authType === newProfile.authType)
      )
      const updated = [newProfile, ...filtered]
      window.vibe?.storeSet('accounts', updated)
      try {
        localStorage.setItem('vibelauncher_accounts', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
    setShowLogin(false)
  }

  const handleSelectAccount = (acc) => {
    setProfile(acc)
    window.vibe?.storeSet('profile', acc)
    try {
      localStorage.setItem('vibelauncher_profile', JSON.stringify(acc))
    } catch (e) {}
  }

  const handleDeleteAccount = (accToDelete) => {
    setAccounts((prev) => {
      const updated = prev.filter(
        (a) => !(a.username === accToDelete.username && a.authType === accToDelete.authType)
      )
      window.vibe?.storeSet('accounts', updated)
      try {
        localStorage.setItem('vibelauncher_accounts', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
    if (profile?.username === accToDelete.username && profile?.authType === accToDelete.authType) {
      setProfile(null)
      window.vibe?.storeDelete('profile')
      try {
        localStorage.removeItem('vibelauncher_profile')
      } catch (e) {}
    }
  }

  return (
    <div className={styles.root}>
      {/* 3D Interactive Void Background (Floating 3D wireframe polyhedra & horizon grid) */}
      {(currentTheme?.is3D || currentTheme?.is3DMonochrome) && (
        <Monochrome3DBackground
          paused={isGameRunning || !enableAnimations}
          colorMode={currentTheme?.colorMode || 'monochrome'}
          sceneType={currentTheme?.sceneType || 'minimal-void'}
        />
      )}

      {/* Solid Plain Minimalist Background for Clean Black or Clean White */}
      {currentTheme?.isPlainBg && (
        <div
          className={styles.plainBg}
          style={{ backgroundColor: currentTheme.bgColor || '#000000' }}
        />
      )}

      {/* Dynamic Theme Minecraft Wallpaper with smooth cross-fade */}
      {!currentTheme?.is3D && !currentTheme?.is3DMonochrome && !currentTheme?.isPlainBg && (
        <div className={styles.bgContainer}>
          {bgLayers.prev && (
            <div
              className={`${styles.bgLayer} ${bgLayers.fading ? styles.bgLayerFading : styles.bgLayerActive}`}
              style={{ backgroundImage: `url(${bgLayers.prev})` }}
            />
          )}
          <div
            className={`${styles.bgLayer} ${styles.bgLayerActive}`}
            style={{ backgroundImage: `url(${bgLayers.current})` }}
          />
        </div>
      )}

      {/* Atmospheric Live Video Background (Only for active video theme) */}
      {!disableVideoBg && currentTheme?.isVideo && (
        <video
          ref={videoRef}
          src={bgVideo}
          autoPlay
          loop
          muted
          playsInline
          className={`${styles.bgVideo} ${videoLoaded ? styles.bgVideoVisible : ''} ${styles.bgVideoPrimary}`}
          onLoadedData={() => setVideoLoaded(true)}
          onPlaying={() => setVideoLoaded(true)}
          onCanPlayThrough={() => setVideoLoaded(true)}
          onError={(e) => {
            console.warn('Video failed, hiding video layer')
            e.target.style.display = 'none'
          }}
        />
      )}

      <div
        className={`${styles.bgOverlay} ${
          currentTheme?.isPlainBg
            ? styles.bgOverlayHidden
            : (currentTheme?.is3D || currentTheme?.is3DMonochrome)
            ? styles.bgOverlay3D
            : ''
        }`}
      />

      {/* Minimal Title Bar: Top-Left Brand + Темы */}
      <TitleBar
        onOpenThemes={() => setShowThemesModal(true)}
      />

      {/* Main Page Content */}
      <main className={styles.mainContent}>
        <Home
          profile={profile}
          setProfile={setProfile}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onDeleteAccount={handleDeleteAccount}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
          cardRef={cardRef}
          onGameRunningChange={setIsGameRunning}
          onNavigate={(target) => {
            if (target === 'settings') setShowSettings(true)
            else if (target === 'versions') {
              refreshLocalVersions()
              setShowVersionsManager(true)
            } else if (target === 'mods') {
              refreshLocalVersions()
              setShowModsModal(true)
            } else if (target === 'changelog') {
              setShowChangelogModal(true)
            }
          }}
          onLoginRequest={() => setShowLogin(true)}
        />
      </main>

      {/* Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      {/* Themes Modal (🎨) */}
      {showThemesModal && (
        <ThemesModal onClose={() => setShowThemesModal(false)} />
      )}

      {/* Settings Modal (☰) */}
      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false)
            checkSettings()
          }}
          onOpenWelcome={() => {
            setShowSettings(false)
            setShowWelcomeModal(true)
          }}
        />
      )}

      {/* Welcome & Onboarding Tutorial Modal */}
      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          onOpenLogin={() => setShowLogin(true)}
        />
      )}

      {/* Mods, Shaders & Resourcepacks Modal (🧩) */}
      {showModsModal && (
        <ModsModal
          activeVersion={selectedVersion || { id: '1.16.5', label: 'Fabric 1.16.5', type: 'fabric' }}
          localVersions={localVersions}
          onSelectVersion={(v) => {
            setSelectedVersion(v)
            window.vibe?.storeSet('lastVersion', v)
            refreshLocalVersions()
          }}
          onClose={() => {
            setShowModsModal(false)
            refreshLocalVersions()
          }}
        />
      )}

      {/* Changelog Modal */}
      {showChangelogModal && (
        <ChangelogModal onClose={() => setShowChangelogModal(false)} />
      )}

      {/* Versions Manager Modal */}
      {showVersionsManager && (
        <div className={styles.modalOverlay} onClick={() => setShowVersionsManager(false)}>
          <div className={`${styles.versionsModal} glass`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t('versions_manager_title')}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowVersionsManager(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <Versions
                onSelectVersion={(v) => {
                  setSelectedVersion(v)
                  setShowVersionsManager(false)
                  refreshLocalVersions()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Auto Update Modal on Detection */}
      {autoUpdateInfo && (
        <UpdateModal
          updateInfo={autoUpdateInfo}
          onClose={() => setAutoUpdateInfo(null)}
        />
      )}

      {/* Subtle Version Watermark in Bottom-Right Corner */}
      <div
        className={styles.versionWatermark}
        onClick={() => setShowChangelogModal(true)}
        title={t('version_watermark_tip', { version: packageInfo.version })}
      >
        <span className={styles.versionDot} />
        <span className={styles.versionText}>v{packageInfo.version} • VibeLauncher</span>
      </div>

      {/* Startup Screen (Splash Loader) */}
      {!appReady && (
        <AppSplashScreen onReady={() => setAppReady(true)} />
      )}
    </div>
  )
}

