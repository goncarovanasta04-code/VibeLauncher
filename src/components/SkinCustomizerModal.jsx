import { useState, useEffect, useRef } from 'react'
import {
  X,
  Check,
  Upload,
  RotateCw,
  Play,
  Pause,
  User,
  Sparkles,
  Shield,
  Layers,
  Search,
  Download,
  Eye,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Copy,
  Send,
} from 'lucide-react'
import { SkinViewer, IdleAnimation, WalkingAnimation, RunningAnimation, FlyingAnimation } from 'skinview3d'
import { DEFAULT_STEVE_SKIN } from '../assets/defaultSkin'
import { PRESET_CAPES } from '../assets/capesData'
import styles from './SkinCustomizerModal.module.css'

const PRESET_SKINS = [
  {
    id: 'steve',
    name: 'Steve',
    tag: 'Default',
    url: DEFAULT_STEVE_SKIN,
    model: 'default',
  },
  {
    id: 'alex',
    name: 'Alex',
    tag: 'Slim',
    url: 'https://minotar.net/skin/MHF_Alex',
    model: 'slim',
  },
  {
    id: 'dream',
    name: 'Dream',
    tag: 'Popular',
    url: 'https://minotar.net/skin/Dream',
    model: 'default',
  },
  {
    id: 'techno',
    name: 'Technoblade',
    tag: 'Legend',
    url: 'https://minotar.net/skin/Technoblade',
    model: 'default',
  },
  {
    id: 'notch',
    name: 'Notch',
    tag: 'Creator',
    url: 'https://minotar.net/skin/Notch',
    model: 'default',
  },
  {
    id: 'herobrine',
    name: 'Herobrine',
    tag: 'Myth',
    url: 'https://minotar.net/skin/Herobrine',
    model: 'default',
  },
  {
    id: 'creeper',
    name: 'Creeper Boy',
    tag: 'Mob',
    url: 'https://minotar.net/skin/MHF_Creeper',
    model: 'default',
  },
  {
    id: 'enderman',
    name: 'Enderman',
    tag: 'Void',
    url: 'https://minotar.net/skin/MHF_Enderman',
    model: 'default',
  },
]

const CAPE_PRESETS = [
  { id: 'none', name: 'Без плаща', url: null },
  { id: 'cyber_cyan', name: 'Cyber Neon Cyan', url: PRESET_CAPES.cyber_cyan },
  { id: 'ender_void', name: 'Ender Void Purple', url: PRESET_CAPES.ender_void },
  { id: 'phoenix_fire', name: 'Phoenix Fire Flame', url: PRESET_CAPES.phoenix_fire },
  { id: 'opti_blue', name: 'OptiFine OF Blue', url: PRESET_CAPES.opti_blue },
]

