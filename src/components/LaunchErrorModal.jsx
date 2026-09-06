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

export default function LaunchErrorModal({
  isOpen,
  onClose,
  errorData,
  onOpenFolder,
}) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !errorData) return null

  const { version, reason, code, logs } = errorData

  const handleCopyLogs = () => {
    const textToCopy = `=== VibeLauncher Crash Report ===\nВерсия: ${version || 'Unknown'}\nКод выхода: ${code ?? 'N/A'}\nПричина: ${reason || 'Неизвестно'}\n\nЛоги:\n${logs || 'Логи отсутствуют'}`
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
              <div className={styles.title}>Сбой при запуске Minecraft</div>
              <div className={styles.subtitleRow}>
                {version && (
                  <span className={styles.versionBadge}>{version}</span>
                )}
                {code !== undefined && code !== null && (
                  <span className={styles.codeBadge}>Код: {code}</span>
                )}
              </div>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title="Закрыть окно"
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
              <div className={styles.reasonTitle}>Причина сбоя</div>
              <div className={styles.reasonText}>
                {reason ||
                  'Произошла неизвестная ошибка, о которой мы не знаем :( Попробуйте исправить сами.'}
              </div>
            </div>
          </div>

          <div className={styles.tipBox}>
            💡 <strong>Совет:</strong> Если игра не запускается, попробуйте
            включить «Обновить клиент» перед запуском, уменьшить или увеличить
            выделение оперативной памяти в настройках, или проверить папку mods.
          </div>

          {/* Collapsible/Scrollable Log View */}
          {logs && (
            <div className={styles.logSection}>
              <div className={styles.logHeader}>
                <div className={styles.logHeaderLeft}>
                  <Terminal size={14} />
                  <span>Консольный лог Minecraft</span>
                </div>
                <button
                  className={`${styles.logCopyBtn} ${copied ? styles.logCopyBtnSuccess : ''}`}
                  onClick={handleCopyLogs}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Скопировано!' : 'Скопировать лог'}</span>
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
            <span>Открыть папку игры</span>
          </button>
          <button className={styles.okBtn} onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}
