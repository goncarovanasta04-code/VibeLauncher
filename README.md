# VibeLauncher 🎮

> Минималистичный Minecraft-лаунчер с красивым UI, авторизацией Ely.by и поддержкой Forge/Fabric.

## ✨ Возможности

- **Авторизация**: Ely.by (OAuth2) или офлайн по никнейму
- **Версии**: Vanilla / Fabric / Forge с поиском и установкой
- **Дизайн**: Frosted glass UI поверх Minecraft-пейзажа
- **Настройки**: RAM, Java, директория, разрешение экрана
- **Компактный интерфейс**: нижняя панель, максимум фона

## 🚀 Запуск для разработки

```bash
npm install
npm run dev
```

## 📦 Сборка .exe

```bash
npm run dist
```

Готовый установщик будет в папке `release/`.

> **Перед сборкой**: положи иконки `assets/icon.png` и `assets/icon.ico`.

## 🗂 Структура

```
VibeLauncher/
├── electron/         # Electron main process
│   ├── main.js       # Entry point, IPC handlers
│   ├── preload.js    # Secure IPC bridge
│   ├── auth/elyby.js # Ely.by OAuth2
│   ├── versions.js   # Version manifest API
│   └── launcher.js   # Game launch logic
├── src/              # React renderer
│   ├── pages/        # Home, Versions, Settings
│   ├── components/   # TitleBar, LoginModal
│   └── utils/        # UUID generator
└── assets/           # Icons, background image
```
