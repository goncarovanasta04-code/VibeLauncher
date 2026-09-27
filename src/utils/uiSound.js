let audioContext = null
let enabled = true
let volume = 0.22
let installed = false

function context() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    audioContext = new AudioContext()
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

function tone({ frequency, endFrequency = frequency, duration = 0.06, gain = 0.1, type = 'sine' }) {
  if (!enabled || document.hidden) return
  const ctx = context()
  if (!ctx) return
  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const envelope = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration)
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.exponentialRampToValueAtTime(gain * volume, now + 0.009)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(envelope).connect(ctx.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.015)
}

export function playUiSound(name = 'tap') {
  if (name === 'open') return tone({ frequency: 300, endFrequency: 350, duration: 0.07, gain: 0.045 })
  if (name === 'success') {
    tone({ frequency: 392, endFrequency: 440, duration: 0.07, gain: 0.052 })
    window.setTimeout(() => tone({ frequency: 523, endFrequency: 560, duration: 0.08, gain: 0.042 }), 62)
    return
  }
  if (name === 'error') return tone({ frequency: 175, endFrequency: 150, duration: 0.09, gain: 0.045, type: 'sine' })
  tone({ frequency: 250, endFrequency: 276, duration: 0.038, gain: 0.032 })
}

export function configureUiSounds(settings = {}) {
  enabled = settings.uiSounds !== false
  volume = Math.max(0, Math.min(1, Number(settings.uiSoundVolume ?? 0.22)))
}

export function installUiSounds() {
  if (installed) return
  installed = true
  document.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button, [role="button"], input[type="checkbox"], select') : null
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return
    playUiSound(target.matches('input[type="checkbox"]') ? 'open' : 'tap')
  }, { capture: true })
}
