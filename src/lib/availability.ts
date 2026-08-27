import { prisma } from "./db";
import { getCalendarBusyRanges } from "./googleCalendar";
import { getSettings, ruleForWeekday } from "./settings";
import { addHour, isPastDate, weekdayOf, zonedDateTimeToUtc } from "./time";

export type HourSlot = {
  time: string; // "18:00" — начало часа, Europe/Moscow
  free: boolean;
};

/**
 * Рабочие часы конкретной даты как список часовых меток начала
 * ("10:00", "11:00", … "22:00"), т.е. последний слот стартует за час до
 * закрытия. Если день выходной по настройкам — пустой массив.
 */
export async function workingHourStarts(dateStr: string): Promise<string[]> {
  const { workingHours } = await getSettings();
  const rule = ruleForWeekday(workingHours, weekdayOf(dateStr));
  if (!rule) return [];

  const [openH] = rule.open.split(":").map(Number);
  const [closeH] = rule.close.split(":").map(Number);
  const starts: string[] = [];
  for (let h = openH ?? 0; h < (closeH ?? 0); h++) {
    starts.push(`${String(h).padStart(2, "0")}:00`);
  }
  return starts;
}

/**
 * Брони, блокировки и (если настроена интеграция) занятые интервалы из
 * Google Calendar — всё, что реально занимает время в этот день.
 * Календарь спрашиваем best-effort и параллельно с БД: если он недоступен
 * или не настроен, просто не участвует в результате (см. googleCalendar.ts).
 */
async function occupiedRangesForDate(dateStr: string, excludeBookingId?: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const [bookings, blocks, calendarBusy] = await Promise.all([
    prisma.booking.findMany({
      where: {
        date,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.blockedSlot.findMany({
      where: { date },
      select: { startTime: true, endTime: true },
    }),
    getCalendarBusyRanges(dateStr),
  ]);

  return [...bookings, ...blocks, ...calendarBusy];
}

function hourOverlapsRange(hourStart: string, rangeStart: string, rangeEnd: string): boolean {
  const hourEnd = addHour(hourStart);
  // Полуоткрытые интервалы [start, end) — стандартная договорённость для часовых слотов.
  return hourStart < rangeEnd && rangeStart < hourEnd;
}

/**
 * Почасовая доступность на дату — то, что видит клиент на шаге 3.
 * excludeBookingId — при переносе уже существующей брони её собственный
 * (ещё не сдвинутый) интервал не должен считаться "занятым" сам собой.
 */
export async function getHourlyAvailability(dateStr: string, excludeBookingId?: string): Promise<HourSlot[]> {
  if (isPastDate(dateStr)) return [];

  const starts = await workingHourStarts(dateStr);
  if (starts.length === 0) return [];

  const occupied = await occupiedRangesForDate(dateStr, excludeBookingId);

  return starts.map((time) => ({
    time,
    free: !occupied.some((o) => hourOverlapsRange(time, o.startTime, o.endTime)),
  }));
}

/**
 * Для выбранного времени начала — какие продолжительности реально можно
 * выбрать, то есть КАЖДЫЙ час в диапазоне свободен и укладывается в
 * рабочее время. Ровно правило из ТЗ: "18:00 + 3 часа" доступно только
 * если 18:00, 19:00 И 20:00 все свободны. Явного потолка в часах нет —
 * ограничение только естественное: сколько подряд свободных часов
 * осталось в рабочем дне.
 */
export async function getAvailableDurations(dateStr: string, startTime: string, excludeBookingId?: string): Promise<number[]> {
  const slots = await getHourlyAvailability(dateStr, excludeBookingId);
  const byTime = new Map(slots.map((s) => [s.time, s.free]));

  const result: number[] = [];
  let cursor = startTime;
  for (let hours = 1; hours <= slots.length; hours++) {
    const isFree = byTime.get(cursor);
    if (isFree === undefined || !isFree) break; // либо вне рабочих часов, либо занято
    result.push(hours);
    cursor = addHour(cursor);
  }
  return result;
}

/** Статус дня для календаря: доступен ли хотя бы один часовой слот. */
export async function getDayStatus(dateStr: string): Promise<"past" | "full" | "available"> {
  if (isPastDate(dateStr)) return "past";
  const slots = await getHourlyAvailability(dateStr);
  if (slots.length === 0) return "full"; // выходной по расписанию — тоже недоступно для записи
  return slots.some((s) => s.free) ? "available" : "full";
}

/** Статусы всех дней месяца одним проходом (для отрисовки календаря). */
export async function getMonthStatus(
  year: number,
  month: number // 1-12
): Promise<Record<string, "past" | "full" | "available">> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: Record<string, "past" | "full" | "available"> = {};
  // Считаем последовательно, а не Promise.all на всё сразу — 31 день с
  // несколькими запросами каждый не должен разом забивать пул соединений.
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    result[dateStr] = await getDayStatus(dateStr);
  }
  return result;
}

export type BookingRangeInput = {
  dateStr: string;
  startTime: string;
  duration: number;
};

export function computeRange(input: BookingRangeInput) {
  const endTime = addHour(input.startTime, input.duration);
  const startsAt = zonedDateTimeToUtc(input.dateStr, input.startTime);
  const endsAt = zonedDateTimeToUtc(input.dateStr, endTime);
  return { endTime, startsAt, endsAt };
}
