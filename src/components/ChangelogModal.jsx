import { X, Sparkles, CheckCircle2, ShieldCheck, Zap, Package, Palette, Cpu, Sliders, Monitor, Box } from 'lucide-react'
import styles from './ChangelogModal.module.css'

const RELEASES = [
  {
    version: '1.3.9',
    date: 'Сентябрь 2026',
    title: 'Режим «Potato PC», защита от сбоев JVM и гарантированный запуск сборок',
    tag: 'Новейшее обновление',
    highlight: true,
    changes: [
      {
        icon: Zap,
        type: 'new',
        title: 'Режим «Potato PC» (Для очень слабых ПК)',
        desc: 'Отключает видео-фон и тяжелые 3D-анимации, оптимизирует options.txt на минимальные требования и выставляет безопасный легкий сборщик мусора.',
      },
      {
        icon: ShieldCheck,
        type: 'fix',
        title: 'Устранена ошибка «Could not create the Java Virtual Machine»',
        desc: 'Строгая фильтрация 32-битной Java, удаление конфликтующих флагов PreTouch и автоматическое скачивание официального 64-битного OpenJDK Temurin.',
      },
      {
        icon: Package,
        type: 'fix',
        title: 'Поддержка любых модпаков и кастомных сборок',
        desc: 'Глубокий анализ JSON-манифестов (inheritsFrom, jar, assets) для безошибочного определения нужной Java 8, 17 или 21.',
      },
    ],
  },
  {
    version: '1.3.8',
    date: 'Сентябрь 2026',
    title: 'Гарантированный запуск версий, кэширование Java и окно крашей',
    tag: 'Предыдущий релиз',
    highlight: false,
    changes: [
      {
        icon: Zap,
        type: 'fix',
        title: 'Умный подбор и кэширование Java',
        desc: 'Minecraft 1.16.5- (Java 8), 1.17-1.20.4 (Java 17), 1.20.5+ (Java 21). Если Java уже скачана, второй раз не загружается!',
      },
      {
        icon: Package,
        type: 'new',
        title: 'Кнопка «Установить» / «Запустить»',
        desc: 'Лаунчер автоматически проверяет наличие файлов: если версия не скачана, отображается зеленая кнопка «Установить».',
      },
      {
        icon: ShieldCheck,
        type: 'new',
        title: 'Окно диагностики крашей',
        desc: 'Понятный разбор ошибок видеодрайверов, модов и поврежденных файлов вместо тихого вылета.',
      },
      {
        icon: Sliders,
        type: 'opt',
        title: 'Плавная шкала и кнопка обновления каталога 🔄',
        desc: 'Монотонный прогресс без скачков назад и кнопка для мгновенного обнаружения добавленных вручную сборок.',
      },
    ],
  },
  {
    version: '1.3.6',
    date: 'Сентябрь 2026',
    title: 'Поддержка Java 21, запуск кастомных сборок и оптимизация для слабых ПК',
    tag: 'Предыдущий релиз',
    highlight: false,
    changes: [
      {
        icon: Zap,
        type: 'fix',
        title: 'Исправлен запуск новых версий (1.20.5+, 1.21+) и Fabric',
        desc: 'Автоматическое определение и выделение Java 21 (Temurin OpenJDK) без конфликтов с Java 17 и Java 25.',
      },
      {
        icon: Package,
        type: 'fix',
        title: 'Запуск любых кастомных и перенесённых версий',
        desc: 'Умный резолвер версий находит нестандартные JSON и JAR файлы в папке versions/, не требуя официального манифеста.',
      },
      {
        icon: Monitor,
        type: 'opt',
        title: 'Полное скрытие лаунчера во время игры',
        desc: 'Лаунчер полностью выгружается и скрывается при появлении окна игры (0% нагрузки на GPU и ОЗУ) и мгновенно возвращается при закрытии.',
      },
      {
        icon: Sparkles,
        type: 'opt',
        title: 'Живой фон без чёрного экрана при запуске',
        desc: '3D анимации и живой фон остаются активными во время подготовки и проверки файлов, сохраняя плавность и визуальный стиль.',
      },
      {
        icon: Cpu,
        type: 'opt',
        title: 'Оптимизированный пресет для слабых ПК (<= 2 ГБ ОЗУ)',
        desc: 'Специальная конфигурация G1GC, ускоренные аксессоры и конкатенация строк для максимального FPS на слабых процессорах.',
      },
    ],
  },
  {
    version: '1.3.5',
    date: 'Сентябрь 2026',
    title: 'Ультра-легкий установщик, FPS-движок & Экспорт скинов',
    tag: 'Предыдущий релиз',
    highlight: false,
    changes: [
      {
        icon: Zap,
        type: 'opt',
        title: 'Ультра-легкий установщик (без мусора и дубликатов)',
        desc: 'Оптимизирован размер инсталлятора, исключены лишние бинарники. Лаунчер скачивается и устанавливается за секунды.',
      },
      {
        icon: Monitor,
        type: 'opt',
        title: 'Авто-скрытие лаунчера при запуске Minecraft',
        desc: 'При старте игры лаунчер полностью скрывается, освобождая 100% мощности видеокарты и памяти для игры, и мгновенно открывается при выходе.',
      },
      {
        icon: Cpu,
        type: 'opt',
        title: 'Новый высокопроизводительный движок JVM (ZGC/G1GC)',
        desc: 'Оптимизированы аргументы Java Virtual Machine, сжатие строк и управление кучей памяти для максимального FPS и стабильного фреймтайма.',
      },
      {
        icon: Package,
        type: 'new',
        title: 'Экспорт скина в .png для офлайн-аккаунтов и друзей',
        desc: 'Добавлена кнопка «Скинуть скин другу (.png)» и копирование ссылки, а также защита от битых текстур и аватарок лиц.',
      },
      {
        icon: Box,
        type: 'new',
        title: 'Новые 3D Темы: Cyber Matrix, Solar Nexus, Quantum Matrix',
        desc: 'Интерактивные 3D-темы с вращающимися кристаллами, многогранниками, сеткой горизонта и частицами звездной пыли.',
      },
      {
        icon: Sparkles,
        type: 'new',
        title: 'Плавающая интерактивная плашка предосмотра тем',
        desc: 'При наведении курсора на тему плавно следует карточка с живым 3D-холстом в реальном времени, видео-анимацией и эффектом сияния.',
      },
      {
        icon: Cpu,
        type: 'new',
        title: 'Авто-установщик OpenJDK 21, 17 и 8 (Adoptium Temurin)',
        desc: 'Лаунчер автоматически скачивает и настраивает нужную версию Java для любых версий Minecraft (от 1.12.2 до 1.21.4).',
      },
      {
        icon: ShieldCheck,
        type: 'opt',
        title: 'Усиленная безопасность и изоляция лаунчера',
        desc: 'Защита от внедрения команд в никнеймы и JVM-флаги, строгий whitelist браузерных ссылок и изоляция контекста Electron.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: 'Сентябрь 2026',
    title: '3D Скины 360°, Темы оформления & Мультиплеер',
    tag: 'Предыдущая версия',
    highlight: false,
    changes: [
      {
        icon: Sparkles,
        type: 'new',
        title: '3D Интерактивный гардероб скинов (360°)',
        desc: 'При нажатии на аватарку открывается 3D модель персонажа с вращением на 360°, зумом, анимациями (ходьба, бег, полет) и выбором модели Стив/Алекс.',
      },
      {
        icon: Package,
        type: 'new',
        title: 'Каталог скинов, плащей и загрузка с ПК',
        desc: 'Примеряй стильные неоновые скины, загружай свой файл .png, ищи скины по нику или выбирай легендарные плащи Minecon & Optifine.',
      },
      {
        icon: Palette,
        type: 'new',
        title: 'Система кастомных тем с предпросмотром',
        desc: 'Выбирай между Neon Emerald, Midnight Nebula, Cyber Sunset, Glacier Ice, Solar Flare и Obsidian Stealth с мгновенной сменяемостью.',
      },
      {
        icon: Zap,
        type: 'new',
        title: 'Виджет игрового сервера & Discord',
        desc: 'Интегрирован игровой сервер с копированием IP в 1 клик, статусом онлайна и быстрой кнопкой входа в официальный Discord.',
      },
      {
        icon: ShieldCheck,
        type: 'opt',
        title: 'Обновление Discord Rich Presence',
        desc: 'Статус в Discord теперь отображает активный сервер, выбранный скин и интерактивную кнопку перехода в Discord сообщество.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'Сентябрь 2026',
    title: 'Liquid Glass 2.0 & Сверхплавная оптимизация',
    tag: 'Предыдущая версия',
    highlight: false,
    changes: [
      {
        icon: Palette,
        type: 'design',
        title: 'Apple Liquid Glass 2.0 для всех окон',
        desc: 'Настройки, каталог модификаций и модальные окна переведены на прозрачное стекло с оптическими фасками, отражением и глубоким размытием.',
      },
      {
        icon: Zap,
        type: 'opt',
        title: 'Сверхплавные физические анимации',
        desc: 'Интегрированы пружинные кривые перехода cubic-bezier(0.16, 1, 0.3, 1), мгновенный отклик кнопок, плавные ховеры и выпадающие списки.',
      },
      {
        icon: Cpu,
        type: 'new',
        title: 'Расширенная оптимизация JVM и выбор GC',
        desc: 'Добавлены пресеты Aikar’s Flags, Shenandoah GC и ZGC для полного устранения лагов и микрофризов памяти в тяжелых модпаках.',
      },
      {
        icon: Monitor,
        type: 'new',
        title: 'Выбор разрешения и режим энергосбережения',
        desc: 'Настройка разрешения окна игры (FullHD, 2K, 4K) и опция отключения фонового видео для экономии батареи ноутбука и ресурсов GPU.',
      },
      {
        icon: Sparkles,
        type: 'new',
        title: 'Индикатор версии в углу экрана',
        desc: 'Еле заметный изящный водяной знак в правом нижнем углу лаунчера с быстрым доступом к списку изменений в один клик.',
      },
    ],
  },
  {
    version: '1.1.5',
    date: 'Сентябрь 2026',
    title: 'Интерактивная линза и преломление света',
    tag: 'Обновление дизайна',
    highlight: false,
    changes: [
      {
        icon: Sparkles,
        type: 'design',
        title: 'Интерактивный оптический блик мыши',
        desc: 'Главная карточка лаунчера реагирует на курсор, создавая эффект живой световой линзы и преломления видеофона.',
      },
      {
        icon: Sliders,
        type: 'fix',
        title: 'Корректные слои и выпадающие списки',
        desc: 'Селектор версий теперь плавно перекрывает элементы управления без обрезания контента и наложения рамок.',
      },
      {
        icon: ShieldCheck,
        type: 'fix',
        title: 'Кастомные чекбоксы и кнопки запуска',
        desc: 'Отказ от стандартных браузерных чекбоксов в пользу авторских анимированных тумблеров.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: 'Сентябрь 2026',
    title: 'Модпаки, Шейдеры и Каталог Modrinth',
    tag: 'Каталог дополнений',
    highlight: false,
    changes: [
      {
        icon: Package,
        type: 'new',
        title: 'Умный каталог дополнений Modrinth',
        desc: 'Скачанные моды, шейдеры и ресурспаки помечаются ярким бейджем «Установлен» прямо в результатах поиска.',
      },
      {
        icon: Sparkles,
        type: 'fix',
        title: 'Исправлена загрузка шейдеров и ресурспаков',
        desc: 'Каталог корректно загружает шейдеры (Complementary, BSL) и текстурпаки без конфликтов категорий.',
      },
      {
        icon: ShieldCheck,
        type: 'fix',
        title: 'Стабильность сетевого мультиплеера',
        desc: 'Сняты ограничения на многопользовательскую игру для всех типов учетных записей.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'Август 2026',
    title: 'Базовый релиз VibeLauncher',
    tag: 'Первый релиз',
    highlight: false,
    changes: [
      {
        icon: Zap,
        type: 'new',
        title: 'Быстрый запуск Minecraft',
        desc: 'Поддержка официальных релизов Vanilla, Fabric, Forge и автоматическая подгрузка библиотек.',
      },
      {
        icon: ShieldCheck,
        type: 'new',
        title: 'Офлайн, Ely.by и Microsoft аккаунты',
        desc: 'Поддержка скинов Ely.by и лицензионная авторизация Microsoft/Xbox.',
      },
      {
        icon: Package,
        type: 'new',
        title: 'Изолированные папки версий',
        desc: 'Каждая версия хранит свои моды, текстуры и шейдеры независимо друг от друга.',
      },
    ],
  },
]

export default function ChangelogModal({ onClose }) {
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
              <h2 className={styles.title}>Список изменений</h2>
              <span className={styles.subtitle}>История обновлений и новые возможности VibeLauncher</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Закрыть">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {RELEASES.map((rel) => (
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
                              ? 'Новое'
                              : ch.type === 'fix'
                              ? 'Исправление'
                              : ch.type === 'opt'
                              ? 'Оптимизация'
                              : 'Дизайн'}
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
            <span>У вас установлена самая свежая версия лаунчера (v1.3.5)</span>
          </div>
          <button type="button" className={styles.okBtn} onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}
