import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert English digits to Bengali digits
export function toBengaliNumerals(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num
    .toString()
    .replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

// Format Currency in Bangladeshi Taka (৳)
export function formatBDT(
  amount: number,
  options?: { useBengaliDigits?: boolean; showSymbol?: boolean }
): string {
  const { useBengaliDigits = false, showSymbol = true } = options || {};
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  const finalNumber = useBengaliDigits ? toBengaliNumerals(formattedNumber) : formattedNumber;
  return showSymbol ? `৳ ${finalNumber}` : finalNumber;
}

// Format Date nicely
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Format Date and Time nicely (e.g. "9 Oct 2026, 6:15 PM")
export function formatDateTime(
  date: Date | string,
  createdAt?: Date | string | null,
  options?: { useBengaliDigits?: boolean }
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  let timeSource = d;

  // If date was normalized to noon UTC or midnight UTC and createdAt is available,
  // use createdAt timestamp for accurate realistic time
  const isUtcNormalized =
    (d.getUTCHours() === 12 || d.getUTCHours() === 0) &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0;

  if (isUtcNormalized && createdAt) {
    const createdDate = new Date(createdAt);
    if (!isNaN(createdDate.getTime())) {
      timeSource = createdDate;
    }
  }

  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(timeSource);

  const result = `${datePart}, ${timePart}`;
  return options?.useBengaliDigits ? toBengaliNumerals(result) : result;
}

// Format Month Key "YYYY-MM" to Bengali month name (e.g. "অক্টোবর ২০২৬")
export function formatMonthBengali(
  monthKey: string,
  options?: { useBengaliDigits?: boolean }
): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const bengaliMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const monthName = bengaliMonths[monthIdx] || monthKey;
  const yearFormatted = options?.useBengaliDigits ? toBengaliNumerals(yearStr) : yearStr;
  return `${monthName} ${yearFormatted}`;
}

// Get YYYY-MM-DD in local time
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Safely parse date to Date object keeping calendar day and local time intact across all timezones
export function parseDateSafe(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    // Plain date: YYYY-MM-DD -> set to noon UTC so calendar day stays identical across all timezones
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return new Date(`${dateInput}T12:00:00.000Z`);
    }
    // DateTime string without explicit timezone offset (+/-HH:MM or Z), e.g. "2026-10-22T14:20:00"
    // Attach Bangladesh Standard Time (+06:00) so Node server in UTC doesn't interpret local time as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(dateInput)) {
      return new Date(`${dateInput}+06:00`);
    }
  }
  return new Date(dateInput);
}

// Check if two dates represent the same local calendar day
export function isSameDay(d1: Date | string, d2: Date | string = new Date()): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Get local date key YYYY-MM-DD for grouping
export function toLocalDateKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
