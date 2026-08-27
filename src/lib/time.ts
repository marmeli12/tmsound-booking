import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Вся студия работает по московскому времени независимо от того, откуда
 * клиент открыл сайт и в каком часовом поясе задеплоен сервер (Railway
 * обычно UTC). Поэтому "HH:mm", введённые/показанные клиенту, ВСЕГДА
 * интерпретируются как Europe/Moscow, а в базе хранится абсолютный UTC
 * (timestamptz) — это то, что использует EXCLUDE-ограничение в БД.
 */
export const STUDIO_TIMEZONE = "Europe/Moscow";

/** "2026-08-28" + "18:00" (по Europe/Moscow) -> абсолютный момент (UTC Date). */
export function zonedDateTimeToUtc(dateStr: string, timeStr: string): Date {
  const naive = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(naive, STUDIO_TIMEZONE);
}

/** Текущий момент, представленный как "стенные часы" Europe/Moscow. */
export function nowInStudioTz(): Date {
  return toZonedTime(new Date(), STUDIO_TIMEZONE);
}

/** "2026-08-28" в терминах Europe/Moscow (без времени). */
export function todayDateStr(): string {
  return formatInTimeZone(new Date(), STUDIO_TIMEZONE, "yyyy-MM-dd");
}

/** Прошла ли дата (по календарю Europe/Moscow, а не UTC-серверу)? */
export function isPastDate(dateStr: string): boolean {
  return dateStr < todayDateStr();
}

/** Текущее время "часы:минуты" по Europe/Moscow — сравнивать со стартом
 * часового слота вроде "14:00" (оба вида — зеро-паддед "HH:mm", поэтому
 * обычное строковое сравнение работает как числовое). */
export function nowTimeStr(): string {
  return formatInTimeZone(new Date(), STUDIO_TIMEZONE, "HH:mm");
}

/** Человекочитаемая дата на русском: "28 августа". */
const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function formatDateHuman(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_RU[(m ?? 1) - 1]}`;
}

/** Час ("18:00") -> следующий час ("19:00"), с переносом через полночь. */
export function addHour(time: string, hours = 1): string {
  const [h] = time.split(":").map(Number);
  const nh = ((h ?? 0) + hours) % 24;
  return `${String(nh).padStart(2, "0")}:00`;
}

/** День недели по правилам рабочих часов: 0 = воскресенье … 6 = суббота. */
export function weekdayOf(dateStr: string): number {
  // Строим дату в полдень по Москве, чтобы избежать смещения на соседние
  // сутки из-за часового пояса окружения сервера.
  const utcNoon = zonedDateTimeToUtc(dateStr, "12:00");
  return Number(formatInTimeZone(utcNoon, STUDIO_TIMEZONE, "i")) % 7; // ISO 7=вс -> 0
}
