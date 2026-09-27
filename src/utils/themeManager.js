import defaultBg from '../assets/bg.jpg'
import emeraldBg from '../assets/themes/emerald.jpg'
import nebulaBg from '../assets/themes/nebula.jpg'
import sunsetBg from '../assets/themes/sunset.jpg'
import glacierBg from '../assets/themes/glacier.jpg'
import solarBg from '../assets/themes/solar.jpg'
import stealthBg from '../assets/themes/stealth.jpg'
import minimalBlackBg from '../assets/themes/minimal_black.jpg'
import minimalWhiteBg from '../assets/themes/minimal_white.jpg'
import minimal3dBg from '../assets/themes/3d_minimal.jpg'

// Online theme art is intentionally referenced, not bundled: it keeps the
// installer light and lets a source update its image without an app release.
// Sources are shown in the theme metadata for attribution.
const ONLINE_THEME_ART = {
  end: 'https://www.complementary.dev/assets/img/newScreenshots/both5_endCity.jpg',
  fortress: 'https://wallpapers.com/images/high/minecraft-nether-fortress-ablaze-ceye2stzv4jffe3e.jpg',
}

export const THEMES = [
  {
    id: 'minimal-3d',
    name: '3D Монохром (Дефолт)',
    description: 'Оригинальная 3D сцена: парящие кубики летят в камеру с эффектом полета сквозь пространство и сеткой горизонта',
    accent: '#ffffff',
    accentSec: '#cbd5e1',
    accentIce: '#f8fafc',
    glow: 'rgba(255, 255, 255, 0.5)',
    bgTint: 'rgba(0, 0, 0, 0.75)',
    borderGlow: 'rgba(255, 255, 255, 0.75)',
    bgImage: minimal3dBg,
    is3D: true,
    is3DMonochrome: true,
    sceneType: 'minimal-void',
    colorMode: 'monochrome',
    isVideo: false,
    category: '3d',
    tag: '3D Полет кубиков',
    iconKey: 'Box',
    previewGradient: 'radial-gradient(circle at 50% 50%, #27272a 0%, #09090b 70%, #000000 100%)',
  },
  {
    id: 'vibe-classic',
    name: 'Vibe Motion',
    description: 'Анимированный живой видео-фон VibeLauncher с динамическими шейдерами',
    accent: '#38bdf8',
    accentSec: '#0ea5e9',
    accentIce: '#67e8f9',
    glow: 'rgba(56, 189, 248, 0.45)',
    bgTint: 'rgba(14, 165, 233, 0.12)',
    borderGlow: 'rgba(56, 189, 248, 0.6)',
    bgImage: defaultBg,
    isVideo: true,
    category: 'motion',
    tag: 'Живой видео-фон',
    iconKey: 'Film',
    previewGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0c4a6e 100%)',
  },
  {
    id: 'end-city',
    name: 'End City',
    description: 'Город Края среди фиолетовых островов; изображение из галереи Complementary Shaders',
    accent: '#22c55e',
    accentSec: '#10b981',
    accentIce: '#4ade80',
    glow: 'rgba(34, 197, 94, 0.45)',
    bgTint: 'rgba(16, 185, 129, 0.12)',
    borderGlow: 'rgba(34, 197, 94, 0.6)',
    bgImage: ONLINE_THEME_ART.end,
    isVideo: false,
    category: 'art',
    tag: 'Край • онлайн',
    iconKey: 'Trees',
    previewGradient: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #059669 100%)',
  },
  {
    id: 'nether-bastion',
    name: 'Blazing Bastion',
    description: 'Огненная крепость Незера — интернет-фон с обязательной атрибуцией источника',
    accent: '#a855f7',
    accentSec: '#8b5cf6',
    accentIce: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.45)',
    bgTint: 'rgba(139, 92, 246, 0.12)',
    borderGlow: 'rgba(168, 85, 247, 0.6)',
    bgImage: ONLINE_THEME_ART.fortress,
    isVideo: false,
    category: 'art',
    tag: 'Незер • онлайн',
    iconKey: 'Sparkles',
    previewGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #ec4899 100%)',
  },
  {
    id: 'cyber-sunset',
    name: 'Cyber Sunset',
    description: 'Вечерний неоновый мегаполис, золотые вершины гор и багровые лучи заката',
    accent: '#f43f5e',
    accentSec: '#fb7185',
    accentIce: '#fb923c',
    glow: 'rgba(244, 63, 94, 0.45)',
    bgTint: 'rgba(244, 63, 94, 0.12)',
    borderGlow: 'rgba(244, 63, 94, 0.6)',
    bgImage: sunsetBg,
    isVideo: false,
    category: 'art',
    tag: 'Закатный мегаполис',
    iconKey: 'Sunset',
    previewGradient: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 50%, #facc15 100%)',
  },
  {
    id: 'solar-flare',
    name: 'Solar Citadel',
    description: 'Величественный замок на скалистом утесе, залитый теплым золотом утреннего солнца',
    accent: '#eab308',
    accentSec: '#f59e0b',
    accentIce: '#fde047',
    glow: 'rgba(234, 179, 8, 0.45)',
    bgTint: 'rgba(245, 158, 11, 0.12)',
    borderGlow: 'rgba(234, 179, 8, 0.6)',
    bgImage: solarBg,
    isVideo: false,
    category: 'art',
    tag: 'Солнечная цитадель',
    iconKey: 'Castle',
    previewGradient: 'linear-gradient(135deg, #eab308 0%, #f97316 50%, #ef4444 100%)',
  },
  {
    id: 'obsidian-stealth',
    name: 'Deep Dark Sculk',
    description: 'Подземный древний город в недрах скальных глубин, бирюзовые жилы и темный стиль',
    accent: '#2dd4bf',
    accentSec: '#14b8a6',
    accentIce: '#5eead4',
    glow: 'rgba(45, 212, 191, 0.4)',
    bgTint: 'rgba(15, 23, 42, 0.25)',
    borderGlow: 'rgba(45, 212, 191, 0.5)',
    bgImage: stealthBg,
    isVideo: false,
    category: 'art',
    tag: 'Древний скалк',
    iconKey: 'Ghost',
    previewGradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 50%, #042f2e 100%)',
  },
  {
    id: 'minimal-black',
    name: 'Просто Чёрный',
    description: 'Абсолютно чистый чёрный минимализм, глубокий контраст и эстетика OLED',
    accent: '#f8fafc',
    accentSec: '#cbd5e1',
    accentIce: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.25)',
    bgTint: 'rgba(0, 0, 0, 0.95)',
    borderGlow: 'rgba(255, 255, 255, 0.4)',
    isPlainBg: true,
    bgColor: '#000000',
    bgImage: minimalBlackBg,
    isVideo: false,
    category: 'minimal',
    tag: 'Чистый чёрный',
    iconKey: 'Moon',
    previewGradient: 'linear-gradient(135deg, #000000 0%, #09090b 50%, #18181b 100%)',
  },
  {
    id: 'minimal-white',
    name: 'Просто Белый',
    description: 'Абсолютно чистый белый минимализм, благородный светлый дизайн и чистота',
    accent: '#0284c7',
    accentSec: '#0369a1',
    accentIce: '#0f172a',
    glow: 'rgba(2, 132, 199, 0.25)',
    bgTint: 'rgba(248, 250, 252, 0.95)',
    borderGlow: 'rgba(15, 23, 42, 0.25)',
    isPlainBg: true,
    isLight: true,
    bgColor: '#f8fafc',
    bgImage: minimalWhiteBg,
    isVideo: false,
    category: 'minimal',
    tag: 'Чистый белый',
    iconKey: 'Sun',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)',
  },
]

