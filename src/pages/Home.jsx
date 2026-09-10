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
import { useLanguage } from '../context/LanguageContext'
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
  const { t } = useLanguage()
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
  const [playtimeStats, setPlaytimeStats] = useState({ totalPlaytimeMs: 0 })

  const loadPlaytimeStats = async () => {
    try {
      const stats = await window.vibe?.getPlaytimeStats?.()
      if (stats) setPlaytimeStats(stats)
    } catch (e) {}
  }

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
    loadPlaytimeStats()

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
            phaseText = t('home_phase_components', { pct: rawPct })
          }
        } else if (evt.type === 'progress' && evt.data) {
          const { task, total, type } = evt.data
          const rawPct = total > 0 ? Math.min(100, Math.round((task / total) * 100)) : 0

          if (type === 'natives' || type === 'classes' || type === 'download' || type === 'libraries') {
            phaseCalculated = 25 + Math.round((rawPct / 100) * 40)
            phaseText = total > 0 ? t('home_phase_libraries_count', { task, total }) : t('home_phase_libraries_prep')
          } else if (type === 'assets') {
            phaseCalculated = 65 + Math.round((rawPct / 100) * 27)
            phaseText = total > 0 ? t('home_phase_resources_count', { task, total }) : t('home_phase_resources_prep')
          } else {
            phaseCalculated = Math.round((rawPct / 100) * 90)
            phaseText = total > 0 ? t('home_phase_files_count', { task, total }) : t('home_phase_files_prep')
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
          setStatus(t('home_game_running_status'))
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

  const [versionTab, setVersionTab] = useState('all')
  const [deletingVersionId, setDeletingVersionId] = useState(null)

  const loadVersions = async () => {
    setLoading(true)
    try {
      let saved = await window.vibe?.storeGet('lastVersion')
      if (!saved) {
        try {
          const ls = localStorage.getItem('vibelauncher_last_version')
          if (ls) saved = JSON.parse(ls)
        } catch (e) {}
      }
      
      // 1. Scan local versions in .minecraft/versions
      const localRes = await window.vibe?.getLocalVersions()
      const locals = localRes?.ok ? localRes.versions || [] : []
      setLocalVersions(locals)

      // 2. Curated popular presets
      const presets = [
        { id: '1.21.1', label: 'Fabric 1.21.1', type: 'fabric', loaderVersion: '0.16.10' },
        { id: '1.20.1', label: 'Fabric 1.20.1', type: 'fabric', loaderVersion: '0.16.10' },
        { id: '1.16.5', label: 'Fabric 1.16.5', type: 'fabric', loaderVersion: '0.16.10' },
        { id: '1.21.1', label: 'Vanilla 1.21.1', type: 'vanilla' },
        { id: '1.20.1', label: 'Vanilla 1.20.1', type: 'vanilla' },
        { id: '1.16.5', label: 'Vanilla 1.16.5', type: 'vanilla' },
        { id: '1.12.2', label: 'Vanilla 1.12.2', type: 'vanilla' },
        { id: '1.8.9', label: 'Vanilla 1.8.9', type: 'vanilla' },
      ]
      setPresetVersions(presets)

      // 3. Official releases from manifest (clean standard semantic versions only: 1.21.4, 1.20.1, 1.16.5...)
      const manifestRes = await window.vibe?.getVersionManifest()
      if (manifestRes?.ok && Array.isArray(manifestRes.versions)) {
        const cleanReleases = manifestRes.versions
          .filter((v) => v.type === 'release' && /^1\.\d+(\.\d+)?$/.test(v.id))
          .map((v) => ({
            id: v.id,
            label: `Vanilla ${v.id}`,
            type: 'vanilla',
          }))
          .sort((a, b) => {
            const parseParts = (str) => str.split('.').map((n) => parseInt(n, 10) || 0)
            const pA = parseParts(a.id)
            const pB = parseParts(b.id)
            for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
              const diff = (pB[i] || 0) - (pA[i] || 0)
              if (diff !== 0) return diff
            }
            return 0
          })
          .slice(0, 50)
        setManifestVersions(cleanReleases)
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

  const handleDeleteLocalVersion = async (e, v) => {
    e.stopPropagation()
    const isPack = v.isModpack || v.type === 'modpack'
    const confirmMsg = isPack
      ? `Вы действительно хотите удалить сборку «${v.label || v.id}»? Все её моды и файлы будут удалены.`
      : `Удалить версию Minecraft «${v.label || v.id}»?`

    if (!window.confirm(confirmMsg)) return

    setDeletingVersionId(v.id)
    try {
      const res = await window.vibe?.deleteVersion(v.id)
      if (res?.ok) {
        await loadVersions()
        if (selected?.id === v.id) {
          const fallback = presetVersions[0] || { id: '1.20.1', label: 'Fabric 1.20.1', type: 'fabric' }
          setSelected(fallback)
          window.vibe?.storeSet('lastVersion', fallback)
        }
        setStatus(isPack ? 'Сборка успешно удалена' : 'Версия удалена')
        setTimeout(() => setStatus(''), 3000)
      } else {
        alert(res?.error || 'Не удалось удалить версию')
      }
    } catch (err) {
      alert('Ошибка при удалении: ' + err.message)
    } finally {
      setDeletingVersionId(null)
    }
  }

  const handleRefreshVersions = async (e) => {
    e?.stopPropagation?.()
    setRefreshingVersions(true)
    try {
      await loadVersions()
      setStatus(t('home_versions_updated'))
      setTimeout(() => setStatus(''), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => setRefreshingVersions(false), 500)
    }
  }

  const handleLaunch = async () => {
    if (!profile) {
      setStatus(t('home_enter_nick_first'))
      onLoginRequest()
      setTimeout(() => setStatus(''), 3500)
      return
    }
    if (!selected) {
      setStatus(t('home_select_version_first'))
      return
    }

    setLaunching(true)
    maxSeenProgress.current = 0
    setProgressPct(0)
    setStatus(!isInstalled ? t('home_installing_client') : t('home_launching_game'))

    if (delayedLaunch) {
      for (let i = 3; i > 0; i--) {
        setStatus(t('home_delayed_launch_status', { seconds: i }))
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
        setStatus(t('home_game_finished'))
        // Automatically refresh local versions in case a newly installed version is now in .minecraft/versions
        await loadVersions()
      } else {
        const err = result?.error || t('home_unknown_error')
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
      setStatus(t('home_error_prefix') + ': ' + err.message)
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
    try {
      localStorage.setItem('vibelauncher_last_version', JSON.stringify(v))
    } catch (e) {}
  }

  // Search & Tab filtering
  const query = versionSearch.toLowerCase().trim()
  const filterFn = (v) => (v.label || v.id).toLowerCase().includes(query)

  const allModpacks = localVersions.filter((v) => v.isModpack || v.type === 'modpack')
  const allRegularLocal = localVersions.filter((v) => !v.isModpack && v.type !== 'modpack')

  const filteredModpacks = allModpacks.filter(filterFn)
  const filteredLocalRegular = allRegularLocal.filter((v) => {
    if (!filterFn(v)) return false
    if (versionTab === 'fabric') return v.type === 'fabric' || v.id.includes('fabric')
    if (versionTab === 'forge') return v.type === 'forge' || v.id.includes('forge')
    if (versionTab === 'vanilla') return v.type === 'vanilla'
    return true
  })

  const filteredPresets = presetVersions.filter((p) => {
    if (!filterFn(p)) return false
    if (localVersions.some((lv) => lv.id === p.id && lv.type === p.type)) return false
    if (versionTab === 'fabric') return p.type === 'fabric'
    if (versionTab === 'forge') return p.type === 'forge'
    if (versionTab === 'vanilla') return p.type === 'vanilla'
    if (versionTab === 'modpack' || versionTab === 'installed') return false
    return true
  })

  const filteredManifest = manifestVersions.filter((m) => {
    if (!filterFn(m)) return false
    if (localVersions.some((lv) => lv.id === m.id)) return false
    if (presetVersions.some((p) => p.id === m.id && p.type === 'vanilla')) return false
    if (versionTab === 'modpack' || versionTab === 'installed' || versionTab === 'fabric' || versionTab === 'forge') return false
    return true
  })

  const showModpacksSection = (versionTab === 'all' || versionTab === 'modpack' || versionTab === 'installed') && filteredModpacks.length > 0
  const showLocalSection = (versionTab === 'all' || versionTab === 'installed' || versionTab === 'fabric' || versionTab === 'forge' || versionTab === 'vanilla') && filteredLocalRegular.length > 0
  const showPresetsSection = (versionTab === 'all' || versionTab === 'fabric' || versionTab === 'forge' || versionTab === 'vanilla') && filteredPresets.length > 0
  const showManifestSection = (versionTab === 'all' || versionTab === 'vanilla') && filteredManifest.length > 0

  const hasAnyResults = showModpacksSection || showLocalSection || showPresetsSection || showManifestSection

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
                title={t('home_profile_menu')}
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
                className={styles.selectBtn}
                onClick={() => setShowProfileDropdown((v) => !v)}
                title={t('home_profile_menu')}
              >
                <div className={styles.fieldLeft}>
                  <span className={styles.fieldText}>{profile.username}</span>
                  {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                    <span className={styles.badgeMicrosoft} title={t('home_badge_microsoft_title')}>
                      <span className={styles.dotMicrosoft} />
                      {t('home_badge_license')}
                    </span>
                  ) : profile.authType === 'elyby' ? (
                    <span className={styles.badgeElyBy} title={t('home_badge_elyby_title')}>
                      <span className={styles.dotElyBy} />
                      Ely.by
                    </span>
                  ) : (
                    <span className={styles.badgeOffline} title={t('home_badge_offline_title')}>
                      <span className={styles.dotOffline} />
                      {t('home_badge_offline')}
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
                <span className={styles.fieldTextPlaceholder}>{t('home_enter_nickname_ph')}</span>
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
                  <span className={styles.menuTitle}>{t('accounts')}</span>
                  <span className={styles.menuNick}>{profile?.username}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                      <span className={styles.badgeMicrosoft}>
                        <span className={styles.dotMicrosoft} />
                        {t('account_type_microsoft')}
                      </span>
                    ) : profile.authType === 'elyby' ? (
                      <span className={styles.badgeElyBy}>
                        <span className={styles.dotElyBy} />
                        {t('account_type_elyby')}
                      </span>
                    ) : (
                      <span className={styles.badgeOffline}>
                        <span className={styles.dotOffline} />
                        {t('account_type_offline')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Saved accounts list for 1-click switching */}
              {accounts && accounts.length > 0 && (
                <div className={styles.accountsSection}>
                  <div className={styles.accountsTitle}>{t('home_saved_accounts', { count: accounts.length })}</div>
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
                          title={isActive ? t('home_active_account_tip') : t('home_switch_to_account', { name: acc.username })}
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
                                ? '🟢 ' + t('account_type_microsoft')
                                : acc.authType === 'elyby'
                                ? '🔵 ' + t('account_type_elyby')
                                : '⚪ ' + t('account_type_offline')}
                            </span>
                          </div>
                          {isActive ? (
                            <span className={styles.accountActiveBadge} title={t('home_active_account_tip')}>
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
                              title={t('home_delete_account_tip')}
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
                <span>{t('home_add_account')}</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={1.8} />
                <span>{t('home_logout')}</span>
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
              title={t('home_refresh_versions_tip')}
              disabled={loading || refreshingVersions}
            >
              <RotateCw size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Version Dropdown */}
          {showVersionDropdown && (
            <div className={styles.versionDropdown}>
              {/* Search Bar */}
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={t('home_search_versions')}
                  value={versionSearch}
                  onChange={(e) => setVersionSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {versionSearch && (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      setVersionSearch('')
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Version Category Filter Tabs */}
              <div className={styles.filterTabsRow}>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${versionTab === 'all' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('all') }}
                >
                  Все
                </button>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${styles.filterTabBtnModpack} ${versionTab === 'modpack' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('modpack') }}
                >
                  <Sparkles size={11} />
                  <span>Сборки</span>
                  {allModpacks.length > 0 && <span className={styles.filterTabBadge}>{allModpacks.length}</span>}
                </button>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${versionTab === 'installed' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('installed') }}
                >
                  Установленные
                </button>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${versionTab === 'fabric' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('fabric') }}
                >
                  Fabric
                </button>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${versionTab === 'forge' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('forge') }}
                >
                  Forge
                </button>
                <button
                  type="button"
                  className={`${styles.filterTabBtn} ${versionTab === 'vanilla' ? styles.filterTabBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setVersionTab('vanilla') }}
                >
                  Vanilla
                </button>
              </div>

              <div className={styles.versionList}>
                {/* Section 1: Installed Modpacks (Сборки) */}
                {showModpacksSection && (
                  <>
                    <div className={styles.groupHeader}>
                      <Sparkles size={11} className={styles.headerModpackIcon} />
                      <span>{t('home_installed_modpacks') || 'Установленные сборки'}</span>
                      <span className={styles.groupCountBadge}>{filteredModpacks.length}</span>
                    </div>
                    {filteredModpacks.map((v, idx) => {
                      const isSelected = selected?.id === v.id
                      const isDeleting = deletingVersionId === v.id
                      return (
                        <div
                          key={'modpack-' + v.id + idx}
                          className={`${styles.versionItem} ${styles.versionItemModpack} ${
                            isSelected ? styles.versionItemActive : ''
                          }`}
                          onClick={() => selectVersion(v)}
                        >
                          <div className={styles.versionItemLeft}>
                            {v.modpackMeta?.icon ? (
                              <img
                                src={v.modpackMeta.icon}
                                alt={v.label}
                                className={styles.modpackThumb}
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className={styles.modpackIconFallback}>
                                <Sparkles size={13} />
                              </div>
                            )}
                            <div className={styles.versionItemModpackInfo}>
                              <span className={styles.versionItemName}>{v.modpackMeta?.title || v.label || v.id}</span>
                              <div className={styles.versionItemModpackMeta}>
                                <span className={styles.versionItemBadgeModpack}>Сборка</span>
                                <span className={styles.modpackSubVer}>
                                  {v.modpackMeta?.mcVersion ? `MC ${v.modpackMeta.mcVersion}` : v.baseVersion || ''}
                                </span>
                                {v.modpackMeta?.loader && (
                                  <span className={styles.modpackLoaderTag}>{v.modpackMeta.loader}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={styles.versionItemRight}>
                            {isSelected && <Check size={14} className={styles.checkIcon} />}
                            <button
                              type="button"
                              className={styles.versionDeleteBtn}
                              onClick={(e) => handleDeleteLocalVersion(e, v)}
                              title="Удалить сборку"
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 size={12} className={styles.spin} /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* If user clicked 'Сборки' tab but none are installed */}
                {versionTab === 'modpack' && allModpacks.length === 0 && (
                  <div className={styles.emptyModpacksPrompt}>
                    <Sparkles size={28} className={styles.emptyPromptIcon} />
                    <span className={styles.emptyPromptTitle}>Нет установленных сборок</span>
                    <span className={styles.emptyPromptText}>Выбирайте и устанавливайте готовые сборки в 1 клик через Модпаки!</span>
                    <button
                      type="button"
                      className={styles.emptyPromptBtn}
                      onClick={() => {
                        setShowVersionDropdown(false)
                        onNavigate('versions')
                      }}
                    >
                      <Download size={13} />
                      <span>Каталог сборок и модов</span>
                    </button>
                  </div>
                )}

                {/* Section 2: Local / Installed Vanilla & Loader Versions */}
                {showLocalSection && (
                  <>
                    <div className={styles.groupHeader}>{t('home_installed_versions')}</div>
                    {filteredLocalRegular.map((v, idx) => {
                      const isSelected = selected?.id === v.id && (!selected?.type || selected?.type === v.type)
                      const isDeleting = deletingVersionId === v.id
                      return (
                        <div
                          key={'loc-' + v.id + idx}
                          className={`${styles.versionItem} ${isSelected ? styles.versionItemActive : ''}`}
                          onClick={() => selectVersion(v)}
                        >
                          <div className={styles.versionItemLeft}>
                            <span className={styles.versionItemName}>{v.label || v.id}</span>
                            <span className={styles.versionItemBadge}>{v.type}</span>
                          </div>

                          <div className={styles.versionItemRight}>
                            {isSelected && <Check size={14} className={styles.checkIcon} />}
                            <button
                              type="button"
                              className={styles.versionDeleteBtn}
                              onClick={(e) => handleDeleteLocalVersion(e, v)}
                              title="Удалить версию"
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 size={12} className={styles.spin} /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Section 3: Popular Presets */}
                {showPresetsSection && (
                  <>
                    <div className={styles.groupHeader}>{t('home_popular_presets')}</div>
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

                {/* Section 4: Official Mojang Releases */}
                {showManifestSection && (
                  <>
                    <div className={styles.groupHeader}>{t('home_official_releases')}</div>
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

                {!hasAnyResults && versionTab !== 'modpack' && (
                  <div className={styles.noResults}>{t('home_no_versions_found')}</div>
                )}
              </div>

              {/* Bottom bar inside dropdown */}
              <div className={styles.dropdownFooter}>
                <button
                  type="button"
                  className={styles.dropdownFooterBtn}
                  onClick={handleOpenVersionsFolder}
                  title={t('home_open_versions_folder')}
                >
                  <Folder size={13} />
                  <span>{t('home_open_versions_folder')}</span>
                </button>
                <button
                  type="button"
                  className={styles.dropdownFooterBtn}
                  onClick={() => {
                    setShowVersionDropdown(false)
                    onNavigate('versions')
                  }}
                  title={t('home_versions_library')}
                >
                  <Download size={13} />
                  <span>{t('home_versions_library')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Two Checkboxes with Info Badges and Tooltips */}
        <div className={styles.checkboxContainer}>
          <label className={styles.checkboxLabel} title={t('home_delayed_launch_tip')}>
            <input
              type="checkbox"
              checked={delayedLaunch}
              onChange={(e) => setDelayedLaunch(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}>
              <Check size={12} strokeWidth={2.6} className={styles.checkMark} />
            </span>
            <span className={styles.checkboxText}>{t('home_delayed_launch')}</span>
            <span className={styles.helpBadge} title={t('home_delayed_launch_help')}>?</span>
          </label>

          <label className={styles.checkboxLabel} title={t('home_force_update_tip')}>
            <input
              type="checkbox"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}>
              <Check size={12} strokeWidth={2.6} className={styles.checkMark} />
            </span>
            <span className={styles.checkboxText}>{t('home_force_update')}</span>
            <span className={styles.helpBadge} title={t('home_force_update_help')}>?</span>
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
                    if (!status) return !isInstalled ? t('home_hud_prep_install') : t('home_hud_prep_launch')
                    const sLower = status.toLowerCase()
                    if (sLower.includes('ассет') || sLower.includes('assets') || sLower.includes('текстур') || sLower.includes('sound')) {
                      return progressPct ? t('home_hud_assets_pct', { pct: progressPct }) : t('home_hud_assets')
                    }
                    if (sLower.includes('библиот') || sLower.includes('librar') || sLower.includes('native')) {
                      return t('home_hud_natives')
                    }
                    if (sLower.includes('java')) {
                      return t('home_hud_java')
                    }
                    if (sLower.includes('запуск') || sLower.includes('запущ') || sLower.includes('игра') || sLower.includes('launch') || sLower.includes('run')) {
                      return t('home_hud_ready')
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
                  {!isInstalled ? t('home_installing') : t('home_launching')}
                </span>
              </div>
            ) : !isInstalled ? (
              <div className={styles.launchBtnContent}>
                <Download size={17} strokeWidth={2.2} />
                <span>{t('home_install')}</span>
              </div>
            ) : (
              <div className={styles.launchBtnContent}>
                <Play size={17} strokeWidth={2.2} fill="currentColor" />
                <span>{t('home_play')}</span>
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

        {/* Row 5: 5 Toolbar Square Glass Buttons with Tooltips */}
        <div className={styles.toolBar}>
          <div className={styles.toolBtnWrap} data-tooltip={t('home_tooltip_mods')}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('mods')}
              aria-label={t('home_tooltip_mods')}
            >
              <Puzzle size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip={t('home_tooltip_versions')}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('versions')}
              aria-label={t('home_tooltip_versions')}
            >
              <Layers size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip={t('home_tooltip_folder')}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleOpenFolder}
              aria-label={t('home_tooltip_folder')}
            >
              <Folder size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip={t('home_tooltip_settings')}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => onNavigate('settings')}
              aria-label={t('home_tooltip_settings')}
            >
              <SlidersHorizontal size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.toolBtnWrap} data-tooltip={t('home_tooltip_about')}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => setShowInfoModal(true)}
              aria-label={t('home_tooltip_about')}
            >
              <Info size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Elongated Glass Pill Banner */}
      <div className={styles.bottomBanner}>
        <span>{t('home_bottom_banner')}</span>
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
                <span>{t('info_app_version')}</span>
                <b>v{packageInfo.version}</b>
              </div>
              <div className={styles.infoRow}>
                <span>{t('info_skin_mode')}</span>
                <b>{t('info_skin_mode_val')}</b>
              </div>
              <div className={styles.infoRow}>
                <span>{t('info_versions_folder')}</span>
                <b>.minecraft/versions</b>
              </div>
              <div className={styles.infoRow}>
                <span>{t('info_custom_builds')}</span>
                <b>{t('info_supported')}</b>
              </div>
              {playtimeStats?.totalPlaytimeMs > 0 && (
                <div className={styles.infoRow}>
                  <span>Время в игре:</span>
                  <b>
                    {Math.floor(playtimeStats.totalPlaytimeMs / 3600000)} ч{' '}
                    {Math.floor((playtimeStats.totalPlaytimeMs % 3600000) / 60000)} мин
                  </b>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className={styles.infoOkBtn}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                }}
                onClick={() => {
                  setShowInfoModal(false)
                  onNavigate('changelog')
                }}
              >
                {t('info_changelog_btn')}
              </button>
              <button
                type="button"
                className={styles.infoOkBtn}
                onClick={() => setShowInfoModal(false)}
              >
                {t('ok')}
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

