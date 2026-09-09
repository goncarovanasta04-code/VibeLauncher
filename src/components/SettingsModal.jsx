import { useState, useEffect } from 'react'
import {
  X,
  Save,
  RotateCcw,
  Folder,
  Check,
  Sliders,
  Cpu,
  FolderOpen,
  Coffee,
  HardDrive,
  Info,
  Maximize,
  Sparkles,
  Monitor,
  Server,
  Zap,
  RefreshCw,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Globe,
  Box,
  Package,
  Flame,
  Layers,
  Radio,
  ExternalLink,
} from 'lucide-react'
import FlagIcon from './FlagIcon'
import { useLanguage } from '../context/LanguageContext'
import UpdateModal from './UpdateModal'
import styles from './SettingsModal.module.css'

const SETTING_TABS = [
  { id: 'general', labelKey: 'settings_general', icon: Sliders },
  { id: 'java', labelKey: 'settings_tab_java', icon: Coffee },
  { id: 'appearance', labelKey: 'settings_tab_appearance', icon: Sparkles },
]

const GC_PRESETS = [
  {
    id: 'aikar',
    nameKey: 'gc_aikar_name',
    descKey: 'gc_aikar_desc',
    badgeKey: 'gc_aikar_badge',
    icon: Zap,
  },
  {
    id: 'shenandoah',
    nameKey: 'gc_shenandoah_name',
    descKey: 'gc_shenandoah_desc',
    badgeKey: 'gc_shenandoah_badge',
    icon: Cpu,
  },
  {
    id: 'zgc',
    nameKey: 'gc_zgc_name',
    descKey: 'gc_zgc_desc',
    badgeKey: 'gc_zgc_badge',
    icon: Sparkles,
  },
  {
    id: 'potato',
    nameKey: 'gc_potato_name',
    descKey: 'gc_potato_desc',
    badgeKey: 'gc_potato_badge',
    icon: Zap,
  },
  {
    id: 'default',
    nameKey: 'gc_default_name',
    descKey: 'gc_default_desc',
    badgeKey: 'gc_default_badge',
    icon: Coffee,
  },
]

