import { createContext, useContext, useState, useEffect } from 'react'
import { translations, getTranslation, SUPPORTED_LANGUAGES } from '../utils/i18n'

const LanguageContext = createContext({
  language: 'ru',
  setLanguage: () => {},
  t: () => '',
  languages: SUPPORTED_LANGUAGES,
})

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('vibelauncher_lang')
      if (saved && translations[saved]) return saved
      // Auto-detect system language
      if (typeof navigator !== 'undefined' && navigator.language) {
        if (navigator.language.startsWith('ru')) return 'ru'
        if (navigator.language.startsWith('uk')) return 'uk'
        if (navigator.language.startsWith('de')) return 'de'
        return 'en'
      }
    } catch (e) {}
    return 'ru'
  })

  // Load language from Electron store if available
  useEffect(() => {
    const loadStoreLang = async () => {
      try {
        const storeLang = await window.vibe?.storeGet('settings.language')
        if (storeLang && translations[storeLang]) {
          setLanguageState(storeLang)
          localStorage.setItem('vibelauncher_lang', storeLang)
        }
      } catch (e) {}
    }
    loadStoreLang()
  }, [])

  const setLanguage = (langCode) => {
    if (!translations[langCode]) return
    setLanguageState(langCode)
    try {
      localStorage.setItem('vibelauncher_lang', langCode)
      window.vibe?.storeSet?.('settings.language', langCode)
    } catch (e) {}
  }

  const t = (key, params) => getTranslation(language, key, params)

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
