import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  FolderOpen,
  Gamepad2,
  Layers3,
  LogIn,
  LogOut,
  Minus,
  Package,
  Settings2,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import logoIcon from '../assets/icon.png'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: Gamepad2 },
  { id: 'versions', label: 'Версии', icon: Layers3 },
  { id: 'catalog', label: 'Каталог', icon: Package },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
]

function avatarFor(profile) {
  if (profile?.avatarUrl) return profile.avatarUrl
  if (profile?.skinUrl?.includes('minotar.net/skin/')) return profile.skinUrl.replace('/skin/', '/avatar/') + '/48'
  if (profile?.authType === 'elyby' && profile?.username) return `https://skinsystem.ely.by/avatars/${encodeURIComponent(profile.username)}`
  return `https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || 'Steve')}/48`
}

export default function AppShell({
  activePage,
  onNavigate,
  profile,
  accounts = [],
  onSelectAccount,
  onDeleteAccount,
  onLogin,
  onOpenThemes,
  children,
}) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const avatar = useMemo(() => avatarFor(profile), [profile])

  useEffect(() => {
    const close = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img className={styles.logo} src={logoIcon} alt="VibeLauncher" />
          <span className={styles.brandTitle}>
            <span className={styles.logoVibe}>Vibe</span>Launcher
          </span>
        </div>

        <nav className={styles.nav} aria-label="Основная навигация">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${activePage === id ? styles.navItemActive : ''}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button
            type="button"
            className={styles.folderButton}
            onClick={() => window.vibe?.openGameDir?.()}
            title="Открыть папку .minecraft"
          >
            <FolderOpen size={18} strokeWidth={1.8} />
            <span>Папка игры</span>
          </button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.dragSpace} />

          {/* Quick project actions: Themes & Discord */}
          <div className={styles.quickActions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.themesActionBtn}`}
              onClick={onOpenThemes}
              title="Сменить тему оформления и фон"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
              <span>Темы</span>
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.discordActionBtn}`}
              onClick={() => window.vibe?.openExternal?.('https://discord.gg/fM9M8fc45s')}
              title="Discord сервер VibeLauncher"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M19.54 4.64A16.2 16.2 0 0 0 15.5 3.4l-.5 1a15.2 15.2 0 0 0-6 0l-.5-1a16.3 16.3 0 0 0-4.05 1.25C1.89 8.43 1.2 12.1 1.54 15.73A16.2 16.2 0 0 0 6.5 18.25l1.2-1.63a9.55 9.55 0 0 1-1.9-.92l.46-.36c3.67 1.72 7.8 1.72 11.42 0l.57.45c-.6.36-1.24.67-1.9.92l1.2 1.63a16.1 16.1 0 0 0 4.96-2.52c.4-4.2-.67-7.84-2.98-11.18ZM8.84 13.5c-1.02 0-1.85-.94-1.85-2.1s.82-2.1 1.85-2.1c1.04 0 1.87.95 1.85 2.1 0 1.16-.82 2.1-1.85 2.1Zm6.32 0c-1.02 0-1.85-.94-1.85-2.1s.82-2.1 1.85-2.1c1.04 0 1.87.95 1.85 2.1 0 1.16-.81 2.1-1.85 2.1Z" />
              </svg>
              <span>Discord</span>
            </button>
          </div>

          <div className={styles.accountArea} ref={accountRef}>
            <button
              type="button"
              className={styles.accountButton}
              onClick={() => (profile ? setAccountOpen((value) => !value) : onLogin())}
            >
              <img
                src={avatar}
                alt=""
                className={styles.accountAvatar}
                onError={(event) => {
                  event.currentTarget.src = 'https://minotar.net/avatar/MHF_Steve/48'
                }}
              />
              <span className={styles.accountText}>
                <strong>{profile?.username || 'Войти в аккаунт'}</strong>
                <small>
                  <i
                    className={`${styles.statusDot} ${
                      profile?.authType === 'microsoft'
                        ? styles.dotOnline
                        : profile?.authType === 'elyby'
                        ? styles.dotElyBy
                        : styles.dotOffline
                    }`}
                  />
                  {profile?.authType === 'microsoft'
                    ? 'Лицензия'
                    : profile?.authType === 'elyby'
                    ? 'Ely.by'
                    : 'Офлайн'}
                </small>
              </span>
              {profile ? (
                <ChevronDown size={17} className={accountOpen ? styles.chevronOpen : ''} />
              ) : (
                <LogIn size={16} />
              )}
            </button>
            {accountOpen && profile && (
              <div className={styles.accountMenu}>
                <div className={styles.menuLabel}>Сохраненные аккаунты</div>
                {accounts.map((account) => {
                  const selected =
                    account.username === profile.username &&
                    account.authType === profile.authType
                  return (
                    <div
                      className={`${styles.accountRow} ${
                        selected ? styles.accountRowActive : ''
                      }`}
                      key={`${account.username}-${account.authType || 'offline'}`}
                    >
                      <button
                        type="button"
                        className={styles.accountPick}
                        onClick={() => {
                          onSelectAccount(account)
                          setAccountOpen(false)
                        }}
                      >
                        <img src={avatarFor(account)} alt="" />
                        <span>
                          <strong>{account.username}</strong>
                          <small>
                            {account.authType === 'microsoft'
                              ? 'Лицензия'
                              : account.authType === 'elyby'
                              ? 'Ely.by'
                              : 'Офлайн'}
                          </small>
                        </span>
                      </button>
                      {!selected && (
                        <button
                          type="button"
                          className={styles.removeAccount}
                          onClick={() => onDeleteAccount(account)}
                          title="Удалить аккаунт"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
                <button
                  type="button"
                  className={styles.loginButton}
                  onClick={() => {
                    setAccountOpen(false)
                    onLogin()
                  }}
                >
                  <LogIn size={15} /> Добавить аккаунт
                </button>
              </div>
            )}
          </div>
          <div className={styles.windowControls}>
            <button
              type="button"
              onClick={() => window.vibe?.minimize()}
              aria-label="Свернуть"
              title="Свернуть"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => window.vibe?.maximize()}
              aria-label="Развернуть"
              title="Развернуть"
            >
              <Square size={13} />
            </button>
            <button
              type="button"
              className={styles.closeControl}
              onClick={() => window.vibe?.close()}
              aria-label="Закрыть"
              title="Закрыть"
            >
              <X size={17} />
            </button>
          </div>
        </header>
        <div className={styles.pageFrame} key={activePage}>
          {children}
        </div>
      </section>
    </div>
  )
}
