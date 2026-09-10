import { useState, useEffect } from 'react'
import {
  Download,
  Check,
  Loader2,
  Search,
  Folder,
  Trash2,
  Play,
  Sparkles,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react'
import styles from './Versions.module.css'
import { useLanguage } from '../context/LanguageContext'

const TAB_KEYS = [
  { id: 'installed', labelKey: 'versions_tab_installed' },
  { id: 'vanilla', labelKey: 'versions_tab_vanilla' },
  { id: 'fabric', labelKey: 'versions_tab_fabric' },
  { id: 'forge', labelKey: 'versions_tab_forge' },
]

const POPULAR_MC_VERSIONS = ['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9']

const TYPE_COLORS = {
  release: '#ffffff',
  vanilla: '#ffffff',
  fabric: '#a855f7',
  forge: '#eab308',
  neoforge: '#f97316',
  quilt: '#5c7cfa',
  optifine: '#ec4899',
  modpack: '#38bdf8',
  custom: '#10b981',
  snapshot: '#f97316',
  'old_beta': '#a29bfe',
  'old_alpha': '#fd79a8',
}

export default function Versions({ onSelectVersion, onNavigate }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('installed')
  const [versions, setVersions] = useState([])
  const [localVersions, setLocalVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState(null)
  const [progress, setProgress] = useState(null)
  const [mcVersionForLoader, setMcVersionForLoader] = useState('1.20.1')
  const [loaderVersions, setLoaderVersions] = useState([])
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [limitVanilla, setLimitVanilla] = useState(50)

  useEffect(() => {
    loadData(mcVersionForLoader)
  }, [tab, mcVersionForLoader])

  useEffect(() => {
    const handler = window.vibe?.onInstallProgress
    if (handler) {
      handler((data) => setProgress(data))
    }
    return () => window.vibe?.offInstallProgress?.()
  }, [])

  const loadData = async (targetMcVer = mcVersionForLoader) => {
    setLoading(true)
    try {
      const localRes = await window.vibe?.getLocalVersions()
      if (localRes?.ok) {
        setLocalVersions(localRes.versions || [])
      }

      if (tab === 'installed') {
        // localVersions already loaded
      } else if (tab === 'vanilla') {
        const res = await window.vibe?.getVersionManifest()
        if (res?.ok) setVersions(res.versions || [])
      } else if (tab === 'fabric') {
        setLoaderVersions([])
        const res = await window.vibe?.getFabricVersions(targetMcVer)
        if (res?.ok) setLoaderVersions(res.versions || [])
      } else if (tab === 'forge') {
        setLoaderVersions([])
        const res = await window.vibe?.getForgeVersions(targetMcVer)
        if (res?.ok) setLoaderVersions(res.versions || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleInstall = async (versionObj, type, loaderVersion) => {
    const vId = versionObj.id || versionObj
    const id = `${type}-${vId}-${loaderVersion || ''}`
    setInstalling(id)
    setProgress({ task: t('loading'), current: 0, total: 1 })

    const settings = (await window.vibe?.storeGet('settings')) || {}
    const result = await window.vibe?.installVersion({
      type: type.toLowerCase(),
      mcVersion: vId || mcVersionForLoader,
      loaderVersion,
      gameDir: settings.gameDir,
    })

    if (result?.ok) {
      await loadData()
      if (onSelectVersion) {
        const installedItem = {
          id: result.versionId || vId,
          label: result.label || `${type} ${vId}`,
          type: result.type || type.toLowerCase(),
          loaderVersion: loaderVersion,
        }
        await window.vibe?.storeSet('lastVersion', installedItem)
        onSelectVersion(installedItem)
      }
    } else {
      alert(result?.error || 'Ошибка при установке версии')
    }

    setInstalling(null)
    setProgress(null)
  }

  const handleDelete = async (versionId) => {
    if (window.confirm(t('versions_confirm_delete', { version: versionId }))) {
      await window.vibe?.deleteVersion(versionId)
      await loadData()
    }
  }

  const handleSelect = (v) => {
    if (onSelectVersion) {
      window.vibe?.storeSet('lastVersion', v)
      onSelectVersion(v)
    }
  }

  const handleOpenVersionsFolder = async () => {
    await window.vibe?.openVersionsDir()
  }

  const isLocalInstalled = (id) => {
    return localVersions.some(
      (lv) => lv.id.toLowerCase() === id.toLowerCase() || lv.baseVersion === id
    )
  }

  const filteredLocal = localVersions.filter((v) =>
    (v.label || v.id).toLowerCase().includes(search.toLowerCase())
  )

  const allFilteredVanilla = versions.filter((v) => {
    if (!showSnapshots && v.type !== 'release') return false
    return v.id.toLowerCase().includes(search.toLowerCase())
  })

  const filteredVanilla = allFilteredVanilla.slice(0, limitVanilla)

  const progressPct = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0

  return (
    <div className={styles.page}>
      <div className={`${styles.panel} glass`}>
        {/* Header Tabs & Controls */}
        <div className={styles.header}>
          <div className={styles.tabs}>
            {TAB_KEYS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
                onClick={() => setTab(item.id)}
              >
                {t(item.labelKey)}
                {item.id === 'installed' && localVersions.length > 0 && (
                  <span className={styles.tabBadge}>{localVersions.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t('versions_search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              {search && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearch('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.openFolderBtn}
              onClick={handleOpenVersionsFolder}
              title={t('versions_folder_btn')}
            >
              <Folder size={14} />
              <span>{t('versions_folder_btn')}</span>
            </button>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => loadData()}
              title={t('versions_refresh_tip')}
            >
              <RefreshCw size={14} className={loading ? styles.spin : ''} />
            </button>
          </div>
        </div>

        {/* Sub-bar: Quick MC Version chips for Fabric/Forge or Snapshot toggle for Vanilla */}
        {(tab === 'fabric' || tab === 'forge') && (
          <div className={styles.subBar}>
            <div className={styles.chipsLabel}>{t('versions_mc_ver_label')}</div>
            <div className={styles.chipsScroll}>
              {POPULAR_MC_VERSIONS.map((ver) => (
                <button
                  key={ver}
                  type="button"
                  className={`${styles.mcChip} ${
                    mcVersionForLoader === ver ? styles.mcChipActive : ''
                  }`}
                  onClick={() => setMcVersionForLoader(ver)}
                >
                  {ver}
                </button>
              ))}
            </div>
            <div className={styles.customVerWrap}>
              <input
                type="text"
                value={mcVersionForLoader}
                onChange={(e) => setMcVersionForLoader(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData(e.target.value)}
                placeholder={t('versions_custom_ver_placeholder')}
                className={styles.customVerInput}
                title={t('versions_custom_ver_tip')}
              />
            </div>
          </div>
        )}

        {tab === 'vanilla' && (
          <div className={styles.subBar}>
            <button
              type="button"
              className={`${styles.snapshotToggle} ${
                showSnapshots ? styles.snapshotToggleActive : ''
              }`}
              onClick={() => setShowSnapshots(!showSnapshots)}
            >
              <span>{t('versions_snapshots_toggle')}</span>
              {showSnapshots && <Check size={12} />}
            </button>
            <span className={styles.counterText}>
              {t('versions_found_count', { count: allFilteredVanilla.length })}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>
              <span className={styles.progressTask}>{progress.task}</span>
              <span className={styles.progressPct}>{progressPct}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Version list */}
        <div className={styles.list}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.skeletonRow} skeleton`}
                style={{ animationDelay: `${i * 0.06}s` }}
              />
            ))
          ) : tab === 'installed' ? (
            filteredLocal.length > 0 ? (
              filteredLocal.map((v) => (
                <div key={v.id} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span
                      className={styles.typeDot}
                      style={{ background: TYPE_COLORS[v.type] || '#ffffff' }}
                    />
                    <div className={styles.versionInfoCol}>
                      <span className={styles.versionId}>{v.label || v.id}</span>
                      <span className={styles.versionSubId}>
                        {t('versions_folder_label')} {v.id} {v.inheritsFrom ? `(${t('versions_base_label')} ${v.inheritsFrom})` : ''}
                      </span>
                    </div>
                    <span
                      className={styles.typeBadge}
                      style={{
                        background: `${TYPE_COLORS[v.type] || '#ffffff'}22`,
                        color: TYPE_COLORS[v.type] || '#ffffff',
                        borderColor: `${TYPE_COLORS[v.type] || '#ffffff'}44`,
                      }}
                    >
                      {v.type}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.selectActiveBtn}
                      onClick={() => handleSelect(v)}
                      title={t('versions_select_btn')}
                    >
                      <Play size={13} />
                      <span>{t('versions_select_btn')}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(v.id)}
                      title={t('versions_delete_tip')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Folder size={32} className={styles.emptyIcon} />
                <p>{t('versions_empty_title')}</p>
                <span>{t('versions_empty_desc')}</span>
              </div>
            )
          ) : tab === 'vanilla' ? (
            <>
              {filteredVanilla.map((v) => {
                const installed = isLocalInstalled(v.id)
                const instId = `vanilla-${v.id}-`
                return (
                  <div key={v.id} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <span
                        className={styles.typeDot}
                        style={{ background: TYPE_COLORS[v.type] || '#ffffff' }}
                      />
                      <span className={styles.versionId}>{v.id}</span>
                      <span className={styles.versionType}>{v.type}</span>
                    </div>
                    <div className={styles.rowActions}>
                      {installed ? (
                        <button
                          type="button"
                          className={styles.selectActiveBtn}
                          onClick={() =>
                            handleSelect({
                              id: v.id,
                              label: `Vanilla ${v.id}`,
                              type: 'vanilla',
                            })
                          }
                        >
                          <Check size={13} />
                          <span>{t('versions_select_btn')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.installBtn}
                          onClick={() => handleInstall(v, 'Vanilla')}
                          disabled={installing === instId}
                        >
                          {installing === instId ? (
                            <Loader2 size={13} className={styles.spin} />
                          ) : (
                            <>
                              <Download size={13} />
                              <span>{t('versions_install_btn')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredVanilla.length < allFilteredVanilla.length && (
                <div className={styles.loadMoreWrap}>
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={() => setLimitVanilla((prev) => prev + 50)}
                  >
                    <span>{t('versions_load_more')}</span>
                    <span className={styles.loadMoreBadge}>
                      {t('versions_of_total', { current: filteredVanilla.length, total: allFilteredVanilla.length })}
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : loaderVersions.length > 0 ? (
            loaderVersions.map((v) => {
              const lv = v.loader || v.version
              const targetId =
                tab === 'forge'
                  ? `forge-${mcVersionForLoader}-${lv}`
                  : `fabric-loader-${lv}-${mcVersionForLoader}`
              const installed = isLocalInstalled(targetId)
              const instId = `${tab}-${mcVersionForLoader}-${lv}`

              return (
                <div key={lv} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span
                      className={styles.typeDot}
                      style={{
                        background: v.stable !== false ? '#a855f7' : '#ff9f43',
                      }}
                    />
                    <span className={styles.versionId}>
                      {tab.toUpperCase()} {mcVersionForLoader} (Loader {lv})
                    </span>
                    {v.stable !== false && <span className={styles.stableBadge}>stable</span>}
                    {v.recommended && <span className={styles.recBadge}>recommended</span>}
                  </div>

                  <div className={styles.rowActions}>
                    {installed ? (
                      <button
                        type="button"
                        className={styles.selectActiveBtn}
                        onClick={() =>
                          handleSelect({
                            id: targetId,
                            label: `${tab.toUpperCase()} ${mcVersionForLoader} (${lv})`,
                            type: tab,
                            loaderVersion: lv,
                          })
                        }
                      >
                        <Check size={13} />
                        <span>{t('versions_select_btn')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.installBtn}
                        onClick={() => handleInstall({ id: mcVersionForLoader }, tab === 'forge' ? 'Forge' : 'Fabric', lv)}
                        disabled={installing === instId}
                      >
                        {installing === instId ? (
                          <Loader2 size={13} className={styles.spin} />
                        ) : (
                          <>
                            <Download size={13} />
                            <span>{t('versions_install_btn')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className={styles.empty}>{t('versions_none_for_mc', { version: mcVersionForLoader })}</div>
          )}
        </div>
      </div>
    </div>
  )
}