export default function SettingsModal({ onClose, onOpenWelcome }) {
  const { language, setLanguage, t, languages } = useLanguage()
  const [activeTab, setActiveTab] = useState('general')

  const [ramMin, setRamMin] = useState(1)
  const [ramMax, setRamMax] = useState(4)
  const [systemRam, setSystemRam] = useState(16)
  const [systemFreeRam, setSystemFreeRam] = useState(null)
  const [showAdvancedRam, setShowAdvancedRam] = useState(false)
  const [javaMode, setJavaMode] = useState('auto')
  const [javaPath, setJavaPath] = useState('')
  const [detectedJavaList, setDetectedJavaList] = useState([])
  const [javaProbeResult, setJavaProbeResult] = useState(null)
  const [gameDir, setGameDir] = useState('')
  const [screenRes, setScreenRes] = useState({ width: 1920, height: 1080 })
  const [isolateVersionFolders, setIsolateVersionFolders] = useState(true)
  const [disableVideoBg, setDisableVideoBg] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [gcPreset, setGcPreset] = useState('aikar')
  const [serverAutoConnect, setServerAutoConnect] = useState('')
  const [discordRpc, setDiscordRpc] = useState(true)
  const [potatoMode, setPotatoMode] = useState(false)
  const [potatoToast, setPotatoToast] = useState(false)
  const [saved, setSaved] = useState(false)

  // Update check states
  const [currentAppVersion, setCurrentAppVersion] = useState('1.2.0')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    loadSettings()
    loadAppVersion()
    loadDetectedJava()
    loadScreenRes()
  }, [])

  const loadScreenRes = async () => {
    try {
      const res = await window.vibe?.getScreenResolution()
      if (res?.width && res?.height) {
        setScreenRes({ width: res.width, height: res.height })
      }
    } catch (e) {}
  }

  const loadAppVersion = async () => {
    const v = await window.vibe?.getCurrentVersion()
    if (v) setCurrentAppVersion(v)
  }

  const loadDetectedJava = async () => {
    try {
      const list = await window.vibe?.discoverJava()
      if (Array.isArray(list)) setDetectedJavaList(list)
    } catch (e) {}
  }

  const probeJava = async (pathToCheck) => {
    if (!pathToCheck || !pathToCheck.trim()) {
      setJavaProbeResult(null)
      return
    }
    try {
      const res = await window.vibe?.probeJava(pathToCheck.trim())
      setJavaProbeResult(res)
    } catch (e) {
      setJavaProbeResult({ valid: false, major: null, error: e.message })
    }
  }

  const handleJavaPathChange = (val) => {
    setJavaPath(val)
    probeJava(val)
  }

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateResult(null)

    try {
      const res = await window.vibe?.checkForUpdates()
      setCheckingUpdate(false)
      setUpdateResult(res)
    } catch (e) {
      setCheckingUpdate(false)
      setUpdateResult({ available: false, error: e.message })
    }
  }

  const loadSettings = async () => {
    try {
      const mem = await window.vibe?.getSystemMemory()
      if (mem?.totalGb) {
        setSystemRam(mem.totalGb)
        setSystemFreeRam(mem.freeGb)
      }
    } catch (e) {}

    let s = (await window.vibe?.storeGet('settings')) || {}
    if (!s || Object.keys(s).length === 0) {
      try {
        const ls = localStorage.getItem('vibelauncher_settings')
        if (ls) s = JSON.parse(ls)
      } catch (e) {}
    }
    if (s.ramMin) setRamMin(Number(s.ramMin))
    if (s.ramMax) setRamMax(Number(s.ramMax))
    if (s.javaMode) setJavaMode(s.javaMode)
    if (s.javaPath) {
      setJavaPath(s.javaPath)
      probeJava(s.javaPath)
    }
    if (s.gameDir) setGameDir(s.gameDir)
    if (s.isolateVersionFolders !== undefined)
      setIsolateVersionFolders(Boolean(s.isolateVersionFolders))
    if (s.disableVideoBg !== undefined)
      setDisableVideoBg(Boolean(s.disableVideoBg))
    if (s.enableAnimations !== undefined)
      setEnableAnimations(Boolean(s.enableAnimations))
    if (s.gcPreset) setGcPreset(s.gcPreset)
    if (s.serverAutoConnect) setServerAutoConnect(s.serverAutoConnect)
    if (s.discordRpc !== undefined) setDiscordRpc(Boolean(s.discordRpc))
    if (s.potatoMode !== undefined) setPotatoMode(Boolean(s.potatoMode))
  }

  const handleBrowseDir = async () => {
    const dir = await window.vibe?.openDir()
    if (dir) setGameDir(dir)
  }

  const handleBrowseJava = async () => {
    const file = await window.vibe?.openJavaFile()
    if (file) {
      setJavaPath(file)
      probeJava(file)
    }
  }

  const handleApplyPotatoMode = async () => {
    const nextMode = !potatoMode
    setPotatoMode(nextMode)

    if (nextMode) {
      setDisableVideoBg(true)
      setEnableAnimations(false)
      setRamMin(1)
      setRamMax(2)
      setGcPreset('potato')

      try {
        await window.vibe?.applyPotatoOptions(gameDir)
      } catch (e) {}

      const newSettings = {
        ramMin: 1,
        ramMax: 2,
        javaMode: javaMode || 'auto',
        javaPath: javaPath.trim(),
        gameDir: gameDir.trim(),
        isolateVersionFolders: Boolean(isolateVersionFolders),
        disableVideoBg: true,
        enableAnimations: false,
        gcPreset: 'potato',
        potatoMode: true,
        serverAutoConnect: serverAutoConnect.trim(),
        discordRpc: Boolean(discordRpc),
      }

      await window.vibe?.storeSet('settings', newSettings)
      try {
        localStorage.setItem('vibelauncher_settings', JSON.stringify(newSettings))
      } catch (e) {}

      setPotatoToast(true)
      setTimeout(() => setPotatoToast(false), 4500)
    } else {
      const newSettings = {
        ramMin: Number(ramMin) || 1,
        ramMax: Number(ramMax) || 4,
        javaMode: javaMode || 'auto',
        javaPath: javaPath.trim(),
        gameDir: gameDir.trim(),
        isolateVersionFolders: Boolean(isolateVersionFolders),
        disableVideoBg: Boolean(disableVideoBg),
        enableAnimations: Boolean(enableAnimations),
        gcPreset: gcPreset || 'aikar',
        potatoMode: false,
        serverAutoConnect: serverAutoConnect.trim(),
        discordRpc: Boolean(discordRpc),
      }
      await window.vibe?.storeSet('settings', newSettings)
      try {
        localStorage.setItem('vibelauncher_settings', JSON.stringify(newSettings))
      } catch (e) {}
    }
  }

  const handleSave = async () => {
    const newSettings = {
      ramMin: Number(ramMin) || 1,
      ramMax: Number(ramMax) || 4,
      javaMode: javaMode || 'auto',
      javaPath: javaPath.trim(),
      gameDir: gameDir.trim(),
      isolateVersionFolders: Boolean(isolateVersionFolders),
      disableVideoBg: Boolean(disableVideoBg),
      enableAnimations: Boolean(enableAnimations),
      gcPreset: gcPreset || 'aikar',
      serverAutoConnect: serverAutoConnect.trim(),
      discordRpc: Boolean(discordRpc),
      potatoMode: Boolean(potatoMode),
    }

    await window.vibe?.storeSet('settings', newSettings)
    try {
      localStorage.setItem('vibelauncher_settings', JSON.stringify(newSettings))
    } catch (e) {}
    await window.vibe?.setDiscordEnabled(Boolean(discordRpc))
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 450)
  }

  const handleReset = () => {
    setRamMin(1)
    setRamMax(4)
    setJavaMode('auto')
    setJavaPath('')
    setJavaProbeResult(null)
    setGameDir('')
    setIsolateVersionFolders(true)
    setDisableVideoBg(false)
    setGcPreset('aikar')
    setServerAutoConnect('')
    setDiscordRpc(true)
  }

  // Visual RAM memory percentage calculation
  const maxScale = Math.max(16, systemRam)
  const minScale = 1
  const ramMaxPct = Math.min(100, Math.max(0, Math.round(((ramMax - minScale) / (maxScale - minScale)) * 100)))
  const ramMinPct = Math.min(100, Math.max(0, Math.round(((ramMin - minScale) / (maxScale - minScale)) * 100)))
  const ramPctOfSystem = Math.round((ramMax / systemRam) * 100)

  let ramStatus = 'optimal'
  if (ramPctOfSystem > 85 || (systemRam - ramMax < 2)) {
    ramStatus = 'warning'
  } else if (ramPctOfSystem > 65) {
    ramStatus = 'moderate'
  }

  const tickValues = maxScale <= 16
    ? [1, 2, 4, 6, 8, 12, 16].filter((v) => v <= maxScale)
    : [2, 4, 8, 16, 24, 32].filter((v) => v <= maxScale)

  const presetOptions = [2, 4, 6, 8, 10, 12, 16, 24, 32].filter((gb) => gb <= maxScale)

  const RAM_PROFILES = [
    {
      id: 'vanilla',
      labelKey: 'settings_profile_vanilla',
      descKey: 'settings_profile_vanilla_desc',
      ram: Math.min(maxScale, 3),
      badge: '3 GB',
      icon: Box,
    },
    {
      id: 'mods',
      labelKey: 'settings_profile_mods',
      descKey: 'settings_profile_mods_desc',
      ram: Math.min(maxScale, 6),
      badge: '6 GB',
      icon: Package,
    },
    {
      id: 'heavy',
      labelKey: 'settings_profile_heavy',
      descKey: 'settings_profile_heavy_desc',
      ram: Math.min(maxScale, Math.max(8, Math.min(12, Math.floor(systemRam * 0.7)))),
      badge: `${Math.min(maxScale, Math.max(8, Math.min(12, Math.floor(systemRam * 0.7))))} GB`,
      icon: Flame,
    },
  ]

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Sliders size={18} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>{t('settings_title')}</h2>
              <span className={styles.subtitle}>{t('settings_subtitle')}</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title={t('close')}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.navBar}>
          {SETTING_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{t(tab.labelKey)}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Body */}
        <div className={styles.body}>
          {/* TAB 1: ОСНОВНЫЕ */}
          {activeTab === 'general' && (
            <div className={styles.tabContent}>
              {/* Card 0: Language Selection */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Globe size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_language')}</span>
                </div>
                <p className={styles.inputNote} style={{ marginTop: 0, marginBottom: 10 }}>
                  {t('settings_language_desc')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 8 }}>
                  {languages.map((item) => {
                    const isSelected = language === item.code
                    return (
                      <button
                        key={item.code}
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '9px 12px',
                          borderRadius: 6,
                          background: isSelected ? '#182232' : '#0e1117',
                          border: isSelected ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#ffffff' : '#8b949e',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: 600,
                          transition: 'all 150ms ease',
                        }}
                        onClick={() => setLanguage(item.code)}
                      >
                        <FlagIcon code={item.code} size={15} />
                        <span>{item.nativeName}</span>
                        {isSelected && <Check size={13} style={{ color: '#ffffff', marginLeft: 2 }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Card 0.5: Onboarding / Tutorial */}
              {onOpenWelcome && (
                <div className={styles.card}>
                  <div className={styles.toggleCard}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>{t('settings_tutorial_banner')}</span>
                      <p className={styles.toggleDesc}>
                        {t('settings_tutorial_banner_desc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.quickActionBtn}
                      style={{ padding: '6px 14px', borderRadius: 6, whiteSpace: 'nowrap' }}
                      onClick={onOpenWelcome}
                    >
                      <Sparkles size={14} />
                      <span>{t('settings_run_tutorial')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 1: Game directory */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <HardDrive size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_game_dir')}</span>
                </div>
                <div className={styles.inputWithBrowse}>
                  <input
                    type="text"
                    placeholder="%APPDATA%\.minecraft"
                    value={gameDir}
                    onChange={(e) => setGameDir(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={handleBrowseDir}
                    title={t('settings_browse')}
                  >
                    <Folder size={14} />
                    <span>{t('settings_browse')}</span>
                  </button>
                </div>

                <div className={styles.quickActionsRow}>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => window.vibe?.openGameDir(gameDir)}
                  >
                    <FolderOpen size={13} />
                    <span>{t('settings_open_minecraft')}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => window.vibe?.openVersionsDir(gameDir)}
                  >
                    <FolderOpen size={13} />
                    <span>{t('settings_open_versions')}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Auto Screen Resolution */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Monitor size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_resolution')}</span>
                </div>
                <div className={styles.autoResBox}>
                  <div className={styles.autoResHeader}>
                    <div className={styles.autoResIconWrap}>
                      <Monitor size={16} />
                    </div>
                    <div className={styles.autoResInfo}>
                      <div className={styles.autoResTitleRow}>
                        <span className={styles.autoResTitle}>
                          {screenRes.width} × {screenRes.height}
                        </span>
                        <span className={styles.autoResBadge}>
                          {t('settings_res_auto_detected') || 'Автоматически под монитор'}
                        </span>
                      </div>
                      <p className={styles.autoResDesc}>
                        {t('settings_res_auto_detected_desc') ||
                          'Лаунчер автоматически сканирует разрешение вашего экрана и передает оптимальные параметры в Minecraft для запуска без искажений и с максимальной четкостью.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Version Isolation Toggle */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>{t('settings_isolate_folders')}</span>
                    <p className={styles.toggleDesc}>
                      {t('settings_isolate_folders_desc')}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={isolateVersionFolders}
                      onChange={(e) => setIsolateVersionFolders(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Card 4: Server Auto-connect */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Server size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_server_autoconnect')}</span>
                </div>
                <input
                  type="text"
                  placeholder={t('settings_server_autoconnect_placeholder')}
                  value={serverAutoConnect}
                  onChange={(e) => setServerAutoConnect(e.target.value)}
                  className={styles.textInput}
                />
                <span className={styles.inputNote}>
                  {t('settings_server_autoconnect_desc')}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: JAVA & ОПТИМИЗАЦИЯ */}
          {activeTab === 'java' && (
            <div className={styles.tabContent}>
              {/* Java Runtime Selector Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Coffee size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_java_runtime')}</span>
                </div>

                {/* Mode Switcher: Авто vs Вручную */}
                <div className={styles.javaModeTabs}>
                  <button
                    type="button"
                    className={`${styles.javaModeTab} ${javaMode === 'auto' ? styles.javaModeTabActive : ''}`}
                    onClick={() => setJavaMode('auto')}
                  >
                    <Sparkles size={14} />
                    <span>{t('settings_java_auto')}</span>
                    <span className={styles.optBadge}>{t('settings_java_auto_badge')}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.javaModeTab} ${javaMode === 'manual' ? styles.javaModeTabActive : ''}`}
                    onClick={() => setJavaMode('manual')}
                  >
                    <FolderOpen size={14} />
                    <span>{t('settings_java_manual')}</span>
                  </button>
                </div>

                {javaMode === 'auto' ? (
                  <div className={styles.javaAutoBox}>
                    <div className={styles.javaAutoHeader}>
                      <CheckCircle2 size={18} className={styles.javaAutoIcon} />
                      <div>
                        <div className={styles.javaAutoTitle}>{t('settings_java_smart_title')}</div>
                        <div className={styles.javaAutoDesc}>
                          {t('settings_java_smart_desc')}
                        </div>
                      </div>
                    </div>

                    {detectedJavaList.length > 0 && (
                      <div className={styles.detectedJavaSection}>
                        <div className={styles.detectedTitle}>{t('settings_detected_java', { count: detectedJavaList.length })}</div>
                        <div className={styles.detectedList}>
                          {detectedJavaList.map((item, idx) => (
                            <div key={idx} className={styles.detectedItem}>
                              <span className={styles.detectedBadge}>Java {item.major}</span>
                              <span className={styles.detectedPath} title={item.path}>{item.path}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.javaManualBox}>
                    <div className={styles.manualFieldLabel}>{t('settings_java_manual_label')}</div>
                    <div className={styles.pathInputRow}>
                      <input
                        type="text"
                        placeholder="C:\Program Files\Java\jdk-21\bin\javaw.exe"
                        value={javaPath}
                        onChange={(e) => handleJavaPathChange(e.target.value)}
                        className={styles.textInput}
                      />
                      <button
                        type="button"
                        className={styles.browseBtn}
                        onClick={handleBrowseJava}
                        title={t('settings_browse_java_tip')}
                      >
                        <Folder size={14} />
                        <span>{t('settings_browse')}</span>
                      </button>
                    </div>

                    {/* Probe status badge */}
                    {javaProbeResult && (
                      <div className={`${styles.probeResult} ${javaProbeResult.valid ? styles.probeValid : styles.probeInvalid}`}>
                        {javaProbeResult.valid ? (
                          <>
                            <Check size={14} />
                            <span>{t('settings_java_valid', { version: javaProbeResult.major })}</span>
                          </>
                        ) : (
                          <>
                            <X size={14} />
                            <span>{t('settings_java_invalid')}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Quick picks from detected runtimes */}
                    {detectedJavaList.length > 0 && (
                      <div className={styles.quickJavaPicks}>
                        <span className={styles.quickPickLabel}>{t('settings_quick_java_picks')}</span>
                        <div className={styles.quickPickChips}>
                          {detectedJavaList.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`${styles.quickPickChip} ${javaPath === item.path ? styles.quickPickChipActive : ''}`}
                              onClick={() => handleJavaPathChange(item.path)}
                              title={item.path}
                            >
                              <b>Java {item.major}</b>
                              <span>({item.path.split('\\').slice(-3, -1).join('\\')})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RAM Section */}
              <div className={styles.card}>
                <div className={styles.ramHeader}>
                  <div className={styles.ramHeaderLeft}>
                    <Cpu size={15} className={styles.cardIcon} />
                    <span className={styles.cardTitle}>{t('settings_ram_allocation')}</span>
                  </div>
                  <div className={styles.systemRamBadge} title={t('settings_system_ram_tip')}>
                    <Monitor size={12} />
                    <span>{t('settings_system_ram_total', { total: systemRam })}</span>
                    {systemFreeRam && <span className={styles.systemFreeText}>{t('settings_system_ram_free', { free: systemFreeRam })}</span>}
                  </div>
                </div>

                {/* Hero Status Banner */}
                <div className={`${styles.ramHeroBanner} ${styles['ramHero_' + ramStatus]}`}>
                  <div className={styles.ramHeroValueCol}>
                    <div className={styles.ramHeroValueRow}>
                      <span className={styles.ramHeroNumber}>{ramMax}</span>
                      <span className={styles.ramHeroUnit}>GB</span>
                    </div>
                    <span className={styles.ramHeroSub}>{t('settings_ram_allocated_xmx')}</span>
                  </div>

                  <div className={styles.ramHeroStatusCol}>
                    <div className={styles.ramStatusPill}>
                      {ramStatus === 'optimal' && <CheckCircle2 size={13} className={styles.statusIconOptimal} />}
                      {ramStatus === 'moderate' && <Zap size={13} className={styles.statusIconModerate} />}
                      {ramStatus === 'warning' && <AlertTriangle size={13} className={styles.statusIconWarning} />}
                      <span>
                        {ramStatus === 'optimal' && t('settings_ram_optimal')}
                        {ramStatus === 'moderate' && t('settings_ram_moderate')}
                        {ramStatus === 'warning' && t('settings_ram_warning')}
                      </span>
                      <span className={styles.ramPctBadge}>{t('settings_ram_pct_system', { pct: ramPctOfSystem })}</span>
                    </div>

                    <p className={styles.ramHeroHint}>
                      {ramStatus === 'optimal' && t('settings_ram_optimal_hint')}
                      {ramStatus === 'moderate' && t('settings_ram_moderate_hint')}
                      {ramStatus === 'warning' && t('settings_ram_warning_hint', { pct: ramPctOfSystem })}
                    </p>
                  </div>
                </div>

                {/* Main Interactive Slider with Integrated Track */}
                <div className={styles.ramSliderContainer}>
                  <div className={styles.ramSliderTrackWrapper}>
                    <input
                      type="range"
                      min={minScale}
                      max={maxScale}
                      step="1"
                      value={ramMax}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setRamMax(val)
                        if (ramMin > val) setRamMin(val)
                      }}
                      className={styles.ramMainRange}
                      style={{
                        background: `linear-gradient(90deg, #ffffff 0%, #a855f7 ${ramMaxPct}%, rgba(255, 255, 255, 0.08) ${ramMaxPct}%)`,
                      }}
                    />
                  </div>

                  {/* Math-precise Interactive Ticks */}
                  <div className={styles.ramScaleTicks}>
                    {tickValues.map((gb) => {
                      const posPct = ((gb - minScale) / (maxScale - minScale)) * 100
                      const isActive = ramMax >= gb
                      const isExact = ramMax === gb
                      return (
                        <button
                          key={gb}
                          type="button"
                          className={`${styles.ramTickBtn} ${isActive ? styles.ramTickActive : ''} ${isExact ? styles.ramTickExact : ''}`}
                          style={{ left: `${posPct}%` }}
                          onClick={() => {
                            setRamMax(gb)
                            if (ramMin > gb) setRamMin(gb)
                          }}
                          title={t('settings_allocate_ram_tip', { gb })}
                        >
                          <span className={styles.ramTickPip} />
                          <span className={styles.ramTickText}>{gb}G</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Selection Buttons */}
                <div className={styles.quickPresetsSection}>
                  <span className={styles.presetsLabel}>{t('settings_quick_choice')}</span>
                  <div className={styles.quickPresetsList}>
                    {presetOptions.map((gb) => (
                      <button
                        key={gb}
                        type="button"
                        className={`${styles.presetPill} ${ramMax === gb ? styles.presetPillActive : ''}`}
                        onClick={() => {
                          setRamMax(gb)
                          if (ramMin > gb) setRamMin(gb)
                        }}
                      >
                        {gb} GB
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommended Profiles Cards */}
                <div className={styles.profilesGrid}>
                  {RAM_PROFILES.map((prof) => {
                    const isSelected = ramMax === prof.ram
                    const ProfIcon = prof.icon
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        className={`${styles.profileCard} ${isSelected ? styles.profileCardActive : ''}`}
                        onClick={() => {
                          setRamMax(prof.ram)
                          if (ramMin > prof.ram) setRamMin(prof.ram)
                        }}
                      >
                        <div className={styles.profileCardTop}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ProfIcon && <ProfIcon size={13} style={{ color: isSelected ? '#ffffff' : '#8b949e' }} />}
                            <span className={styles.profileTitle}>{t(prof.labelKey)}</span>
                          </div>
                          <span className={styles.profileBadge}>{prof.badge}</span>
                        </div>
                        <span className={styles.profileDesc}>{t(prof.descKey)}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Advanced JVM Xms Accordion */}
                <div className={styles.advancedXmsCard}>
                  <button
                    type="button"
                    className={styles.advancedXmsToggle}
                    onClick={() => setShowAdvancedRam(!showAdvancedRam)}
                  >
                    <div className={styles.advancedXmsToggleLeft}>
                      <Sliders size={13} className={styles.advancedXmsIcon} />
                      <span className={styles.advancedXmsTitle}>{t('settings_xms_title')}</span>
                      <span className={styles.advancedXmsBadge}>{ramMin} GB</span>
                    </div>
                    <div className={styles.advancedXmsToggleRight}>
                      <span className={styles.advancedXmsToggleHint}>
                        {showAdvancedRam ? t('settings_xms_hide') : t('settings_xms_configure')}
                      </span>
                      {showAdvancedRam ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {showAdvancedRam && (
                    <div className={styles.advancedXmsBody}>
                      <div className={styles.advancedXmsRow}>
                        <div className={styles.advancedXmsSliderBox}>
                          <div className={styles.advancedXmsSliderHeader}>
                            <span className={styles.advancedXmsFieldLabel}>{t('settings_xms_initial_heap')}</span>
                            <span className={styles.badgeHighlight}>{ramMin} GB</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max={ramMax}
                            step="1"
                            value={ramMin}
                            onChange={(e) => setRamMin(Number(e.target.value))}
                            className={styles.rangeInput}
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.autoXmsBtn}
                          onClick={() => setRamMin(Math.max(1, Math.min(2, Math.floor(ramMax / 2))))}
                          title={t('settings_xms_recommended_tip')}
                        >
                          {t('settings_xms_recommended', { gb: Math.max(1, Math.min(2, Math.floor(ramMax / 2))) })}
                        </button>
                      </div>

                      <p className={styles.advancedXmsNote}>
                        💡 {t('settings_xms_note')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* JVM GC Selector */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Zap size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_gc_title')}</span>
                </div>
                <div className={styles.gcList}>
                  {GC_PRESETS.map((preset) => {
                    const GcIcon = preset.icon
                    const isGcSelected = gcPreset === preset.id
                    return (
                      <div
                        key={preset.id}
                        className={`${styles.gcCard} ${isGcSelected ? styles.gcCardActive : ''}`}
                        onClick={() => setGcPreset(preset.id)}
                      >
                        <div className={styles.gcRadio}>
                          <div className={styles.gcRadioInner} />
                        </div>
                        <div className={styles.gcInfo}>
                          <div className={styles.gcTitleRow}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {GcIcon && <GcIcon size={13} style={{ color: isGcSelected ? '#ffffff' : '#8b949e' }} />}
                              <span className={styles.gcName}>{t(preset.nameKey)}</span>
                            </div>
                            <span className={styles.gcBadge}>{t(preset.badgeKey)}</span>
                          </div>
                          <p className={styles.gcDesc}>{t(preset.descKey)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Java Path Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Coffee size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_java_file_title')}</span>
                </div>
                <div className={styles.inputWithBrowse}>
                  <input
                    type="text"
                    placeholder={t('settings_java_file_placeholder')}
                    value={javaPath}
                    onChange={(e) => setJavaPath(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={handleBrowseJava}
                    title={t('settings_browse_java_tip')}
                  >
                    <Folder size={14} />
                    <span>{t('settings_browse')}</span>
                  </button>
                </div>
                <span className={styles.inputNote}>
                  {t('settings_java_file_note')}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: ИНТЕРФЕЙС & FPS */}
          {activeTab === 'appearance' && (
            <div className={styles.tabContent}>
              {/* Potato PC Ultra FPS Optimization Card */}
              <div className={`${styles.card} ${styles.potatoCard} ${potatoMode ? styles.potatoCardActive : ''}`}>
                <div className={styles.potatoHeader}>
                  <div className={styles.potatoTitleRow}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: potatoMode ? '#f59e0b' : '#221c16',
                      color: potatoMode ? '#1a1715' : '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Zap size={18} />
                    </div>
                    <div className={styles.potatoTextGroup}>
                      <div className={styles.potatoTitle}>
                        {t('settings_potato_mode_title')}
                        <span className={styles.potatoBadge}>{t('settings_potato_mode_badge')}</span>
                        {potatoMode && <span className={styles.potatoActiveBadge}>{t('settings_potato_activated')}</span>}
                      </div>
                      <p className={styles.potatoDesc}>
                        {t('settings_potato_desc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.potatoActionBtn} ${potatoMode ? styles.potatoActionBtnActive : ''}`}
                    onClick={handleApplyPotatoMode}
                  >
                    <Zap size={14} />
                    <span>{potatoMode ? t('settings_potato_disable') : t('settings_potato_enable')}</span>
                  </button>
                </div>

                {potatoToast && (
                  <div className={styles.potatoToast}>
                    <CheckCircle2 size={16} />
                    <span>{t('settings_potato_toast')}</span>
                  </div>
                )}
              </div>

              {/* Card 1: 3D Animations & Motion Background */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>{t('settings_3d_bg')}</span>
                    <p className={styles.toggleDesc}>
                      {t('settings_3d_bg_desc')}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={enableAnimations}
                      onChange={(e) => setEnableAnimations(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Card 2: Performance / Battery saver mode */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>{t('settings_energy_saver')}</span>
                    <p className={styles.toggleDesc}>
                      {t('settings_energy_saver_desc')}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={disableVideoBg}
                      onChange={(e) => setDisableVideoBg(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Card 3: Discord Rich Presence */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>{t('settings_discord_rpc_title')}</span>
                    <p className={styles.toggleDesc}>
                      {t('settings_discord_rpc_detail')}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={discordRpc}
                      onChange={(e) => setDiscordRpc(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Card 3: Launcher Updates */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <RefreshCw size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{t('settings_updates')}</span>
                </div>
                <div className={styles.updateCardContent}>
                  <div className={styles.updateVerInfo}>
                    <span className={styles.updateVerLabel}>{t('settings_current_version')}</span>
                    <span className={styles.updateVerBadge}>v{currentAppVersion}</span>
                  </div>

                  <button
                    type="button"
                    className={styles.checkUpdateBtn}
                    onClick={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    <RefreshCw size={13} className={checkingUpdate ? styles.spin : ''} />
                    <span>{checkingUpdate ? t('settings_checking') : t('settings_check_updates')}</span>
                  </button>
                </div>

                {/* Status Message */}
                {updateResult && (
                  <div className={styles.updateResultBox}>
                    {updateResult.available ? (
                      <div className={styles.updateAvailableRow}>
                        <div className={styles.updateAvailableText}>
                          <Sparkles size={16} className={styles.sparkleIcon} />
                          <span>
                            {t('settings_update_available', { version: updateResult.latestVersion })}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.openUpdateModalBtn}
                          onClick={() => setShowUpdateModal(true)}
                        >
                          <Download size={13} />
                          <span>{t('settings_update_btn')}</span>
                        </button>
                      </div>
                    ) : (
                      <div className={styles.updateLatestRow}>
                        <CheckCircle2 size={15} className={styles.latestCheckIcon} />
                        <span>{t('settings_up_to_date')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 4: About VibeLauncher */}
              <div className={styles.card}>
                <div className={styles.aboutBox}>
                  <Info size={18} className={styles.aboutIcon} />
                  <div>
                    <h4 className={styles.aboutTitle}>VibeLauncher • v{currentAppVersion}</h4>
                    <p className={styles.aboutDesc}>
                      {t('settings_about_desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            <RotateCcw size={14} />
            <span>{t('settings_reset_btn')}</span>
          </button>

          <button
            type="button"
            className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
            onClick={handleSave}
          >
            {saved ? (
              <>
                <Check size={15} />
                <span>{t('settings_saved_btn')}</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{t('settings_save_btn')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Update Modal Overlay */}
      {showUpdateModal && updateResult && (
        <UpdateModal
          updateInfo={updateResult}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  )
}
