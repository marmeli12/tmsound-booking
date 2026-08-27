import { google } from "googleapis";
import type { Booking, Service } from "@prisma/client";
import { STUDIO_TIMEZONE, zonedDateTimeToUtc } from "./time";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Двусторонняя синхронизация с Google Calendar — полностью опциональна.
 * Если переменные окружения не заданы, все функции тут тихо ничего не
 * делают (см. README, раздел "Google Calendar") — сайт и бот работают
 * как раньше, просто без календаря.
 *
 * Направление "сайт → календарь": при подтверждении брони (см.
 * bookingActions.confirmBooking) создаём событие в календаре, чтобы все,
 * у кого есть доступ к календарю, видели бронь без захода на сайт/в бот.
 *
 * Направление "календарь → сайт": при расчёте свободных часов (см.
 * availability.occupiedRangesForDate) спрашиваем у календаря занятые
 * интервалы на эту дату и учитываем их наравне с бронями из БД — так
 * ручная запись прямо в Google Calendar тоже блокирует время на сайте.
 */

type BusyRange = { startTime: string; endTime: string };

function calendarId(): string | null {
  return process.env.GOOGLE_CALENDAR_ID || null;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  // В .env приватный ключ хранится в одну строку с "\n" вместо реальных
  // переносов — тут разворачиваем обратно в настоящий PEM.
  const key = rawKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function getCalendarClient() {
  const auth = getAuth();
  const id = calendarId();
  if (!auth || !id) return null;
  return { calendar: google.calendar({ version: "v3", auth }), id };
}

/** Занятые интервалы из Google Calendar на дату — в том же формате, что и брони/блокировки из БД. */
export async function getCalendarBusyRanges(dateStr: string): Promise<BusyRange[]> {
  const client = getCalendarClient();
  if (!client) return [];

  const dayStart = zonedDateTimeToUtc(dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000); // Europe/Moscow без перехода на летнее время — плюс сутки безопасен

  try {
    const res = await client.calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: client.id }],
      },
    });
    const busy = res.data.calendars?.[client.id]?.busy ?? [];
    return busy
      .map((period): BusyRange | null => {
        if (!period.start || !period.end) return null;
        const start = new Date(period.start);
        const end = new Date(period.end);
        const clippedStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
        const clippedEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
        if (clippedStart >= clippedEnd) return null;
        return {
          startTime: formatInTimeZone(clippedStart, STUDIO_TIMEZONE, "HH:mm"),
          // "24:00", а не "00:00" — событие может тянуться до конца дня,
          // а строковое сравнение времён (см. availability.ts) со
          // значением "00:00" в качестве конца диапазона ломает
          // проверку пересечения для последнего часа дня.
          endTime: clippedEnd.getTime() === dayEnd.getTime() ? "24:00" : formatInTimeZone(clippedEnd, STUDIO_TIMEZONE, "HH:mm"),
        };
      })
      .filter((r): r is BusyRange => r !== null);
  } catch (err) {
    // Best-effort: если календарь недоступен (не расшарен, невалидные
    // креды, временная ошибка Google) — просто не учитываем его, но не
    // ломаем доступность на сайте.
    console.error("Google Calendar freebusy query failed:", err);
    return [];
  }
}

type BookingWithService = Booking & { service: Service };

/** Создаёт событие в календаре для подтверждённой брони, возвращает его ID (или null, если интеграция не настроена/упала). */
export async function createCalendarEvent(booking: BookingWithService): Promise<string | null> {
  const client = getCalendarClient();
  if (!client) return null;

  const descriptionLines = [
    `Услуга: ${booking.service.name}`,
    `Цена: ${booking.price} ₽`,
    booking.telegramUsername ? `Telegram: @${booking.telegramUsername}` : null,
    booking.phone ? `Телефон: ${booking.phone}` : null,
    booking.comment ? `Комментарий: ${booking.comment}` : null,
    "",
    "Создано автоматически с сайта бронирования T&M Sound.",
  ].filter((l): l is string => l !== null);

  try {
    const res = await client.calendar.events.insert({
      calendarId: client.id,
      requestBody: {
        summary: `${booking.clientName} — ${booking.service.name}`,
        description: descriptionLines.join("\n"),
        start: { dateTime: booking.startsAt.toISOString(), timeZone: STUDIO_TIMEZONE },
        end: { dateTime: booking.endsAt.toISOString(), timeZone: STUDIO_TIMEZONE },
      },
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("Google Calendar event creation failed:", err);
    return null;
  }
}

/** Двигает время события при переносе брони. Тихо игнорирует ошибки (например, если событие уже удалили вручную). */
export async function updateCalendarEvent(eventId: string, booking: BookingWithService): Promise<void> {
  const client = getCalendarClient();
  if (!client) return;
  try {
    await client.calendar.events.patch({
      calendarId: client.id,
      eventId,
      requestBody: {
        start: { dateTime: booking.startsAt.toISOString(), timeZone: STUDIO_TIMEZONE },
        end: { dateTime: booking.endsAt.toISOString(), timeZone: STUDIO_TIMEZONE },
      },
    });
  } catch (err) {
    console.error("Google Calendar event update failed:", err);
  }
}

/** Удаляет событие при отмене брони. Тихо игнорирует ошибки (например, если событие уже удалили вручную). */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const client = getCalendarClient();
  if (!client) return;
  try {
    await client.calendar.events.delete({ calendarId: client.id, eventId });
  } catch (err) {
    console.error("Google Calendar event deletion failed:", err);
  }
}