export const INTERFACE_THEMES = [
  { id: 'graphite', name: 'Графит', description: 'Нейтральный тёмный интерфейс' },
  { id: 'oled', name: 'OLED', description: 'Чистый чёрный, максимум контраста' },
  { id: 'ash', name: 'Пепельный', description: 'Спокойный серый в стиле Discord' },
  { id: 'frost', name: 'Светлый', description: 'Чистый светлый интерфейс' },
]

export function applyInterfaceTheme(id = 'graphite') {
  const root = document.documentElement
  root.dataset.interfaceTheme = id
  const values = id === 'oled'
    ? { dark: '#000000', glass: 'rgba(0,0,0,.9)', card: 'rgba(7,7,8,.9)', text: '#fff', muted: 'rgba(203,213,225,.64)' }
    : id === 'ash'
      ? { dark: '#313338', glass: 'rgba(49,51,56,.97)', card: 'rgba(43,45,49,.98)', text: '#f2f3f5', muted: '#b5bac1' }
      : id === 'frost'
      ? { dark: '#eef2f6', glass: 'rgba(255,255,255,.9)', card: 'rgba(255,255,255,.84)', text: '#111827', muted: '#5f6b7a' }
      : { dark: '#0a0c10', glass: 'rgba(17,20,26,.88)', card: 'rgba(15,18,24,.85)', text: '#fff', muted: 'rgba(148,163,184,.75)' }
  root.style.setProperty('--bg-dark', values.dark)
  root.style.setProperty('--bg-glass', values.glass)
  root.style.setProperty('--bg-glass-card', values.card)
  root.style.setProperty('--text-main', values.text)
  root.style.setProperty('--text-muted', values.muted)
  if (id === 'frost') root.setAttribute('data-theme', 'light')
  else root.removeAttribute('data-theme')
  try { localStorage.setItem('vibelauncher_interface_theme', id) } catch (e) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vibe-interface-theme-changed', { detail: { id } }))
  }
}