export default function SkinCustomizerModal({ profile, onSaveSkin, onClose }) {
  const canvasRef = useRef(null)
  const viewerRef = useRef(null)

  const [currentSkinUrl, setCurrentSkinUrl] = useState(
    profile?.skinUrl || `https://minotar.net/skin/${profile?.username || 'Steve'}`
  )
  const [modelType, setModelType] = useState(profile?.skinModel || 'default')
  const [currentCapeUrl, setCurrentCapeUrl] = useState(profile?.capeUrl || null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [activeAnimation, setActiveAnimation] = useState('idle')
  const [innerLayersOnly, setInnerLayersOnly] = useState(false)
  const [nickInput, setNickInput] = useState('')
  const [loadingNick, setLoadingNick] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('gallery') // 'gallery' | 'custom' | 'capes'

  // Initialize SkinViewer
  useEffect(() => {
    if (!canvasRef.current) return

    try {
      const viewer = new SkinViewer({
        canvas: canvasRef.current,
        width: 320,
        height: 420,
        model: modelType,
      })

      viewer.autoRotate = autoRotate
      viewer.autoRotateSpeed = 1.0
      viewer.animation = new IdleAnimation()
      viewer.zoom = 0.85
      viewer.controls.enableZoom = true
      viewer.controls.enablePan = false

      const initialSkin = currentSkinUrl || DEFAULT_STEVE_SKIN

      viewer.loadSkin(initialSkin, { model: modelType }).catch(() => {
        viewer.loadSkin(DEFAULT_STEVE_SKIN).catch(() => {})
      })

      if (currentCapeUrl) {
        viewer.loadCape(currentCapeUrl).catch(() => {})
      }

      viewerRef.current = viewer
    } catch (e) {
      console.error('[SkinViewer init error]:', e)
    }

    return () => {
      viewerRef.current?.dispose?.()
    }
  }, [])

  // Update skin texture
  useEffect(() => {
    if (viewerRef.current && currentSkinUrl) {
      viewerRef.current.loadSkin(currentSkinUrl, { model: modelType }).catch(() => {
        // Fallback to Steve on invalid URL
        viewerRef.current?.loadSkin?.(DEFAULT_STEVE_SKIN).catch(() => {})
      })
    }
  }, [currentSkinUrl, modelType])

  // Update cape texture
  useEffect(() => {
    if (viewerRef.current) {
      if (currentCapeUrl) {
        viewerRef.current.loadCape(currentCapeUrl).catch(() => {})
      } else {
        viewerRef.current.resetCape()
      }
    }
  }, [currentCapeUrl])

  // Update auto-rotation
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  // Update animation
  useEffect(() => {
    if (!viewerRef.current) return
    if (activeAnimation === 'idle') {
      viewerRef.current.animation = new IdleAnimation()
    } else if (activeAnimation === 'walk') {
      viewerRef.current.animation = new WalkingAnimation()
    } else if (activeAnimation === 'run') {
      viewerRef.current.animation = new RunningAnimation()
    } else if (activeAnimation === 'fly') {
      viewerRef.current.animation = new FlyingAnimation()
    } else {
      viewerRef.current.animation = null
    }
  }, [activeAnimation])

  // Update layer visibility
  useEffect(() => {
    if (!viewerRef.current?.playerObject) return
    const outerVisible = !innerLayersOnly
    const po = viewerRef.current.playerObject
    if (po.skin) {
      po.skin.head.outer.visible = outerVisible
      po.skin.body.outer.visible = outerVisible
      po.skin.leftArm.outer.visible = outerVisible
      po.skin.rightArm.outer.visible = outerVisible
      po.skin.leftLeg.outer.visible = outerVisible
      po.skin.rightLeg.outer.visible = outerVisible
    }
  }, [innerLayersOnly])

  // Handle local file upload with strict dimension check
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.png')) {
      alert('Пожалуйста, выберите файл скина в формате .png')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (dataUrl) {
        const img = new Image()
        img.onload = () => {
          // Check if user uploaded an avatar face instead of full skin
          if (img.width <= 64 && img.height <= 64 && (img.width < 64 || (img.height !== 64 && img.height !== 32))) {
            alert(
              `Внимание: загруженный файл имеет размер ${img.width}x${img.height}px. Похоже, это иконка лица, а не полный скин Minecraft!\n\nДля корректного отображения скина выберите файл развёртки 64x64 или 64x32.`
            )
            return
          }
          setCurrentSkinUrl(dataUrl)
        }
        img.onerror = () => {
          alert('Не удалось прочитать изображение скина. Убедитесь, что файл не повреждён.')
        }
        img.src = dataUrl
      }
    }
    reader.readAsDataURL(file)
  }

  // Download skin to send to friends
  const handleDownloadSkin = () => {
    try {
      const link = document.createElement('a')
      const name = profile?.username || 'player'
      link.download = `skin_${name}.png`
      link.href = currentSkinUrl || DEFAULT_STEVE_SKIN
      link.click()
    } catch (e) {
      console.error('Download error:', e)
    }
  }

  // Copy skin link or data
  const [copiedLink, setCopiedLink] = useState(false)
  const handleCopyLink = () => {
    if (currentSkinUrl) {
      navigator.clipboard.writeText(currentSkinUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Handle skin load by nickname
  const handleFetchByNick = () => {
    if (!nickInput.trim()) return
    setLoadingNick(true)
    const url = `https://minotar.net/skin/${encodeURIComponent(nickInput.trim())}`
    setCurrentSkinUrl(url)
    setTimeout(() => {
      setLoadingNick(false)
    }, 400)
  }

  // Save skin to launcher profile
  const handleApply = () => {
    onSaveSkin({
      skinUrl: currentSkinUrl,
      skinModel: modelType,
      capeUrl: currentCapeUrl,
    })
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 800)
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className={`${styles.modal} glass`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Sparkles size={20} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>3D Гардероб и Скины</h2>
              <p className={styles.subtitle}>
                Вращай скин на 360°, примеряй плащи и настраивай образ персонажа
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Content Layout */}
        <div className={styles.content}>
          {/* Left Column: 3D Interactive Canvas & Viewer Controls */}
          <div className={styles.viewerCol}>
            <div className={styles.canvasContainer}>
              <canvas ref={canvasRef} className={styles.skinCanvas} />
              
              {/* Overlay 360 Hint */}
              <div className={styles.canvasHint}>
                <RotateCw size={12} className={styles.hintIcon} />
                <span>Зажми мышь для 360° вращения</span>
              </div>
            </div>

            {/* Quick Controls Bar under 3D model */}
            <div className={styles.viewerBar}>
              <button
                type="button"
                className={`${styles.ctrlBtn} ${autoRotate ? styles.ctrlBtnActive : ''}`}
                onClick={() => setAutoRotate((v) => !v)}
                title="Авто-вращение 360°"
              >
                <RotateCw size={14} />
                <span>Вращение</span>
              </button>

              <button
                type="button"
                className={`${styles.ctrlBtn} ${
                  modelType === 'slim' ? styles.ctrlBtnActive : ''
                }`}
                onClick={() => setModelType((m) => (m === 'default' ? 'slim' : 'default'))}
                title="Переключить модель Стив (4px) / Алекс (3px)"
              >
                <User size={14} />
                <span>{modelType === 'slim' ? 'Alex (Slim)' : 'Steve (4px)'}</span>
              </button>

              <button
                type="button"
                className={`${styles.ctrlBtn} ${innerLayersOnly ? styles.ctrlBtnActive : ''}`}
                onClick={() => setInnerLayersOnly((v) => !v)}
                title="Скрыть/показать внешние слои одежды"
              >
                <Layers size={14} />
                <span>{innerLayersOnly ? 'Без куртки' : 'Все слои'}</span>
              </button>
            </div>

            {/* Animations Pill Row */}
            <div className={styles.animRow}>
              {[
                { id: 'idle', label: 'Дыхание' },
                { id: 'walk', label: 'Ходьба' },
                { id: 'run', label: 'Бег' },
                { id: 'fly', label: 'Полёт' },
                { id: 'pause', label: 'Стоп' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  className={`${styles.animPill} ${
                    activeAnimation === anim.id ? styles.animPillActive : ''
                  }`}
                  onClick={() => setActiveAnimation(anim.id)}
                >
                  {anim.label}
                </button>
              ))}
            </div>

            {/* Quick Export for Friends */}
            <div className={styles.exportRow}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={handleDownloadSkin}
                title="Скачать скин в .png, чтобы отправить другу"
              >
                <Download size={13} />
                <span>Скинуть скин другу (.png)</span>
              </button>
              <button
                type="button"
                className={styles.copyLinkBtn}
                onClick={handleCopyLink}
                title="Скопировать ссылку или текстуру"
              >
                {copiedLink ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Customization Tabs & Gallery */}
          <div className={styles.optionsCol}>
            {/* Tabs Navigation */}
            <div className={styles.tabsNav}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'gallery' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                <Sparkles size={14} />
                <span>Каталог скинов</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'custom' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                <Upload size={14} />
                <span>Свой скин / Ник</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'capes' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('capes')}
              >
                <Shield size={14} />
                <span>Плащи</span>
              </button>
            </div>

            {/* Tab 1: Curated Skins Gallery */}
            {activeTab === 'gallery' && (
              <div className={styles.skinsGrid}>
                {PRESET_SKINS.map((skin) => {
                  const isSelected = currentSkinUrl === skin.url
                  return (
                    <div
                      key={skin.id}
                      className={`${styles.skinCard} ${
                        isSelected ? styles.skinCardActive : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentSkinUrl(skin.url)
                        setModelType(skin.model || 'default')
                      }}
                    >
                      <div className={styles.skinCardAvatar}>
                        <img
                          src={`https://minotar.net/avatar/${skin.name === 'Steve' ? 'MHF_Steve' : skin.name === 'Alex' ? 'MHF_Alex' : skin.name}/48`}
                          alt={skin.name}
                          onError={(e) => {
                            e.target.src = 'https://minotar.net/avatar/MHF_Steve/48'
                          }}
                        />
                      </div>
                      <div className={styles.skinCardInfo}>
                        <span className={styles.skinCardName}>{skin.name}</span>
                        <span className={styles.skinCardTag}>{skin.tag}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={16} className={styles.skinSelectedCheck} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab 2: Custom Upload & Nick Search */}
            {activeTab === 'custom' && (
              <div className={styles.customTabWrap}>
                {/* Upload File Box */}
                <div className={styles.uploadBox}>
                  <Upload size={28} className={styles.uploadIcon} />
                  <span className={styles.uploadTitle}>Загрузи свой скин (.png)</span>
                  <span className={styles.uploadSub}>
                    Поддерживаются стандартные 64x64 и 64x32 скины
                  </span>
                  <label className={styles.uploadBtn}>
                    <input
                      type="file"
                      accept=".png"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <span>Выбрать файл на ПК</span>
                  </label>
                </div>

                {/* Fetch from Nickname */}
                <div className={styles.nickSearchBox}>
                  <span className={styles.sectionLabel}>Или загрузи скин любого игрока:</span>
                  <div className={styles.nickInputRow}>
                    <div className={styles.inputWrap}>
                      <Search size={14} className={styles.inputIcon} />
                      <input
                        type="text"
                        placeholder="Введите никнейм (напр. Notch, Dream)..."
                        value={nickInput}
                        onChange={(e) => setNickInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFetchByNick()}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.fetchBtn}
                      onClick={handleFetchByNick}
                      disabled={loadingNick || !nickInput.trim()}
                    >
                      {loadingNick ? <RefreshCw size={14} className={styles.spin} /> : 'Найти'}
                    </button>
                  </div>
                </div>

                {/* Share with friend box */}
                <div className={styles.shareFriendBox}>
                  <div className={styles.shareFriendHeader}>
                    <Send size={15} className={styles.shareFriendIcon} />
                    <span className={styles.shareFriendTitle}>Скинуть скин другу (офлайн/онлайн)</span>
                  </div>
                  <p className={styles.shareFriendDesc}>
                    Скачай файл своего скина и перешли другу в Discord, Telegram или VK. Друг может просто выбрать этот .png файл в лаунчере!
                  </p>
                  <div className={styles.shareFriendActions}>
                    <button
                      type="button"
                      className={styles.friendDownloadBtn}
                      onClick={handleDownloadSkin}
                    >
                      <Download size={14} />
                      <span>Скачать скин в .png</span>
                    </button>
                    <button
                      type="button"
                      className={styles.friendCopyBtn}
                      onClick={handleCopyLink}
                    >
                      {copiedLink ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Ссылка скопирована' : 'Скопировать ссылку'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Capes */}
            {activeTab === 'capes' && (
              <div className={styles.capesGrid}>
                {CAPE_PRESETS.map((cape) => {
                  const isSelected = currentCapeUrl === cape.url
                  return (
                    <div
                      key={cape.id}
                      className={`${styles.capeCard} ${
                        isSelected ? styles.capeCardActive : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentCapeUrl(cape.url)
                      }}
                    >
                      <Shield size={20} className={styles.capeIcon} />
                      <span className={styles.capeName}>{cape.name}</span>
                      {isSelected && (
                        <CheckCircle2 size={16} className={styles.skinSelectedCheck} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Apply Button */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.activeSkinLabel}>
              Выбран скин: <strong>{modelType === 'slim' ? 'Alex (3px)' : 'Steve (4px)'}</strong>
            </span>
          </div>
          <div className={styles.footerRight}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className={`${styles.applyBtn} ${savedSuccess ? styles.applyBtnSuccess : ''}`}
              onClick={handleApply}
            >
              {savedSuccess ? (
                <>
                  <Check size={16} strokeWidth={2.6} />
                  <span>Скин применён!</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Применить скин</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
