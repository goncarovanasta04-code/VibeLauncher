import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ChevronDown,
  User,
  LogIn,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Folder,
  Info,
  SlidersHorizontal,
  Check,
  X,
  Download,
  Puzzle,
  Layers,
  Box,
  Plus,
  Trash2,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import MiniSkin3D from '../components/MiniSkin3D'
import LaunchErrorModal from '../components/LaunchErrorModal'
import packageInfo from '../../package.json'
import styles from './Home.module.css'

function isVersionInstalled(v, locals) {
  if (!v || !locals || locals.length === 0) return false
  if (v.isLocal) return true

  // Direct match by ID
  if (locals.some((l) => l.id === v.id)) return true

  // Fabric check
  if (v.type === 'fabric') {
    const loaderId = v.loaderVersion ? `fabric-loader-${v.loaderVersion}-${v.id}` : null
    return locals.some((l) =>
      (loaderId && l.id === loaderId) ||
      (l.id.includes('fabric') && l.id.includes(v.id)) ||
      (l.type === 'fabric' && (l.baseVersion === v.id || l.id.includes(v.id)))
    )
  }

  // Vanilla check
  if (v.type === 'vanilla') {
    return locals.some((l) => l.id === v.id || (l.type === 'vanilla' && l.id === v.id))
  }

  // Forge / NeoForge / OptiFine check
  if (v.type === 'forge') {
    return locals.some((l) => l.type === 'forge' && (l.baseVersion === v.id || l.id.includes(v.id)))
  }

  return false
}

