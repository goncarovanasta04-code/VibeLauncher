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
} from 'lucide-react'
import UpdateModal from './UpdateModal'
import styles from './SettingsModal.module.css'

const SETTING_TABS = [
  { id: 'general', label: 'Основные', icon: Sliders },
  { id: 'java', label: 'Java & Память', icon: Coffee },
  { id: 'appearance', label: 'Интерфейс & FPS', icon: Sparkles },
]

const RESOLUTION_PRESETS = [
  { label: 'Авто (1920 × 1080)', width: 1920, height: 1080 },
  { label: '1280 × 720 (HD 720p)', width: 1280, height: 720 },
  { label: '1600 × 900 (HD+)', width: 1600, height: 900 },
  { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '2560 × 1440 (2K QHD)', width: 2560, height: 1440 },
  { label: '3840 × 2160 (4K UHD)', width: 3840, height: 2160 },
]

const GC_PRESETS = [
  {
    id: 'aikar',
    name: "Флаги Aikar's (G1GC)",
    desc: 'Оптимизирует задержки сборщика мусора, устраняет микрофризы в тяжелых модпаках.',
    badge: 'Рекомендуется',
  },
  {
    id: 'shenandoah',
    name: 'Shenandoah GC',
    desc: 'Ультранизкое время пауз. Идеально для мощных процессоров и Java 17+.',
    badge: 'Низкий пинг',
  },
  {
    id: 'zgc',
    name: 'ZGC (Z Garbage Collector)',
    desc: 'Масштабируемый сборщик мусора с паузами менее 1 мс.',
    badge: 'Новинка',
  },
  {
    id: 'potato',
    name: 'Potato PC (Легковесный G1GC)',
    desc: 'Минимальное потребление процессора и памяти, предотвращает сбои создания JVM.',
    badge: 'Макс. FPS',
  },
  {
    id: 'default',
    name: 'Стандартный JVM G1GC',
    desc: 'Базовые параметры Java по умолчанию без дополнительных флагов.',
    badge: 'Vanilla',
  },
]

