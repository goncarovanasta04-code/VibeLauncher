import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, ShieldCheck, Flame, Users, Sparkles } from 'lucide-react'
import styles from './ServerBanner.module.css'

export default function ServerBanner() {
  const [copied, setCopied] = useState(false)
  const [onlineInfo, setOnlineInfo] = useState({ online: true, players: 42, max: 500 })

  const SERVER_IP = 'fuflandiya.ru'
  const DISCORD_URL = 'https://discord.gg/fAS92DwB8R'

  // Fetch real online status if available
  useEffect(() => {
    let isMounted = true
    const checkStatus = async () => {
      try {
        const res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}`)
        const data = await res.json()
        if (isMounted && data && data.online !== undefined) {
          setOnlineInfo({
            online: data.online,
            players: data.players?.online || 0,
            max: data.players?.max || 500,
          })
        }
      } catch (e) {
        // Fallback default simulation
      }
    }
    checkStatus()
    const timer = setInterval(checkStatus, 30000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  const handleCopyIp = () => {
    navigator.clipboard.writeText(SERVER_IP)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenDiscord = () => {
    if (window.vibe?.openExternal) {
      window.vibe.openExternal(DISCORD_URL)
    } else {
      window.open(DISCORD_URL, '_blank')
    }
  }

  return (
    <div className={`${styles.banner} glass-subtle`}>
      <div className={styles.leftSection}>
        <div className={styles.serverLogo}>
          <Flame size={20} className={styles.flameIcon} />
        </div>
        <div className={styles.serverDetails}>
          <div className={styles.titleRow}>
            <span className={styles.serverName}>VibeLauncher Server</span>
            <div className={styles.onlineBadge}>
              <span className={styles.pulseDot} />
              <span>{onlineInfo.online ? 'Сервер Онлайн' : 'Тех. работы'}</span>
            </div>
          </div>
          <div className={styles.ipRow}>
            <span className={styles.ipText}>{SERVER_IP}</span>
            <button
              type="button"
              className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
              onClick={handleCopyIp}
              title="Нажми, чтобы скопировать IP"
            >
              {copied ? (
                <>
                  <Check size={12} strokeWidth={2.8} />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Скопировать IP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button
          type="button"
          className={styles.discordBtn}
          onClick={handleOpenDiscord}
          title="Открыть Discord сервер"
        >
          <svg className={styles.discordIcon} viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span>Наш Discord</span>
          <ExternalLink size={12} className={styles.extIcon} />
        </button>
      </div>
    </div>
  )
}
