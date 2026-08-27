import { prisma } from "./db";
import { getAvailableDurations, getHourlyAvailability } from "./availability";
import type { InlineButton } from "./telegram";
import { addHour, formatDateHuman, todayDateStr, zonedDateTimeToUtc } from "./time";

/** Текст + (опционально) кнопки под ним — общий формат ответа админ-команд. */
export type CommandReply = { text: string; buttons?: InlineButton[][] };

/**
 * Постоянное меню снизу экрана (Reply Keyboard) — в отличие от инлайн-кнопок
 * mainMenuButtons() ниже (которые висят только под конкретным сообщением),
 * это меню остаётся на экране всегда, независимо от того, что происходит в
 * чате дальше. Нажатие на кнопку отправляет её текст обычным сообщением —
 * обработка в src/app/api/telegram/webhook/route.ts (handleKeyboardButton).
 */
export const ADMIN_KEYBOARD: string[][] = [
  ["📅 Сегодня", "📆 Завтра"],
  ["🗓 Дни с записями", "⏳ Ждут подтверждения"],
  ["📆 Неделя", "📋 Ближайшие"],
  ["🕐 Свободные часы"],
];

/** Главное меню — показывается по /start, /menu и кнопкой "🔙 Меню" под любым ответом. */
export function mainMenuButtons(): InlineButton[][] {
  return [
    [
      { text: "📅 Сегодня", callback_data: "menu:today" },
      { text: "📆 Завтра", callback_data: "menu:tomorrow" },
    ],
    [
      { text: "🗓 Дни с записями", callback_data: "days:list" },
      { text: "⏳ Ждут подтверждения", callback_data: "pending:list" },
    ],
    [
      { text: "📆 Неделя целиком", callback_data: "menu:week" },
      { text: "📋 Ближайшие", callback_data: "menu:bookings" },
    ],
    [{ text: "🕐 Свободные часы сегодня", callback_data: "menu:free" }],
    [{ text: "🔒 Как заблокировать время", callback_data: "menu:block_hint" }],
  ];
}

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** "2026-08-28" -> "28 авг" — компактная подпись для кнопки. */
function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  const day = Number(d);
  const month = MONTH_SHORT[Number(m) - 1] ?? "";
  return `${day} ${month}`;
}

/** "28.08", "28.08.2026", "2026-08-28", "сегодня", "завтра" -> "YYYY-MM-DD" (Europe/Moscow). */
export function parseDateArg(arg: string | undefined): string | null {
  const today = todayDateStr();
  if (!arg) return today;
  const a = arg.trim().toLowerCase();
  if (a === "сегодня") return today;
  if (a === "завтра") return addDays(today, 1);

  let m = a.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return a;

  m = a.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (m) {
    const day = m[1]!.padStart(2, "0");
    const month = m[2]!.padStart(2, "0");
    const year = m[3] ?? today.slice(0, 4);
    return `${year}-${month}-${day}`;
  }
  return null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function bookingsOnDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return prisma.booking.findMany({
    where: { date, status: { in: ["PENDING", "CONFIRMED"] } },
    include: { service: true },
    orderBy: { startTime: "asc" },
  });
}

type BookingRow = Awaited<ReturnType<typeof bookingsOnDate>>[number];

function formatBookingLine(b: BookingRow): string {
  const statusIcon = b.status === "PENDING" ? "⏳" : "✅";
  return `${statusIcon} ${b.startTime}–${b.endTime} · ${b.service.name} · ${b.clientName}`;
}

/**
 * Кнопки действий для одной брони — может быть НЕСКОЛЬКО рядов кнопок.
 * PENDING получает ✅/❌ прямо в списке (не только на исходном уведомлении
 * о заявке) — так с ней можно разобраться, не листая историю чата.
 * CONFIRMED получает ❌ Отменить. Обе активные брони получают ✏️ Перенести
 * отдельным рядом — открывает выбор новой даты/времени (см. rs:d/rs:t/rs:c
 * в webhook-обработчике). Имя клиента обрезаем, чтобы уложиться в лимит
 * текста кнопки Telegram.
 */
function actionButtonsRow(b: BookingRow): InlineButton[][] | null {
  const label = `${b.startTime} · ${b.clientName}`.slice(0, 40);
  const rescheduleRow: InlineButton[] = [
    { text: `✏️ Перенести ${label}`.slice(0, 60), callback_data: `rs:d:${b.id}` },
  ];
  if (b.status === "PENDING") {
    return [
      [
        { text: `✅ ${label}`, callback_data: `confirm:${b.id}` },
        { text: "❌", callback_data: `reject:${b.id}` },
      ],
      rescheduleRow,
    ];
  }
  if (b.status === "CONFIRMED") {
    return [[{ text: `❌ Отменить ${label}`.slice(0, 60), callback_data: `cancel:${b.id}` }], rescheduleRow];
  }
  return null;
}

