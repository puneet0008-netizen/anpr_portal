import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

/** Use image URL from API as-is (handles relative paths + http→https). */
export const resolveImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null

  if (url.startsWith('/uploads/')) {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    return apiBase ? `${apiBase}${url}` : url
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      parsed.protocol = 'https:'
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}