export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
  const root = document.documentElement

  root.style.setProperty('--accent-cyan', theme.accent)
  root.style.setProperty('--accent-ice', theme.accentIce)
  root.style.setProperty('--accent-blue', theme.accentSec)
  root.style.setProperty('--accent-purple', theme.accent)
  root.style.setProperty('--theme-glow', theme.glow)
  root.style.setProperty('--theme-bg-tint', theme.bgTint)
  root.style.setProperty('--glass-border-active', theme.borderGlow)

  // Handle Clean Light mode vs Neutral Dark mode (Anti-AI Slop)
  if (theme.isLight) {
    root.setAttribute('data-theme', 'light')
    root.style.setProperty('--bg-dark', '#f8fafc')
    root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.94)')
    root.style.setProperty('--bg-glass-hover', 'rgba(255, 255, 255, 0.98)')
    root.style.setProperty('--bg-glass-card', 'rgba(255, 255, 255, 0.92)')
    root.style.setProperty('--text-main', '#0f172a')
    root.style.setProperty('--text-secondary', '#334155')
    root.style.setProperty('--text-muted', '#64748b')
    root.style.setProperty('--glass-border', 'rgba(15, 23, 42, 0.12)')
    root.style.setProperty('--glass-border-hover', 'rgba(15, 23, 42, 0.28)')
    root.style.setProperty('--glass-highlight', 'inset 0 1px 1px 0 rgba(255, 255, 255, 1)')
    root.style.setProperty('--glass-shadow', '0 16px 36px -8px rgba(0, 0, 0, 0.08)')
  } else {
    root.removeAttribute('data-theme')
    root.style.setProperty('--bg-dark', '#0a0c10')
    root.style.setProperty('--bg-glass', 'rgba(17, 20, 26, 0.88)')
    root.style.setProperty('--bg-glass-hover', 'rgba(26, 30, 39, 0.95)')
    root.style.setProperty('--bg-glass-card', 'rgba(15, 18, 24, 0.85)')
    root.style.setProperty('--text-main', '#ffffff')
    root.style.setProperty('--text-secondary', 'rgba(241, 245, 249, 0.85)')
    root.style.setProperty('--text-muted', 'rgba(148, 163, 184, 0.75)')
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)')
    root.style.setProperty('--glass-border-hover', 'rgba(255, 255, 255, 0.18)')
    root.style.setProperty('--glass-highlight', 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)')
    root.style.setProperty('--glass-shadow', '0 16px 40px rgba(0, 0, 0, 0.65)')
  }

  // Dispatch custom event for immediate dynamic background update in App.jsx
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vibe-theme-changed', { detail: theme }))
  }

  try {
    localStorage.setItem('vibelauncher_theme', theme.id)
  } catch (e) {}

  try { applyInterfaceTheme(localStorage.getItem('vibelauncher_interface_theme') || 'graphite') } catch (e) {}

  return theme
}

export function getCurrentTheme() {
  try {
    const saved = localStorage.getItem('vibelauncher_theme')
    if (saved && saved !== 'glacier-ice') {
      return THEMES.find((t) => t.id === saved) || THEMES[0]
    }
    return THEMES[0] // Default: minimal-3d (original 3D flying cubes)
  } catch (e) {
    return THEMES[0]
  }
}