export async function handleDayCommand(dateStr: string): Promise<CommandReply> {
  const bookings = await bookingsOnDate(dateStr);
  const header = `📅 ${formatDateHuman(dateStr)}`;
  if (bookings.length === 0) return { text: `${header}\n\nНа этот день записей нет.` };
  return {
    text: `${header}\n\n${bookings.map(formatBookingLine).join("\n")}`,
    buttons: bookings.flatMap((b) => actionButtonsRow(b) ?? []),
  };
}

export async function handleWeekCommand(): Promise<CommandReply> {
  const today = todayDateStr();
  const lines: string[] = ["📆 Расписание на неделю", ""];
  const buttons: InlineButton[][] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(today, i);
    const bookings = await bookingsOnDate(dateStr);
    lines.push(`${formatDateHuman(dateStr)}${bookings.length === 0 ? " — свободно" : ""}`);
    for (const b of bookings) {
      lines.push(`  ${formatBookingLine(b)}`);
      const rows = actionButtonsRow(b);
      if (rows) buttons.push(...rows);
    }
  }
  return { text: lines.join("\n"), buttons };
}

export async function handleUpcomingCommand(limit = 10): Promise<CommandReply> {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED"] }, date: { gte: new Date(`${todayDateStr()}T00:00:00.000Z`) } },
    include: { service: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: limit,
  });
  if (bookings.length === 0) return { text: "Ближайших записей нет." };
  const lines = ["📋 Ближайшие записи", ""];
  for (const b of bookings) {
    lines.push(`${formatDateHuman(b.date.toISOString().slice(0, 10))} ${formatBookingLine(b)}`);
  }
  return {
    text: lines.join("\n"),
    buttons: bookings.flatMap((b) => actionButtonsRow(b) ?? []),
  };
}

/** Список дней, в которые есть брони — по кнопке на день, с подписью
 * именем клиента (если бронь одна) или количеством (если несколько). */
export async function handleDaysList(): Promise<CommandReply> {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED"] }, date: { gte: new Date(`${todayDateStr()}T00:00:00.000Z`) } },
    include: { service: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  if (bookings.length === 0) return { text: "Записей нет — впереди все дни свободны." };

  const byDate = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const dateStr = b.date.toISOString().slice(0, 10);
    const list = byDate.get(dateStr) ?? [];
    list.push(b);
    byDate.set(dateStr, list);
  }

  const buttons: InlineButton[][] = [];
  for (const [dateStr, list] of byDate) {
    const hasPending = list.some((b) => b.status === "PENDING");
    const icon = hasPending ? "⏳" : "📅";
    const first = list[0];
    const label =
      list.length === 1 && first
        ? `${icon} ${formatDateShort(dateStr)} · ${first.clientName}`
        : `${icon} ${formatDateShort(dateStr)} · ${list.length} брони`;
    buttons.push([{ text: label.slice(0, 64), callback_data: `day:${dateStr}` }]);
  }
  return { text: "🗓 Дни с записями — выберите день, чтобы посмотреть и отредактировать:", buttons };
}

