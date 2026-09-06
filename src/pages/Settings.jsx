import { useState, useEffect } from 'react'
import { Folder, Save, RotateCcw, HardDrive, Monitor, Coffee, FolderOpen, Sparkles, CheckCircle2, Check, X, Zap } from 'lucide-react'
import styles from './Settings.module.css'

const DEFAULT_SETTINGS = {
  gameDir: '',
  ram: 2048,
  javaMode: 'auto',
  javaPath: '',
  width: 854,
  height: 480,
  fullscreen: false,
  showSnapshots: false,
  closeOnLaunch: false,
  launcherTheme: 'dark',
  potatoMode: false,
}

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [detectedJavaList, setDetectedJavaList] = useState([])
  const [javaProbeResult, setJavaProbeResult] = useState(null)

  useEffect(() => {
    const load = async () => {
      const stored = await window.vibe?.storeGet('settings')
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...stored })
        if (stored.javaPath) probeJava(stored.javaPath)
      }
      try {
        const list = await window.vibe?.discoverJava()
        if (Array.isArray(list)) setDetectedJavaList(list)
      } catch (e) {}
    }
    load()
  }, [])

  const probeJava = async (pathToCheck) => {
    if (!pathToCheck || !pathToCheck.trim()) {
      setJavaProbeResult(null)
      return
    }
    try {
      const res = await window.vibe?.probeJava(pathToCheck.trim())
      setJavaProbeResult(res)
    } catch (e) {
      setJavaProbeResult({ valid: false, major: null })
    }
  }

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    await window.vibe?.storeSet('settings', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = async () => {
    setSettings(DEFAULT_SETTINGS)
    setJavaProbeResult(null)
    await window.vibe?.storeSet('settings', DEFAULT_SETTINGS)
  }

  const browseGameDir = async () => {
    const dir = await window.vibe?.openDir()
    if (dir) update('gameDir', dir)
  }

  const browseJava = async () => {
    const file = await window.vibe?.openJavaFile()
    if (file) {
      update('javaPath', file)
      probeJava(file)
    }
  }

  const handleJavaPathChange = (val) => {
    update('javaPath', val)
    probeJava(val)
  }

  const ramLabel = settings.ram >= 1024
    ? `${(settings.ram / 1024).toFixed(1)} GB`
    : `${settings.ram} MB`

  return (
    <div className={styles.page}>
      <div className={`${styles.panel} glass`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Настройки</h2>
          <div className={styles.headerActions}>
            <button className={styles.resetBtn} onClick={reset} title="Сбросить настройки">
              <RotateCcw size={13} />
              <span>Сбросить</span>
            </button>
            <button className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`} onClick={save}>
              <Save size={13} />
              <span>{saved ? 'Сохранено!' : 'Сохранить'}</span>
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {/* ── Game Directory ── */}
          <Section icon={<Folder size={14} />} title="Игровая директория">
            <div className={styles.pathRow}>
              <input
                type="text"
                value={settings.gameDir}
                onChange={e => update('gameDir', e.target.value)}
                placeholder="По умолчанию: %AppData%\.vibelauncher"
              />
              <button className={styles.browseBtn} onClick={browseGameDir}>
                <FolderOpen size={13} />
              </button>
            </div>
          </Section>

          {/* ── Potato PC ── */}
          <Section icon={<Zap size={14} />} title="Режим «Potato PC» (Для очень слабых ПК)">
            <div className={styles.potatoBox}>
              <div className={styles.potatoBoxInfo}>
                <div className={styles.potatoBoxTitle}>
                  🥔 Графика Potato (Максимальный FPS)
                  {settings.potatoMode && <span className={styles.potatoBadgeActive}>АКТИВИРОВАНО</span>}
                </div>
                <div className={styles.potatoBoxDesc}>
                  Отключает видео-фон и тяжелые 3D-анимации лаунчера, выставляет безопасную память JVM и переводит настройки Minecraft (options.txt) на ультра-низкие для слабых ПК и ноутбуков.
                </div>
              </div>
              <button
                type="button"
                className={`${styles.potatoBtn} ${settings.potatoMode ? styles.potatoBtnActive : ''}`}
                onClick={async () => {
                  const next = !settings.potatoMode
                  update('potatoMode', next)
                  if (next) {
                    update('ram', 2048)
                    update('disableVideoBg', true)
                    update('enableAnimations', false)
                    try {
                      await window.vibe?.applyPotatoOptions(settings.gameDir)
                    } catch (e) {}
                  }
                }}
              >
                {settings.potatoMode ? 'Отключить Potato' : 'Включить режим Potato'}
              </button>
            </div>
          </Section>

          {/* ── Memory ── */}
          <Section icon={<HardDrive size={14} />} title="Оперативная память">
            <div className={styles.ramRow}>
              <input
                type="range"
                min={512}
                max={16384}
                step={256}
                value={settings.ram}
                onChange={e => update('ram', Number(e.target.value))}
              />
              <span className={styles.ramValue}>{ramLabel}</span>
            </div>
            <p className={styles.hint}>Рекомендуется: 2–4 GB для обычной игры</p>
          </Section>

          {/* ── Java ── */}
          <Section icon={<Coffee size={14} />} title="Среда исполнения Java">
            {/* Mode switch */}
            <div className={styles.javaModeTabs}>
              <button
                type="button"
                className={`${styles.javaModeTab} ${settings.javaMode === 'auto' ? styles.javaModeTabActive : ''}`}
                onClick={() => update('javaMode', 'auto')}
              >
                <Sparkles size={13} />
                <span>Автоматический выбор (оптимальный)</span>
                <span className={styles.optBadge}>Рекомендуется</span>
              </button>
              <button
                type="button"
                className={`${styles.javaModeTab} ${settings.javaMode === 'manual' ? styles.javaModeTabActive : ''}`}
                onClick={() => update('javaMode', 'manual')}
              >
                <FolderOpen size={13} />
                <span>Выбрать вручную на компьютере</span>
              </button>
            </div>

            {settings.javaMode === 'auto' ? (
              <div className={styles.javaAutoBox}>
                <div className={styles.javaAutoHeader}>
                  <CheckCircle2 size={16} className={styles.javaAutoIcon} />
                  <div>
                    <div className={styles.javaAutoTitle}>Умный подбор Java под каждую версию</div>
                    <div className={styles.javaAutoDesc}>
                      Лаунчер автоматически подбирает и запускает:
                      <b> Java 8</b> для 1.16.5 и старше, 
                      <b> Java 17</b> для 1.17–1.20.4, 
                      <b> Java 21</b> для 1.20.5+ и 1.21+. 
                      Если подходящей Java нет на компьютере, она будет скачана автоматически.
                    </div>
                  </div>
                </div>

                {detectedJavaList.length > 0 && (
                  <div className={styles.detectedJavaSection}>
                    <div className={styles.detectedTitle}>Обнаруженные версии Java в системе ({detectedJavaList.length}):</div>
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
                <div className={styles.manualFieldLabel}>Путь к java.exe или javaw.exe:</div>
                <div className={styles.pathRow}>
                  <input
                    type="text"
                    value={settings.javaPath}
                    onChange={e => handleJavaPathChange(e.target.value)}
                    placeholder="C:\Program Files\Java\jdk-21\bin\javaw.exe"
                  />
                  <button className={styles.browseBtn} onClick={browseJava} title="Выбрать файл">
                    <FolderOpen size={13} />
                  </button>
                </div>

                {/* Probe Result */}
                {javaProbeResult && (
                  <div className={`${styles.probeResult} ${javaProbeResult.valid ? styles.probeValid : styles.probeInvalid}`}>
                    {javaProbeResult.valid ? (
                      <>
                        <Check size={14} />
                        <span>Обнаружена <b>Java {javaProbeResult.major}</b> — Файл проверен и готов к работе</span>
                      </>
                    ) : (
                      <>
                        <X size={14} />
                        <span>Файл не найден или не является рабочей Java</span>
                      </>
                    )}
                  </div>
                )}

                {/* Quick picks */}
                {detectedJavaList.length > 0 && (
                  <div className={styles.quickJavaPicks}>
                    <span className={styles.quickPickLabel}>Быстрый выбор из найденных на ПК:</span>
                    <div className={styles.quickPickChips}>
                      {detectedJavaList.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`${styles.quickPickChip} ${settings.javaPath === item.path ? styles.quickPickChipActive : ''}`}
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
          </Section>

          {/* ── Resolution ── */}
          <Section icon={<Monitor size={14} />} title="Разрешение окна">
            <div className={styles.resRow}>
              <div className={styles.resPair}>
                <label className={styles.resLabel}>Ширина</label>
                <input
                  type="number"
                  value={settings.width}
                  onChange={e => update('width', Number(e.target.value))}
                  min={640} max={3840}
                />
              </div>
              <span className={styles.resSep}>×</span>
              <div className={styles.resPair}>
                <label className={styles.resLabel}>Высота</label>
                <input
                  type="number"
                  value={settings.height}
                  onChange={e => update('height', Number(e.target.value))}
                  min={480} max={2160}
                />
              </div>
            </div>
            <Toggle
              label="Полноэкранный режим"
              value={settings.fullscreen}
              onChange={v => update('fullscreen', v)}
            />
          </Section>

          {/* ── Launcher ── */}
          <Section icon={<Monitor size={14} />} title="Лаунчер">
            <Toggle
              label="Показывать снапшоты и бета-версии"
              value={settings.showSnapshots}
              onChange={v => update('showSnapshots', v)}
            />
            <Toggle
              label="Закрывать лаунчер при запуске игры"
              value={settings.closeOnLaunch}
              onChange={v => update('closeOnLaunch', v)}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className={styles.toggle}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        className={`${styles.toggleBtn} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className={styles.toggleThumb} />
      </button>
    </label>
  )
}
