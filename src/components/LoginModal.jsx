import { useState } from 'react'
import {
  X,
  LogIn,
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
  Sparkles,
  Award,
} from 'lucide-react'
import styles from './LoginModal.module.css'
import { generateOfflineUUID } from '../utils/uuid'

const TABS = [
  { id: 'offline', label: 'Офлайн', badge: 'Бесплатно' },
  { id: 'elyby', label: 'Ely.by', badge: 'Скины' },
  { id: 'microsoft', label: 'Microsoft', badge: 'Лицензия' },
]

const COOL_NICKS = [
  'VibeMaster',
  'PixelKnight',
  'CyberCrafter',
  'ShadowPlay',
  'FrostByte',
  'HyperNova',
  'EnderStorm',
  'StarCreeper',
  'TurboSteve',
  'GlitchFox',
  'NeonCrafter',
  'QuantumCraft',
  'AeroStrike',
  'AquaPlayer',
  'ApexMiner',
]

export default function LoginModal({ onClose, onLogin }) {
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
        setError(res?.error || 'Не удалось выполнить вход через Microsoft')
      }
    } catch (err) {
      setError('Ошибка соединения: ' + err.message)
    }
    setLoading(false)
  }

  const handleElyByLogin = async (e) => {
    if (e) e.preventDefault()
    const u = elyUser.trim()
    if (!u) {
      setError('Введите логин или email от Ely.by')
      return
    }
    if (!elyPass) {
      setError('Введите пароль')
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
        setError(res?.error || 'Неверный логин или пароль')
      }
    } catch (err) {
      setError(err.message || 'Ошибка соединения с сервером')
    }
    setLoading(false)
  }

  const handleOfflineLogin = (e) => {
    if (e) e.preventDefault()
    const name = offlineNick.trim()
    if (!name || name.length < 1) {
      setError('Введите никнейм')
      return
    }
    if (name.length > 24) {
      setError('Никнейм: максимум 24 символа')
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
      setError('Ошибка генерации UUID: ' + err.message)
    }
  }

  const previewNick = offlineNick.trim() || 'Steve'

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} glass`}>
        {/* Close Button */}
        <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Вход в аккаунт</h2>
          <p className={styles.subtitle}>Выберите способ авторизации для игры</p>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${styles['tabBtn_' + t.id]} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => {
                setTab(t.id)
                setError('')
              }}
            >
              <div className={styles.tabIconWrap}>
                {t.id === 'offline' && <User size={15} />}
                {t.id === 'elyby' && <ShieldCheck size={15} />}
                {t.id === 'microsoft' && <Gamepad2 size={15} />}
              </div>
              <div className={styles.tabLabelWrap}>
                <span className={styles.tabLabel}>{t.label}</span>
                <span className={`${styles.tabBadge} ${styles['badge_' + t.id]}`}>{t.badge}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className={styles.body}>
          {tab === 'microsoft' ? (
            <div className={styles.microsoftSection}>
              <div className={styles.bannerMicrosoft}>
                <div className={styles.msHeaderRow}>
                  <div className={styles.msLogoWrap}>
                    <div className={styles.msGrid}>
                      <span style={{ background: '#f25022' }} />
                      <span style={{ background: '#7fba00' }} />
                      <span style={{ background: '#00a4ef' }} />
                      <span style={{ background: '#ffb900' }} />
                    </div>
                    <span className={styles.msText}>Официальная Лицензия Microsoft</span>
                  </div>
                  <span className={styles.xboxBadge}>Xbox Live</span>
                </div>
                <p className={styles.msInfo}>
                  Вход через официальный профиль Minecraft Java Edition. Полный доступ ко всем
                  лицензионным серверам (Hypixel, 2b2t и др.), официальным скинам и плащам Mojang.
                </p>

                <div className={styles.msFeatureList}>
                  <div className={styles.msFeatureItem}>
                    <CheckCircle2 size={15} className={styles.msFeatureCheck} />
                    <span>Значок <b>Лицензия</b> в профиле и подтверждённый статус игрока</span>
                  </div>
                  <div className={styles.msFeatureItem}>
                    <CheckCircle2 size={15} className={styles.msFeatureCheck} />
                    <span>Безопасный <b>OAuth 2.0</b> вход через официальное окно Microsoft</span>
                  </div>
                  <div className={styles.msFeatureItem}>
                    <CheckCircle2 size={15} className={styles.msFeatureCheck} />
                    <span>Доступ ко всем лицензионным серверам (Hypixel, GommeHD, 2b2t)</span>
                  </div>
                  <div className={styles.msFeatureItem}>
                    <CheckCircle2 size={15} className={styles.msFeatureCheck} />
                    <span>Автоматическая синхронизация официальных скинов и плащей</span>
                  </div>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button
                type="button"
                className={`${styles.submitBtn} ${styles.submitBtnMicrosoft}`}
                onClick={handleMicrosoftLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className={styles.spin} />
                    <span>Ожидание входа в окне Microsoft...</span>
                  </>
                ) : (
                  <>
                    <Gamepad2 size={18} />
                    <span>Войти через Microsoft (Xbox Live)</span>
                  </>
                )}
              </button>
            </div>
          ) : tab === 'offline' ? (
            <form className={styles.form} onSubmit={handleOfflineLogin}>
              <div className={styles.offlineAvatarSection}>
                <div className={styles.avatarGlow}>
                  <img
                    src={`https://mc-heads.net/avatar/${previewNick}/64`}
                    alt={previewNick}
                    className={styles.previewAvatar}
                    onError={(e) => {
                      e.target.src = 'https://mc-heads.net/avatar/steve/64'
                    }}
                  />
                </div>
                <div className={styles.avatarDetails}>
                  <div className={styles.avatarTopRow}>
                    <span className={styles.avatarName}>{previewNick}</span>
                    <span className={styles.avatarBadge}>Офлайн режим</span>
                  </div>
                  <span className={styles.avatarSub}>Локальный профиль Minecraft</span>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Игровой никнейм</label>
                  <button
                    type="button"
                    className={styles.rollNickBtn}
                    onClick={rollRandomNick}
                    title="Сгенерировать случайный ник"
                  >
                    <Dices size={13} />
                    <span>Случайный ник</span>
                  </button>
                </div>
                <div className={styles.inputWrap}>
                  <User size={15} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Напишите свой Никнейм"
                    value={offlineNick}
                    onChange={(e) => {
                      setOfflineNick(e.target.value)
                      setError('')
                    }}
                    maxLength={16}
                    autoFocus
                  />
                  {offlineNick && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setOfflineNick('')}
                      title="Очистить"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={styles.quickNicks}>
                  <span className={styles.quickLabel}>Быстрый выбор:</span>
                  {['Steve', 'Alex', 'ShadowPro', 'VibePlayer', 'CyberMiner'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={styles.quickNickChip}
                      onClick={() => {
                        setOfflineNick(n)
                        setError('')
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.offlinePerks}>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkCheck} />
                  <span>Игра без интернета</span>
                </div>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkCheck} />
                  <span>Любой ник</span>
                </div>
                <div className={styles.perkItem}>
                  <CheckCircle2 size={13} className={styles.perkCheck} />
                  <span>Пиратские серверы</span>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button type="submit" className={styles.submitBtn}>
                <User size={16} />
                <span>Войти как {offlineNick.trim() || 'Игрок'}</span>
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleElyByLogin}>
              <div className={styles.bannerEly}>
                <div className={styles.elyLogoWrap}>
                  <img
                    src="https://ely.by/favicon.ico"
                    alt="Ely.by"
                    className={styles.elyIcon}
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                  <span className={styles.elyText}>🔵 Ely.by Аккаунт</span>
                </div>
                <p className={styles.elyInfo}>
                  Официальная поддержка скинов, плащей и скиновой системы Ely.by на серверах.
                </p>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Логин или Email</label>
                <div className={styles.inputWrap}>
                  <User size={15} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Ваш логин на Ely.by"
                    value={elyUser}
                    onChange={(e) => {
                      setElyUser(e.target.value)
                      setError('')
                    }}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Пароль</label>
                <div className={styles.inputWrap}>
                  <Lock size={15} className={styles.inputIcon} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Пароль от аккаунта"
                    value={elyPass}
                    onChange={(e) => {
                      setElyPass(e.target.value)
                      setError('')
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passToggle}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    <span>Проверка данных...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Войти через Ely.by</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.registerLink}
                onClick={() => window.vibe?.openExternal('https://account.ely.by/register')}
              >
                <ExternalLink size={12} />
                <span>Создать аккаунт на Ely.by</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