export default function SettingsModal({ onClose }) {
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
  const [fullscreen, setFullscreen] = useState(false)
  const [isolateVersionFolders, setIsolateVersionFolders] = useState(true)
  const [disableVideoBg, setDisableVideoBg] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [resolutionIndex, setResolutionIndex] = useState(0)
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
  }, [])

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
    if (s.fullscreen !== undefined) setFullscreen(Boolean(s.fullscreen))
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

    if (s.width && s.height) {
      const idx = RESOLUTION_PRESETS.findIndex(
        (p) => p.width === Number(s.width) && p.height === Number(s.height)
      )
      if (idx !== -1) setResolutionIndex(idx)
    }
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

      const resPreset = RESOLUTION_PRESETS[resolutionIndex] || RESOLUTION_PRESETS[0]
      const newSettings = {
        ramMin: 1,
        ramMax: 2,
        javaMode: javaMode || 'auto',
        javaPath: javaPath.trim(),
        gameDir: gameDir.trim(),
        fullscreen: Boolean(fullscreen),
        width: resPreset.width,
        height: resPreset.height,
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
        fullscreen: Boolean(fullscreen),
        width: RESOLUTION_PRESETS[resolutionIndex]?.width || 1920,
        height: RESOLUTION_PRESETS[resolutionIndex]?.height || 1080,
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
    const resPreset = RESOLUTION_PRESETS[resolutionIndex] || RESOLUTION_PRESETS[0]
    const newSettings = {
      ramMin: Number(ramMin) || 1,
      ramMax: Number(ramMax) || 4,
      javaMode: javaMode || 'auto',
      javaPath: javaPath.trim(),
      gameDir: gameDir.trim(),
      fullscreen: Boolean(fullscreen),
      width: resPreset.width,
      height: resPreset.height,
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
    setFullscreen(false)
    setResolutionIndex(0)
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
      label: 'Vanilla (Обычная)',
      desc: 'Без модов или с OptiFine',
      ram: Math.min(maxScale, 3),
      badge: '3 ГБ',
    },
    {
      id: 'mods',
      label: 'Сборка с модами',
      desc: 'Forge / Fabric (50-100 модов)',
      ram: Math.min(maxScale, 6),
      badge: '6 ГБ',
    },
    {
      id: 'heavy',
      label: 'Тяжелые моды & Шейдеры',
      desc: '200+ модов, HD текстуры',
      ram: Math.min(maxScale, Math.max(8, Math.min(12, Math.floor(systemRam * 0.7)))),
      badge: `${Math.min(maxScale, Math.max(8, Math.min(12, Math.floor(systemRam * 0.7))))} ГБ`,
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
              <h2 className={styles.title}>Настройки лаунчера</h2>
              <span className={styles.subtitle}>Персонализация, память, оптимизация и пути</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Закрыть">
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
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Body */}
        <div className={styles.body}>
          {/* TAB 1: ОСНОВНЫЕ */}
          {activeTab === 'general' && (
            <div className={styles.tabContent}>
              {/* Card 1: Game directory */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <HardDrive size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>Директория игры Minecraft</span>
                </div>
                <div className={styles.inputWithBrowse}>
                  <input
                    type="text"
                    placeholder="%APPDATA%\.minecraft (стандартная папка)"
                    value={gameDir}
                    onChange={(e) => setGameDir(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={handleBrowseDir}
                    title="Выбрать другую папку"
                  >
                    <Folder size={14} />
                    <span>Обзор</span>
                  </button>
                </div>

                <div className={styles.quickActionsRow}>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => window.vibe?.openGameDir(gameDir)}
                  >
                    <FolderOpen size={13} />
                    <span>Открыть .minecraft</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => window.vibe?.openVersionsDir(gameDir)}
                  >
                    <FolderOpen size={13} />
                    <span>Открыть versions</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Resolution & Fullscreen */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Monitor size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>Разрешение экрана и окно игры</span>
                </div>
                <div className={styles.controlRow}>
                  <div className={styles.selectWrap}>
                    <span className={styles.fieldLabel}>Размер окна:</span>
                    <select
                      className={styles.selectInput}
                      value={resolutionIndex}
                      onChange={(e) => setResolutionIndex(Number(e.target.value))}
                      disabled={fullscreen}
                    >
                      {RESOLUTION_PRESETS.map((res, i) => (
                        <option key={i} value={i}>
                          {res.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.toggleCardInner}>
                  <div className={styles.toggleInfo}>
                    <div className={styles.toggleTitleRow}>
                      <Maximize size={14} className={styles.toggleIcon} />
                      <span className={styles.toggleTitle}>Полноэкранный режим (Fullscreen)</span>
                    </div>
                    <p className={styles.toggleDesc}>
                      Запускать Minecraft сразу на весь экран без оконных рамок Windows.
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={fullscreen}
                      onChange={(e) => setFullscreen(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Card 3: Version Isolation Toggle */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Изоляция файлов по версиям</span>
                    <p className={styles.toggleDesc}>
                      Каждая версия имеет собственные независимые папки <b>mods</b>, <b>shaderpacks</b> и <b>resourcepacks</b> в <code>.minecraft/versions/</code>.
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
                  <span className={styles.cardTitle}>Автоматический вход на сервер</span>
                </div>
                <input
                  type="text"
                  placeholder="mc.hypixel.net или ip:порт (опционально)"
                  value={serverAutoConnect}
                  onChange={(e) => setServerAutoConnect(e.target.value)}
                  className={styles.textInput}
                />
                <span className={styles.inputNote}>
                  Если заполнено, игра сразу подключится к указанному серверу при запуске.
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
                  <span className={styles.cardTitle}>Среда исполнения Java</span>
                </div>

                {/* Mode Switcher: Авто vs Вручную */}
                <div className={styles.javaModeTabs}>
                  <button
                    type="button"
                    className={`${styles.javaModeTab} ${javaMode === 'auto' ? styles.javaModeTabActive : ''}`}
                    onClick={() => setJavaMode('auto')}
                  >
                    <Sparkles size={14} />
                    <span>Автоматический выбор (оптимальный)</span>
                    <span className={styles.optBadge}>Рекомендуется</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.javaModeTab} ${javaMode === 'manual' ? styles.javaModeTabActive : ''}`}
                    onClick={() => setJavaMode('manual')}
                  >
                    <FolderOpen size={14} />
                    <span>Выбрать вручную на компьютере</span>
                  </button>
                </div>

                {javaMode === 'auto' ? (
                  <div className={styles.javaAutoBox}>
                    <div className={styles.javaAutoHeader}>
                      <CheckCircle2 size={18} className={styles.javaAutoIcon} />
                      <div>
                        <div className={styles.javaAutoTitle}>Умный подбор Java под каждую версию Minecraft</div>
                        <div className={styles.javaAutoDesc}>
                          Лаунчер автоматически определит и запустит нужную версию:
                          <b> Java 8</b> для 1.16.5 и старых версий, 
                          <b> Java 17</b> для 1.17–1.20.4, 
                          <b> Java 21</b> для 1.20.5+ и 1.21+. 
                          Если нужной Java нет на ПК, лаунчер сам автоматически скачает чистый портативный Temurin JDK без лишних вопросов.
                        </div>
                      </div>
                    </div>

                    {detectedJavaList.length > 0 && (
                      <div className={styles.detectedJavaSection}>
                        <div className={styles.detectedTitle}>Обнаружено сред Java на вашем ПК ({detectedJavaList.length}):</div>
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
                    <div className={styles.manualFieldLabel}>Укажите путь к исполняемому файлу (java.exe или javaw.exe):</div>
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
                        title="Выбрать java.exe на компьютере"
                      >
                        <Folder size={14} />
                        <span>Обзор...</span>
                      </button>
                    </div>

                    {/* Probe status badge */}
                    {javaProbeResult && (
                      <div className={`${styles.probeResult} ${javaProbeResult.valid ? styles.probeValid : styles.probeInvalid}`}>
                        {javaProbeResult.valid ? (
                          <>
                            <Check size={14} />
                            <span>Обнаружена <b>Java {javaProbeResult.major}</b> — Файл проверен и готов к запуску игры</span>
                          </>
                        ) : (
                          <>
                            <X size={14} />
                            <span>Файл не найден или не является рабочей Java</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Quick picks from detected runtimes */}
                    {detectedJavaList.length > 0 && (
                      <div className={styles.quickJavaPicks}>
                        <span className={styles.quickPickLabel}>Быстрый выбор из найденных на ПК:</span>
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
                    <span className={styles.cardTitle}>Выделение оперативной памяти (RAM)</span>
                  </div>
                  <div className={styles.systemRamBadge} title="Общий объем физической памяти вашего компьютера">
                    <Monitor size={12} />
                    <span>Всего на ПК: <b>{systemRam} ГБ</b></span>
                    {systemFreeRam && <span className={styles.systemFreeText}>(~{systemFreeRam} ГБ свободно)</span>}
                  </div>
                </div>

                {/* Hero Status Banner */}
                <div className={`${styles.ramHeroBanner} ${styles['ramHero_' + ramStatus]}`}>
                  <div className={styles.ramHeroValueCol}>
                    <div className={styles.ramHeroValueRow}>
                      <span className={styles.ramHeroNumber}>{ramMax}</span>
                      <span className={styles.ramHeroUnit}>ГБ</span>
                    </div>
                    <span className={styles.ramHeroSub}>Выделено Minecraft (Xmx)</span>
                  </div>

                  <div className={styles.ramHeroStatusCol}>
                    <div className={styles.ramStatusPill}>
                      {ramStatus === 'optimal' && <CheckCircle2 size={13} className={styles.statusIconOptimal} />}
                      {ramStatus === 'moderate' && <Zap size={13} className={styles.statusIconModerate} />}
                      {ramStatus === 'warning' && <AlertTriangle size={13} className={styles.statusIconWarning} />}
                      <span>
                        {ramStatus === 'optimal' && 'Оптимальный баланс'}
                        {ramStatus === 'moderate' && 'Высокое выделение'}
                        {ramStatus === 'warning' && 'Риск зависания Windows'}
                      </span>
                      <span className={styles.ramPctBadge}>{ramPctOfSystem}% ОЗУ ПК</span>
                    </div>

                    <p className={styles.ramHeroHint}>
                      {ramStatus === 'optimal' && 'Идеальный баланс: быстрая работа игры без фризов сборщика мусора и без влияния на систему.'}
                      {ramStatus === 'moderate' && 'Подходит для крупных модпаков и шейдеров. Закройте тяжелые фоновые программы.'}
                      {ramStatus === 'warning' && `Выделено ${ramPctOfSystem}% всей памяти ПК! Оставьте хотя бы 2-3 ГБ для Windows, иначе система начнет сбрасывать данные в файл подкачки.`}
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
                        background: `linear-gradient(90deg, #38bdf8 0%, #a855f7 ${ramMaxPct}%, rgba(255, 255, 255, 0.08) ${ramMaxPct}%)`,
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
                          title={`Выделить ${gb} ГБ`}
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
                  <span className={styles.presetsLabel}>Быстрый выбор:</span>
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
                        {gb} ГБ
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommended Profiles Cards */}
                <div className={styles.profilesGrid}>
                  {RAM_PROFILES.map((prof) => {
                    const isSelected = ramMax === prof.ram
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
                          <span className={styles.profileTitle}>{prof.label}</span>
                          <span className={styles.profileBadge}>{prof.badge}</span>
                        </div>
                        <span className={styles.profileDesc}>{prof.desc}</span>
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
                      <span className={styles.advancedXmsTitle}>Начальная память (Xms)</span>
                      <span className={styles.advancedXmsBadge}>{ramMin} ГБ</span>
                    </div>
                    <div className={styles.advancedXmsToggleRight}>
                      <span className={styles.advancedXmsToggleHint}>
                        {showAdvancedRam ? 'Скрыть параметры' : 'Настроить Xms'}
                      </span>
                      {showAdvancedRam ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {showAdvancedRam && (
                    <div className={styles.advancedXmsBody}>
                      <div className={styles.advancedXmsRow}>
                        <div className={styles.advancedXmsSliderBox}>
                          <div className={styles.advancedXmsSliderHeader}>
                            <span className={styles.advancedXmsFieldLabel}>Стартовый размер кучи (-Xms)</span>
                            <span className={styles.badgeHighlight}>{ramMin} ГБ</span>
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
                          title="Установить оптимальное значение (1-2 ГБ)"
                        >
                          Рекомендованное ({Math.max(1, Math.min(2, Math.floor(ramMax / 2)))} ГБ)
                        </button>
                      </div>

                      <p className={styles.advancedXmsNote}>
                        💡 <b>Xms</b> определяет объем памяти при первом старте игры. Для современных сборок и алгоритмов G1GC оптимально 1–2 ГБ. Лаунчер автоматически гарантирует, что Xms никогда не превысит Xmx.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* JVM GC Selector */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Zap size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>Оптимизация сборщика мусора (GC)</span>
                </div>
                <div className={styles.gcList}>
                  {GC_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className={`${styles.gcCard} ${gcPreset === preset.id ? styles.gcCardActive : ''}`}
                      onClick={() => setGcPreset(preset.id)}
                    >
                      <div className={styles.gcRadio}>
                        <div className={styles.gcRadioInner} />
                      </div>
                      <div className={styles.gcInfo}>
                        <div className={styles.gcTitleRow}>
                          <span className={styles.gcName}>{preset.name}</span>
                          <span className={styles.gcBadge}>{preset.badge}</span>
                        </div>
                        <p className={styles.gcDesc}>{preset.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Java Path Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Coffee size={15} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>Исполняемый файл Java (javaw.exe)</span>
                </div>
                <div className={styles.inputWithBrowse}>
                  <input
                    type="text"
                    placeholder="Автоопределение (системная Java 17+)"
                    value={javaPath}
                    onChange={(e) => setJavaPath(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={handleBrowseJava}
                    title="Выбрать java.exe"
                  >
                    <Folder size={14} />
                    <span>Обзор</span>
                  </button>
                </div>
                <span className={styles.inputNote}>
                  Оставьте пустым для автоматического поиска установленной Java в системе.
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
                    <span className={styles.potatoEmoji}>🥔</span>
                    <div className={styles.potatoTextGroup}>
                      <div className={styles.potatoTitle}>
                        Графика «Potato PC»
                        <span className={styles.potatoBadge}>Для очень слабых ПК</span>
                        {potatoMode && <span className={styles.potatoActiveBadge}>АКТИВИРОВАНО</span>}
                      </div>
                      <p className={styles.potatoDesc}>
                        Максимальная оптимизация лаунчера и игры для слабых ПК и ноутбуков: отключает живой видео-фон и 3D-графику в лаунчере, переводит JVM на легкий сборщик мусора, безопасно выделяет ОЗУ и настраивает графику Minecraft (options.txt) на минимальные требования для максимального FPS.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.potatoActionBtn} ${potatoMode ? styles.potatoActionBtnActive : ''}`}
                    onClick={handleApplyPotatoMode}
                  >
                    <Zap size={15} />
                    <span>{potatoMode ? 'Отключить Potato' : 'Включить режим Potato'}</span>
                  </button>
                </div>

                {potatoToast && (
                  <div className={styles.potatoToast}>
                    <CheckCircle2 size={16} />
                    <span>Режим «Potato PC» успешно активирован! Все настройки лаунчера и игры оптимизированы для слабого ПК.</span>
                  </div>
                )}
              </div>

              {/* Card 1: 3D Animations & Motion Background */}
              <div className={styles.card}>
                <div className={styles.toggleCard}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>3D-анимации и живой фон</span>
                    <p className={styles.toggleDesc}>
                      Включает динамический 3D-фон с кубами, кристаллами и сеткой горизонта. Автоматически уходит в сон при запуске игры для 100% FPS в Minecraft.
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
                    <span className={styles.toggleTitle}>Режим энергосбережения / FPS-буст</span>
                    <p className={styles.toggleDesc}>
                      Отключает живой видео-фон лаунчера для экономии ресурсов видеокарты и заряда аккумулятора ноутбука.
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
                    <span className={styles.toggleTitle}>Discord Rich Presence</span>
                    <p className={styles.toggleDesc}>
                      Отображает красивый статус в профиле Discord во время игры («Играет в VibeLauncher • Minecraft 1.16.5»).
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
                  <span className={styles.cardTitle}>Обновление лаунчера</span>
                </div>
                <div className={styles.updateCardContent}>
                  <div className={styles.updateVerInfo}>
                    <span className={styles.updateVerLabel}>Текущая версия:</span>
                    <span className={styles.updateVerBadge}>v{currentAppVersion}</span>
                  </div>

                  <button
                    type="button"
                    className={styles.checkUpdateBtn}
                    onClick={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    <RefreshCw size={13} className={checkingUpdate ? styles.spin : ''} />
                    <span>{checkingUpdate ? 'Проверка...' : 'Проверить обновления'}</span>
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
                            Найдено обновление <b>v{updateResult.latestVersion}</b>!
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.openUpdateModalBtn}
                          onClick={() => setShowUpdateModal(true)}
                        >
                          <Download size={13} />
                          <span>Обновить</span>
                        </button>
                      </div>
                    ) : (
                      <div className={styles.updateLatestRow}>
                        <CheckCircle2 size={15} className={styles.latestCheckIcon} />
                        <span>У вас установлена самая свежая версия VibeLauncher.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 4: Liquid Glass info */}
              <div className={styles.card}>
                <div className={styles.glassInfoBox}>
                  <Sparkles size={20} className={styles.glassInfoIcon} />
                  <div>
                    <h4 className={styles.glassInfoTitle}>Apple Liquid Glass Design</h4>
                    <p className={styles.glassInfoDesc}>
                      В лаунчере активирован аппаратный оптический движок Liquid Glass со световыми фасками и интерактивным преломлением.
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
            <span>Сбросить</span>
          </button>

          <button
            type="button"
            className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
            onClick={handleSave}
          >
            {saved ? (
              <>
                <Check size={15} />
                <span>Настройки сохранены!</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Сохранить настройки</span>
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
