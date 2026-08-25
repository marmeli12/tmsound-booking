import type { Booking, Service } from "@prisma/client";
import { formatDateHuman } from "./time";

type BookingWithService = Booking & { service: Service };

function rangeLine(b: Booking): string {
  return `${b.startTime}–${b.endTime}`;
}

export function adminNewRequestMessage(b: BookingWithService): string {
  const lines = [
    `🎙 <b>НОВАЯ ЗАЯВКА</b>`,
    "",
    `👤 Имя: ${escapeHtml(b.clientName)}`,
    `🎧 Услуга: ${escapeHtml(b.service.name)}`,
    `📅 ${formatDateHuman(toDateStr(b.date))}`,
    `🕐 ${rangeLine(b)}`,
    `💰 ${b.price} ₽`,
    `📱 Telegram: ${b.telegramUsername ? "@" + b.telegramUsername : "не указан"}`,
    `📞 Телефон: ${b.phone || "не указан"}`,
    `💬 Комментарий: ${b.comment || "—"}`,
    "",
    "Статус: ⏳ ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ",
  ];
  return lines.join("\n");
}

export function clientPendingMessage(b: Booking): string {
  return [
    "⏳ <b>Заявка отправлена</b>",
    "Мы получили вашу заявку и скоро подтвердим запись.",
    "",
    `${formatDateHuman(toDateStr(b.date))}`,
    `${rangeLine(b)}`,
  ].join("\n");
}

export function clientConfirmedMessage(b: Booking, studioAddress: string): string {
  return [
    "✅ <b>ЗАПИСЬ ПОДТВЕРЖДЕНА</b>",
    "T&M Sound",
    `📅 ${formatDateHuman(toDateStr(b.date))}`,
    `🕐 ${rangeLine(b)}`,
    `📍 ${studioAddress}`,
    "",
    "До встречи!",
  ].join("\n");
}

export function clientRejectedMessage(): string {
  return [
    "❌ К сожалению, мы не смогли подтвердить вашу запись.",
    "Свяжитесь с нами, чтобы выбрать другое время.",
  ].join("\n");
}

export function clientCancelledMessage(b: Booking): string {
  return [
    "Ваша запись отменена.",
    `${formatDateHuman(toDateStr(b.date))} ${rangeLine(b)}`,
    "Если это неожиданно — напишите нам, разберёмся.",
  ].join("\n");
}

export function adminSlotTakenWarning(): string {
  return [
    "⚠️ <b>НЕВОЗМОЖНО ПОДТВЕРДИТЬ</b>",
    "Этот слот уже занят.",
    "",
    "Свяжитесь с клиентом, чтобы предложить другое время.",
  ].join("\n");
}

export function adminReminderMessage(b: BookingWithService): string {
  return [
    "⏰ Напоминание о записи",
    `👤 ${escapeHtml(b.clientName)} — ${escapeHtml(b.service.name)}`,
    `📅 ${formatDateHuman(toDateStr(b.date))}`,
    `🕐 ${rangeLine(b)}`,
  ].join("\n");
}

export function clientReminderMessage(b: Booking): string {
  return [
    "⏰ Напоминаем о записи в T&M Sound",
    `📅 ${formatDateHuman(toDateStr(b.date))}`,
    `🕐 ${rangeLine(b)}`,
    "До встречи!",
  ].join("\n");
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
