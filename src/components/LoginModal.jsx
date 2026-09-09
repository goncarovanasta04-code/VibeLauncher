import { useState } from 'react'
import {
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Gamepad2,
  CheckCircle2,
  Dices,
} from 'lucide-react'
import styles from './LoginModal.module.css'
import { generateOfflineUUID } from '../utils/uuid'
import { useLanguage } from '../context/LanguageContext'

const COOL_NICKS = [
  'Steve',
  'Alex',
  'ShadowPro',
  'VibePlayer',
  'CyberMiner',
  'PixelKnight',
  'FrostByte',
  'EnderStorm',
  'NeonCrafter',
  'QuantumCraft',
]

export default function LoginModal({ onClose, onLogin }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('offline')

  // Ely.by fields
  const [elyUser, setElyUser] = useState('')
  const [elyPass, setElyPass] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Offline fields
  const [offlineNick, setOfflineNick] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const rollRandomNick = () => {
    const base = COOL_NICKS[Math.floor(Math.random() * COOL_NICKS.length)]
    const num = Math.floor(Math.random() * 900 + 100)
    setOfflineNick(`${base}_${num}`)
    setError('')
  }

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await window.vibe?.loginMicrosoft()
      if (res?.ok) {
        onLogin(res)
      } else {
        setError(res?.error || t('microsoft_error'))
      }
    } catch (err) {
      setError(err.message || t('error'))
    }
    setLoading(false)
  }

  const handleElyByLogin = async (e) => {
    if (e) e.preventDefault()
    const u = elyUser.trim()
    if (!u) {
      setError(t('elyby_empty_user'))
      return
    }
    if (!elyPass) {
      setError(t('elyby_empty_pass'))
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await window.vibe?.loginElyByCredentials({
        username: u,
        password: elyPass,
      })

      if (res?.ok) {
        onLogin(res)
      } else {
        setError(res?.error || t('elyby_auth_error'))
      }
    } catch (err) {
      setError(err.message || t('error'))
    }
    setLoading(false)
  }

  const handleOfflineLogin = (e) => {
    if (e) e.preventDefault()
    const name = offlineNick.trim()
    if (!name || name.length < 1) {
      setError(t('offline_nick_empty'))
      return
    }
    if (name.length > 24) {
      setError(t('offline_nick_long'))
      return
    }

    try {
      const uuid = generateOfflineUUID(name)
      onLogin({
        username: name,
        uuid: uuid,
        token: null,
        isOnline: false,
        skinUrl: `https://minotar.net/skin/${encodeURIComponent(name)}`,
        avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`,
        authType: 'offline',
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const previewNick = offlineNick.trim() || 'Steve'

  const TABS = [
    { id: 'offline', label: t('tab_offline'), icon: User },
    { id: 'elyby', label: t('tab_elyby'), icon: ShieldCheck },
    { id: 'microsoft', label: t('tab_microsoft'), icon: Gamepad2 },
  ]

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Close Button */}
        <button className={styles.closeBtn} onClick={onClose} title={t('close')}>
          <X size={15} />
        </button>

        {/* Modal Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{t('login_title')}</h2>
          <p className={styles.subtitle}>{t('login_subtitle')}</p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className={styles.tabs}>
          {TABS.map((tItem) => {
            const IconComponent = tItem.icon
            const isActive = tab === tItem.id
            return (
              <button
                key={tItem.id}
                type="button"
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                onClick={() => {
                  setTab(tItem.id)
                  setError('')
                }}
              >
                <IconComponent size={14} className={styles.tabIcon} />
                <span>{tItem.label}</span>
              </button>
            )
          })}
        </div>

        {/* Form Body */}
        <div className={styles.body}>
          {tab === 'microsoft' ? (
            <div className={styles.section}>
              <div className={styles.msCard}>
                <div className={styles.msHeader}>
                  <div className={styles.msBrand}>
                    <div className={styles.msGrid}>
                      <span style={{ background: '#f25022' }} />
                      <span style={{ background: '#7fba00' }} />
                      <span style={{ background: '#00a4ef' }} />
                      <span style={{ background: '#ffb900' }} />
                    </div>
                    <span className={styles.msTitle}>{t('microsoft_banner_title')}</span>
                  </div>
                  <span className={styles.msBadge}>Xbox Live</span>
                </div>
                <p className={styles.msDesc}>{t('microsoft_banner_desc')}</p>

                <div className={styles.featureList}>
                  <div className={styles.featureItem}>
                    <CheckCircle2 size={14} className={styles.featureCheck} />
                    <span>{t('microsoft_feat_1')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircle2 size={14} className={styles.featureCheck} />
                    <span>{t('microsoft_feat_2')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircle2 size={14} className={styles.featureCheck} />
                    <span>{t('microsoft_feat_3')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircle2 size={14} className={styles.featureCheck} />
                    <span>{t('microsoft_feat_4')}</span>
                  </div>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button
                type="button"
                className={`${styles.primaryBtn} ${styles.msBtn}`}
                onClick={handleMicrosoftLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className={styles.spin} />
                    <span>{t('microsoft_waiting')}</span>
                  </>
                ) : (
                  <>
                    <Gamepad2 size={16} />
                    <span>{t('microsoft_login_btn')}</span>
                  </>
                )}
              </button>
            </div>
          ) : tab === 'offline' ? (
            <form className={styles.section} onSubmit={handleOfflineLogin}>
              {/* Profile Card Preview */}
              <div className={styles.profileCard}>
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(previewNick)}/48`}
                  alt={previewNick}
                  className={styles.profileAvatar}
                  onError={(e) => {
                    e.target.src = 'https://mc-heads.net/avatar/steve/48'
                  }}
                />
                <div className={styles.profileDetails}>
                  <div className={styles.profileName}>{previewNick}</div>
                  <div className={styles.profileRole}>{t('offline_profile')}</div>
                </div>
                <span className={styles.offlineTag}>{t('tab_offline')}</span>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>{t('offline_nickname_label')}</label>
                  <button
                    type="button"
                    className={styles.diceBtn}
                    onClick={rollRandomNick}
                    title={t('offline_random_nick')}
                  >
                    <Dices size={13} />
                    <span>{t('offline_random_nick')}</span>
                  </button>
                </div>

                <div className={styles.inputWrap}>
                  <User size={15} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder={t('offline_nickname_placeholder')}
                    value={offlineNick}
                    onChange={(e) => {
                      setOfflineNick(e.target.value)
                      setError('')
                    }}
                    maxLength={24}
                    autoFocus
                  />
                  {offlineNick && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setOfflineNick('')}
                      title={t('cancel')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Nick Suggestion Chips */}
                <div className={styles.chipRow}>
                  {COOL_NICKS.slice(0, 5).map((nick) => (
                    <button
                      key={nick}
                      type="button"
                      className={styles.chip}
                      onClick={() => {
                        setOfflineNick(nick)
                        setError('')
                      }}
                    >
                      {nick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Muted Perks */}
              <div className={styles.perksRow}>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkIcon} />
                  <span>{t('offline_perk_no_internet')}</span>
                </div>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkIcon} />
                  <span>{t('offline_perk_any_nick')}</span>
                </div>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkIcon} />
                  <span>{t('offline_perk_all_servers')}</span>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button type="submit" className={styles.primaryBtn}>
                <User size={15} />
                <span>{t('offline_login_btn', { name: offlineNick.trim() || 'Player' })}</span>
              </button>
            </form>
          ) : (
            <form className={styles.section} onSubmit={handleElyByLogin}>
              <div className={styles.elyCard}>
                <div className={styles.elyBrand}>
                  <div className={styles.elyDot} />
                  <span className={styles.elyTitle}>{t('elyby_banner_title')}</span>
                </div>
                <p className={styles.elyDesc}>{t('elyby_banner_desc')}</p>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t('elyby_user_label')}</label>
                <div className={styles.inputWrap}>
                  <User size={15} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder={t('elyby_user_placeholder')}
                    value={elyUser}
                    onChange={(e) => {
                      setElyUser(e.target.value)
                      setError('')
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t('elyby_pass_label')}</label>
                <div className={styles.inputWrap}>
                  <Lock size={15} className={styles.inputIcon} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('elyby_pass_placeholder')}
                    value={elyPass}
                    onChange={(e) => {
                      setElyPass(e.target.value)
                      setError('')
                    }}
                  />
                  <button
                    type="button"
                    className={styles.passToggle}
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={15} className={styles.spin} />
                    <span>{t('loading')}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{t('elyby_login_btn')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.registerLink}
                onClick={() => window.vibe?.openExternal?.('https://ely.by/registration')}
              >
                <span>{t('elyby_register')}</span>
                <ExternalLink size={12} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
