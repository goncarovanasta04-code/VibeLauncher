import {
  Sparkles,
  ShieldCheck,
  Zap,
  Package,
  Palette,
  Cpu,
  Sliders,
  Monitor,
  Box,
} from 'lucide-react'

export const CHANGELOG_DATA = [
  {
    version: '1.4.0',
    highlight: true,
    i18n: {
      ru: {
        date: 'Сентябрь 2026',
        title: 'Редизайн Liquid Glass, восстановление классической 3D-темы и Discord-сервер',
        tag: 'Новейшее обновление',
      },
      en: {
        date: 'September 2026',
        title: 'Liquid Glass Redesign, Default 3D Flight Theme & Discord Server',
        tag: 'Latest Update',
      },
      uk: {
        date: 'Вересень 2026',
        title: 'Редизайн Liquid Glass, відновлення класичної 3D-теми та Discord-сервер',
        tag: 'Новітнє оновлення',
      },
      de: {
        date: 'September 2026',
        title: 'Liquid Glass Redesign, Standard 3D-Blockflug-Theme & Discord-Server',
        tag: 'Neuestes Update',
      },
    },
    changes: [
      {
        icon: Box,
        type: 'new',
        i18n: {
          ru: {
            title: 'Легендарная 3D тема «Полет кубиков» по умолчанию',
            desc: 'Возвращен классический интерактивный 3D-полет сквозь пространство: кубики летят в камеру с плавной физикой облета и технической сеткой горизонта.',
          },
          en: {
            title: 'Legendary 3D "Flying Cubes" theme by default',
            desc: 'Restored the classic interactive 3D flight through space: cubes fly towards the camera with smooth physics and a horizon grid.',
          },
          uk: {
            title: 'Легендарна 3D тема «Політ кубиків» за замовчуванням',
            desc: 'Повернено класичний інтерактивний 3D-політ крізь простір: кубики летять у камеру з плавною фізикою та технічною сіткою горизонту.',
          },
          de: {
            title: 'Legendäres 3D-„Blockflug“-Design als Standard',
            desc: 'Klassischer interaktiver 3D-Flug durch den Raum wiederhergestellt: Blöcke fliegen mit weicher Physik und Horizontgitter auf die Kamera zu.',
          },
        },
      },
      {
        icon: Sparkles,
        type: 'new',
        i18n: {
          ru: {
            title: 'Премиальный дизайн «Liquid Glass»',
            desc: 'Полная переработка всех модальных окон (Настройки, Моды, Темы, Вход) в стиле жидкого матового стекла с мягким размытием (backdrop-filter) и элегантными световыми бликами.',
          },
          en: {
            title: 'Premium "Liquid Glass" design',
            desc: 'Complete redesign of all modal windows (Settings, Mods, Themes, Login) with frosted glass, backdrop blur, and refined lighting reflections.',
          },
          uk: {
            title: 'Преміальний дизайн «Liquid Glass»',
            desc: 'Повна переробка всіх модальних вікон (Налаштування, Моди, Теми, Вхід) у стилі рідкого матового скла з м’яким розмиттям та елегантними відблисками.',
          },
          de: {
            title: 'Premium-Design „Liquid Glass“',
            desc: 'Vollständige Überarbeitung aller Modalfenster (Einstellungen, Mods, Themes, Login) im Stil von mattiertem Flüssigglas mit weicher Weichzeichnung.',
          },
        },
      },
      {
        icon: Palette,
        type: 'opt',
        i18n: {
          ru: {
            title: 'Красочные карточки тем и 3D-превью',
            desc: 'В меню тем добавлены высокодетализированные баннеры и живые интерактивные 3D-канвасы для каждой визуальной сцены.',
          },
          en: {
            title: 'Vibrant theme cards & 3D previews',
            desc: 'Added high-resolution theme banners and live interactive 3D canvases for every visual scene in the themes catalog.',
          },
          uk: {
            title: 'Барвисті картки тем та 3D-прев’ю',
            desc: 'У меню тем додано високодеталізовані банери та живі інтерактивні 3D-полотна для кожної візуальної сцени.',
          },
          de: {
            title: 'Detailreiche Theme-Karten & 3D-Vorschau',
            desc: 'Im Theme-Menü wurden hochauflösende Banner und interaktive 3D-Echtzeit-Leinwände für jede visuelle Szene hinzugefügt.',
          },
        },
      },
      {
        icon: ShieldCheck,
        type: 'fix',
        i18n: {
          ru: {
            title: 'Автодобавление Discord-сервера в servers.dat',
            desc: 'Лаунчер автоматически прописывает Discord-сервер в список серверов Minecraft (servers.dat) с аккуратным названием без лишних приставок.',
          },
          en: {
            title: 'Auto-add Discord community to servers.dat',
            desc: 'The launcher automatically injects the Discord server entry into Minecraft servers.dat with a clean name.',
          },
          uk: {
            title: 'Автододавання Discord-сервера у servers.dat',
            desc: 'Лаунчер автоматично прописує Discord-сервер до списку серверів Minecraft (servers.dat) з охайним заголовком.',
          },
          de: {
            title: 'Automatisches Hinzufügen des Discord-Servers zu servers.dat',
            desc: 'Der Launcher trägt den offiziellen Discord-Server automatisch mit einer sauberen Bezeichnung in die servers.dat-Liste ein.',
          },
        },
      },
    ],
  },
  {
    version: '1.3.9',
    highlight: false,
    i18n: {
      ru: {
        date: 'Сентябрь 2026',
        title: 'Режим «Potato PC», защита от сбоев JVM и гарантированный запуск сборок',
        tag: 'Предыдущий релиз',
      },
      en: {
        date: 'September 2026',
        title: 'Potato PC Mode, JVM Crash Protection & Universal Modpack Launch',
        tag: 'Previous Release',
      },
      uk: {
        date: 'Вересень 2026',
        title: 'Режим «Potato PC», захист від збоїв JVM та гарантований запуск збірок',
        tag: 'Попередній реліз',
      },
      de: {
        date: 'September 2026',
        title: 'Potato PC-Modus, JVM-Absturzschutz & garantierter Modpack-Start',
        tag: 'Vorheriges Release',
      },
    },
    changes: [
      {
        icon: Zap,
        type: 'new',
        i18n: {
          ru: {
            title: 'Режим «Potato PC» (Для очень слабых ПК)',
            desc: 'Отключает видео-фон и тяжелые 3D-анимации, оптимизирует options.txt на минимальные требования и выставляет безопасный легкий сборщик мусора.',
          },
          en: {
            title: 'Potato PC Mode (For low-end PCs)',
            desc: 'Disables background video and heavy 3D animations, optimizes options.txt to minimal requirements, and configures a safe lightweight GC.',
          },
          uk: {
            title: 'Режим «Potato PC» (Для слабких ПК)',
            desc: 'Вимикає відеофон та важкі 3D анімації, оптимізує options.txt на мінімальні вимоги та виставляє легкий збирач сміття.',
          },
          de: {
            title: 'Potato-PC-Modus (Für leistungsschwache Rechner)',
            desc: 'Deaktiviert Hintergrundvideos und 3D-Animationen, optimiert options.txt auf Minimum und setzt einen leichten Garbage Collector.',
          },
        },
      },
      {
        icon: ShieldCheck,
        type: 'fix',
        i18n: {
          ru: {
            title: 'Устранена ошибка «Could not create the Java Virtual Machine»',
            desc: 'Строгая фильтрация 32-битной Java, удаление конфликтующих флагов PreTouch и автоматическое скачивание официального 64-битного OpenJDK Temurin.',
          },
          en: {
            title: 'Fixed "Could not create the Java Virtual Machine"',
            desc: 'Strict 32-bit Java filtration, elimination of conflicting PreTouch flags, and automatic 64-bit Temurin OpenJDK provisioning.',
          },
          uk: {
            title: 'Виправлено помилку «Could not create the Java Virtual Machine»',
            desc: 'Сувора фільтрація 32-бітної Java, видалення конфліктуючих прапорів PreTouch та автоматичне завантаження 64-бітного OpenJDK Temurin.',
          },
          de: {
            title: 'Fehler „Could not create the Java Virtual Machine“ behoben',
            desc: 'Strikte 32-Bit-Filterung, Entfernung konfliktbehafteter PreTouch-Flags und automatischer Download von 64-Bit OpenJDK Temurin.',
          },
        },
      },
      {
        icon: Package,
        type: 'fix',
        i18n: {
          ru: {
            title: 'Поддержка любых модпаков и кастомных сборок',
            desc: 'Глубокий анализ JSON-манифестов (inheritsFrom, jar, assets) для безошибочного определения нужной Java 8, 17 или 21.',
          },
          en: {
            title: 'Universal support for custom modpacks and builds',
            desc: 'Deep manifest analysis (inheritsFrom, jar, assets) for automatic detection of required Java 8, 17, or 21.',
          },
          uk: {
            title: 'Підтримка будь-яких модпаків та кастомних збірок',
            desc: 'Глибокий аналіз JSON-маніфестів (inheritsFrom, jar, assets) для безпомилкового визначення потрібної Java 8, 17 чи 21.',
          },
          de: {
            title: 'Unterstützung für benutzerdefinierte Modpacks und Builds',
            desc: 'Tiefgehende Manifest-Analyse (inheritsFrom, jar, assets) zur fehlerfreien Wahl von Java 8, 17 oder 21.',
          },
        },
      },
    ],
  },
  {
    version: '1.3.8',
    highlight: false,
    i18n: {
      ru: {
        date: 'Сентябрь 2026',
        title: 'Гарантированный запуск версий, кэширование Java и окно крашей',
        tag: 'Предыдущий релиз',
      },
      en: {
        date: 'September 2026',
        title: 'Guaranteed Version Launch, Java Caching & Crash Window',
        tag: 'Previous Release',
      },
      uk: {
        date: 'Вересень 2026',
        title: 'Гарантований запуск версій, кешування Java та вікно крашів',
        tag: 'Попередній реліз',
      },
      de: {
        date: 'September 2026',
        title: 'Garantierter Versionsstart, Java-Caching & Absturz-Diagnose',
        tag: 'Vorheriges Release',
      },
    },
    changes: [
      {
        icon: Zap,
        type: 'fix',
        i18n: {
          ru: {
            title: 'Умный подбор и кэширование Java',
            desc: 'Minecraft 1.16.5- (Java 8), 1.17-1.20.4 (Java 17), 1.20.5+ (Java 21). Если Java уже скачана, второй раз не загружается!',
          },
          en: {
            title: 'Smart Java detection & caching',
            desc: 'Minecraft 1.16.5- (Java 8), 1.17–1.20.4 (Java 17), 1.20.5+ (Java 21). Already downloaded Java runtimes are never downloaded twice!',
          },
          uk: {
            title: 'Розумний підбір та кешування Java',
            desc: 'Minecraft 1.16.5- (Java 8), 1.17–1.20.4 (Java 17), 1.20.5+ (Java 21). Якщо середовище вже завантажене, воно не завантажується повторно!',
          },
          de: {
            title: 'Intelligente Java-Erkennung & Caching',
            desc: 'Minecraft 1.16.5- (Java 8), 1.17–1.20.4 (Java 17), 1.20.5+ (Java 21). Bereits geladene Java-Runtimes werden nicht doppelt geladen!',
          },
        },
      },
      {
        icon: Package,
        type: 'new',
        i18n: {
          ru: {
            title: 'Кнопка «Установить» / «Запустить»',
            desc: 'Лаунчер автоматически проверяет наличие файлов: если версия не скачана, отображается зеленая кнопка «Установить».',
          },
          en: {
            title: 'Dynamic "Install" / "Launch" button',
            desc: 'The launcher checks files on disk: if the client is not yet downloaded, an Install button is shown.',
          },
          uk: {
            title: 'Кнопка «Встановити» / «Запустити»',
            desc: 'Лаунчер перевіряє наявність файлів: якщо клієнт ще не завантажено, відображається кнопка «Встановити».',
          },
          de: {
            title: 'Dynamische Schaltfläche „Installieren“ / „Starten“',
            desc: 'Der Launcher prüft lokale Dateien: Wenn die Version noch nicht geladen ist, wird „Installieren“ angezeigt.',
          },
        },
      },
      {
        icon: ShieldCheck,
        type: 'new',
        i18n: {
          ru: {
            title: 'Окно диагностики крашей',
            desc: 'Понятный разбор ошибок видеодрайверов, модов и поврежденных файлов вместо тихого вылета.',
          },
          en: {
            title: 'Crash diagnostics modal',
            desc: 'Helpful troubleshooting for graphics driver crashes, mod incompatibilities, and corrupt files.',
          },
          uk: {
            title: 'Вікно діагностики крашів',
            desc: 'Зрозумілий аналіз помилок відеодрайверів, несумісності модів та пошкоджених файлів замість мовчазного закриття гри.',
          },
          de: {
            title: 'Absturz-Diagnosefenster',
            desc: 'Verständliche Analyse von Grafiktreiber-Fehlern, Mod-Konflikten und beschädigten Dateien statt stummem Absturz.',
          },
        },
      },
    ],
  },
  {
    version: '1.3.5',
    highlight: false,
    i18n: {
      ru: {
        date: 'Сентябрь 2026',
        title: 'Ультра-легкий установщик, FPS-движок & Экспорт скинов',
        tag: 'Предыдущий релиз',
      },
      en: {
        date: 'September 2026',
        title: 'Ultra-Lightweight Installer, FPS Engine & Skin Export',
        tag: 'Previous Release',
      },
      uk: {
        date: 'Вересень 2026',
        title: 'Ультра-легкий установник, FPS-рушій та експорт скінів',
        tag: 'Попередній реліз',
      },
      de: {
        date: 'September 2026',
        title: 'Ultra-leichter Installer, FPS-Engine & Skin-Export',
        tag: 'Vorheriges Release',
      },
    },
    changes: [
      {
        icon: Zap,
        type: 'opt',
        i18n: {
          ru: {
            title: 'Ультра-легкий установщик (без мусора и дубликатов)',
            desc: 'Оптимизирован размер инсталлятора, исключены лишние бинарники. Лаунчер скачивается и устанавливается за секунды.',
          },
          en: {
            title: 'Ultra-lightweight installer',
            desc: 'Installer package size minimized without redundant binaries. Download and install in seconds.',
          },
          uk: {
            title: 'Ультра-легкий установник',
            desc: 'Мінімізовано розмір інсталятора без дублікатів. Лаунчер завантажується та встановлюється за лічені секунди.',
          },
          de: {
            title: 'Ultra-leichter Installer',
            desc: 'Paketgröße des Installers minimiert ohne überflüssige Binärdateien. Download und Setup in Sekunden.',
          },
        },
      },
      {
        icon: Monitor,
        type: 'opt',
        i18n: {
          ru: {
            title: 'Авто-скрытие лаунчера при запуске Minecraft',
            desc: 'При старте игры лаунчер полностью скрывается, освобождая 100% мощности видеокарты и памяти для игры, и мгновенно открывается при выходе.',
          },
          en: {
            title: 'Auto-hide launcher during gameplay',
            desc: 'The launcher frees 100% GPU and memory resources while the game runs, and restores automatically upon exit.',
          },
          uk: {
            title: 'Авто-приховування лаунчера під час гри',
            desc: 'Лаунчер звільняє 100% потужності відеокарти та оперативної пам’яті для гри, і миттєво відкривається після виходу.',
          },
          de: {
            title: 'Automatisches Ausblenden während des Spiels',
            desc: 'Der Launcher gibt während des Spiels 100 % GPU- und RAM-Leistung frei und kehrt beim Beenden sofort zurück.',
          },
        },
      },
      {
        icon: Cpu,
        type: 'opt',
        i18n: {
          ru: {
            title: 'Новый высокопроизводительный движок JVM (ZGC/G1GC)',
            desc: 'Оптимизированы аргументы Java Virtual Machine, сжатие строк и управление кучей памяти для максимального FPS и стабильного фреймтайма.',
          },
          en: {
            title: 'High-performance JVM tuning (ZGC/G1GC)',
            desc: 'Optimized Java Virtual Machine arguments, string compression, and heap management for stable frametimes.',
          },
          uk: {
            title: 'Високопродуктивний рушій JVM (ZGC/G1GC)',
            desc: 'Оптимізовано аргументи JVM, стиснення рядків та керування пам’яттю для максимального FPS і плавного фреймтайму.',
          },
          de: {
            title: 'Hochleistungs-JVM-Tuning (ZGC/G1GC)',
            desc: 'Optimierte JVM-Parameter, String-Kompression und Heap-Management für maximale FPS und stabile Frametimes.',
          },
        },
      },
    ],
  },
  {
    version: '1.0.0',
    highlight: false,
    i18n: {
      ru: {
        date: 'Август 2026',
        title: 'Базовый релиз VibeLauncher',
        tag: 'Первый релиз',
      },
      en: {
        date: 'August 2026',
        title: 'Initial VibeLauncher Release',
        tag: 'First Release',
      },
      uk: {
        date: 'Серпень 2026',
        title: 'Базовий реліз VibeLauncher',
        tag: 'Перший реліз',
      },
      de: {
        date: 'August 2026',
        title: 'Erstveröffentlichung von VibeLauncher',
        tag: 'Erstes Release',
      },
    },
    changes: [
      {
        icon: Zap,
        type: 'new',
        i18n: {
          ru: {
            title: 'Быстрый запуск Minecraft',
            desc: 'Поддержка официальных релизов Vanilla, Fabric, Forge и автоматическая подгрузка библиотек.',
          },
          en: {
            title: 'Fast Minecraft Launch',
            desc: 'Support for official Vanilla, Fabric, Forge releases and automatic library downloading.',
          },
          uk: {
            title: 'Швидкий запуск Minecraft',
            desc: 'Підтримка офіційних релізів Vanilla, Fabric, Forge та автоматичне завантаження бібліотек.',
          },
          de: {
            title: 'Schneller Minecraft-Start',
            desc: 'Unterstützung für Vanilla, Fabric, Forge und automatischen Download aller Abhängigkeiten.',
          },
        },
      },
      {
        icon: ShieldCheck,
        type: 'new',
        i18n: {
          ru: {
            title: 'Офлайн, Ely.by и Microsoft аккаунты',
            desc: 'Поддержка скинов Ely.by и лицензионная авторизация Microsoft/Xbox.',
          },
          en: {
            title: 'Offline, Ely.by and Microsoft Accounts',
            desc: 'Custom skins via Ely.by and official licensed login via Microsoft/Xbox.',
          },
          uk: {
            title: 'Офлайн, Ely.by та Microsoft акаунти',
            desc: 'Підтримка скінів Ely.by та ліцензійна авторизація Microsoft/Xbox.',
          },
          de: {
            title: 'Offline, Ely.by und Microsoft-Konten',
            desc: 'Skins über Ely.by und offizielle Lizenz-Anmeldung über Microsoft/Xbox.',
          },
        },
      },
      {
        icon: Package,
        type: 'new',
        i18n: {
          ru: {
            title: 'Изолированные папки версий',
            desc: 'Каждая версия хранит свои моды, текстуры и шейдеры независимо друг от друга.',
          },
          en: {
            title: 'Isolated Version Directories',
            desc: 'Each version maintains its own independent mods, textures, and shaderpacks.',
          },
          uk: {
            title: 'Ізольовані папки версій',
            desc: 'Кожна версія зберігає власні моди, текстури та шейдери незалежно одна від одної.',
          },
          de: {
            title: 'Isolierte Versionsverzeichnisse',
            desc: 'Jede Version verwaltet ihre eigenen Mods, Texturen und Shader unabhängig voneinander.',
          },
        },
      },
    ],
  },
]

export function getLocalizedReleases(language = 'ru') {
  const lang = ['ru', 'en', 'uk', 'de'].includes(language) ? language : 'ru'
  return CHANGELOG_DATA.map((rel) => {
    const relMeta = rel.i18n[lang] || rel.i18n.ru
    return {
      version: rel.version,
      highlight: rel.highlight,
      date: relMeta.date,
      title: relMeta.title,
      tag: relMeta.tag,
      changes: rel.changes.map((ch) => {
        const chMeta = ch.i18n[lang] || ch.i18n.ru
        return {
          icon: ch.icon,
          type: ch.type,
          title: chMeta.title,
          desc: chMeta.desc,
        }
      }),
    }
  })
}
