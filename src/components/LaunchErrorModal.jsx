import React, { useState } from 'react'
import {
  AlertTriangle,
  X,
  Copy,
  Check,
  FolderOpen,
  Terminal,
  HelpCircle,
} from 'lucide-react'
import styles from './LaunchErrorModal.module.css'
import { useLanguage } from '../context/LanguageContext'

export default function LaunchErrorModal({
  isOpen,
  onClose,
  errorData,
  onOpenFolder,
}) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  if (!isOpen || !errorData) return null

  const { version, reason, code, logs } = errorData

  const handleCopyLogs = () => {
    const textToCopy = `=== VibeLauncher Crash Report ===\n${t('versions_folder_label')} ${version || 'Unknown'}\n${t('crash_code', { code: code ?? 'N/A' })}\n${t('crash_reason')}: ${reason || t('crash_reason_unknown')}\n\n${t('crash_log_title')}:\n${logs || 'N/A'}`
    navigator.clipboard?.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <AlertTriangle size={22} />
            </div>
            <div className={styles.titleCol}>
              <div className={styles.title}>{t('crash_title')}</div>
              <div className={styles.subtitleRow}>
                {version && (
                  <span className={styles.versionBadge}>{version}</span>
                )}
                {code !== undefined && code !== null && (
                  <span className={styles.codeBadge}>{t('crash_code', { code })}</span>
                )}
              </div>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {/* Reason Highlight */}
          <div className={styles.reasonCard}>
            <HelpCircle size={20} className={styles.reasonIcon} />
            <div className={styles.reasonContent}>
              <div className={styles.reasonTitle}>{t('crash_reason')}</div>
              <div className={styles.reasonText}>
                {reason || t('crash_reason_unknown')}
              </div>
            </div>
          </div>

          <div className={styles.tipBox}>
            💡 <strong>{t('crash_tip_prefix')}</strong> {t('crash_tip')}
          </div>

          {/* Collapsible/Scrollable Log View */}
          {logs && (
            <div className={styles.logSection}>
              <div className={styles.logHeader}>
                <div className={styles.logHeaderLeft}>
                  <Terminal size={14} />
                  <span>{t('crash_log_title')}</span>
                </div>
                <button
                  className={`${styles.logCopyBtn} ${copied ? styles.logCopyBtnSuccess : ''}`}
                  onClick={handleCopyLogs}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? t('crash_copied') : t('crash_copy_log')}</span>
                </button>
              </div>
              <pre className={styles.logBox}>{logs}</pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button
            className={styles.openFolderBtn}
            onClick={() => {
              onOpenFolder?.()
            }}
          >
            <FolderOpen size={15} />
            <span>{t('crash_open_game_folder')}</span>
          </button>
          <button className={styles.okBtn} onClick={onClose}>
            {t('understand')}
          </button>
        </div>
      </div>
    </div>
  )
}
