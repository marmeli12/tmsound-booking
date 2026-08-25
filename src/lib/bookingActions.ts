import { prisma } from "./db";
import { computeRange } from "./availability";
import { createCalendarEvent, deleteCalendarEvent } from "./googleCalendar";
import { getSettings } from "./settings";
import {
  adminNewRequestMessage,
  adminSlotTakenWarning,
  clientCancelledMessage,
  clientConfirmedMessage,
  clientPendingMessage,
  clientRejectedMessage,
} from "./notifications";
import { sendMessage } from "./telegram";

export class BookingConflictError extends Error {
  constructor() {
    super("Этот слот уже занят — попробуйте другое время.");
    this.name = "BookingConflictError";
  }
}

export type CreateBookingInput = {
  serviceId: string;
  dateStr: string;
  startTime: string;
  duration: number;
  clientName: string;
  telegramUsername?: string;
  phone?: string;
  instagram?: string;
  comment?: string;
};

/** Означает ли эта ошибка Prisma/Postgres нарушение EXCLUDE-ограничения bookings_no_overlap? */
function isOverlapConstraintError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("bookings_no_overlap") || msg.includes("exclusion constraint");
}

export async function createBooking(input: CreateBookingInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.isActive) {
    throw new Error("Услуга не найдена");
  }
  if (input.duration < 1 || input.duration > 24) {
    throw new Error("Некорректная продолжительность");
  }

  const { endTime, startsAt, endsAt } = computeRange({
    dateStr: input.dateStr,
    startTime: input.startTime,
    duration: input.duration,
  });

  // Ручные блокировки — отдельная сущность без EXCLUDE-ограничения (их
  // создаёт только админ через бота, гонки тут не бывает), поэтому
  // проверяем пересечение явным запросом прямо перед вставкой.
  const date = new Date(`${input.dateStr}T00:00:00.000Z`);
  const blockConflict = await prisma.blockedSlot.findFirst({
    where: {
      date,
      startTime: { lt: endTime },
      endTime: { gt: input.startTime },
    },
  });
  if (blockConflict) {
    throw new BookingConflictError();
  }

  const price = service.pricePerHour * input.duration;

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        clientName: input.clientName,
        telegramUsername: input.telegramUsername?.replace(/^@/, ""),
        phone: input.phone,
        instagram: input.instagram,
        comment: input.comment,
        serviceId: input.serviceId,
        date,
        startTime: input.startTime,
        endTime,
        startsAt,
        endsAt,
        duration: input.duration,
        price,
      },
      include: { service: true },
    });
  } catch (err) {
    // Сюда попадаем, если КТО-ТО ДРУГОЙ успел забронировать это же время
    // на долю секунды раньше — EXCLUDE-ограничение в базе (см. миграцию
    // 20240101000100_overlap_protection) отклоняет вставку атомарно на
    // уровне БД, ещё до того как мы вообще успели бы проверить это в коде.
    if (isOverlapConstraintError(err)) {
      throw new BookingConflictError();
    }
    throw err;
  }

  // Уведомления — best effort: если Telegram недоступен, бронь всё равно
  // создана, клиент видит подтверждение на сайте.
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    const buttons: import("./telegram").InlineButton[][] = [
      [
        { text: "✅ ПОДТВЕРДИТЬ", callback_data: `confirm:${booking.id}` },
        { text: "❌ ОТКЛОНИТЬ", callback_data: `reject:${booking.id}` },
      ],
    ];
    if (booking.telegramUsername) {
      buttons.push([{ text: "💬 НАПИСАТЬ КЛИЕНТУ", url: `https://t.me/${booking.telegramUsername}` }]);
    }
    await sendMessage(adminChatId, adminNewRequestMessage(booking), buttons);
  }

  return { booking, botDeepLink: clientBotDeepLink(booking.linkToken) };
}

export function clientBotDeepLink(linkToken: string): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `https://t.me/${username}?start=${linkToken}`;
}

/** Клиент нажал /start по диплинку — привязываем его chat_id к заявке. */
export async function linkClientChat(linkToken: string, chatId: string) {
  const booking = await prisma.booking.findUnique({ where: { linkToken } });
  if (!booking) return null;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { telegramChatId: chatId },
  });
  // Если заявка уже висела в PENDING — сразу шлём то же сообщение о
  // статусе, чтобы клиент не терялся, даже если пришёл в бота не сразу.
  await sendMessage(chatId, clientPendingMessage(updated));
  return updated;
}

export async function confirmBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });
  if (!booking) return { ok: false as const, reason: "not_found" as const };
  if (booking.status !== "PENDING") {
    return { ok: false as const, reason: "not_pending" as const, booking };
  }

  // Повторная проверка перед подтверждением. Пересечения с другими
  // БРОНЯМИ уже физически невозможны — их не даёт создать EXCLUDE-
  // ограничение (см. createBooking). Но между созданием заявки и её
  // подтверждением админ мог вручную заблокировать это время (например,
  // "студия занята с 15:00 до 18:00") — вот эту гонку и перепроверяем.
  const blockConflict = await prisma.blockedSlot.findFirst({
    where: {
      date: booking.date,
      startTime: { lt: booking.endTime },
      endTime: { gt: booking.startTime },
    },
  });
  if (blockConflict) {
    return { ok: false as const, reason: "conflict" as const, booking };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
    include: { service: true },
  });

  // Календарь — best effort (см. googleCalendar.ts): если не настроен или
  // недоступен, просто не создаём событие, подтверждение брони это не блокирует.
  const googleEventId = await createCalendarEvent(updated);
  if (googleEventId) {
    await prisma.booking.update({ where: { id: bookingId }, data: { googleEventId } });
  }

  if (updated.telegramChatId) {
    const settings = await getSettings();
    await sendMessage(updated.telegramChatId, clientConfirmedMessage(updated, settings.studioAddress));
  }

  return { ok: true as const, booking: updated };
}

export async function rejectBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false as const, reason: "not_found" as const };
  if (booking.status !== "PENDING") {
    return { ok: false as const, reason: "not_pending" as const, booking };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED" },
  });

  if (updated.telegramChatId) {
    await sendMessage(updated.telegramChatId, clientRejectedMessage());
  }

  return { ok: true as const, booking: updated };
}

export async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false as const, reason: "not_found" as const };
  if (booking.status !== "CONFIRMED") {
    return { ok: false as const, reason: "not_confirmed" as const, booking };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  if (booking.googleEventId) {
    await deleteCalendarEvent(booking.googleEventId);
  }

  if (updated.telegramChatId) {
    await sendMessage(updated.telegramChatId, clientCancelledMessage(updated));
  }

  return { ok: true as const, booking: updated };
}

export { adminSlotTakenWarning };
