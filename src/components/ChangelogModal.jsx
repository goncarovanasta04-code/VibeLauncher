import { X, Sparkles, CheckCircle2 } from 'lucide-react'
import packageInfo from '../../package.json'
import styles from './ChangelogModal.module.css'
import { useLanguage } from '../context/LanguageContext'
import { getLocalizedReleases } from '../utils/changelogData'

export default function ChangelogModal({ onClose }) {
  const { t, language } = useLanguage()
  const releases = getLocalizedReleases(language)

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
              <h2 className={styles.title}>{t('changelog_title')}</h2>
              <span className={styles.subtitle}>{t('changelog_subtitle')}</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title={t('close')}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {releases.map((rel) => (
            <div
              key={rel.version}
              className={`${styles.releaseSection} ${rel.highlight ? styles.releaseHighlight : ''}`}
            >
              <div className={styles.releaseHeader}>
                <div className={styles.releaseTitleRow}>
                  <span className={styles.versionBadge}>v{rel.version}</span>
                  <h3 className={styles.releaseTitle}>{rel.title}</h3>
                </div>
                <div className={styles.releaseMeta}>
                  <span className={styles.tagBadge}>{rel.tag}</span>
                  <span className={styles.releaseDate}>{rel.date}</span>
                </div>
              </div>

              <div className={styles.changesList}>
                {rel.changes.map((ch, idx) => {
                  const Icon = ch.icon
                  return (
                    <div key={idx} className={styles.changeCard}>
                      <div className={`${styles.changeIconWrap} ${styles['type_' + ch.type]}`}>
                        <Icon size={16} />
                      </div>
                      <div className={styles.changeInfo}>
                        <div className={styles.changeTitleRow}>
                          <h4 className={styles.changeTitle}>{ch.title}</h4>
                          <span className={`${styles.typePill} ${styles['pill_' + ch.type]}`}>
                            {ch.type === 'new'
                              ? t('changelog_type_new')
                              : ch.type === 'fix'
                              ? t('changelog_type_fix')
                              : ch.type === 'opt'
                              ? t('changelog_type_opt')
                              : t('changelog_type_design')}
                          </span>
                        </div>
                        <p className={styles.changeDesc}>{ch.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <CheckCircle2 size={15} className={styles.footerCheckIcon} />
            <span>{t('changelog_latest_installed', { version: packageInfo.version })}</span>
          </div>
          <button type="button" className={styles.okBtn} onClick={onClose}>
            {t('understand')}
          </button>
        </div>
      </div>
    </div>
  )
}
