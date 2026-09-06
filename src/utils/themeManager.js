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
import cyber3dBg from '../assets/themes/3d_cyber.jpg'
import hyperspace3dBg from '../assets/themes/3d_hyperspace.jpg'
import crystals3dBg from '../assets/themes/3d_crystals.jpg'
import ender3dBg from '../assets/themes/3d_ender.jpg'

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
    id: '3d-cyber',
    name: '3D Кибер-Горизонт',
    description: '3D-волна цифровой матрицы с интерактивной физикой ряби от курсора и неоновым горизонтом',
    accent: '#06b6d4',
    accentSec: '#a855f7',
    accentIce: '#67e8f9',
    glow: 'rgba(6, 182, 212, 0.55)',
    bgTint: 'rgba(6, 182, 212, 0.14)',
    borderGlow: 'rgba(168, 85, 247, 0.75)',
    bgImage: cyber3dBg,
    is3D: true,
    sceneType: 'cyber-horizon',
    colorMode: 'cyber',
    isVideo: false,
    category: '3d',
    tag: '3D Киберпанк',
    iconKey: 'Sparkles',
    previewGradient: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
  },
  {
    id: '3d-hyperspace',
    name: '3D Гиперпространство',
    description: 'Варп-скорость через космическое пространство со световыми лучами и 3D гироскопическими орбиталями',
    accent: '#38bdf8',
    accentSec: '#818cf8',
    accentIce: '#c084fc',
    glow: 'rgba(56, 189, 248, 0.55)',
    bgTint: 'rgba(56, 189, 248, 0.14)',
    borderGlow: 'rgba(129, 140, 248, 0.75)',
    bgImage: hyperspace3dBg,
    is3D: true,
    sceneType: 'hyperspace-stars',
    colorMode: 'hyperspace',
    isVideo: false,
    category: '3d',
    tag: '3D Варп',
    iconKey: 'Sun',
    previewGradient: 'radial-gradient(circle at 50% 50%, #0369a1 0%, #0f172a 60%, #02040a 100%)',
  },
  {
    id: '3d-crystals',
    name: '3D Призматические Кристаллы',
    description: 'Объемные граненые 3D-самоцветы с освещением граней нормалями, преломлением и бликами',
    accent: '#ec4899',
    accentSec: '#8b5cf6',
    accentIce: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.55)',
    bgTint: 'rgba(236, 72, 153, 0.14)',
    borderGlow: 'rgba(139, 92, 246, 0.75)',
    bgImage: crystals3dBg,
    is3D: true,
    sceneType: 'prismatic-crystals',
    colorMode: 'crystals',
    isVideo: false,
    category: '3d',
    tag: '3D Кристаллы',
    iconKey: 'Sparkles',
    previewGradient: 'radial-gradient(circle at 50% 50%, #831843 0%, #1e1b4b 60%, #06060c 100%)',
  },
  {
    id: '3d-ender',
    name: '3D Разлом Энда',
    description: 'Гравитационная сингулярность измерения Энд, спиральный вихрь частиц и парящие кристаллы края',
    accent: '#a855f7',
    accentSec: '#06b6d4',
    accentIce: '#e879f9',
    glow: 'rgba(168, 85, 247, 0.6)',
    bgTint: 'rgba(168, 85, 247, 0.14)',
    borderGlow: 'rgba(6, 182, 212, 0.75)',
    bgImage: ender3dBg,
    is3D: true,
    sceneType: 'ender-rift',
    colorMode: 'ender',
    isVideo: false,
    category: '3d',
    tag: '3D Сингулярность',
    iconKey: 'Box',
    previewGradient: 'radial-gradient(circle at 50% 50%, #581c87 0%, #172554 60%, #050209 100%)',
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
  {
    id: 'glacier-ice',
    name: 'Glacier Aurora',
    description: 'Северное сияние, кристальные шпили льда и морозный ультрамариновый блеск',
    accent: '#38bdf8',
    accentSec: '#0ea5e9',
    accentIce: '#67e8f9',
    glow: 'rgba(56, 189, 248, 0.45)',
    bgTint: 'rgba(14, 165, 233, 0.12)',
    borderGlow: 'rgba(56, 189, 248, 0.6)',
    bgImage: glacierBg,
    isVideo: false,
    category: 'art',
    tag: 'Ледяной биом',
    iconKey: 'Snowflake',
    previewGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #67e8f9 100%)',
  },
  {
    id: 'neon-emerald',
    name: 'Neon Emerald',
    description: 'Густой хвойный лес тайги, таинственные изумрудные светлячки и неоновый мох',
    accent: '#22c55e',
    accentSec: '#10b981',
    accentIce: '#4ade80',
    glow: 'rgba(34, 197, 94, 0.45)',
    bgTint: 'rgba(16, 185, 129, 0.12)',
    borderGlow: 'rgba(34, 197, 94, 0.6)',
    bgImage: emeraldBg,
    isVideo: false,
    category: 'art',
    tag: 'Изумрудная тайга',
    iconKey: 'Trees',
    previewGradient: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #059669 100%)',
  },
  {
    id: 'midnight-nebula',
    name: 'Midnight Nebula',
    description: 'Космическое измерение Энда, парящие кристаллы аметиста и звездная пыль',
    accent: '#a855f7',
    accentSec: '#8b5cf6',
    accentIce: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.45)',
    bgTint: 'rgba(139, 92, 246, 0.12)',
    borderGlow: 'rgba(168, 85, 247, 0.6)',
    bgImage: nebulaBg,
    isVideo: false,
    category: 'art',
    tag: 'Измерение Энд',
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
]

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

  // Handle Clean Light mode vs Dark mode
  if (theme.isLight) {
    root.setAttribute('data-theme', 'light')
    root.style.setProperty('--bg-dark', '#f8fafc')
    root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.88)')
    root.style.setProperty('--bg-glass-hover', 'rgba(255, 255, 255, 0.98)')
    root.style.setProperty('--bg-glass-card', 'rgba(255, 255, 255, 0.92)')
    root.style.setProperty('--text-main', '#0f172a')
    root.style.setProperty('--text-secondary', '#334155')
    root.style.setProperty('--text-muted', '#64748b')
    root.style.setProperty('--glass-border', 'rgba(15, 23, 42, 0.12)')
    root.style.setProperty('--glass-border-hover', 'rgba(15, 23, 42, 0.28)')
    root.style.setProperty('--glass-highlight', 'inset 0 1px 1px 0 rgba(255, 255, 255, 1)')
    root.style.setProperty('--glass-shadow', '0 20px 45px -10px rgba(0, 0, 0, 0.12), 0 8px 20px -5px rgba(0, 0, 0, 0.08)')
  } else {
    root.removeAttribute('data-theme')
    root.style.setProperty('--bg-dark', '#040814')
    root.style.setProperty('--bg-glass', 'rgba(12, 20, 38, 0.55)')
    root.style.setProperty('--bg-glass-hover', 'rgba(18, 30, 56, 0.65)')
    root.style.setProperty('--bg-glass-card', 'rgba(15, 25, 48, 0.5)')
    root.style.setProperty('--text-main', '#ffffff')
    root.style.setProperty('--text-secondary', 'rgba(241, 245, 249, 0.85)')
    root.style.setProperty('--text-muted', 'rgba(148, 163, 184, 0.75)')
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.15)')
    root.style.setProperty('--glass-border-hover', 'rgba(255, 255, 255, 0.35)')
    root.style.setProperty('--glass-highlight', 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)')
    root.style.setProperty('--glass-shadow', '0 20px 50px -10px rgba(0, 0, 0, 0.65), 0 8px 20px -5px rgba(0, 0, 0, 0.4)')
  }

  // Dispatch custom event for immediate dynamic background update in App.jsx
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vibe-theme-changed', { detail: theme }))
  }

  try {
    localStorage.setItem('vibelauncher_theme', theme.id)
  } catch (e) {}

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
