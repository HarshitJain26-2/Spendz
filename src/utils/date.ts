const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format date for display: "Today", "Yesterday", "Mon, 15 Sep"
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return DAYS[date.getDay()];

  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

/**
 * Format date for section headers: "Today", "Yesterday", "15 September 2025"
 */
export const formatDateHeader = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const yearSuffix = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${yearSuffix}`;
};

/**
 * Format date for Activity group header: "SEPTEMBER 15 · Sunday"
 */
export const formatActivityDateHeader = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  const monthName = MONTHS[date.getMonth()].toUpperCase();
  const dayOfMonth = date.getDate();

  if (diffDays === 0) return `TODAY · ${dayOfWeek}`;
  if (diffDays === 1) return `YESTERDAY · ${dayOfWeek}`;

  return `${monthName} ${dayOfMonth} · ${dayOfWeek}`;
};

/**
 * Format for month display: "September 2025"
 */
export const formatMonth = (date: Date): string => {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Format for short month: "Sep 2025"
 */
export const formatMonthShort = (date: Date): string => {
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Get month key for grouping: "2025-09"
 */
export const getMonthKey = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Get date key for grouping: "2025-09-15"
 */
export const getDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Format full date/time: "15 Sep 2025, 2:30 PM"
 */
export const formatFullDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}, ${displayHours}:${minutes} ${ampm}`;
};

/**
 * Get start and end of current month
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Safely parse a stored transaction date string into a local Date.
 * Date-only strings ("2026-09-29") are anchored to local noon to avoid
 * timezone shifts that would move the date by a day.
 */
export const parseDateLocal = (dateString: string): Date => {
  const trimmed = (dateString || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Format a date's local time as "7:30 PM"
 */
export const formatTimeLabel = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Replace only the calendar date of `base`, preserving its local time.
 * Returns a full ISO string with the original time intact.
 */
export const combineDateInto = (base: string, picked: Date): string => {
  const current = parseDateLocal(base);
  const next = new Date(
    picked.getFullYear(),
    picked.getMonth(),
    picked.getDate(),
    current.getHours(),
    current.getMinutes(),
    current.getSeconds(),
    current.getMilliseconds()
  );
  return next.toISOString();
};

/**
 * Replace only the time of `base`, preserving its local calendar date.
 * Returns a full ISO string with the original date intact.
 */
export const combineTimeInto = (base: string, picked: Date): string => {
  const current = parseDateLocal(base);
  const next = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    picked.getHours(),
    picked.getMinutes(),
    picked.getSeconds(),
    0
  );
  return next.toISOString();
};

/**
 * Get ISO date string for today
 */
export const getTodayISO = (): string => {
  return new Date().toISOString();
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
