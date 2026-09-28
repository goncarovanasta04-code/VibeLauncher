import { lazy, Suspense, useState, useEffect, useRef, startTransition } from 'react'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import AppSplashScreen from './components/AppSplashScreen'
import Monochrome3DBackground from './components/Monochrome3DBackground'
import { THEMES, applyTheme, applyInterfaceTheme, getCurrentTheme } from './utils/themeManager'
import bgVideo from './assets/bg.mp4'
import bgImage from './assets/bg.jpg'
import packageInfo from '../package.json'
import { useLanguage } from './context/LanguageContext'
import { configureUiSounds } from './utils/uiSound'
import styles from './App.module.css'

const Versions = lazy(() => import('./pages/Versions'))
const LoginModal = lazy(() => import('./components/LoginModal'))
const SettingsModal = lazy(() => import('./components/SettingsModal'))
const ModsModal = lazy(() => import('./components/ModsModal'))
const ChangelogModal = lazy(() => import('./components/ChangelogModal'))
const UpdateModal = lazy(() => import('./components/UpdateModal'))
const ThemesModal = lazy(() => import('./components/ThemesModal'))
const WelcomeModal = lazy(() => import('./components/WelcomeModal'))

export default function App() {
  const { t } = useLanguage()
  const [appReady, setAppReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [localVersions, setLocalVersions] = useState([])
  const [showLogin, setShowLogin] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [showThemesModal, setShowThemesModal] = useState(false)
  const [activePage, setActivePage] = useState('home')
  const [autoUpdateInfo, setAutoUpdateInfo] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [disableVideoBg, setDisableVideoBg] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(false)
  const [liquidGlassFps, setLiquidGlassFps] = useState(30)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => getCurrentTheme())
  const [bgLayers, setBgLayers] = useState({
    current: getCurrentTheme()?.bgImage || bgImage,
    prev: null,
    fading: false,
  })
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const sceneCanvasRef = useRef(null)
  // A tiny off-screen render of the static wallpaper.  The WebGL glass samples
  // this canvas instead of a still <img>, so the refraction travels with the
  // Ken Burns background just like it does with the 3D canvas.
  const wallpaperCanvasRef = useRef(null)
  const wallpaperMotionStartRef = useRef(performance.now())

  const checkSettings = async () => {
    const s = await window.vibe?.storeGet('settings')
    configureUiSounds(s || {})
    applyInterfaceTheme(s?.interfaceTheme || 'graphite')
    if (s?.potatoMode) {
      setDisableVideoBg(true)
      setEnableAnimations(false)
      setLiquidGlassEnabled(false)
      setLiquidGlassFps(15)
    } else {
      if (s?.disableVideoBg !== undefined) {
        setDisableVideoBg(Boolean(s.disableVideoBg))
      }
      if (s?.enableAnimations !== undefined) {
        setEnableAnimations(Boolean(s.enableAnimations))
      }
      setLiquidGlassEnabled(Boolean(s?.liquidGlass))
      setLiquidGlassFps(Math.max(15, Math.min(60, Number(s?.liquidGlassFps) || 30)))
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('liquid-glass-enabled', liquidGlassEnabled)
    return () => document.documentElement.classList.remove('liquid-glass-enabled')
  }, [liquidGlassEnabled])

  useEffect(() => {
    const canvas = wallpaperCanvasRef.current
    if (!canvas || currentTheme?.is3D || currentTheme?.is3DMonochrome || currentTheme?.isPlainBg) return undefined

    const currentImage = new Image()
    const previousImage = bgLayers.prev ? new Image() : null
    let animationFrame = null
    let lastDrawAt = 0
    let active = true
    let currentReady = false
    let previousReady = !previousImage
    let transitionStartedAt = null

    const easeOut = (value) => 1 - Math.pow(1 - value, 3)
    const drawLayer = (ctx, image, width, height, phase, opacity) => {
      if (!image || !opacity) return
      const zoom = 1.05 + Math.sin(phase) * 0.035
      const driftX = Math.sin(phase * 0.72) * width * 0.005
      const driftY = Math.cos(phase * 0.58) * height * 0.0035
      const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom
      const drawWidth = image.naturalWidth * cover
      const drawHeight = image.naturalHeight * cover
      ctx.globalAlpha = opacity
      ctx.drawImage(image, (width - drawWidth) / 2 + driftX, (height - drawHeight) / 2 + driftY, drawWidth, drawHeight)
    }

    const drawWallpaper = (now) => {
      if (!active) return
      animationFrame = null
      // Outside the launch page the wallpaper is deliberately still.  This
      // preserves the visual hierarchy of utility pages and stops needless
      // canvas work while browsing catalogues and settings.
      const shouldAnimate = enableAnimations && activePage === 'home' && !isGameRunning
      const targetFps = liquidGlassEnabled ? liquidGlassFps : 24
      if (shouldAnimate && now - lastDrawAt < 1000 / targetFps) {
        animationFrame = requestAnimationFrame(drawWallpaper)
        return
      }
      if (!currentReady) {
        if (shouldAnimate) animationFrame = requestAnimationFrame(drawWallpaper)
        return
      }
      lastDrawAt = now

      const width = Math.max(1, window.innerWidth)
      const height = Math.max(1, window.innerHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const pixelWidth = Math.round(width * dpr)
      const pixelHeight = Math.round(height * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return
      const elapsed = (now - wallpaperMotionStartRef.current) / 18000
      const phase = elapsed * Math.PI * 2
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      if (previousImage && previousReady && bgLayers.fading) {
        if (transitionStartedAt === null) transitionStartedAt = now
        const progress = Math.min(1, (now - transitionStartedAt) / 820)
        const eased = easeOut(progress)
        drawLayer(ctx, previousImage, width, height, phase, 1 - eased)
        drawLayer(ctx, currentImage, width, height, phase, eased)
      } else {
        drawLayer(ctx, currentImage, width, height, phase, 1)
      }
      ctx.globalAlpha = 1
      if (shouldAnimate) animationFrame = requestAnimationFrame(drawWallpaper)
    }

    currentImage.onload = () => {
      currentReady = true
      if (!(enableAnimations && activePage === 'home' && !isGameRunning)) drawWallpaper(performance.now())
    }
    currentImage.src = bgLayers.current
    if (previousImage) {
      previousImage.onload = () => { previousReady = true }
      previousImage.src = bgLayers.prev
    }
    if (currentImage.complete && currentImage.naturalWidth) currentReady = true
    if (previousImage?.complete && previousImage.naturalWidth) previousReady = true
    drawWallpaper(performance.now())
    return () => {
      active = false
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [bgLayers.current, bgLayers.prev, bgLayers.fading, currentTheme?.is3D, currentTheme?.is3DMonochrome, currentTheme?.isPlainBg, enableAnimations, activePage, isGameRunning, liquidGlassEnabled, liquidGlassFps])

  useEffect(() => {
    const onInterfaceThemeChange = ({ detail }) => {
      // Interface theme changes no longer disable liquid glass
    }
    window.addEventListener('vibe-interface-theme-changed', onInterfaceThemeChange)
    return () => window.removeEventListener('vibe-interface-theme-changed', onInterfaceThemeChange)
  }, [])

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
        }, 1200)
      }
    }
    window.addEventListener('vibe-theme-changed', onThemeChange)
    return () => window.removeEventListener('vibe-theme-changed', onThemeChange)
  }, [])

  // Auto-slideshow of static wallpapers with smooth Ken Burns zoom
  const [slideshowActive, setSlideshowActive] = useState(false)

  useEffect(() => {
    window.__vibeAutoSlideshowActive = slideshowActive
    const handleToggle = (e) => {
      const nextState = e.detail?.active !== undefined ? e.detail.active : !slideshowActive
      setSlideshowActive(nextState)
      window.__vibeAutoSlideshowActive = nextState
      try {
        localStorage.setItem('vibelauncher_auto_slideshow', String(nextState))
      } catch (err) {}
      window.dispatchEvent(new CustomEvent('vibe-slideshow-state-changed', { detail: { active: nextState } }))
    }
    window.addEventListener('vibe-slideshow-toggle', handleToggle)
    return () => window.removeEventListener('vibe-slideshow-toggle', handleToggle)
  }, [slideshowActive])

  const currentThemeRef = useRef(currentTheme)
  useEffect(() => {
    currentThemeRef.current = currentTheme
  }, [currentTheme])

  useEffect(() => {
    if (!slideshowActive) return
    const wallpaperList = THEMES.filter((t) => t.bgImage && !t.is3D && !t.is3DMonochrome && !t.isPlainBg && !t.isVideo)
    if (wallpaperList.length === 0) return

    const timer = setInterval(() => {
      const curId = currentThemeRef.current?.id
      let idx = wallpaperList.findIndex((t) => t.id === curId)
      if (idx === -1) idx = 0
      const nextIdx = (idx + 1) % wallpaperList.length
      applyTheme(wallpaperList[nextIdx].id)
    }, 6000)

    return () => clearInterval(timer)
  }, [slideshowActive])

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

      // Load saved version on start
      try {
        let savedVer = await window.vibe?.storeGet('lastVersion')
        if (!savedVer) {
          const ls = localStorage.getItem('vibelauncher_last_version')
          if (ls) savedVer = JSON.parse(ls)
        }
        if (savedVer) {
          setSelectedVersion(savedVer)
        }
      } catch (e) {}

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

  const handleNavigate = (page) => {
    if (page === 'changelog') {
      setShowChangelogModal(true)
      return
    }
    if (page === 'themes') {
      setShowThemesModal(true)
      return
    }
    startTransition(() => setActivePage(page))
  }

  return (
    <div className={`${styles.root} ${currentTheme?.category === 'art' ? styles.staticArtTheme : ''} ${activePage !== 'home' ? styles.utilityPage : ''}`}>
      {/* 3D Interactive Void Background (Floating 3D wireframe polyhedra & horizon grid) */}
      {(currentTheme?.is3D || currentTheme?.is3DMonochrome) && (
        <Monochrome3DBackground
          paused={isGameRunning || !enableAnimations}
          colorMode={currentTheme?.colorMode || 'monochrome'}
          sceneType={currentTheme?.sceneType || 'minimal-void'}
          externalCanvasRef={sceneCanvasRef}
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
          {/* This same canvas is both the visible wallpaper and the source of
              refraction.  One timeline means the lens cannot drift behind it. */}
          <canvas ref={wallpaperCanvasRef} className={styles.wallpaperSource} aria-hidden="true" />
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

      <AppShell
        activePage={activePage}
        onNavigate={handleNavigate}
        profile={profile}
        accounts={accounts}
        onSelectAccount={handleSelectAccount}
        onDeleteAccount={handleDeleteAccount}
        onLogin={() => setShowLogin(true)}
        onOpenThemes={() => setShowThemesModal(true)}
      >
      <Suspense fallback={<div className={styles.pageLoading} aria-label="Загрузка страницы" />}>
        {activePage === 'home' && <Home
          profile={profile}
          setProfile={setProfile}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onDeleteAccount={handleDeleteAccount}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
          cardRef={cardRef}
          liquidSourceCanvasRef={
            (currentTheme?.is3D || currentTheme?.is3DMonochrome)
              ? sceneCanvasRef
              : currentTheme?.isVideo
                ? videoRef
                : wallpaperCanvasRef
          }
          liquidLensEnabled={liquidGlassEnabled && enableAnimations && !isGameRunning}
          liquidLensFps={liquidGlassFps}
          onGameRunningChange={setIsGameRunning}
          onNavigate={(target) => handleNavigate(target === 'mods' ? 'catalog' : target)}
          onLoginRequest={() => setShowLogin(true)}
          showProfileControl={false}
        />}

        {activePage === 'versions' && (
          <div className={styles.pageWorkspace}>
            <Versions onSelectVersion={(version) => { setSelectedVersion(version); window.vibe?.storeSet('lastVersion', version); setActivePage('home') }} />
          </div>
        )}

        {activePage === 'catalog' && (
          <ModsModal
            embedded
            activeVersion={selectedVersion || { id: '1.16.5', label: 'Fabric 1.16.5', type: 'fabric' }}
            localVersions={localVersions}
            onSelectVersion={(version) => { setSelectedVersion(version); window.vibe?.storeSet('lastVersion', version); refreshLocalVersions() }}
          />
        )}

        {activePage === 'settings' && (
          <SettingsModal
            embedded
            onClose={() => { setActivePage('home'); checkSettings() }}
            onOpenWelcome={() => { setShowWelcomeModal(true) }}
          />
        )}
      </Suspense>
      </AppShell>

      <Suspense fallback={<div className={styles.modalLoading} aria-label="Loading" />}>
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


      {/* Welcome & Onboarding Tutorial Modal */}
      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          onOpenLogin={() => setShowLogin(true)}
          onLiquidGlassChange={setLiquidGlassEnabled}
        />
      )}


      {/* Changelog Modal */}
      {showChangelogModal && (
        <ChangelogModal onClose={() => setShowChangelogModal(false)} />
      )}


      {/* Auto Update Modal on Detection */}
      {autoUpdateInfo && (
        <UpdateModal
          updateInfo={autoUpdateInfo}
          onClose={() => setAutoUpdateInfo(null)}
        />
      )}
      </Suspense>

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
