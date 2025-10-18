/**
 * Utility functions for formatting data in the UI
 */

/**
 * Format currency in BRL (Brazilian Real)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency in a compact form (K for thousands, M for millions)
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0';

  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '0';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number in compact form (K for thousands, M for millions)
 */
export function formatNumberCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatNumber(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '0%';

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date and time to Brazilian format (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date in relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 0) return `há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`;
  if (diffHours > 0) return `em ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffHours < 0) return `há ${Math.abs(diffHours)} hora${Math.abs(diffHours) > 1 ? 's' : ''}`;
  if (diffMinutes > 0) return `em ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  if (diffMinutes < 0) return `há ${Math.abs(diffMinutes)} minuto${Math.abs(diffMinutes) > 1 ? 's' : ''}`;
  return 'agora';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format month name from date
 */
export function formatMonthName(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Get month abbreviation from month number (1-12)
 */
export function getMonthAbbreviation(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}