export default function Home({
  profile,
  setProfile,
  accounts = [],
  onSelectAccount,
  onDeleteAccount,
  selectedVersion,
  setSelectedVersion,
  onNavigate,
  onLoginRequest,
  onGameRunningChange,
  cardRef,
}) {
  const [localVersions, setLocalVersions] = useState([])
  const [presetVersions, setPresetVersions] = useState([])
  const [manifestVersions, setManifestVersions] = useState([])
  const [selected, setSelected] = useState(
    selectedVersion || { id: '1.16.5', label: 'Fabric 1.16.5', type: 'fabric', loaderVersion: '0.16.10' }
  )
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const [versionSearch, setVersionSearch] = useState('')
  const [launching, setLaunching] = useState(false)
  const [status, setStatus] = useState('')
  const [progressPct, setProgressPct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshingVersions, setRefreshingVersions] = useState(false)
  const [launchErrorData, setLaunchErrorData] = useState(null)
  const [showErrorModal, setShowErrorModal] = useState(false)

  // Checkboxes
  const [delayedLaunch, setDelayedLaunch] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)

  const dropdownRef = useRef(null)
  const profileMenuRef = useRef(null)
  const maxSeenProgress = useRef(0)

  const isInstalled = useMemo(() => {
    return isVersionInstalled(selected, localVersions)
  }, [selected, localVersions])

  const userAvatarSrc = useMemo(() => {
    if (profile?.avatarUrl) return profile.avatarUrl
    if (profile?.skinUrl && profile.skinUrl.includes('minotar.net/skin/')) {
      return profile.skinUrl.replace('/skin/', '/avatar/') + '/32'
    }
    if (profile?.authType === 'elyby' && profile?.username) {
      return `https://skinsystem.ely.by/avatars/${encodeURIComponent(profile.username)}`
    }
    return `https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || 'Steve')}/32`
  }, [profile])

  useEffect(() => {
    if (selectedVersion) {
      setSelected(selectedVersion)
    }
  }, [selectedVersion])

  useEffect(() => {
    loadVersions()

    // Listen for live progress with monotonic smoothing (never jumps backwards!)
    if (window.vibe?.onGameProgress) {
      window.vibe.onGameProgress((evt) => {
        let phaseCalculated = null
        let phaseText = ''

        if (evt.type === 'download-status' && evt.data) {
          const { current, total } = evt.data
          if (total > 0) {
            const rawPct = Math.min(100, Math.round((current / total) * 100))
            phaseCalculated = Math.round((rawPct / 100) * 25)
            phaseText = `Загрузка компонентов: ${rawPct}%`
          }
        } else if (evt.type === 'progress' && evt.data) {
          const { task, total, type } = evt.data
          const rawPct = total > 0 ? Math.min(100, Math.round((task / total) * 100)) : 0

          if (type === 'natives' || type === 'classes' || type === 'download' || type === 'libraries') {
            phaseCalculated = 25 + Math.round((rawPct / 100) * 40)
            phaseText = total > 0 ? `Библиотеки: ${task}/${total}` : 'Подготовка библиотек...'
          } else if (type === 'assets') {
            phaseCalculated = 65 + Math.round((rawPct / 100) * 27)
            phaseText = total > 0 ? `Текстуры и звуки: ${task}/${total}` : 'Подготовка ресурсов...'
          } else {
            phaseCalculated = Math.round((rawPct / 100) * 90)
            phaseText = total > 0 ? `Файлы: ${task}/${total}` : 'Подготовка файлов...'
          }
        } else if (evt.type === 'status' && evt.text) {
          phaseText = evt.text
          if (evt.text.includes('Java')) {
            phaseCalculated = 15
          } else if (evt.text.includes('Библиот') || evt.text.includes('Downloading')) {
            phaseCalculated = 35
          } else if (evt.text.includes('Ассет') || evt.text.includes('assets')) {
            phaseCalculated = 70
          }
        }

        if (phaseCalculated !== null) {
          const monotonicPct = Math.min(98, Math.max(maxSeenProgress.current, phaseCalculated))
          maxSeenProgress.current = monotonicPct
          setProgressPct(monotonicPct)
        }

        if (phaseText) {
          setStatus(phaseText)
        }
      })
    }

    if (window.vibe?.onGameLog) {
      window.vibe.onGameLog((log) => {
        if (log.type === 'out' && log.text) {
          maxSeenProgress.current = 100
          setProgressPct(100)
          setStatus('Игра запущена!')
          setTimeout(() => {
            setProgressPct(null)
          }, 1200)
        }
      })
    }

    return () => {
      window.vibe?.offGameProgress?.()
      window.vibe?.offGameLog?.()
    }
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowVersionDropdown(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const saved = await window.vibe?.storeGet('lastVersion')
      
      // 1. Scan local versions in .minecraft/versions
      const localRes = await window.vibe?.getLocalVersions()
      const locals = localRes?.ok ? localRes.versions || [] : []
      setLocalVersions(locals)

      // 2. Curated popular presets
      const presets = [
        { id: '1.16.5', label: 'Fabric 1.16.5', type: 'fabric', loaderVersion: '0.16.10' },
        { id: '1.16.5', label: 'Vanilla 1.16.5', type: 'vanilla' },
        { id: '1.20.1', label: 'Fabric 1.20.1', type: 'fabric', loaderVersion: '0.16.10' },
        { id: '1.20.1', label: 'Vanilla 1.20.1', type: 'vanilla' },
        { id: '1.12.2', label: 'Vanilla 1.12.2', type: 'vanilla' },
        { id: '1.8.9', label: 'Vanilla 1.8.9', type: 'vanilla' },
      ]
      setPresetVersions(presets)

      // 3. Official releases from manifest
      const manifestRes = await window.vibe?.getVersionManifest()
      if (manifestRes?.ok && manifestRes.versions) {
        const releases = manifestRes.versions
          .filter((v) => v.type === 'release')
          .slice(0, 40)
          .map((v) => ({
            id: v.id,
            label: `Vanilla ${v.id}`,
            type: 'vanilla',
          }))
        setManifestVersions(releases)
      }

      // Initial selection logic: saved > first local > first preset
      if (saved) {
        setSelected(saved)
      } else if (locals.length > 0) {
        setSelected(locals[0])
      } else {
        setSelected(presets[0])
      }
    } catch (e) {
      console.error('[Home] loadVersions error:', e)
    }
    setLoading(false)
  }

  const handleRefreshVersions = async (e) => {
    e?.stopPropagation?.()
    setRefreshingVersions(true)
    try {
      await loadVersions()
      setStatus('Каталог версий обновлен')
      setTimeout(() => setStatus(''), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => setRefreshingVersions(false), 500)
    }
  }

  const handleLaunch = async () => {
    if (!profile) {
      setStatus('Сначала введите никнейм')
      onLoginRequest()
      setTimeout(() => setStatus(''), 3500)
      return
    }
    if (!selected) {
      setStatus('Выберите версию игры')
      return
    }

    setLaunching(true)
    maxSeenProgress.current = 0
    setProgressPct(0)
    setStatus(!isInstalled ? 'Установка клиента...' : 'Запуск...')

    if (delayedLaunch) {
      for (let i = 3; i > 0; i--) {
        setStatus(`Отложенный запуск (${i} сек)...`)
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    const settings = (await window.vibe?.storeGet('settings')) || {}

    try {
      const result = await window.vibe?.launchGame({
        mcVersion: selected.id,
        type: selected.type || 'vanilla',
        loaderVersion: selected.loaderVersion,
        username: profile.username,
        token: profile.token,
        uuid: profile.uuid,
        isOnline: profile.isOnline,
        authType: profile.authType || (profile.token ? 'elyby' : 'offline'),
        gameDir: settings.gameDir,
        ramMin: settings.ramMin || 1,
        ramMax: settings.ramMax || 4,
        javaPath: settings.javaPath,
        width: settings.width || 1920,
        height: settings.height || 1080,
        fullscreen: settings.fullscreen || false,
        forceUpdate: forceUpdate,
        potatoMode: Boolean(settings.potatoMode),
      })

      if (result?.ok) {
        setStatus('Игра завершена')
        // Automatically refresh local versions in case a newly installed version is now in .minecraft/versions
        await loadVersions()
      } else {
        const err = result?.error || 'Произошла неизвестная ошибка, о которой мы не знаем :( Попробуйте исправить сами.'
        setStatus(err.length > 45 ? err.substring(0, 42) + '...' : err)
        console.error('Launch error:', result)
        setLaunchErrorData({
          version: selected?.label || selected?.id,
          reason: err,
          code: result?.code,
          logs: result?.logs || '',
        })
        setShowErrorModal(true)
      }
    } catch (err) {
      setStatus('Ошибка: ' + err.message)
      setLaunchErrorData({
        version: selected?.label || selected?.id,
        reason: err.message,
        code: 1,
        logs: '',
      })
      setShowErrorModal(true)
    } finally {
      onGameRunningChange?.(false)
    }

    setLaunching(false)
    setProgressPct(null)
    setTimeout(() => setStatus(''), 5000)

    if (selected) {
      window.vibe?.storeSet('lastVersion', selected)
    }
  }

  const handleOpenFolder = async () => {
    await window.vibe?.openGameDir()
  }

  const handleOpenVersionsFolder = async () => {
    await window.vibe?.openVersionsDir()
    setShowVersionDropdown(false)
  }

  const handleLogout = async () => {
    setProfile(null)
    await window.vibe?.storeDelete('profile')
    setShowProfileDropdown(false)
  }

  const selectVersion = (v) => {
    setSelected(v)
    if (setSelectedVersion) setSelectedVersion(v)
    setShowVersionDropdown(false)
    setVersionSearch('')
    window.vibe?.storeSet('lastVersion', v)
  }

  // Search filtering
  const query = versionSearch.toLowerCase().trim()
  const filterFn = (v) => (v.label || v.id).toLowerCase().includes(query)

  const filteredLocal = localVersions.filter(filterFn)
  const filteredPresets = presetVersions.filter(
    (p) => filterFn(p) && !localVersions.some((lv) => lv.id === p.id && lv.type === p.type)
  )
  const filteredManifest = manifestVersions.filter(
    (m) =>
      filterFn(m) &&
      !localVersions.some((lv) => lv.id === m.id) &&
      !presetVersions.some((p) => p.id === m.id && p.type === 'vanilla')
  )

  const hasAnyResults =
    filteredLocal.length > 0 || filteredPresets.length > 0 || filteredManifest.length > 0

  const versionDisplayLabel = selected?.label || selected?.id || 'Fabric 1.16.5'

  const handleMouseMove = (e) => {
    const card = e.currentTarget
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty('--mouse-x', `${x}px`)
    card.style.setProperty('--mouse-y', `${y}px`)
  }

  return (
    <div className={styles.page}>
      {/* Center Interactive Liquid Glass Card */}
      <div
        ref={cardRef}
        className={styles.centerCard}
        onMouseMove={handleMouseMove}
      >
        {/* Row 1: Profile Selector [ 👤 ZIKYT (Лицензия) ⌵ ] */}
        <div className={styles.fieldWrap} ref={profileMenuRef}>
          {profile ? (
            <div className={styles.profileRowLayout}>
              <button
                type="button"
                className={styles.avatarMainBtn}
                onClick={() => setShowProfileDropdown((v) => !v)}
                title="Меню профиля"
              >
                <img
                  src={userAvatarSrc}
                  alt={profile.username}
                  className={styles.userAvatarImg}
                  onError={(e) => {
                    e.target.src = 'https://minotar.net/avatar/MHF_Steve/32'
                  }}
                />
              </button>

              <button
                type="button"
                className={styles.profileNickBtn}
                onClick={() => setShowProfileDropdown((v) => !v)}
              >
                <div className={styles.fieldLeft}>
                  <span className={styles.fieldText}>{profile.username}</span>
                  {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                    <span className={styles.badgeMicrosoft} title="Официальная лицензия Microsoft">
                      <span className={styles.dotMicrosoft} />
                      Лицензия
                    </span>
                  ) : profile.authType === 'elyby' ? (
                    <span className={styles.badgeElyBy} title="Ely.by Аккаунт">
                      <span className={styles.dotElyBy} />
                      Ely.by
                    </span>
                  ) : (
                    <span className={styles.badgeOffline} title="Офлайн режим (Пиратка)">
                      <span className={styles.dotOffline} />
                      Офлайн
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.8}
                  className={`${styles.chevron} ${
                    showProfileDropdown ? styles.chevronOpen : ''
                  }`}
                />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.selectBtn}
              onClick={onLoginRequest}
            >
              <div className={styles.fieldLeft}>
                <User size={16} strokeWidth={1.8} className={styles.fieldIcon} />
                <span className={styles.fieldTextPlaceholder}>Напишите свой Никнейм</span>
              </div>
              <LogIn size={15} strokeWidth={1.8} className={styles.chevron} />
            </button>
          )}

          {/* Profile Dropdown Menu */}
          {showProfileDropdown && (
            <div className={styles.dropdownMenu}>
              <div className={styles.menuHeader}>
                {/* 3D Rotating Skin Preview inside menu */}
                <div className={styles.menu3DBox}>
                  <MiniSkin3D
                    skinUrl={profile?.skinUrl}
                    username={profile?.username}
                    model={profile?.skinModel || 'default'}
                    width={72}
                    height={98}
                  />
                </div>

                <div className={styles.menuHeaderRight}>
                  <span className={styles.menuTitle}>Аккаунт</span>
                  <span className={styles.menuNick}>{profile?.username}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                      <span className={styles.badgeMicrosoft}>
                        <span className={styles.dotMicrosoft} />
                        Лицензия
                      </span>
                    ) : profile.authType === 'elyby' ? (
                      <span className={styles.badgeElyBy}>
                        <span className={styles.dotElyBy} />
                        Ely.by
                      </span>
                    ) : (
                      <span className={styles.badgeOffline}>
                        <span className={styles.dotOffline} />
                        Офлайн
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Saved accounts list for 1-click switching */}
              {accounts && accounts.length > 0 && (
                <div className={styles.accountsSection}>
                  <div className={styles.accountsTitle}>Сохранённые аккаунты ({accounts.length})</div>
                  <div className={styles.accountsList}>
                    {accounts.map((acc, idx) => {
                      const isActive =
                        profile &&
                        acc.username === profile.username &&
                        acc.authType === profile.authType
                      return (
                        <div
                          key={acc.username + '-' + (acc.authType || 'offline') + '-' + idx}
                          className={`${styles.accountRow} ${isActive ? styles.accountRowActive : ''}`}
                          onClick={() => {
                            if (!isActive && onSelectAccount) {
                              onSelectAccount(acc)
                              setShowProfileDropdown(false)
                            }
                          }}
                          title={isActive ? 'Текущий активный аккаунт' : `Переключиться на ${acc.username}`}
                        >
                          <img
                            src={acc.avatarUrl || `https://mc-heads.net/avatar/${encodeURIComponent(acc.username)}/32`}
                            alt={acc.username}
                            className={styles.accountRowAvatar}
                            onError={(e) => {
                              e.target.src = 'https://minotar.net/avatar/MHF_Steve/32'
                            }}
                          />
                          <div className={styles.accountRowInfo}>
                            <span className={styles.accountRowNick}>{acc.username}</span>
                            <span className={styles.accountRowType}>
                              {acc.authType === 'microsoft'
                                ? '🟢 Лицензия'
                                : acc.authType === 'elyby'
                                ? '🔵 Ely.by'
                                : '⚪ Офлайн'}
                            </span>
                          </div>
                          {isActive ? (
                            <span className={styles.accountActiveBadge} title="Активный аккаунт">
                              <Check size={12} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.accountDeleteBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onDeleteAccount) onDeleteAccount(acc)
                              }}
                              title="Удалить из сохранённых"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setShowProfileDropdown(false)
                  onLoginRequest()
                }}
              >
                <Plus size={14} strokeWidth={2} />
                <span>Добавить / Сменить аккаунт</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={1.8} />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Version Selector [ 📦 Fabric 1.16.5 ⌵ ] and Refresh Catalog button */}
        <div className={styles.fieldWrap} ref={dropdownRef}>
          <div className={styles.versionSelectorRow}>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => !loading && setShowVersionDropdown((v) => !v)}
            >
              <div className={styles.fieldLeft}>
                <Box size={16} strokeWidth={1.8} className={styles.fieldIcon} />
                <span className={styles.fieldText}>{versionDisplayLabel}</span>
              </div>
              {loading ? (
                <Loader2 size={15} className={styles.spin} />
              ) : (
                <ChevronDown
                  size={16}
                  strokeWidth={1.8}
                  className={`${styles.chevron} ${
                    showVersionDropdown ? styles.chevronOpen : ''
                  }`}
                />
              )}
            </button>

            <button
              type="button"
              className={`${styles.refreshVersionsBtn} ${refreshingVersions ? styles.refreshVersionsBtnSpin : ''}`}
              onClick={handleRefreshVersions}
              title="Обновить каталог версий (пересканировать папку versions)"
              disabled={loading || refreshingVersions}
            >
              <RotateCw size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Version Dropdown */}
          {showVersionDropdown && (
            <div className={styles.versionDropdown}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Поиск версии..."
                  value={versionSearch}
                  onChange={(e) => setVersionSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>

              <div className={styles.versionList}>
                {/* Section 1: Local / Installed Versions */}
                {filteredLocal.length > 0 && (
                  <>
                    <div className={styles.groupHeader}>📁 Установленные и свои версии</div>
                    {filteredLocal.map((v, idx) => (
                      <button
                        key={'loc-' + v.id + idx}
                        type="button"
                        className={`${styles.versionItem} ${
                          selected?.id === v.id && (!selected?.type || selected?.type === v.type)
                            ? styles.versionItemActive
                            : ''
                        }`}
                        onClick={() => selectVersion(v)}
                      >
                        <div className={styles.versionItemLeft}>
                          <span className={styles.versionItemName}>{v.label || v.id}</span>
                          <span className={styles.versionItemBadge}>{v.type}</span>
                        </div>
                        {selected?.id === v.id && (
                          <Check size={14} className={styles.checkIcon} />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Section 2: Popular Presets */}
                {filteredPresets.length > 0 && (
                  <>
                    <div className={styles.groupHeader}>⚡ Популярные сборки</div>
                    {filteredPresets.map((v, idx) => (
                      <button
                        key={'pre-' + v.id + v.type + idx}
                        type="button"
                        className={`${styles.versionItem} ${
                          selected?.id === v.id && selected?.type === v.type
                            ? styles.versionItemActive
                            : ''
                        }`}
                        onClick={() => selectVersion(v)}
                      >
                        <div className={styles.versionItemLeft}>
                          <span className={styles.versionItemName}>{v.label || v.id}</span>
                          <span className={styles.versionItemBadge}>{v.type}</span>
                        </div>
                        {selected?.id === v.id && selected?.type === v.type && (
                          <Check size={14} className={styles.checkIcon} />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Section 3: Official Mojang Releases */}
                {filteredManifest.length > 0 && (
                  <>
                    <div className={styles.groupHeader}>🌐 Официальные релизы</div>
                    {filteredManifest.map((v, idx) => (
                      <button
                        key={'man-' + v.id + idx}
                        type="button"
                        className={`${styles.versionItem} ${
                          selected?.id === v.id && selected?.type === v.type
                            ? styles.versionItemActive
                            : ''
                        }`}
                        onClick={() => selectVersion(v)}
                      >
                        <div className={styles.versionItemLeft}>
                          <span className={styles.versionItemName}>{v.label || v.id}</span>
                        </div>
                        {selected?.id === v.id && selected?.type === v.type && (
                          <Check size={14} className={styles.checkIcon} />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {!hasAnyResults && (
                  <div className={styles.noResults}>Версии не найдены</div>
                )}
              </div>

              {/* Bottom bar inside dropdown */}
              <div className={styles.dropdownFooter}>
                <button
                  type="button"
                  className={styles.dropdownFooterBtn}
                  onClick={handleOpenVersionsFolder}
                  title="Открыть папку versions в проводнике"
                >
                  <Folder size={13} />
                  <span>Папка версий</span>
                </button>
                <button
                  type="button"
                  className={styles.dropdownFooterBtn}
                  onClick={() => {
                    setShowVersionDropdown(false)
                    onNavigate('versions')
                  }}
                  title="Открыть менеджер библиотек и загрузок"
                >
                  <Download size={13} />
                  <span>Библиотека</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Two Checkboxes with Info Badges and Tooltips */}
        <div className={styles.checkboxContainer}>
          <label className={styles.checkboxLabel} title="Запускает 3-секундный таймер перед стартом игры, чтобы успеть отменить или подготовиться">
            <input
              type="checkbox"
              checked={delayedLaunch}
              onChange={(e) => setDelayedLaunch(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}>
              <Check size={12} strokeWidth={2.6} className={styles.checkMark} />
            </span>
            <span className={styles.checkboxText}>Отложенный запуск</span>
            <span className={styles.helpBadge} title="Задержка 3 секунды перед стартом игры">?</span>
          </label>

          <label className={styles.checkboxLabel} title="Принудительно очищает файлы версии и скачивает чистый клиент и библиотеки заново">
            <input
              type="checkbox"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}>
              <Check size={12} strokeWidth={2.6} className={styles.checkMark} />
            </span>
            <span className={styles.checkboxText}>Обновить клиент</span>
            <span className={styles.helpBadge} title="Принудительно перекачивает файлы клиента при сбоях">?</span>
          </label>
        </div>

        {/* Thin Divider Line */}
        <div className={styles.cardDivider} />

        {/* Row 4: Big Button «Запустить» / «Установить» with Humanized Compact Progress */}
        <div className={styles.launchArea}>
          {launching && (
            <div className={styles.launchHudCompact}>
              <div className={styles.launchHudTop}>
                <div className={styles.launchHudPulseDot} />
                <span className={styles.launchHudHumanText}>
                  {(() => {
                    if (!status) return !isInstalled ? 'Подготовка к установке клиента...' : 'Подготовка к погружению в игру...'
                    if (status.includes('Ассет') || status.includes('assets') || status.includes('Текстуры')) {
                      return progressPct ? `Загрузка текстур и звуков (${progressPct}%)` : 'Загрузка ресурсов игры...'
                    }
                    if (status.includes('Библиот') || status.includes('natives')) {
                      return 'Проверка и распаковка библиотек...'
                    }
                    if (status.includes('Java')) {
                      return 'Настройка среды выполнения Java...'
                    }
                    if (status.includes('Запуск') || status.includes('запущ') || status.includes('игра')) {
                      return 'Всё готово! Запуск игрового клиента...'
                    }
                    return status
                  })()}
                </span>
                {progressPct !== null && (
                  <span className={styles.launchHudHumanPct}>{progressPct}%</span>
                )}
              </div>
              <div className={styles.launchTrackThin}>
                <div
                  className={`${styles.launchTrackThinBar} ${
                    progressPct === null ? styles.launchTrackShimmer : ''
                  }`}
                  style={{
                    width: `${progressPct !== null ? Math.max(6, progressPct) : 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className={`${styles.launchBtn} ${!isInstalled ? styles.launchBtnInstall : ''} ${launching ? styles.launchBtnLoading : ''}`}
            onClick={handleLaunch}
            disabled={launching || loading}
          >
            {launching ? (
              <div className={styles.launchBtnContent}>
                <Loader2 size={16} className={styles.spin} />
                <span>
                  {!isInstalled ? 'Установка клиента...' : 'Запуск игрового процесса...'}
                </span>
              </div>
            ) : !isInstalled ? (
              <div className={styles.launchBtnContent}>
                <Download size={17} strokeWidth={2.2} />
                <span>Установить</span>
              </div>
            ) : (
              <div className={styles.launchBtnContent}>
                <Play size={17} strokeWidth={2.2} fill="currentColor" />
                <span>Запустить</span>
              </div>
            )}

            {progressPct !== null && !launching && (
              <div
                className={styles.progressBar}
                style={{ width: `${progressPct}%` }}
              />
            )}
          </button>
        </div>

        {/* Row 5: 7 Toolbar Square Glass Buttons with Tooltips */}
        <div className={styles.toolBar}>


          <div className={styles.toolBtnWrap} data-tooltip="Моды, шейдеры и текстуры">
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('mods')}
              aria-label="Моды и шейдеры"
            >
              <Puzzle size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip="Каталог версий">
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('versions')}
              aria-label="Каталог версий"
            >
              <Layers size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip="Папка игры (.minecraft)">
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleOpenFolder}
              aria-label="Папка игры"
            >
              <Folder size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip="Настройки">
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('settings')}
              aria-label="Настройки"
            >
              <SlidersHorizontal size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip="О лаунчере">
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => setShowInfoModal(true)}
              aria-label="О лаунчере"
            >
              <Info size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Elongated Glass Pill Banner */}
      <div className={styles.bottomBanner}>
        <span>Спасибо за использование нашего лаунчера</span>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className={styles.infoOverlay} onClick={() => setShowInfoModal(false)}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoHeader}>
              <h3 className={styles.infoTitle}>VibeLauncher</h3>
              <button
                type="button"
                className={styles.infoClose}
                onClick={() => setShowInfoModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.infoBody}>
              <div className={styles.infoRow}>
                <span>Версия лаунчера:</span>
                <b>v{packageInfo.version}</b>
              </div>
              <div className={styles.infoRow}>
                <span>Режим скинов:</span>
                <b>Ely.by / Офлайн</b>
              </div>
              <div className={styles.infoRow}>
                <span>Папка версий:</span>
                <b>.minecraft/versions</b>
              </div>
              <div className={styles.infoRow}>
                <span>Кастомные сборки:</span>
                <b>Поддерживаются</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className={styles.infoOkBtn}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                }}
                onClick={() => {
                  setShowInfoModal(false)
                  onNavigate('changelog')
                }}
              >
                Список изменений
              </button>
              <button
                type="button"
                className={styles.infoOkBtn}
                onClick={() => setShowInfoModal(false)}
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Launch Error Modal */}
      <LaunchErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errorData={launchErrorData}
        onOpenFolder={handleOpenFolder}
      />
    </div>
  )
}

