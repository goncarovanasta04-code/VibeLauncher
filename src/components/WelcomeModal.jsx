import { useState } from 'react'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Check,
  Package,
  Globe,
  User,
  Gamepad2,
  Sliders,
  Cpu,
  Coffee,
  HardDrive,
} from 'lucide-react'
import styles from './WelcomeModal.module.css'
import { useLanguage } from '../context/LanguageContext'

import FlagIcon from './FlagIcon'

export default function WelcomeModal({ onClose, onOpenLogin }) {
  const { language, setLanguage, t, languages } = useLanguage()
  const [step, setStep] = useState(0)

  const handleFinish = () => {
    try {
      localStorage.setItem('vibelauncher_onboarding_done', 'true')
      window.vibe?.storeSet?.('settings.onboardingCompleted', true)
    } catch (e) {}
    onClose()
    if (onOpenLogin) {
      onOpenLogin()
    }
  }

  const handleSkip = () => {
    handleFinish()
  }

  const steps = [
    // Step 0: Welcome & Language
    {
      badge: t('step1_badge'),
      icon: Globe,
      title: t('step1_title'),
      desc: t('step1_desc'),
      content: (
        <div className={styles.langGrid}>
          {languages.map((item) => {
            const isSelected = language === item.code
            return (
              <button
                key={item.code}
                type="button"
                className={`${styles.langCard} ${isSelected ? styles.langCardActive : ''}`}
                onClick={() => setLanguage(item.code)}
              >
                <FlagIcon code={item.code} size={16} />
                <div className={styles.langMeta}>
                  <span className={styles.langName}>{item.nativeName}</span>
                  <span className={styles.langCode}>{item.name}</span>
                </div>
                {isSelected && (
                  <div className={styles.checkIconWrap}>
                    <Check size={13} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ),
    },

    // Step 1: Versions & Modrinth
    {
      badge: t('step2_badge'),
      icon: Layers,
      title: t('step2_title'),
      desc: t('step2_desc'),
      content: (
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Layers size={18} />
            </div>
            <div className={styles.featureText}>
              <h4>{t('step2_item1_title')}</h4>
              <p>{t('step2_item1_desc')}</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Package size={18} />
            </div>
            <div className={styles.featureText}>
              <h4>{t('step2_item2_title')}</h4>
              <p>{t('step2_item2_desc')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} style={{ color: '#ffffff' }} /> Vanilla & Fabric
            </span>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} style={{ color: '#ffffff' }} /> Forge & NeoForge
            </span>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={11} style={{ color: '#ffffff' }} /> Modrinth 1-Click
            </span>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Coffee size={11} style={{ color: '#ffffff' }} /> {t('step2_tag_auto_java')}
            </span>
          </div>
        </div>
      ),
    },

    // Step 2: Accounts & Skins
    {
      badge: t('step3_badge'),
      icon: ShieldCheck,
      title: t('step3_title'),
      desc: t('step3_desc'),
      content: (
        <div className={styles.accountsGrid}>
          <div className={styles.accountCard}>
            <div className={styles.accountHeader} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <User size={15} className={styles.accIcon} />
                <span className={styles.accTitle}>{t('step3_item1_title')}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', background: '#10131a', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1px 6px', borderRadius: 4 }}>
                {t('step3_tag_free')}
              </span>
            </div>
            <p className={styles.accDesc}>{t('step3_item1_desc')}</p>
          </div>

          <div className={styles.accountCard}>
            <div className={styles.accountHeader} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={15} className={styles.accIcon} style={{ color: '#ffffff' }} />
                <span className={styles.accTitle}>{t('step3_item2_title')}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1px 6px', borderRadius: 4 }}>
                {t('step3_tag_skins')}
              </span>
            </div>
            <p className={styles.accDesc}>{t('step3_item2_desc')}</p>
          </div>

          <div className={styles.accountCard}>
            <div className={styles.accountHeader} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Gamepad2 size={15} className={styles.accIcon} style={{ color: '#4ade80' }} />
                <span className={styles.accTitle}>{t('step3_item3_title')}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '1px 6px', borderRadius: 4 }}>
                Xbox Live
              </span>
            </div>
            <p className={styles.accDesc}>{t('step3_item3_desc')}</p>
          </div>
        </div>
      ),
    },

    // Step 3: Optimization & Potato Mode
    {
      badge: t('step4_badge'),
      icon: Zap,
      title: t('step4_title'),
      desc: t('step4_desc'),
      content: (
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Zap size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div className={styles.featureText}>
              <h4>{t('step4_item1_title')}</h4>
              <p>{t('step4_item1_desc')}</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Sliders size={18} style={{ color: '#ffffff' }} />
            </div>
            <div className={styles.featureText}>
              <h4>{t('step4_item2_title')}</h4>
              <p>{t('step4_item2_desc')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={11} style={{ color: '#f59e0b' }} /> {t('step4_tag_potato')}
            </span>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Cpu size={11} style={{ color: '#ffffff' }} /> {t('step4_tag_ram')}
            </span>
            <span style={{ fontSize: 11, background: '#151922', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 4, padding: '2px 8px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <HardDrive size={11} style={{ color: '#ffffff' }} /> {t('step4_tag_gc')}
            </span>
          </div>
        </div>
      ),
    },
  ]

  const currentStep = steps[step]
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <div className={styles.modal}>
        {/* Top bar with step badge and close */}
        <div className={styles.topRow}>
          <div className={styles.stepBadge}>{currentStep.badge}</div>
          <button className={styles.skipBtn} onClick={handleSkip} title={t('skip')}>
            <span>{t('skip')}</span>
            <X size={14} />
          </button>
        </div>

        {/* Header content with smooth transitions */}
        <div className={styles.contentBody}>
          <div className={styles.slideHeader}>
            <h2 className={styles.title}>{currentStep.title}</h2>
            <p className={styles.desc}>{currentStep.desc}</p>
          </div>

          <div className={styles.slideContent}>{currentStep.content}</div>
        </div>

        {/* Footer controls */}
        <div className={styles.footer}>
          {/* Progress dots */}
          <div className={styles.dotsRow}>
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.dot} ${idx === step ? styles.dotActive : ''}`}
                onClick={() => setStep(idx)}
                title={t('step_number', { number: idx + 1 })}
              />
            ))}
          </div>

          <div className={styles.navBtns}>
            {!isFirst && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft size={15} />
                <span>{t('back')}</span>
              </button>
            )}

            {isLast ? (
              <button type="button" className={styles.finishBtn} onClick={handleFinish}>
                <Sparkles size={15} />
                <span>{t('finish')}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setStep((s) => s + 1)}
              >
                <span>{t('next')}</span>
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
