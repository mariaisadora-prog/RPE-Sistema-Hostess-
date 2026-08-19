import { toZonedTime, format as formatTZ } from 'date-fns-tz';

const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'America/Sao_Paulo';

/**
 * Format a UTC/ISO date string for display in São Paulo timezone
 */
export function formatDate(dateStr: string, formatStr: string = 'dd/MM/yyyy'): string {
  const date = new Date(dateStr);
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  return formatTZ(zonedDate, formatStr, { timeZone: APP_TIMEZONE });
}

/**
 * Format a date with time
 */
export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'dd/MM/yyyy HH:mm');
}

/**
 * Format time only
 */
export function formatTime(dateStr: string): string {
  return formatDate(dateStr, 'HH:mm');
}

/**
 * Format a percentage with 1 decimal place
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * Format a number with Brazilian locale
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Create a URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Get start of day in São Paulo timezone as UTC ISO string
 */
export function getStartOfDaySP(date: Date = new Date()): string {
  const spDate = toZonedTime(date, APP_TIMEZONE);
  const startOfDay = new Date(spDate);
  startOfDay.setHours(0, 0, 0, 0);
  // Convert back to UTC for database queries
  const utcOffset = getUTCOffsetMinutes(APP_TIMEZONE, startOfDay);
  const utcDate = new Date(startOfDay.getTime() + utcOffset * 60 * 1000);
  return utcDate.toISOString();
}

/**
 * Get end of day in São Paulo timezone as UTC ISO string
 */
export function getEndOfDaySP(date: Date = new Date()): string {
  const spDate = toZonedTime(date, APP_TIMEZONE);
  const endOfDay = new Date(spDate);
  endOfDay.setHours(23, 59, 59, 999);
  const utcOffset = getUTCOffsetMinutes(APP_TIMEZONE, endOfDay);
  const utcDate = new Date(endOfDay.getTime() + utcOffset * 60 * 1000);
  return utcDate.toISOString();
}

/**
 * Get UTC offset in minutes for a timezone
 */
function getUTCOffsetMinutes(tz: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz });
  return (new Date(utcStr).getTime() - new Date(tzStr).getTime()) / (60 * 1000);
}

/**
 * Get date range for a preset
 */
export function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  
  switch (preset) {
    case 'today': {
      return { startDate: getStartOfDaySP(now), endDate: getEndOfDaySP(now) };
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: getStartOfDaySP(yesterday), endDate: getEndOfDaySP(yesterday) };
    }
    case 'last7days': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { startDate: getStartOfDaySP(weekAgo), endDate: getEndOfDaySP(now) };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return { startDate: getStartOfDaySP(startOfWeek), endDate: getEndOfDaySP(now) };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: getStartOfDaySP(startOfMonth), endDate: getEndOfDaySP(now) };
    }
    default:
      return { startDate: getStartOfDaySP(now), endDate: getEndOfDaySP(now) };
  }
}

/**
 * Generate CSV content with UTF-8 BOM for Excel compatibility
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(escapeCsvField).join(';');
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(';'));
  return BOM + [headerLine, ...dataLines].join('\r\n');
}

function escapeCsvField(field: string): string {
  if (!field) return '';
  if (field.includes('"') || field.includes(';') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Format variation percentage with arrow
 */
export function formatVariation(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', positive: current > 0 };
  }
  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? '+' : '';
  return {
    value: `${sign}${variation.toFixed(1).replace('.', ',')}%`,
    positive: variation >= 0,
  };
}
