import { useState, useEffect, useRef } from 'react'
import {
  X,
  Check,
  Palette,
  Sparkles,
  Film,
  Snowflake,
  Trees,
  Sunset,
  Castle,
  Ghost,
  Layers,
  Image as ImageIcon,
  Moon,
  Sun,
  Box,
  Zap,
  Play,
  ArrowUpRight,
  Flame,
  Compass,
} from 'lucide-react'
import { THEMES, applyTheme, getCurrentTheme } from '../utils/themeManager'
import Mini3DCanvas from './Mini3DCanvas'
import bgVideo from '../assets/bg.mp4'
import styles from './ThemesModal.module.css'
import { useLanguage } from '../context/LanguageContext'

const ICON_MAP = {
  Film,
  Snowflake,
  Trees,
  Sparkles,
  Sunset,
  Castle,
  Ghost,
  Moon,
  Sun,
  Box,
  Zap,
  Flame,
}

export default function ThemesModal({ onClose }) {
  const { t } = useLanguage()
  const [selectedThemeId, setSelectedThemeId] = useState(getCurrentTheme().id)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '3d' | 'motion' | 'art' | 'minimal'
  const [hoveredTheme, setHoveredTheme] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const modalRef = useRef(null)

  const handleSelect = (themeId) => {
    setSelectedThemeId(themeId)
    applyTheme(themeId)
    window.vibe?.storeSet?.('settings.theme', themeId)
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const filteredThemes = THEMES.filter((theme) => {
    if (activeFilter === '3d') return theme.is3D || theme.is3DMonochrome
    if (activeFilter === 'motion') return theme.category === 'motion'
    if (activeFilter === 'minimal') return theme.category === 'minimal' && !theme.is3D
    if (activeFilter === 'art') return theme.category === 'art'
    return true
  })

  // Floating preview clamped coordinates
  const tooltipX = Math.min(window.innerWidth - 330, Math.max(20, mousePos.x + 22))
  const tooltipY = Math.min(window.innerHeight - 270, Math.max(20, mousePos.y - 130))

  const getThemeName = (item) => {
    if (!item) return ''
    const key = `theme_name_${item.id.replace(/-/g, '_')}`
    const val = t(key)
    return val !== key ? val : item.name
  }

  const getThemeDesc = (item) => {
    if (!item) return ''
    const key = `theme_desc_${item.id.replace(/-/g, '_')}`
    const val = t(key)
    return val !== key ? val : item.description
  }

  const getThemeTag = (item) => {
    if (!item) return ''
    const key = `theme_tag_${item.id.replace(/-/g, '_')}`
    const val = t(key)
    return val !== key ? val : item.tag
  }

  return (
    <div className={styles.overlay} onClick={onClose} onMouseMove={handleMouseMove}>
      <div
        ref={modalRef}
        className={`${styles.modal} glass`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luxury Liquid Glass Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Palette size={22} className={styles.headerIcon} />
              <div className={styles.headerIconGlow} />
            </div>
            <div>
              <div className={styles.headerTitleRow}>
                <h2 className={styles.title}>{t('themes_modal_title')}</h2>
                <span className={styles.themeCountBadge}>
                  {t('themes_styles_count', { count: THEMES.length })}
                </span>
              </div>
              <p className={styles.subtitle}>{t('themes_modal_subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* High-End Segmented Filter Bar */}
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <Layers size={14} />
            <span>{t('themes_filter_all', { count: THEMES.length })}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.filterBtn3D} ${activeFilter === '3d' ? styles.filterBtnActive3D : ''}`}
            onClick={() => setActiveFilter('3d')}
          >
            <Box size={14} />
            <span>
              {t('themes_filter_3d', { count: THEMES.filter((t) => t.is3D || t.is3DMonochrome).length })}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.filterBtnMotion} ${activeFilter === 'motion' ? styles.filterBtnActiveMotion : ''}`}
            onClick={() => setActiveFilter('motion')}
          >
            <Film size={14} />
            <span>
              {t('themes_filter_motion', { count: THEMES.filter((t) => t.category === 'motion').length })}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.filterBtnArt} ${activeFilter === 'art' ? styles.filterBtnActiveArt : ''}`}
            onClick={() => setActiveFilter('art')}
          >
            <ImageIcon size={14} />
            <span>
              {t('themes_filter_art', { count: THEMES.filter((t) => t.category === 'art').length })}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.filterBtnMinimal} ${activeFilter === 'minimal' ? styles.filterBtnActiveMinimal : ''}`}
            onClick={() => setActiveFilter('minimal')}
          >
            <Moon size={14} />
            <span>
              {t('themes_filter_minimal', { count: THEMES.filter((t) => t.category === 'minimal' && !t.is3D).length })}
            </span>
          </button>
        </div>

        {/* Fixed-Row Scrollable Theme Grid */}
        <div className={styles.themesGrid} onMouseLeave={() => setHoveredTheme(null)}>
          {filteredThemes.map((theme) => {
            const isActive = selectedThemeId === theme.id
            const IconComponent = ICON_MAP[theme.iconKey] || Sparkles
            const is3DTheme = theme.is3D || theme.is3DMonochrome

            return (
              <div
                key={theme.id}
                className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''}`}
                onClick={() => handleSelect(theme.id)}
                onMouseEnter={() => setHoveredTheme(theme)}
                style={{
                  '--card-accent': theme.accent,
                  '--card-sec': theme.accentSec || theme.accent,
                  '--card-glow': theme.glow,
                  '--card-border-glow': theme.borderGlow,
                }}
              >
                {/* 1. VISUAL COVER BANNER (Always 130px, never shrinks!) */}
                <div className={styles.cardPreviewBanner}>
                  {/* Distinct Visual Cover Art Image (including 3D themes) */}
                  {theme.bgImage ? (
                    <div
                      className={styles.bannerImageLayer}
                      style={{ backgroundImage: `url(${theme.bgImage})` }}
                    />
                  ) : is3DTheme ? (
                    <div className={styles.canvasWrapper}>
                      <Mini3DCanvas
                        sceneType={theme.sceneType || 'minimal-void'}
                        colorMode={theme.colorMode || 'monochrome'}
                        width={440}
                        height={130}
                      />
                    </div>
                  ) : (
                    <div
                      className={styles.bannerSolidLayer}
                      style={{ background: theme.previewGradient || theme.bgColor || '#09090b' }}
                    />
                  )}

                  {/* Shimmering Light Sweep Animation */}
                  <div className={styles.bannerLightSweep} />

                  {/* Gradient Vignette (transparent at top, gentle fade at bottom) */}
                  <div className={styles.bannerVignette} />

                  {/* Top Badges Row */}
                  <div className={styles.bannerTopRow}>
                    <span
                      className={`${styles.biomeTag} ${
                        is3DTheme
                          ? styles.biomeTag3D
                          : theme.isVideo
                          ? styles.biomeTagVideo
                          : styles.biomeTagArt
                      }`}
                    >
                      {is3DTheme && <Box size={11} className={styles.tagIcon} />}
                      {theme.isVideo && <Film size={11} className={styles.tagIcon} />}
                      {!is3DTheme && !theme.isVideo && <Sparkles size={11} className={styles.tagIcon} />}
                      <span>{getThemeTag(theme)}</span>
                    </span>

                    {isActive && (
                      <div className={styles.activePillBadge}>
                        <Check size={12} strokeWidth={3} />
                        <span>{t('themes_selected')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. CARD BODY CONTENT */}
                <div className={styles.cardBody}>
                  <div className={styles.cardHeaderRow}>
                    <div
                      className={styles.themeIconCircle}
                      style={{
                        background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accentSec || theme.accent}1a)`,
                        borderColor: `${theme.accent}77`,
                        boxShadow: `0 0 14px ${theme.accent}44`,
                      }}
                    >
                      <IconComponent size={16} style={{ color: theme.accent }} />
                    </div>

                    <div className={styles.titleCol}>
                      <span className={styles.themeName}>{getThemeName(theme)}</span>
                      <span className={styles.themeCategoryLabel}>
                        {is3DTheme
                          ? t('themes_cat_3d')
                          : theme.isVideo
                          ? t('themes_cat_motion')
                          : theme.isPlainBg
                          ? t('themes_cat_minimal')
                          : t('themes_cat_art')}
                      </span>
                    </div>
                  </div>

                  <p className={styles.themeDesc}>{getThemeDesc(theme)}</p>

                  <div className={styles.cardBottomRow}>
                    <div className={styles.colorPills}>
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }}
                        title={t('themes_dot_accent')}
                      />
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: theme.accentSec || theme.accent }}
                        title={t('themes_dot_gradient')}
                      />
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: theme.accentIce || '#ffffff' }}
                        title={t('themes_dot_glow')}
                      />
                    </div>

                    <button
                      type="button"
                      className={`${styles.applyBtn} ${isActive ? styles.applyBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(theme.id)
                      }}
                    >
                      {isActive ? (
                        <>
                          <Check size={13} strokeWidth={2.5} />
                          <span>{t('themes_active')}</span>
                        </>
                      ) : (
                        <span>{t('themes_select_theme')}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Bar */}
        <div className={styles.footerBar}>
          <div className={styles.footerTip}>
            <Sparkles size={15} className={styles.footerSparkle} />
            <span>{t('themes_footer_tip')}</span>
          </div>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            {t('ready')}
          </button>
        </div>
      </div>

      {/* Floating Animated Cursor Tooltip Preview */}
      {hoveredTheme && (
        <div
          className={styles.floatingTooltip}
          style={{
            transform: `translate3d(${tooltipX}px, ${tooltipY}px, 0)`,
            '--hover-accent': hoveredTheme.accent,
            '--hover-sec': hoveredTheme.accentSec || hoveredTheme.accent,
            '--hover-glow': hoveredTheme.glow,
          }}
        >
          <div className={styles.floatingPreviewMedia}>
            {hoveredTheme.is3D || hoveredTheme.is3DMonochrome ? (
              <div className={styles.floatingCanvasWrap}>
                <Mini3DCanvas
                  sceneType={hoveredTheme.sceneType || 'minimal-void'}
                  colorMode={hoveredTheme.colorMode || 'monochrome'}
                  width={300}
                  height={160}
                />
                <div className={styles.floatingBadge3D}>
                  <Box size={12} />
                  <span>{t('themes_badge_3d')}</span>
                </div>
              </div>
            ) : hoveredTheme.isVideo ? (
              <div className={styles.floatingVideoWrap}>
                <video
                  src={bgVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.floatingVideo}
                />
                <div className={styles.floatingBadgeVideo}>
                  <Play size={12} />
                  <span>{t('themes_badge_video')}</span>
                </div>
              </div>
            ) : hoveredTheme.bgImage ? (
              <div
                className={styles.floatingImagePreview}
                style={{ backgroundImage: `url(${hoveredTheme.bgImage})` }}
              >
                <div className={styles.floatingImageShine} />
                <div className={styles.floatingBadgeArt}>
                  <Sparkles size={12} />
                  <span>{t('themes_badge_art')}</span>
                </div>
              </div>
            ) : (
              <div
                className={styles.floatingSolidPreview}
                style={{ background: hoveredTheme.previewGradient || hoveredTheme.bgColor }}
              />
            )}
          </div>

          <div className={styles.floatingContent}>
            <div className={styles.floatingHeaderRow}>
              <span className={styles.floatingTitle}>{getThemeName(hoveredTheme)}</span>
              <span
                className={styles.floatingTag}
                style={{
                  color: hoveredTheme.accent,
                  borderColor: `${hoveredTheme.accent}55`,
                  background: `${hoveredTheme.accent}1a`,
                }}
              >
                {getThemeTag(hoveredTheme)}
              </span>
            </div>
            <p className={styles.floatingDesc}>{getThemeDesc(hoveredTheme)}</p>
            <div className={styles.floatingFooter}>
              <span className={styles.floatingHint}>{t('themes_click_apply')}</span>
              <ArrowUpRight size={14} style={{ color: hoveredTheme.accent }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
