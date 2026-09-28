import { useState, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  AlertTriangle,
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
  Package,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Eye,
  FileText,
  Image as ImageIcon,
  HardDrive,
  Users,
  ShieldCheck,
} from 'lucide-react'
import styles from './ModsModal.module.css'
import { useLanguage } from '../context/LanguageContext'
import { playUiSound } from '../utils/uiSound'

const TABS = [
  { id: 'mod', labelKey: 'mods_tab_mods', icon: Puzzle },
  { id: 'modpack', labelKey: 'mods_tab_modpacks', icon: Package },
  { id: 'shader', labelKey: 'mods_tab_shaders', icon: Sparkles },
  { id: 'resourcepack', labelKey: 'mods_tab_resourcepacks', icon: Palette },
  { id: 'datapack', labelKey: 'mods_tab_datapacks', icon: Folder },
  { id: 'installed', labelKey: 'mods_tab_installed', icon: Layers },
]

const LOADERS = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'neoforge', label: 'NeoForge' },
  { id: 'quilt', label: 'Quilt' },
  { id: 'all', labelKey: 'all' },
]

function RenderMarkdown({ content }) {
  if (!content || typeof content !== 'string') return null

  const lines = content.split('\n')
  const elements = []
  let inCodeBlock = false
  let codeBuffer = []
  let currentList = []

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`}>
          {currentList.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  const parseInline = (text) => {
    if (!text) return ''
    const linkRegex = /\[(.*?)\]\((.*?)\)/g
    const parts = []
    let lastIdx = 0
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index))
      }
      const label = match[1]
      const url = match[2]
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          onClick={(e) => {
            e.preventDefault()
            window.vibe?.openExternal(url)
          }}
        >
          {label}
        </a>
      )
      lastIdx = linkRegex.lastIndex
    }
    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx))
    }

    return parts.length > 0 ? parts : text
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false
        elements.push(
          <pre key={`code-${elements.length}`}>
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    if (line.startsWith('# ')) {
      flushList()
      elements.push(<h1 key={`h1-${elements.length}`}>{parseInline(line.slice(2))}</h1>)
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(<h2 key={`h2-${elements.length}`}>{parseInline(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      flushList()
      elements.push(<h3 key={`h3-${elements.length}`}>{parseInline(line.slice(4))}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      currentList.push(line.slice(2))
    } else if (line.length === 0) {
      flushList()
    } else {
      flushList()
      elements.push(<p key={`p-${elements.length}`}>{parseInline(line)}</p>)
    }
  }
  flushList()

  return <div className={styles.markdownBody}>{elements}</div>
}

const ALL_DEFAULT_MC_VERSIONS = [
  '26.3', '26.2', '26.1.2', '26.1.1', '26.1',
  '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
  '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
  '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
  '1.18.2', '1.18.1', '1.18',
  '1.17.1', '1.17',
  '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
  '1.15.2', '1.15.1', '1.15',
  '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
  '1.13.2', '1.13.1', '1.13',
  '1.12.2', '1.12.1', '1.12',
  '1.11.2', '1.11',
  '1.10.2', '1.10',
  '1.9.4', '1.9',
  '1.8.9', '1.8.8', '1.8',
  '1.7.10',
]

export default function ModsModal({ activeVersion, localVersions = [], onClose, onSelectVersion, embedded = false }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('mod')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLoader, setSelectedLoader] = useState(
    activeVersion?.type === 'forge' ? 'forge' : 'fabric'
  )
  const [targetVersionId, setTargetVersionId] = useState(activeVersion?.id || '1.16.5')
  const [modpackMcVersion, setModpackMcVersion] = useState(activeVersion?.baseVersion || activeVersion?.modpackMeta?.mcVersion || '1.20.1')
  const [modpackVersions, setModpackVersions] = useState(ALL_DEFAULT_MC_VERSIONS)

  const [hits, setHits] = useState([])
  const [totalHits, setTotalHits] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Project Details View State
  const [selectedProject, setSelectedProject] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsData, setDetailsData] = useState(null)
  const [detailsVersions, setDetailsVersions] = useState([])
  const [detailsTab, setDetailsTab] = useState('description')
  const [previewImage, setPreviewImage] = useState(null)

  // Installing states: { [projectId]: { loading: boolean, progress: number, done: boolean, text: string } }
  const [installStatus, setInstallStatus] = useState({})

  // Installed tracking
  const [installedItems, setInstalledItems] = useState([])
  const [installedInfo, setInstalledInfo] = useState({ projectIds: [], slugs: [], fileNames: [] })
  const [installedLoading, setInstalledLoading] = useState(false)
  const [installedFilter, setInstalledFilter] = useState('all')

  const searchTimeoutRef = useRef(null)
  const searchRequestRef = useRef(0)

  // Custom instance creation states
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newInstanceMcVersion, setNewInstanceMcVersion] = useState('1.20.1')
  const [newInstanceLoader, setNewInstanceLoader] = useState('fabric')
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [createInstanceError, setCreateInstanceError] = useState('')

  // Filter out experimental snapshots, and support both 26.x and 1.x Java releases
  const isRealJavaVersion = (id) => {
    if (!id || typeof id !== 'string') return false
    if (/snapshot|pre|rc|beta|alpha|infdev|c0\./i.test(id)) return false
    // 26.x releases (e.g. 26.3, 26.2, 26.1.2, 26.1.1, 26.1)
    if (/^2[6-9](\.\d+)*$/.test(id)) return true
    // 1.x releases (e.g. 1.21.11 down to 1.7.10)
    const match = id.match(/^1\.(\d+)(?:\.(\d+))?$/)
    if (!match) return false
    const minor = parseInt(match[1], 10)
    return minor >= 7
  }

  // Semver comparator for sorting Minecraft versions descending (e.g. 26.3 > 1.21.4 > 1.20.1 > 1.16.5 > 1.7.10)
  const semverCompareDesc = (a, b) => {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0
      const nb = pb[i] || 0
      if (na !== nb) return nb - na
    }
    return 0
  }

  useEffect(() => {
    const fetchManifest = async () => {
      let rawVersions = []
      try {
        const res = await window.vibe?.getVersionManifest?.()
        if (res?.ok && Array.isArray(res.versions) && res.versions.length > 0) {
          rawVersions = res.versions
        }
      } catch (e) {}

      // Fallback to direct Mojang manifest fetch if Electron mock or local storage returns empty
      if (rawVersions.length === 0 && typeof fetch !== 'undefined') {
        try {
          const direct = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
          if (direct.ok) {
            const data = await direct.json()
            if (Array.isArray(data.versions)) {
              rawVersions = data.versions
            }
          }
        } catch (e) {}
      }

      if (rawVersions.length > 0) {
        const ids = rawVersions
          .filter((entry) => entry.type === 'release' && isRealJavaVersion(entry.id))
          .map((entry) => entry.id)
        const combined = [...new Set([...ids, ...ALL_DEFAULT_MC_VERSIONS])]
        const sorted = combined.sort(semverCompareDesc)
        if (sorted.length > 0) {
          setModpackVersions(sorted)
          const currentMc = getMcVersionOnly(targetVersionId)
          if (currentMc && sorted.includes(currentMc)) {
            setModpackMcVersion(currentMc)
            setNewInstanceMcVersion(currentMc)
          } else {
            setModpackMcVersion(sorted[0])
            setNewInstanceMcVersion(sorted[0])
          }
        }
      }
    }
    fetchManifest()
  }, [])

  // Listen to live installation progress from Electron
  useEffect(() => {
    if (window.vibe?.onModInstallProgress) {
      window.vibe.onModInstallProgress((data) => {
        if (data?.task) {
          setInstallStatus((prev) => {
            const keys = Object.keys(prev)
            if (keys.length === 0) return prev
            const activeKey = keys.find((k) => prev[k]?.loading) || keys[keys.length - 1]
            if (!activeKey) return prev
            return {
              ...prev,
              [activeKey]: {
                ...prev[activeKey],
                loading: true,
                progress: data.current !== undefined ? data.current : prev[activeKey].progress,
                text: data.task,
              },
            }
          })
        }
      })
    }
    return () => {
      window.vibe?.offModInstallProgress?.()
    }
  }, [])

  // Extract base Minecraft version from versionId (e.g. "fabric-loader-0.16.10-1.16.5" -> "1.16.5", modpack -> modpackMeta.mcVersion)
  const getMcVersionOnly = (id) => {
    if (!id) return ''
    const targetObj = localVersions.find((v) => v.id === id) || (activeVersion?.id === id ? activeVersion : null)
    if (targetObj?.modpackMeta?.mcVersion) {
      return String(targetObj.modpackMeta.mcVersion).replace(/_/g, '.')
    }
    if (targetObj?.baseVersion) {
      return String(targetObj.baseVersion).replace(/_/g, '.')
    }
    if (id.startsWith('fabric-loader-') || id.startsWith('forge-') || id.startsWith('neoforge-')) {
      const parts = id.split('-')
      const candidate = parts[parts.length - 1]
      return candidate.replace(/_/g, '.')
    }
    const match = id.replace(/_/g, '.').match(/((?:1\.\d+|2[6-9])(?:\.\d+)*)/)
    if (match) return match[1]
    return /^((?:1\.\d+|2[6-9]))/.test(id) ? id : ''
  }

  const mcVersion = getMcVersionOnly(targetVersionId)
  const catalogMcVersion = tab === 'modpack' ? modpackMcVersion : mcVersion
  const targetVersion = localVersions.find((v) => v.id === targetVersionId) || (activeVersion?.id === targetVersionId ? activeVersion : null)
  const lockedLoader = (targetVersion?.modpackMeta?.loader || targetVersion?.type || '').toLowerCase()
  const isLoaderLocked = ['fabric', 'forge', 'neoforge', 'quilt'].includes(lockedLoader)

  // Auto-sync loader and modpack MC version when target version changes
  useEffect(() => {
    const targetObj = localVersions.find((v) => v.id === targetVersionId) || (activeVersion?.id === targetVersionId ? activeVersion : null)
    const ldr = targetObj?.modpackMeta?.loader || targetObj?.type
    if (ldr && ['fabric', 'forge', 'neoforge', 'quilt'].includes(ldr.toLowerCase())) {
      setSelectedLoader(ldr.toLowerCase())
    }
    const currentMc = getMcVersionOnly(targetVersionId)
    if (currentMc) {
      setModpackMcVersion(currentMc)
    }
  }, [targetVersionId, localVersions, activeVersion])

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
  }, [tab, selectedLoader, targetVersionId, modpackMcVersion])

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
  }, [])

  // Handle keyboard ESC: close details view first, or close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null)
        } else if (selectedProject) {
          closeProjectDetails()
        } else if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedProject, previewImage, onClose])

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

  const handleCreateInstance = async (e) => {
    e?.preventDefault?.()
    if (!newInstanceName.trim()) {
      setCreateInstanceError('Введите название сборки')
      return
    }
    setCreatingInstance(true)
    setCreateInstanceError('')

    try {
      const res = await window.vibe?.createCustomInstance?.({
        name: newInstanceName.trim(),
        mcVersion: newInstanceMcVersion,
        loader: newInstanceLoader,
      })

      if (res?.ok && res.instance) {
        playUiSound('success')
        setShowCreateInstanceModal(false)
        setNewInstanceName('')

        // Select newly created instance in launcher
        if (onSelectVersion) {
          onSelectVersion(res.instance)
        }

        // Set target in catalog
        setTargetVersionId(res.instance.id)

        // Reload installed mods for this instance
        await loadInstalled()
      } else {
        throw new Error(res?.error || 'Не удалось создать сборку')
      }
    } catch (err) {
      setCreateInstanceError(err.message || 'Ошибка создания сборки')
      playUiSound('error')
    } finally {
      setCreatingInstance(false)
    }
  }

  const performSearch = async (query = searchQuery, isLoadMore = false) => {
    const requestId = ++searchRequestRef.current
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setHits([])
    }
    setSearchError('')
    const currentOffset = isLoadMore ? hits.length : 0
    const limit = 24

    try {
      const res = await window.vibe?.searchMods({
        query: query,
        type: tab,
        mcVersion: catalogMcVersion,
        loader: tab === 'mod' || tab === 'modpack' ? (selectedLoader === 'all' ? undefined : selectedLoader) : undefined,
        limit,
        offset: currentOffset,
      })

      if (requestId !== searchRequestRef.current) return
      if (res?.ok) {
        if (isLoadMore) {
          setHits((prev) => [...prev, ...(res.hits || [])])
        } else {
          setHits(res.hits || [])
        }
        setTotalHits(Number(res.total) || 0)
      } else {
        if (!isLoadMore) {
          setSearchError(res?.error || t('mods_err_load_failed'))
          setHits([])
          setTotalHits(0)
        }
      }
    } catch (err) {
      if (requestId !== searchRequestRef.current) return
      if (!isLoadMore) {
        setSearchError(t('mods_err_search_prefix') + ': ' + err.message)
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  const handleLoaderChange = (loader) => {
    setSelectedLoader(loader)
    setSearchError('')
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

  const openProjectDetails = async (hit) => {
    setSelectedProject(hit)
    setDetailsLoading(true)
    setDetailsData(null)
    setDetailsVersions([])
    setDetailsTab('description')

    const isModpackProject = tab === 'modpack' || hit.projectType === 'modpack'

    try {
      const [detRes, vRes] = await Promise.all([
        window.vibe?.getModDetails(hit.id || hit.slug),
        window.vibe?.getModVersions({
          slugOrId: hit.id || hit.slug,
          mcVersion: isModpackProject ? catalogMcVersion : mcVersion,
          loader: tab === 'mod' || tab === 'modpack' ? (selectedLoader === 'all' ? undefined : selectedLoader) : undefined,
          type: tab,
        }),
      ])

      if (detRes?.ok && detRes.project) {
        setDetailsData(detRes.project)
      } else {
        setDetailsData(hit)
      }

      if (vRes?.ok && Array.isArray(vRes.versions)) {
        setDetailsVersions(vRes.versions)
      }
    } catch (err) {
      console.warn('Error loading project details:', err)
      setDetailsData(hit)
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeProjectDetails = () => {
    setSelectedProject(null)
    setDetailsData(null)
    setDetailsVersions([])
    setPreviewImage(null)
  }

  const isHitInstalled = (hit) => {
    if (!hit) return false
    if (installStatus[hit.id]?.done) return true
    if (installedInfo.projectIds?.includes(hit.id)) return true
    if (hit.slug && installedInfo.slugs?.includes(hit.slug.toLowerCase())) return true
    if (hit.slug && installedInfo.fileNames?.some((fn) => fn.includes(hit.slug.toLowerCase())))
      return true
    if (tab === 'modpack' || hit.projectType === 'modpack') {
      const isLocalModpack = localVersions.some(
        (v) =>
          (v.isModpack || v.type === 'modpack') &&
          (v.modpackMeta?.id === hit.id ||
            (v.modpackMeta?.slug && hit.slug && v.modpackMeta.slug.toLowerCase() === hit.slug.toLowerCase()) ||
            (hit.slug && v.id.toLowerCase().includes(hit.slug.toLowerCase())) ||
            (hit.title && v.name && v.name.toLowerCase().includes(hit.title.toLowerCase())))
      )
      if (isLocalModpack) return true
    }
    return false
  }

  const handleInstall = async (hit, specificVersion = null) => {
    const pId = hit.id
    const isModpackProject = tab === 'modpack' || hit.projectType === 'modpack'

    setInstallStatus((prev) => ({
      ...prev,
      [pId]: {
        loading: true,
        progress: 0,
        done: false,
        text: isModpackProject ? 'Подготовка сборки...' : t('mods_state_searching'),
      },
    }))

    try {
      let file = null
      let chosenVersionObj = specificVersion

      if (specificVersion?.file?.url) {
        file = specificVersion.file
      } else {
        const vRes = await window.vibe?.getModVersions({
          slugOrId: hit.slug || pId,
          mcVersion: isModpackProject ? catalogMcVersion : mcVersion,
          loader: tab === 'mod' || tab === 'modpack' ? (selectedLoader === 'all' ? undefined : selectedLoader) : undefined,
          type: tab,
        })

        if (!vRes?.ok || !vRes.versions || vRes.versions.length === 0) {
          throw new Error(t('mods_err_no_version', { version: mcVersion }))
        }

        chosenVersionObj = vRes.versions[0]
        file = chosenVersionObj.file
      }

      if (!file || !file.url) {
        throw new Error(t('mods_err_file_not_found'))
      }

      setInstallStatus((prev) => ({
        ...prev,
        [pId]: {
          loading: true,
          progress: 20,
          done: false,
          text: isModpackProject ? 'Загрузка пакета (.mrpack)...' : t('mods_state_downloading'),
        },
      }))

      let installRes
      if (isModpackProject) {
        installRes = await window.vibe?.installModpack({
          fileUrl: file.url,
          fileName: file.filename,
          projectId: hit.id,
          projectSlug: hit.slug,
          projectTitle: hit.title,
          projectIcon: hit.icon,
          specificVersion: chosenVersionObj,
        })
      } else {
        installRes = await window.vibe?.installModFile({
          fileUrl: file.url,
          fileName: file.filename,
          versionId: targetVersionId,
          type: tab,
          projectId: hit.id,
          projectSlug: hit.slug,
          projectTitle: hit.title,
          dependencies: chosenVersionObj?.dependencies,
          mcVersion: mcVersion,
          loader: selectedLoader,
        })
      }

      if (installRes?.ok) {
        playUiSound('success')
        setInstallStatus((prev) => ({
          ...prev,
          [pId]: {
            loading: false,
            progress: 100,
            done: true,
            text: isModpackProject ? 'Сборка установлена!' : t('mods_state_installed'),
          },
        }))

        // If modpack, auto-select it as the active version in the launcher
        if (isModpackProject && onSelectVersion && installRes.versionId) {
          onSelectVersion({
            id: installRes.versionId,
            label: installRes.label,
            type: 'modpack',
            baseVersion: installRes.baseVersion,
            isLocal: true,
            isModpack: true,
            modpackMeta: installRes.modpackMeta,
          })
        }

        await loadInstalled()
      } else {
        throw new Error(installRes?.error || t('mods_err_write_failed'))
      }
    } catch (err) {
      playUiSound('error')
      setInstallStatus((prev) => ({
        ...prev,
        [pId]: { loading: false, progress: 0, done: false, error: err.message, text: t('mods_state_error') },
      }))
      setTimeout(() => {
        setInstallStatus((prev) => {
          const copy = { ...prev }
          delete copy[pId]
          return copy
        })
      }, 4000)
    }
  }

  const handleToggle = async (item) => {
    try {
      const res = await window.vibe?.toggleModFile(item.path)
      if (res?.ok) {
        await loadInstalled()
      }
    } catch (err) {
      console.error('Toggle mod error:', err)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(t('mods_confirm_delete', { name: item.name }))) return
    try {
      const res = await window.vibe?.deleteModFile(item.path, targetVersionId)
      if (res?.ok) {
        await loadInstalled()
      }
    } catch (err) {
      console.error('Delete mod error:', err)
    }
  }

  const handleDeleteHit = async (e, hit) => {
    e?.stopPropagation?.()
    if (!hit) return
    const isModpackProject = tab === 'modpack' || hit.projectType === 'modpack'

    if (isModpackProject) {
      // Find matching installed modpack from localVersions
      const match = localVersions.find(
        (v) =>
          (v.isModpack || v.type === 'modpack') &&
          (v.id.includes(hit.slug || '') ||
            v.label?.toLowerCase().includes(hit.title?.toLowerCase() || '') ||
            v.modpackMeta?.id === hit.id ||
            v.modpackMeta?.slug === hit.slug)
      )
      if (match) {
        if (!window.confirm(`Вы действительно хотите удалить сборку «${hit.title || match.label}»?`)) return
        try {
          const res = await window.vibe?.deleteVersion(match.id)
          if (res?.ok) {
            setInstallStatus((prev) => {
              const copy = { ...prev }
              delete copy[hit.id]
              return copy
            })
            await loadInstalled()
          } else {
            alert(res?.error || 'Не удалось удалить сборку')
          }
        } catch (err) {
          alert('Ошибка при удалении сборки: ' + err.message)
        }
      } else {
        // Clear status if folder already removed
        setInstallStatus((prev) => {
          const copy = { ...prev }
          delete copy[hit.id]
          return copy
        })
        await loadInstalled()
      }
    } else {
      // Mod / shader / resourcepack / datapack
      const match = installedItems.find(
        (it) =>
          it.name?.toLowerCase().includes(hit.slug?.toLowerCase() || '') ||
          (hit.title && it.name?.toLowerCase().includes(hit.title.toLowerCase().replace(/\s+/g, '')))
      )
      if (match) {
        if (!window.confirm(`Удалить «${match.name}»?`)) return
        try {
          const res = await window.vibe?.deleteModFile(match.path, targetVersionId)
          if (res?.ok) {
            setInstallStatus((prev) => {
              const copy = { ...prev }
              delete copy[hit.id]
              return copy
            })
            await loadInstalled()
          }
        } catch (err) {
          alert('Ошибка при удалении: ' + err.message)
        }
      } else {
        setInstallStatus((prev) => {
          const copy = { ...prev }
          delete copy[hit.id]
          return copy
        })
        await loadInstalled()
      }
    }
  }

  const handleOpenFolder = (type = 'mods') => {
    window.vibe?.openModFolder(targetVersionId, type)
  }

  const formatDownloads = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return '0'
    const n = Number(num)
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return String(n)
  }

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return ''
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const filteredInstalled = installedItems.filter((it) => {
    if (installedFilter === 'all') return true
    return it.type === installedFilter
  })

  const getSearchPlaceholder = () => {
    if (tab === 'shader') return t('mods_search_shader')
    if (tab === 'resourcepack') return t('mods_search_resourcepack')
    if (tab === 'modpack') return t('mods_search_modpack')
    if (tab === 'datapack') return t('mods_search_datapack')
    return t('mods_search_mod')
  }

  // Active hit in details view
  const activeHit = detailsData || selectedProject
  const activeHitInstalled = activeHit ? isHitInstalled(activeHit) : false
  const activeHitStatus = activeHit ? installStatus[activeHit.id] : null

  return (
    <div className={`${styles.overlay} ${embedded ? styles.embedded : ''}`} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <div className={`${styles.modal} ${embedded ? styles.embeddedModal : ''}`}>
        {/* If a project is selected, show rich Details View */}
        {selectedProject ? (
          <div className={styles.detailsView}>
            {/* Top Bar with Back Button */}
            <div className={styles.detailsTopBar}>
              <button type="button" className={styles.backBtn} onClick={closeProjectDetails}>
                <ArrowLeft size={15} />
                <span>{t('mods_details_back')}</span>
              </button>

              <button type="button" className={styles.closeBtn} onClick={onClose} title={t('close')}>
                <X size={16} />
              </button>
            </div>

            {/* Project Header Banner */}
            <div className={styles.detailsHeader}>
              <div className={styles.detailsHeaderLeft}>
                {activeHit?.icon ? (
                  <img src={activeHit.icon} alt={activeHit.title} className={styles.detailsIcon} />
                ) : (
                  <div className={styles.detailsIconFallback}>
                    <Package size={26} />
                  </div>
                )}

                <div className={styles.detailsHeaderInfo}>
                  <div className={styles.detailsTitleRow}>
                    <h3 className={styles.detailsTitle}>{activeHit?.title}</h3>
                    <span className={styles.detailsTypeBadge}>
                      {activeHit?.projectType || tab}
                    </span>
                    {activeHitInstalled && (
                      <span className={styles.installedBadge}>
                        <CheckCircle2 size={12} />
                        <span>{t('mods_installed_badge')}</span>
                      </span>
                    )}
                  </div>

                  <span className={styles.detailsAuthor}>
                    {t('mods_by_author', { author: activeHit?.author || 'Unknown' })}
                  </span>

                  <div className={styles.detailsStatsRow}>
                    <div className={styles.statItem} title={t('mods_details_downloads')}>
                      <Download size={13} />
                      <span className={styles.statValue}>{formatDownloads(activeHit?.downloads)}</span>
                    </div>

                    {activeHit?.followers !== undefined && (
                      <div className={styles.statItem} title={t('mods_details_followers')}>
                        <Users size={13} />
                        <span className={styles.statValue}>{formatDownloads(activeHit?.followers)}</span>
                      </div>
                    )}

                    {activeHit?.license && (
                      <div className={styles.statItem} title={t('mods_details_license')}>
                        <ShieldCheck size={13} />
                        <span>{activeHit.license}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Install & Delete Actions */}
              <div className={styles.detailsHeaderActions}>
                <button
                  type="button"
                  className={`${styles.installBtn} ${
                    activeHitInstalled ? styles.installBtnDone : ''
                  } ${activeHitStatus?.loading ? styles.installBtnLoading : ''}`}
                  onClick={() => handleInstall(activeHit)}
                  disabled={activeHitStatus?.loading}
                >
                  {activeHitStatus?.loading ? (
                    <>
                      <Loader2 size={13} className={styles.spin} />
                      <span>{activeHitStatus.text || t('mods_downloading')}</span>
                    </>
                  ) : activeHitInstalled ? (
                    <>
                      <Check size={14} />
                      <span>{t('mods_installed_btn')}</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>
                        {tab === 'modpack' || activeHit?.projectType === 'modpack'
                          ? 'Установить сборку'
                          : t('mods_download_btn')}
                      </span>
                    </>
                  )}
                </button>

                {activeHitInstalled && (
                  <button
                    type="button"
                    className={styles.detailsDeleteBtn}
                    onClick={(e) => handleDeleteHit(e, activeHit)}
                    title={tab === 'modpack' ? 'Удалить сборку' : 'Удалить мод'}
                  >
                    <Trash2 size={14} />
                    <span>Удалить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className={styles.detailsNavTabs}>
              <button
                type="button"
                className={`${styles.detailsNavTab} ${detailsTab === 'description' ? styles.detailsNavTabActive : ''}`}
                onClick={() => setDetailsTab('description')}
              >
                <FileText size={13} />
                <span>{t('mods_details_about')}</span>
              </button>

              {detailsData?.gallery && detailsData.gallery.length > 0 && (
                <button
                  type="button"
                  className={`${styles.detailsNavTab} ${detailsTab === 'gallery' ? styles.detailsNavTabActive : ''}`}
                  onClick={() => setDetailsTab('gallery')}
                >
                  <ImageIcon size={13} />
                  <span>{t('mods_details_gallery')} ({detailsData.gallery.length})</span>
                </button>
              )}

              <button
                type="button"
                className={`${styles.detailsNavTab} ${detailsTab === 'versions' ? styles.detailsNavTabActive : ''}`}
                onClick={() => setDetailsTab('versions')}
              >
                <Layers size={13} />
                <span>{t('mods_details_versions')} ({detailsVersions.length})</span>
              </button>

              {(detailsData?.sourceUrl || detailsData?.issuesUrl || detailsData?.wikiUrl || detailsData?.discordUrl) && (
                <button
                  type="button"
                  className={`${styles.detailsNavTab} ${detailsTab === 'links' ? styles.detailsNavTabActive : ''}`}
                  onClick={() => setDetailsTab('links')}
                >
                  <ExternalLink size={13} />
                  <span>{t('mods_details_links')}</span>
                </button>
              )}
            </div>

            {/* Sub-Tab Content Area */}
            <div className={styles.detailsScrollBody}>
              {detailsLoading ? (
                <div className={styles.centerState}>
                  <Loader2 size={32} className={styles.spin} />
                  <span className={styles.stateText}>{t('mods_details_loading')}</span>
                </div>
              ) : detailsTab === 'description' ? (
                <div>
                  {detailsData?.body ? (
                    <RenderMarkdown content={detailsData.body} />
                  ) : (
                    <p className={styles.cardDesc}>{activeHit?.description || t('mods_no_description')}</p>
                  )}
                </div>
              ) : detailsTab === 'gallery' ? (
                <div className={styles.galleryGrid}>
                  {(detailsData?.gallery || []).map((img, idx) => (
                    <div
                      key={idx}
                      className={styles.galleryCard}
                      onClick={() => setPreviewImage(img.url)}
                      title={img.title || 'View image'}
                    >
                      <img src={img.url} alt={img.title || 'Screenshot'} className={styles.galleryImg} loading="lazy" />
                      {img.title && <span className={styles.galleryTitle}>{img.title}</span>}
                    </div>
                  ))}
                </div>
              ) : detailsTab === 'versions' ? (
                <div className={styles.versionsList}>
                  {detailsVersions.length === 0 ? (
                    <div className={styles.centerState}>
                      <span className={styles.emptyHint}>{t('mods_nothing_found', { version: mcVersion })}</span>
                    </div>
                  ) : (
                    detailsVersions.map((v) => {
                      const isInstalling = installStatus[activeHit.id]?.loading
                      return (
                        <div key={v.id} className={styles.versionCard}>
                          <div className={styles.versionCardLeft}>
                            <div className={styles.versionCardNameRow}>
                              <span className={styles.versionCardName}>{v.name || v.versionNumber}</span>
                              <span className={styles.versionCardNumber}>{v.versionNumber}</span>
                            </div>

                            <div className={styles.versionCardMeta}>
                              <span title="File size">{formatSize(v.file?.size)}</span>
                              {v.datePublished && (
                                <span>{new Date(v.datePublished).toLocaleDateString()}</span>
                              )}
                              <div className={styles.versionCardTags}>
                                {v.loaders?.slice(0, 3).map((ld) => (
                                  <span key={ld} className={styles.vTag}>{ld}</span>
                                ))}
                                {v.gameVersions?.slice(0, 3).map((gv) => (
                                  <span key={gv} className={styles.vTag}>{gv}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={styles.installBtn}
                            onClick={() => handleInstall(activeHit, v)}
                            disabled={isInstalling}
                          >
                            <Download size={13} />
                            <span>
                              {tab === 'modpack' || activeHit?.projectType === 'modpack'
                                ? 'Установить сборку'
                                : t('mods_details_install_version')}
                            </span>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              ) : detailsTab === 'links' ? (
                <div className={styles.linksGrid}>
                  {detailsData?.sourceUrl && (
                    <a
                      href={detailsData.sourceUrl}
                      className={styles.linkCard}
                      onClick={(e) => { e.preventDefault(); window.vibe?.openExternal(detailsData.sourceUrl); }}
                    >
                      <span>{t('mods_details_source')}</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {detailsData?.issuesUrl && (
                    <a
                      href={detailsData.issuesUrl}
                      className={styles.linkCard}
                      onClick={(e) => { e.preventDefault(); window.vibe?.openExternal(detailsData.issuesUrl); }}
                    >
                      <span>{t('mods_details_issues')}</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {detailsData?.wikiUrl && (
                    <a
                      href={detailsData.wikiUrl}
                      className={styles.linkCard}
                      onClick={(e) => { e.preventDefault(); window.vibe?.openExternal(detailsData.wikiUrl); }}
                    >
                      <span>{t('mods_details_wiki')}</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {detailsData?.discordUrl && (
                    <a
                      href={detailsData.discordUrl}
                      className={styles.linkCard}
                      onClick={(e) => { e.preventDefault(); window.vibe?.openExternal(detailsData.discordUrl); }}
                    >
                      <span>{t('mods_details_discord')}</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* Catalog View (Tabs & Search) */
          <>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIconWrap}>
                  <Puzzle size={18} className={styles.headerIcon} />
                </div>
                <div>
                  <h3 className={styles.title}>{t('mods_modal_title')}</h3>
                  <span className={styles.subtitle}>
                    {tab === 'modpack'
                      ? `Сборки Modrinth для Minecraft ${catalogMcVersion} — устанавливаются отдельно`
                      : t('mods_modal_subtitle', { version: targetVersionId })}
                  </span>
                </div>
              </div>

              <div className={styles.headerRight}>
                {tab === 'modpack' ? (
                  <div className={styles.versionSelectorWrap}>
                    <span className={styles.versionLabel}>Версия Minecraft</span>
                    <select className={styles.versionSelect} value={modpackMcVersion} onChange={(e) => setModpackMcVersion(e.target.value)}>
                      {(modpackVersions.length ? modpackVersions : ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2']).map((version) => <option key={version} value={version}>{version}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className={styles.catalogInstanceControls}>
                    <button
                      type="button"
                      className={styles.createInstanceTopBtn}
                      onClick={() => {
                        const cur = catalogMcVersion || '1.20.1'
                        setNewInstanceName(`Сборка ${cur}`)
                        setNewInstanceMcVersion(cur)
                        setCreateInstanceError('')
                        setShowCreateInstanceModal(true)
                      }}
                      title="Создать новую изолированную сборку со своей папкой модов"
                    >
                      <Plus size={15} />
                      <span>Создать сборку</span>
                    </button>

                    <div className={styles.versionSelectorWrap}>
                      <span className={styles.versionLabel}>{t('mods_version_folder')}</span>
                      <select
                        className={styles.versionSelect}
                        value={targetVersionId}
                        onChange={(e) => setTargetVersionId(e.target.value)}
                      >
                        {localVersions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {(v.isModpack || v.type === 'modpack') ? `📦 ${v.label || v.id}` : (v.label || v.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Control Bar: Tabs & Open Folder */}
            <div className={styles.topControlBar}>
              <div className={styles.tabs}>
                {TABS.map((tb) => {
                  const Icon = tb.icon
                  const active = tab === tb.id
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                      onClick={() => setTab(tb.id)}
                    >
                      <Icon size={14} />
                      <span>{t(tb.labelKey)}</span>
                      {tb.id === 'installed' && installedItems.length > 0 && (
                        <span className={styles.tabBadge}>{installedItems.length}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className={styles.folderActions}>
                {tab === 'shader' && (
                  <button
                    type="button"
                    className={styles.openFolderBtn}
                    onClick={() => handleOpenFolder('shaderpacks')}
                    title={t('mods_open_folder_shaders')}
                  >
                    <FolderOpen size={13} />
                    <span>{t('mods_open_folder_shaders')}</span>
                  </button>
                )}
                {tab === 'resourcepack' && (
                  <button
                    type="button"
                    className={styles.openFolderBtn}
                    onClick={() => handleOpenFolder('resourcepacks')}
                    title={t('mods_open_folder_resourcepacks')}
                  >
                    <FolderOpen size={13} />
                    <span>{t('mods_open_folder_resourcepacks')}</span>
                  </button>
                )}
                {tab === 'modpack' && (
                  <button
                    type="button"
                    className={styles.openFolderBtn}
                    onClick={() => handleOpenFolder('modpacks')}
                    title={t('mods_open_folder_modpacks')}
                  >
                    <FolderOpen size={13} />
                    <span>{t('mods_open_folder_modpacks')}</span>
                  </button>
                )}
                {tab === 'datapack' && (
                  <button
                    type="button"
                    className={styles.openFolderBtn}
                    onClick={() => handleOpenFolder('datapacks')}
                    title={t('mods_open_folder_datapacks')}
                  >
                    <FolderOpen size={13} />
                    <span>{t('mods_open_folder_datapacks')}</span>
                  </button>
                )}
                {(tab === 'mod' || tab === 'installed') && (
                  <button
                    type="button"
                    className={styles.openFolderBtn}
                    onClick={() => handleOpenFolder('mods')}
                    title={t('mods_open_folder_mods')}
                  >
                    <FolderOpen size={13} />
                    <span>{t('mods_open_folder_mods')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className={styles.searchFilterRow}>
              {tab !== 'installed' ? (
                <>
                  <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder={getSearchPlaceholder()}
                      value={searchQuery}
                      onChange={handleQueryChange}
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
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {(tab === 'mod' || tab === 'modpack') && (
                    <div className={styles.loaderFilters}>
                      <span className={styles.loaderLabel}>{t('mods_loader_label')}</span>
                      {LOADERS.map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          className={`${styles.loaderBtn} ${
                            selectedLoader === ld.id ? styles.loaderBtnActive : ''
                          }`}
                          onClick={() => handleLoaderChange(ld.id)}
                          disabled={tab !== 'modpack' && isLoaderLocked && ld.id !== lockedLoader}
                        >
                          {ld.labelKey ? t(ld.labelKey) : ld.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Installed filter buttons */
                <div className={styles.installedFilters}>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'all' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('all')}
                  >
                    {t('mods_all_count', { count: installedItems.length })}
                  </button>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'mod' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('mod')}
                  >
                    {t('mods_mods_count', {
                      count: installedItems.filter((i) => i.type === 'mod').length,
                    })}
                  </button>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'modpack' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('modpack')}
                  >
                    {t('mods_modpacks_count', {
                      count: installedItems.filter((i) => i.type === 'modpack').length,
                    })}
                  </button>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'shader' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('shader')}
                  >
                    {t('mods_shaders_count', {
                      count: installedItems.filter((i) => i.type === 'shader').length,
                    })}
                  </button>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'resourcepack' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('resourcepack')}
                  >
                    {t('mods_resourcepacks_count', {
                      count: installedItems.filter((i) => i.type === 'resourcepack').length,
                    })}
                  </button>
                  <button
                    type="button"
                    className={`${styles.installedFilterBtn} ${
                      installedFilter === 'datapack' ? styles.installedFilterBtnActive : ''
                    }`}
                    onClick={() => setInstalledFilter('datapack')}
                  >
                    {t('mods_datapacks_count', {
                      count: installedItems.filter((i) => i.type === 'datapack').length,
                    })}
                  </button>

                  <button
                    type="button"
                    className={styles.refreshInstalledBtn}
                    onClick={loadInstalled}
                    title={t('mods_refresh_btn')}
                  >
                    <RefreshCw size={12} className={installedLoading ? styles.spin : ''} />
                    <span>{t('mods_refresh_btn')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Content Body */}
            <div className={styles.body}>
              {tab !== 'installed' ? (
                loading ? (
                  <div className={styles.centerState}>
                    <Loader2 size={32} className={styles.spin} />
                    <span className={styles.stateText}>{t('mods_searching')}</span>
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
                      <span>{t('mods_retry_search')}</span>
                    </button>
                  </div>
                ) : hits.length === 0 ? (
                  <div className={styles.centerState}>
                    <Puzzle size={40} className={styles.emptyIcon} />
                    <span className={styles.stateText}>
                      {t('mods_nothing_found', { version: catalogMcVersion || mcVersion })}
                    </span>
                    <span className={styles.emptyHint}>
                      {t('mods_nothing_found_hint')}
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
                          onClick={() => openProjectDetails(hit)}
                          title="Click to view details & versions"
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
                                  ) : tab === 'modpack' ? (
                                    <Package size={20} />
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
                                  <span className={styles.installedBadge} title={t('mods_installed_badge')}>
                                    <CheckCircle2 size={12} />
                                    <span>{t('mods_installed_badge')}</span>
                                  </span>
                                )}
                              </div>
                              <span className={styles.cardAuthor}>{t('mods_by_author', { author: hit.author })}</span>
                            </div>
                          </div>

                          <p className={styles.cardDesc} title={hit.description}>
                            {hit.description || t('mods_no_description')}
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

                            <div className={styles.cardActionsWrap}>
                              <button
                                type="button"
                                className={`${styles.installBtn} ${
                                  isInstalled ? styles.installBtnDone : ''
                                } ${status?.loading ? styles.installBtnLoading : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleInstall(hit)
                                }}
                                disabled={status?.loading}
                                title={isInstalled ? t('mods_already_installed_tip') : t('mods_download_install_tip')}
                              >
                                {status?.loading ? (
                                  <>
                                    <Loader2 size={13} className={styles.spin} />
                                    <span>{status.text || t('mods_downloading')}</span>
                                  </>
                                ) : isInstalled ? (
                                  <>
                                    <Check size={14} />
                                    <span>{t('mods_installed_btn')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={14} />
                                    <span>{t('mods_download_btn')}</span>
                                  </>
                                )}
                              </button>

                              {isInstalled && (
                                <button
                                  type="button"
                                  className={styles.cardDeleteBtn}
                                  onClick={(e) => handleDeleteHit(e, hit)}
                                  title={tab === 'modpack' ? 'Удалить сборку' : 'Удалить мод'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {hits.length < totalHits && !loading && (
                      <div className={styles.loadMoreWrap}>
                        <button
                          type="button"
                          className={styles.loadMoreBtn}
                          onClick={() => performSearch(searchQuery, true)}
                          disabled={loadingMore}
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 size={14} className={styles.spin} />
                              <span>{t('mods_loading_more') || 'Загрузка...'}</span>
                            </>
                          ) : (
                            <span>
                              {t('mods_load_more') || 'Загрузить ещё'} ({hits.length} из {totalHits})
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* Installed Items List */
                installedLoading ? (
                  <div className={styles.centerState}>
                    <Loader2 size={32} className={styles.spin} />
                    <span className={styles.stateText}>{t('mods_reading_installed')}</span>
                  </div>
                ) : filteredInstalled.length === 0 ? (
                  <div className={styles.centerState}>
                    <PackageCheck size={42} className={styles.emptyIcon} />
                    <span className={styles.stateText}>
                      {t('mods_no_installed_files', { version: targetVersionId })}
                    </span>
                    <span className={styles.emptyHint}>
                      {t('mods_no_installed_hint')}
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
                            ) : item.type === 'modpack' ? (
                              <Package size={16} />
                            ) : (
                              <Puzzle size={16} />
                            )}
                          </div>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemName}>{item.name}</span>
                            <div className={styles.itemMeta}>
                              <span className={styles.itemTypeTag}>
                                {item.type === 'shader'
                                  ? t('mods_shader_type')
                                  : item.type === 'resourcepack'
                                  ? t('mods_resourcepack_type')
                                  : item.type === 'modpack'
                                  ? t('mods_modpack_type')
                                  : item.type === 'datapack'
                                  ? t('mods_datapack_type')
                                  : t('mods_mod_type')}
                              </span>
                              {item.size > 0 && (
                                <span className={styles.itemSize}>{formatSize(item.size)}</span>
                              )}
                              {!item.enabled && (
                                <span className={styles.disabledBadge}>{t('disabled')}</span>
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
                            title={item.enabled ? t('off') : t('on')}
                          >
                            <Power size={13} />
                            <span>{item.enabled ? t('on') : t('off')}</span>
                          </button>

                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={() => handleDelete(item)}
                            title={t('mods_delete_file')}
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
          </>
        )}

        {/* Screenshot Image Preview Modal */}
        {previewImage && (
          <div className={styles.imgPreviewOverlay} onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="Preview" className={styles.imgPreviewContent} />
          </div>
        )}
      </div>
      {/* Create Custom Instance Modal */}
      {showCreateInstanceModal && (
        <div className={styles.createModalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !creatingInstance) setShowCreateInstanceModal(false) }}>
          <div className={styles.createModal}>
            <div className={styles.createModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.createModalIconWrap}>
                  <Package size={18} />
                </div>
                <div>
                  <h3 className={styles.createModalTitle}>Создать новую сборку</h3>
                  <p className={styles.createModalDesc}>Изолированная версия со своей личной папкой модов</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowCreateInstanceModal(false)}
                disabled={creatingInstance}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInstance} className={styles.createModalBody}>
              {createInstanceError && (
                <div className={styles.createModalError}>
                  <AlertTriangle size={15} />
                  <span>{createInstanceError}</span>
                </div>
              )}

              <div className={styles.createFieldGroup}>
                <label className={styles.createLabel}>Название сборки</label>
                <input
                  type="text"
                  className={styles.createInput}
                  placeholder="Например: Моя выживалка 1.20.1"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  disabled={creatingInstance}
                  autoFocus
                />
              </div>

              <div className={styles.createFieldRow}>
                <div className={styles.createFieldGroup} style={{ flex: 1 }}>
                  <label className={styles.createLabel}>Версия Minecraft</label>
                  <select
                    className={styles.createSelect}
                    value={newInstanceMcVersion}
                    onChange={(e) => {
                      setNewInstanceMcVersion(e.target.value)
                      if (!newInstanceName || newInstanceName.startsWith('Сборка ')) {
                        setNewInstanceName(`Сборка ${e.target.value}`)
                      }
                    }}
                    disabled={creatingInstance}
                  >
                    {(modpackVersions.length > 0 ? modpackVersions : ['26.3', '26.2', '26.1', '1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10']).map((v) => (
                      <option key={v} value={v}>Minecraft {v}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.createFieldGroup} style={{ flex: 1 }}>
                  <label className={styles.createLabel}>Загрузчик модов</label>
                  <div className={styles.loaderSegmented}>
                    {['fabric', 'forge', 'neoforge', 'quilt'].map((ldr) => (
                      <button
                        key={ldr}
                        type="button"
                        className={`${styles.loaderSegmentBtn} ${newInstanceLoader === ldr ? styles.loaderSegmentBtnActive : ''}`}
                        onClick={() => setNewInstanceLoader(ldr)}
                        disabled={creatingInstance}
                      >
                        {ldr === 'fabric' ? 'Fabric' : ldr === 'forge' ? 'Forge' : ldr === 'neoforge' ? 'NeoForge' : 'Quilt'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.createModalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowCreateInstanceModal(false)}
                  disabled={creatingInstance}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitCreateBtn}
                  disabled={creatingInstance || !newInstanceName.trim()}
                >
                  {creatingInstance ? (
                    <>
                      <Loader2 size={15} className={styles.spin} />
                      <span>Создание сборки...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Создать сборку</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
