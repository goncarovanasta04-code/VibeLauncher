import { useState, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Download,
  Check,
  Loader2,
  Trash2,
  FolderOpen,
  Puzzle,
  Sparkles,
  Palette,
  Layers,
  RefreshCw,
  Power,
  Folder,
  SlidersHorizontal,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react'
import styles from './ModsModal.module.css'

const TABS = [
  { id: 'mod', label: 'Моды', icon: Puzzle },
  { id: 'shader', label: 'Шейдеры', icon: Sparkles },
  { id: 'resourcepack', label: 'Ресурспаки', icon: Palette },
  { id: 'installed', label: 'Установленные', icon: Layers },
]

const LOADERS = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'neoforge', label: 'NeoForge' },
  { id: 'quilt', label: 'Quilt' },
  { id: 'all', label: 'Все' },
]

export default function ModsModal({ activeVersion, localVersions = [], onClose }) {
  const [tab, setTab] = useState('mod')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLoader, setSelectedLoader] = useState(
    activeVersion?.type === 'forge' ? 'forge' : 'fabric'
  )
  const [targetVersionId, setTargetVersionId] = useState(activeVersion?.id || '1.16.5')

  // Search Results
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Installing states: { [projectId]: { loading: boolean, progress: number, done: boolean, text: string } }
  const [installStatus, setInstallStatus] = useState({})

  // Installed tracking
  const [installedItems, setInstalledItems] = useState([])
  const [installedInfo, setInstalledInfo] = useState({ projectIds: [], slugs: [], fileNames: [] })
  const [installedLoading, setInstalledLoading] = useState(false)
  const [installedFilter, setInstalledFilter] = useState('all')

  const searchTimeoutRef = useRef(null)

  // Extract base Minecraft version from versionId (e.g. "fabric-loader-0.16.10-1.16.5" -> "1.16.5")
  const getMcVersionOnly = (id) => {
    if (!id) return ''
    if (id.startsWith('fabric-loader-')) {
      const parts = id.split('-')
      return parts[parts.length - 1]
    }
    if (id.startsWith('forge-')) {
      const parts = id.split('-')
      return parts[parts.length - 1]
    }
    if (id.startsWith('neoforge-')) {
      const parts = id.split('-')
      return parts[parts.length - 1]
    }
    // Match standard Minecraft major/minor version (e.g. 1.16.5, 1.20.1)
    const match = id.match(/(1\.\d+(\.\d+)?)/)
    return match ? match[1] : id
  }

  const mcVersion = getMcVersionOnly(targetVersionId)

  // Always load installed list on start & when target version changes
  useEffect(() => {
    loadInstalled()
  }, [targetVersionId])

  useEffect(() => {
    if (tab === 'installed') {
      loadInstalled()
    } else {
      performSearch()
    }
  }, [tab, selectedLoader, targetVersionId])

  // Handle search query with debounce
  const handleQueryChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      if (tab !== 'installed') {
        performSearch(val)
      }
    }, 400)
  }

  const performSearch = async (query = searchQuery) => {
    setLoading(true)
    setSearchError('')
    try {
      const res = await window.vibe?.searchMods({
        query: query,
        type: tab,
        mcVersion: mcVersion,
        loader: tab === 'mod' ? selectedLoader : undefined,
        limit: 30,
      })

      if (res?.ok) {
        setHits(res.hits || [])
      } else {
        setSearchError(res?.error || 'Не удалось загрузить данные с Modrinth')
        setHits([])
      }
    } catch (err) {
      setSearchError('Ошибка поиска: ' + err.message)
    }
    setLoading(false)
  }

  const loadInstalled = async () => {
    setInstalledLoading(true)
    try {
      const res = await window.vibe?.getInstalledMods(targetVersionId)
      if (res?.ok) {
        setInstalledItems(res.items || [])
        setInstalledInfo({
          projectIds: res.installedProjectIds || [],
          slugs: res.installedSlugs || [],
          fileNames: res.installedFileNames || [],
        })
      }
    } catch (err) {
      console.error('Error loading installed mods:', err)
    }
    setInstalledLoading(false)
  }

  const isHitInstalled = (hit) => {
    if (!hit) return false
    if (installStatus[hit.id]?.done) return true
    if (installedInfo.projectIds?.includes(hit.id)) return true
    if (hit.slug && installedInfo.slugs?.includes(hit.slug.toLowerCase())) return true
    if (hit.slug && installedInfo.fileNames?.some((fn) => fn.includes(hit.slug.toLowerCase())))
      return true
    return false
  }

  const handleInstall = async (hit) => {
    const pId = hit.id
    setInstallStatus((prev) => ({
      ...prev,
      [pId]: { loading: true, progress: 0, done: false, text: 'Поиск...' },
    }))

    try {
      const vRes = await window.vibe?.getModVersions({
        slugOrId: hit.slug || pId,
        mcVersion: mcVersion,
        loader: tab === 'mod' ? (selectedLoader === 'all' ? undefined : selectedLoader) : undefined,
        type: tab,
      })

      if (!vRes?.ok || !vRes.versions || vRes.versions.length === 0) {
        throw new Error('Нет подходящей версии для Minecraft ' + mcVersion)
      }

      const latestVer = vRes.versions[0]
      const file = latestVer.file
      if (!file || !file.url) {
        throw new Error('Файл загрузки не найден')
      }

      setInstallStatus((prev) => ({
        ...prev,
        [pId]: { loading: true, progress: 50, done: false, text: 'Загрузка...' },
      }))

      const installRes = await window.vibe?.installModFile({
        fileUrl: file.url,
        fileName: file.filename,
        versionId: targetVersionId,
        type: tab,
        projectId: hit.id,
        projectSlug: hit.slug,
        projectTitle: hit.title,
      })

      if (installRes?.ok) {
        setInstallStatus((prev) => ({
          ...prev,
          [pId]: { loading: false, progress: 100, done: true, text: 'Установлено' },
        }))
        await loadInstalled()
      } else {
        throw new Error(installRes?.error || 'Ошибка записи файла')
      }
    } catch (err) {
      setInstallStatus((prev) => ({
        ...prev,
        [pId]: { loading: false, progress: 0, done: false, error: err.message, text: 'Ошибка' },
      }))
      setTimeout(() => {
        setInstallStatus((prev) => {
          const copy = { ...prev }
          delete copy[pId]
          return copy
        })
      }, 3500)
    }
  }

  const handleToggle = async (item) => {
    try {
      const res = await window.vibe?.toggleModFile(item.path)
      if (res?.ok) {
        await loadInstalled()
      }
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Удалить файл ${item.name}?`)) {
      try {
        const res = await window.vibe?.deleteModFile({
          filePath: item.path,
          versionId: targetVersionId,
        })
        if (res?.ok) {
          await loadInstalled()
        }
      } catch (err) {
        console.error('Delete error:', err)
      }
    }
  }

  const handleOpenFolder = (folderType) => {
    window.vibe?.openModFolder(targetVersionId, folderType || 'mods')
  }

  const formatDownloads = (num) => {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return String(num)
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }

  const filteredInstalled = installedItems.filter((it) => {
    if (installedFilter === 'all') return true
    return it.category === installedFilter
  })

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} glass`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Puzzle size={20} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>Каталог модификаций</h2>
              <span className={styles.subtitle}>
                Modrinth • Моды, шейдеры и ресурспаки для Minecraft {mcVersion}
              </span>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Version target selector */}
            <div className={styles.versionSelectorWrap}>
              <span className={styles.versionLabel}>Папка версии:</span>
              <select
                className={styles.versionSelect}
                value={targetVersionId}
                onChange={(e) => setTargetVersionId(e.target.value)}
              >
                {localVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label || v.id}
                  </option>
                ))}
                {!localVersions.some((v) => v.id === targetVersionId) && (
                  <option value={targetVersionId}>{targetVersionId}</option>
                )}
              </select>
            </div>

            <button type="button" className={styles.closeBtn} onClick={onClose} title="Закрыть">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className={styles.topControlBar}>
          <div className={styles.tabs}>
            {TABS.map((t) => {
              const Icon = t.icon
              const isInstalledTab = t.id === 'installed'
              const installedCount = installedItems.length

              return (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                  onClick={() => {
                    setTab(t.id)
                    setSearchQuery('')
                  }}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                  {isInstalledTab && installedCount > 0 && (
                    <span className={styles.tabBadge}>{installedCount}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick open folder button */}
          <div className={styles.folderActions}>
            <button
              type="button"
              className={styles.openFolderBtn}
              onClick={() =>
                handleOpenFolder(
                  tab === 'shader'
                    ? 'shaderpacks'
                    : tab === 'resourcepack'
                    ? 'resourcepacks'
                    : 'mods'
                )
              }
              title="Открыть папку в Проводнике"
            >
              <FolderOpen size={14} />
              <span>
                Папка{' '}
                {tab === 'shader'
                  ? 'шейдеров'
                  : tab === 'resourcepack'
                  ? 'ресурспаков'
                  : 'модов'}
              </span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row (When on Catalog tabs) */}
        {tab !== 'installed' && (
          <div className={styles.searchFilterRow}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={
                  tab === 'mod'
                    ? 'Поиск модов (Sodium, Iris, JEI, JourneyMap...)'
                    : tab === 'shader'
                    ? 'Поиск шейдеров (Complementary, BSL, Sildurs...)'
                    : 'Поиск ресурспаков (Faithful, Bare Bones, Fresh Animations...)'
                }
                value={searchQuery}
                onChange={handleQueryChange}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchQuery('')
                    performSearch('')
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Loader selector (Only on Mods tab) */}
            {tab === 'mod' && (
              <div className={styles.loaderFilters}>
                <span className={styles.filterLabel}>Загрузчик:</span>
                <div className={styles.loaderPills}>
                  {LOADERS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`${styles.loaderPill} ${
                        selectedLoader === l.id ? styles.loaderPillActive : ''
                      }`}
                      onClick={() => setSelectedLoader(l.id)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Installed Categories Filter Row (When on Installed tab) */}
        {tab === 'installed' && (
          <div className={styles.installedFiltersRow}>
            <div className={styles.installedTabs}>
              <button
                type="button"
                className={`${styles.filterPill} ${
                  installedFilter === 'all' ? styles.filterPillActive : ''
                }`}
                onClick={() => setInstalledFilter('all')}
              >
                Все ({installedItems.length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${
                  installedFilter === 'mods' ? styles.filterPillActive : ''
                }`}
                onClick={() => setInstalledFilter('mods')}
              >
                Моды ({installedItems.filter((i) => i.category === 'mods').length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${
                  installedFilter === 'shaderpacks' ? styles.filterPillActive : ''
                }`}
                onClick={() => setInstalledFilter('shaderpacks')}
              >
                Шейдеры ({installedItems.filter((i) => i.category === 'shaderpacks').length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${
                  installedFilter === 'resourcepacks' ? styles.filterPillActive : ''
                }`}
                onClick={() => setInstalledFilter('resourcepacks')}
              >
                Ресурспаки ({installedItems.filter((i) => i.category === 'resourcepacks').length})
              </button>
            </div>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={loadInstalled}
              disabled={installedLoading}
              title="Обновить список"
            >
              <RefreshCw size={13} className={installedLoading ? styles.spin : ''} />
              <span>Обновить</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className={styles.body}>
          {tab !== 'installed' ? (
            /* Catalog Grid */
            loading ? (
              <div className={styles.centerState}>
                <Loader2 size={32} className={styles.spin} />
                <span className={styles.stateText}>Поиск на Modrinth...</span>
              </div>
            ) : searchError ? (
              <div className={styles.centerState}>
                <span className={styles.errorText}>{searchError}</span>
                <button
                  type="button"
                  className={styles.retryBtn}
                  onClick={() => performSearch(searchQuery)}
                >
                  <RefreshCw size={13} />
                  <span>Повторить поиск</span>
                </button>
              </div>
            ) : hits.length === 0 ? (
              <div className={styles.centerState}>
                <Puzzle size={40} className={styles.emptyIcon} />
                <span className={styles.stateText}>
                  Ничего не найдено для Minecraft {mcVersion}
                </span>
                <span className={styles.emptyHint}>
                  Попробуйте изменить поисковый запрос или переключить фильтр загрузчика
                </span>
              </div>
            ) : (
              <div className={styles.grid}>
                {hits.map((hit) => {
                  const status = installStatus[hit.id]
                  const isInstalled = isHitInstalled(hit)

                  return (
                    <div
                      key={hit.id}
                      className={`${styles.card} ${isInstalled ? styles.cardInstalled : ''}`}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardIconWrap}>
                          {hit.icon ? (
                            <img
                              src={hit.icon}
                              alt={hit.title}
                              className={styles.cardIcon}
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className={styles.cardIconFallback}>
                              {tab === 'shader' ? (
                                <Sparkles size={20} />
                              ) : tab === 'resourcepack' ? (
                                <Palette size={20} />
                              ) : (
                                <Puzzle size={20} />
                              )}
                            </div>
                          )}
                        </div>

                        <div className={styles.cardTitleWrap}>
                          <div className={styles.cardTitleRow}>
                            <h4 className={styles.cardTitle} title={hit.title}>
                              {hit.title}
                            </h4>
                            {isInstalled && (
                              <span className={styles.installedBadge} title="Установлен в этой версии">
                                <CheckCircle2 size={12} />
                                <span>Установлен</span>
                              </span>
                            )}
                          </div>
                          <span className={styles.cardAuthor}>от {hit.author}</span>
                        </div>
                      </div>

                      <p className={styles.cardDesc} title={hit.description}>
                        {hit.description || 'Описание отсутствует'}
                      </p>

                      <div className={styles.cardFooter}>
                        <div className={styles.cardMeta}>
                          <span className={styles.metaDownloads}>
                            ⬇ {formatDownloads(hit.downloads)}
                          </span>
                          {hit.categories?.slice(0, 2).map((cat) => (
                            <span key={cat} className={styles.catTag}>
                              {cat}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          className={`${styles.installBtn} ${
                            isInstalled ? styles.installBtnDone : ''
                          } ${status?.loading ? styles.installBtnLoading : ''}`}
                          onClick={() => handleInstall(hit)}
                          disabled={status?.loading}
                          title={isInstalled ? 'Уже установлен (нажмите для переустановки)' : 'Скачать и установить'}
                        >
                          {status?.loading ? (
                            <>
                              <Loader2 size={13} className={styles.spin} />
                              <span>{status.text || 'Загрузка...'}</span>
                            </>
                          ) : isInstalled ? (
                            <>
                              <Check size={14} />
                              <span>Установлен</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              <span>Скачать</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* Installed Items List */
            installedLoading ? (
              <div className={styles.centerState}>
                <Loader2 size={32} className={styles.spin} />
                <span className={styles.stateText}>Чтение установленных файлов...</span>
              </div>
            ) : filteredInstalled.length === 0 ? (
              <div className={styles.centerState}>
                <PackageCheck size={42} className={styles.emptyIcon} />
                <span className={styles.stateText}>
                  В версии {targetVersionId} пока нет установленных файлов
                </span>
                <span className={styles.emptyHint}>
                  Перейдите во вкладку «Моды», «Шейдеры» или «Ресурспаки» чтобы скачать дополнения в один клик
                </span>
              </div>
            ) : (
              <div className={styles.installedList}>
                {filteredInstalled.map((item) => (
                  <div
                    key={item.path}
                    className={`${styles.installedItem} ${
                      !item.enabled ? styles.installedItemDisabled : ''
                    }`}
                  >
                    <div className={styles.itemLeft}>
                      <div className={styles.itemCategoryIcon}>
                        {item.type === 'shader' ? (
                          <Sparkles size={16} />
                        ) : item.type === 'resourcepack' ? (
                          <Palette size={16} />
                        ) : (
                          <Puzzle size={16} />
                        )}
                      </div>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{item.name}</span>
                        <div className={styles.itemMeta}>
                          <span className={styles.itemTypeTag}>
                            {item.type === 'shader'
                              ? 'Шейдер'
                              : item.type === 'resourcepack'
                              ? 'Ресурспак'
                              : 'Мод'}
                          </span>
                          {item.size > 0 && (
                            <span className={styles.itemSize}>{formatSize(item.size)}</span>
                          )}
                          {!item.enabled && (
                            <span className={styles.disabledBadge}>Отключен</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${
                          item.enabled ? styles.actionBtnActive : styles.actionBtnOff
                        }`}
                        onClick={() => handleToggle(item)}
                        title={item.enabled ? 'Отключить' : 'Включить'}
                      >
                        <Power size={13} />
                        <span>{item.enabled ? 'Вкл' : 'Выкл'}</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => handleDelete(item)}
                        title="Удалить файл"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
