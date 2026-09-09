import { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import styles from './UpdateModal.module.css'
import { useLanguage } from '../context/LanguageContext'

export default function UpdateModal({ updateInfo, onClose }) {
  const { t } = useLanguage()
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadStats, setDownloadStats] = useState({ transferred: 0, total: 0, speed: 0 })
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleProgress = (data) => {
      if (data) {
        setProgress(data.percent || 0)
        setDownloadStats({
          transferred: data.transferred || 0,
          total: data.total || 0,
          speed: data.speed || 0,
        })
      }
    }

    window.vibe?.onUpdateProgress(handleProgress)
    return () => {
      window.vibe?.offUpdateProgress()
    }
  }, [])

  const handleStartDownload = async () => {
    if (!updateInfo?.downloadUrl) return
    setDownloading(true)
    setError('')
    setProgress(0)

    try {
      const res = await window.vibe?.downloadUpdate(updateInfo.downloadUrl)
      if (res?.ok) {
        if (res.redirected) {
          setDownloading(false)
          onClose()
        } else {
          setDownloading(false)
          setDownloadComplete(true)
        }
      } else {
        setDownloading(false)
        setError(res?.error || t('update_failed'))
      }
    } catch (err) {
      setDownloading(false)
      setError(err?.message || t('error'))
    }
  }

  const handleInstall = async () => {
    try {
      const res = await window.vibe?.installUpdate()
      if (!res?.ok) {
        setError(res?.error || t('error'))
      }
    } catch (err) {
      setError(err?.message || t('error'))
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec) return '0 MB/s'
    const mb = bytesPerSec / (1024 * 1024)
    return `${mb.toFixed(1)} MB/s`
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className={styles.title}>{t('update_title')}</h2>
              <span className={styles.subtitle}>{t('update_subtitle')}</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title={t('close')}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {/* Version Banner */}
          <div className={styles.versionBanner}>
            <div className={styles.versionRow}>
              <div className={styles.versionBadgeOld}>v{updateInfo?.currentVersion || '1.0.0'}</div>
              <ArrowRight size={16} className={styles.arrowIcon} />
              <div className={styles.versionBadgeNew}>v{updateInfo?.latestVersion || '1.1.0'}</div>
            </div>
            <span className={styles.bannerTag}>{t('update_tag_fresh')}</span>
          </div>

          {/* Release Notes */}
          <div className={styles.releaseBox}>
            <h4 className={styles.releaseBoxTitle}>{t('update_whats_new_title')}</h4>
            <div className={styles.releaseText}>
              {updateInfo?.releaseNotes || t('update_default_notes')}
            </div>
          </div>

          {/* Progress / Downloading UI */}
          {downloading && (
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>{t('update_downloading_installer')}</span>
                <span className={styles.progressPercent}>{progress}%</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.progressMeta}>
                <span>
                  {formatBytes(downloadStats.transferred)} {t('update_of')} {formatBytes(downloadStats.total)}
                </span>
                <span>{formatSpeed(downloadStats.speed)}</span>
              </div>
            </div>
          )}

          {/* Download Complete State */}
          {downloadComplete && (
            <div className={styles.completeBox}>
              <CheckCircle2 size={20} className={styles.completeIcon} />
              <div>
                <h5 className={styles.completeTitle}>{t('update_download_complete')}</h5>
                <p className={styles.completeDesc}>{t('update_download_desc')}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} className={styles.errorIcon} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button type="button" className={styles.laterBtn} onClick={onClose}>
            {t('update_later_btn')}
          </button>

          {!downloading && !downloadComplete && (
            <button type="button" className={styles.updateBtn} onClick={handleStartDownload}>
              <Download size={15} />
              <span>{t('update_download_launcher')}</span>
            </button>
          )}

          {downloading && (
            <button type="button" className={styles.updateBtn} disabled>
              <RefreshCw size={15} className={styles.spin} />
              <span>{t('update_downloading_progress', { pct: progress })}</span>
            </button>
          )}

          {downloadComplete && (
            <button type="button" className={styles.installBtn} onClick={handleInstall}>
              <CheckCircle2 size={16} />
              <span>{t('update_install_restart')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