/** Все заявки, ожидающие подтверждения — сразу с кнопками ✅/❌ под каждой. */
export async function handlePendingList(): Promise<CommandReply> {
  const bookings = await prisma.booking.findMany({
    where: { status: "PENDING" },
    include: { service: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  if (bookings.length === 0) return { text: "Заявок, ожидающих подтверждения, нет." };
  const lines = ["⏳ Ожидают подтверждения", ""];
  for (const b of bookings) {
    lines.push(`${formatDateHuman(b.date.toISOString().slice(0, 10))} ${formatBookingLine(b)}`);
  }
  return {
    text: lines.join("\n"),
    buttons: bookings.flatMap((b) => actionButtonsRow(b) ?? []),
  };
}

export async function handleFreeCommand(dateStr: string): Promise<string> {
  const slots = await getHourlyAvailability(dateStr);
  const header = `🕐 Свободные часы — ${formatDateHuman(dateStr)}`;
  if (slots.length === 0) return `${header}\n\nВ этот день студия не работает.`;
  const free = slots.filter((s) => s.free).map((s) => s.time);
  if (free.length === 0) return `${header}\n\nВсё занято.`;
  return `${header}\n\n${free.join(", ")}`;
}

export type BlockParseResult =
  | { ok: true; dateStr: string; startTime: string; endTime: string; reason?: string }
  | { ok: false; error: string };

/** "/block 28.08 15:00-18:00 Студия занята" */
export function parseBlockArgs(text: string): BlockParseResult {
  const parts = text.trim().split(/\s+/);
  const [, dateArg, rangeArg, ...reasonParts] = parts;
  const dateStr = parseDateArg(dateArg);
  if (!dateStr) {
    return { ok: false, error: "Не понял дату. Формат: /block 28.08 15:00-18:00 Студия занята" };
  }
  const rangeMatch = rangeArg?.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!rangeMatch) {
    return { ok: false, error: "Не понял время. Формат: /block 28.08 15:00-18:00 Студия занята" };
  }
  return {
    ok: true,
    dateStr,
    startTime: rangeMatch[1]!,
    endTime: rangeMatch[2]!,
    reason: reasonParts.join(" ") || undefined,
  };
}

export async function createBlockedSlot(input: {
  dateStr: string;
  startTime: string;
  endTime: string;
  reason?: string;
}) {
  const date = new Date(`${input.dateStr}T00:00:00.000Z`);
  return prisma.blockedSlot.create({
    data: {
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      startsAt: zonedDateTimeToUtc(input.dateStr, input.startTime),
      endsAt: zonedDateTimeToUtc(input.dateStr, input.endTime),
      reason: input.reason,
    },
  });
}

// --- Перенос брони (reschedule) ---------------------------------------
//
// Полностью кнопочный флоу без хранения состояния диалога — вся нужная
// информация (id брони, выбранная дата, выбранное время) едет прямо в
// callback_data следующего шага:
//   rs:d:<bookingId>              — показать список дней (выбор даты)
//   rs:t:<bookingId>:<dateStr>    — показать список часов на эту дату
//   rs:c:<bookingId>:<dateStr>:<startTime> — подтверждение и сам перенос
// (см. обработку в src/app/api/telegram/webhook/route.ts)

const RESCHEDULE_DAYS_AHEAD = 14;

async function bookingForReschedule(bookingId: string) {
  return prisma.booking.findUnique({ where: { id: bookingId }, include: { service: true } });
}

/** Экран 1: список ближайших дней — на какую дату переносим бронь. */
export async function handleRescheduleDayList(bookingId: string): Promise<CommandReply> {
  const booking = await bookingForReschedule(bookingId);
  if (!booking) return { text: "Не нашли эту бронь — возможно, её уже отменили." };
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { text: "Эту бронь уже нельзя перенести — она не активна (отменена/отклонена)." };
  }

  const today = todayDateStr();
  const buttons: InlineButton[][] = [];
  let row: InlineButton[] = [];
  for (let i = 0; i < RESCHEDULE_DAYS_AHEAD; i++) {
    const dateStr = addDays(today, i);
    row.push({ text: formatDateShort(dateStr), callback_data: `rs:t:${bookingId}:${dateStr}` });
    if (row.length === 3) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length) buttons.push(row);

  const currentDateStr = booking.date.toISOString().slice(0, 10);
  return {
    text: [
      "✏️ <b>Перенос записи</b>",
      `👤 ${booking.clientName} · ${booking.service.name} · ${booking.duration} ч`,
      `Сейчас: ${formatDateHuman(currentDateStr)}, ${booking.startTime}–${booking.endTime}`,
      "",
      "Выберите новую дату:",
    ].join("\n"),
    buttons,
  };
}

/** Экран 2: доступные часы начала на выбранную дату (с той же продолжительностью, что и была). */
export async function handleRescheduleTimeList(bookingId: string, dateStr: string): Promise<CommandReply> {
  const booking = await bookingForReschedule(bookingId);
  if (!booking) return { text: "Не нашли эту бронь — возможно, её уже отменили." };
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { text: "Эту бронь уже нельзя перенести — она не активна (отменена/отклонена)." };
  }

  const backButton: InlineButton[] = [{ text: "🔙 Другая дата", callback_data: `rs:d:${bookingId}` }];

  // excludeBookingId — собственный (ещё не сдвинутый) интервал этой же
  // брони не должен мешать выбрать время в тот же день.
  const slots = await getHourlyAvailability(dateStr, bookingId);
  if (slots.length === 0) {
    return {
      text: `${formatDateHuman(dateStr)} — студия в этот день не работает.`,
      buttons: [backButton],
    };
  }

  const fitting: string[] = [];
  for (const slot of slots) {
    if (!slot.free) continue;
    const durations = await getAvailableDurations(dateStr, slot.time, bookingId);
    if (durations.includes(booking.duration)) fitting.push(slot.time);
  }

  if (fitting.length === 0) {
    return {
      text: `${formatDateHuman(dateStr)} — нет свободного окна на ${booking.duration} ч. Попробуйте другую дату.`,
      buttons: [backButton],
    };
  }

  const buttons: InlineButton[][] = [];
  let row: InlineButton[] = [];
  for (const time of fitting) {
    const end = addHour(time, booking.duration);
    row.push({ text: `${time}–${end}`, callback_data: `rs:c:${bookingId}:${dateStr}:${time}` });
    if (row.length === 3) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length) buttons.push(row);
  buttons.push(backButton);

  return {
    text: `✏️ ${formatDateHuman(dateStr)} — выберите новое время начала (продолжительность ${booking.duration} ч сохраняется):`,
    buttons,
  };
}
