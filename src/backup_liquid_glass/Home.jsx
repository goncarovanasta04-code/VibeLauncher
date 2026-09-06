import { useState, useEffect, useRef } from 'react'
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
  Menu,
  Check,
  X,
  Sparkles,
  Download,
  Puzzle,
  Layers,
} from 'lucide-react'
import styles from './Home.module.css'

export default function Home({ profile, setProfile, selectedVersion, setSelectedVersion, onNavigate, onLoginRequest, cardRef }) {
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

  // Checkboxes
  const [delayedLaunch, setDelayedLaunch] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)

  const dropdownRef = useRef(null)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    if (selectedVersion) {
      setSelected(selectedVersion)
    }
  }, [selectedVersion])

  useEffect(() => {
    loadVersions()

    // Listen for live progress
    if (window.vibe?.onGameProgress) {
      window.vibe.onGameProgress((evt) => {
        if (evt.type === 'download-status' && evt.data) {
          const { current, total } = evt.data
          if (total > 0) {
            const pct = Math.min(100, Math.round((current / total) * 100))
            setProgressPct(pct)
            setStatus(`Загрузка: ${pct}%`)
          }
        } else if (evt.type === 'progress' && evt.data) {
          const { task, total, type } = evt.data
          const typeName =
            type === 'natives'
              ? 'Библиотеки'
              : type === 'assets'
              ? 'Ассеты'
              : 'Файлы'
          if (total > 0) {
            const pct = Math.round((task / total) * 100)
            setProgressPct(pct)
            setStatus(`${typeName}: ${task}/${total} (${pct}%)`)
          } else {
            setStatus(`Подготовка ${typeName}...`)
          }
        } else if (evt.type === 'status' && evt.text) {
          setStatus(evt.text)
        }
      })
    }

    if (window.vibe?.onGameLog) {
      window.vibe.onGameLog((log) => {
        if (log.type === 'out' && log.text) {
          setStatus('Игра запущена!')
          setProgressPct(null)
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
    setProgressPct(null)
    setStatus('Запуск...')

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
      })

      if (result?.ok) {
        setStatus('Игра завершена')
      } else {
        const err = result?.error || 'Ошибка запуска игры'
        setStatus(err.length > 50 ? err.substring(0, 47) + '...' : err)
        console.error('Launch error:', result?.error)
      }
    } catch (err) {
      setStatus('Ошибка: ' + err.message)
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
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => setShowProfileDropdown((v) => !v)}
            >
              <div className={styles.fieldLeft}>
                <User size={16} className={styles.fieldIcon} />
                <span className={styles.fieldText}>{profile.username}</span>
                {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                  <span className={styles.badgeMicrosoft} title="Официальная лицензия Microsoft">
                    Лицензия
                  </span>
                ) : profile.authType === 'elyby' ? (
                  <span className={styles.badgeElyBy} title="Ely.by Аккаунт">
                    Ely.by
                  </span>
                ) : (
                  <span className={styles.badgeOffline} title="Офлайн режим (Пиратка)">
                    Офлайн
                  </span>
                )}
              </div>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  showProfileDropdown ? styles.chevronOpen : ''
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              className={styles.selectBtn}
              onClick={onLoginRequest}
            >
              <div className={styles.fieldLeft}>
                <User size={16} className={styles.fieldIcon} />
                <span className={styles.fieldTextPlaceholder}>Напишите свой Никнейм</span>
              </div>
              <LogIn size={15} className={styles.chevron} />
            </button>
          )}

          {/* Profile Dropdown Menu */}
          {showProfileDropdown && (
            <div className={styles.dropdownMenu}>
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>Аккаунт</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span className={styles.menuNick}>{profile?.username}</span>
                  {profile.authType === 'microsoft' || profile.type === 'microsoft' ? (
                    <span className={styles.badgeMicrosoft}>Лицензия</span>
                  ) : profile.authType === 'elyby' ? (
                    <span className={styles.badgeElyBy}>Ely.by</span>
                  ) : (
                    <span className={styles.badgeOffline}>Офлайн</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setShowProfileDropdown(false)
                  onLoginRequest()
                }}
              >
                <User size={14} />
                <span>Сменить аккаунт / никнейм</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Выйти</span>
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Version Selector [ Fabric 1.16.5 ⌵ ] */}
        <div className={styles.fieldWrap} ref={dropdownRef}>
          <button
            type="button"
            className={styles.selectBtn}
            onClick={() => !loading && setShowVersionDropdown((v) => !v)}
          >
            <div className={styles.fieldLeft}>
              <span className={styles.fieldText}>{versionDisplayLabel}</span>
            </div>
            {loading ? (
              <Loader2 size={15} className={styles.spin} />
            ) : (
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  showVersionDropdown ? styles.chevronOpen : ''
                }`}
              />
            )}
          </button>

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

        {/* Row 3: Two Checkboxes */}
        <div className={styles.checkboxContainer}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={delayedLaunch}
              onChange={(e) => setDelayedLaunch(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom} />
            <span className={styles.checkboxText}>Отложенный запуск</span>
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom} />
            <span className={styles.checkboxText}>Обновить клиент</span>
          </label>
        </div>

        {/* Thin Divider Line */}
        <div className={styles.cardDivider} />

        {/* Row 4: Big Button «Запустить» */}
        <div className={styles.launchArea}>
          <button
            type="button"
            className={`${styles.launchBtn} ${launching ? styles.launchBtnLoading : ''}`}
            onClick={handleLaunch}
            disabled={launching || loading}
          >
            {launching ? (
              <div className={styles.launchBtnContent}>
                <Loader2 size={16} className={styles.spin} />
                <span>{status || 'Запуск...'}</span>
              </div>
            ) : (
              <span>Запустить</span>
            )}

            {progressPct !== null && (
              <div
                className={styles.progressBar}
                style={{ width: `${progressPct}%` }}
              />
            )}
          </button>
        </div>

        {/* Row 5: 5 Toolbar Square Glass Buttons */}
        <div className={styles.toolBar}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setShowInfoModal(true)}
            title="Информация"
          >
            <Info size={16} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleOpenFolder}
            title="Открыть папку игры (.minecraft)"
          >
            <Folder size={16} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onNavigate('mods')}
            title="Каталог модов, шейдеров и ресурспаков"
          >
            <Puzzle size={16} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onNavigate('versions')}
            title="Каталог и менеджер версий"
          >
            <Layers size={16} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onNavigate('settings')}
            title="Настройки"
          >
            <Menu size={16} />
          </button>
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
                <b>1.1.0</b>
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
    </div>
  )
}

