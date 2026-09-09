import React from 'react'
import { Globe } from 'lucide-react'

export default function FlagIcon({ code, size = 18, className = '', style = {} }) {
  const baseStyle = {
    display: 'inline-block',
    verticalAlign: 'middle',
    borderRadius: 2.5,
    overflow: 'hidden',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.12)',
    flexShrink: 0,
    ...style,
  }

  switch (code) {
    case 'ru':
      return (
        <svg
          width={Math.round((size * 4) / 3)}
          height={size}
          viewBox="0 0 24 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={baseStyle}
        >
          <rect width="24" height="5.33" fill="#FFFFFF" />
          <rect y="5.33" width="24" height="5.34" fill="#0039A6" />
          <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
        </svg>
      )

    case 'en':
      return (
        <svg
          width={Math.round((size * 4) / 3)}
          height={size}
          viewBox="0 0 60 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={baseStyle}
        >
          <clipPath id="gb-clip">
            <rect width="60" height="42" rx="2" />
          </clipPath>
          <g clipPath="url(#gb-clip)">
            <rect width="60" height="42" fill="#012169" />
            <path d="M0 0L60 42M60 0L0 42" stroke="#FFFFFF" strokeWidth="8" />
            <path d="M0 0L60 42M60 0L0 42" stroke="#C8102E" strokeWidth="4" />
            <path d="M30 0V42M0 21H60" stroke="#FFFFFF" strokeWidth="14" />
            <path d="M30 0V42M0 21H60" stroke="#C8102E" strokeWidth="8" />
          </g>
        </svg>
      )

    case 'uk':
      return (
        <svg
          width={Math.round((size * 4) / 3)}
          height={size}
          viewBox="0 0 24 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={baseStyle}
        >
          <rect width="24" height="8" fill="#0057B7" />
          <rect y="8" width="24" height="8" fill="#FFD700" />
        </svg>
      )

    case 'de':
      return (
        <svg
          width={Math.round((size * 4) / 3)}
          height={size}
          viewBox="0 0 24 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={baseStyle}
        >
          <rect width="24" height="5.33" fill="#1C1C1C" />
          <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
        </svg>
      )

    default:
      return <Globe size={size} className={className} style={{ color: '#8b949e', ...style }} />
  }
}
