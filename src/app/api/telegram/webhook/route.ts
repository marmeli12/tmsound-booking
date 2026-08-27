import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedSlot,
  handleDayCommand,
  handleDaysList,
  handleFreeCommand,
  handlePendingList,
  handleRescheduleDayList,
  handleRescheduleTimeList,
  handleUpcomingCommand,
  handleWeekCommand,
  mainMenuButtons,
  parseBlockArgs,
  parseDateArg,
} from "@/lib/adminCommands";
import {
  cancelBooking,
  confirmBooking,
  linkClientChat,
  rejectBooking,
  rescheduleBooking,
  adminSlotTakenWarning,
} from "@/lib/bookingActions";
import { prisma } from "@/lib/db";
import { answerCallbackQuery, editMessageReplyMarkup, isAdminChat, sendMessage, type InlineButton } from "@/lib/telegram";
import { formatDateHuman } from "@/lib/time";

// Telegram шлёт секретный токен в заголовке (задаётся при setWebhook,
// см. scripts/set-webhook.ts) — так мы отсекаем любые запросы, которые
// не от настоящего Telegram, даже зная URL вебхука.
function isAuthentic(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // секрет не настроен — пропускаем проверку (см. README)
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthentic(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json();

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    // Telegram ретраит вебхук при ошибке — логируем, но всегда отвечаем 200,
    // чтобы не улететь в бесконечный retry-storm на потенциально уже
    // обработанном апдейте.
    console.error("Telegram webhook handler error:", err);
  }

  return NextResponse.json({ ok: true });
}

// Добавляет кнопку "🔙 Меню" под любой ответ — чтобы из любого места
// можно было вернуться к списку действий, не печатая команду заново.
function withMenuButton(buttons?: InlineButton[][]): InlineButton[][] {
  return [...(buttons ?? []), [{ text: "🔙 Меню", callback_data: "menu:show" }]];
}

async function handleMessage(message: any) {
  const chatId = String(message.chat.id);
  const text: string = message.text ?? "";

  if (text.startsWith("/start")) {
    const linkToken = text.split(" ")[1];
    if (linkToken) {
      const booking = await linkClientChat(linkToken.trim(), chatId);
      if (!booking) {
        await sendMessage(chatId, "Не нашли такую заявку. Проверьте ссылку или напишите нам напрямую.");
      }
    } else if (isAdminChat(chatId)) {
      await sendMessage(chatId, "Привет! Это бот T&M Sound. Выберите действие:", mainMenuButtons());
    } else {
      await sendMessage(chatId, "Привет! Это бот T&M Sound — сюда придут уведомления по вашей записи.");
    }
    return;
  }

  // Всё, что ниже — админские команды, доступны только из админского чата.
  if (!isAdminChat(chatId)) return;

  const [cmd, ...rest] = text.trim().split(/\s+/);
  const argsText = text.trim();

  switch (cmd) {
    case "/menu":
      await sendMessage(chatId, "📋 Меню", mainMenuButtons());
      break;
    case "/today": {
      const reply = await handleDayCommand(parseDateArg("сегодня")!);
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      break;
    }
    case "/tomorrow": {
      const reply = await handleDayCommand(parseDateArg("завтра")!);
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      break;
    }
    case "/week": {
      const reply = await handleWeekCommand();
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      break;
    }
    case "/bookings": {
      const reply = await handleUpcomingCommand();
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      break;
    }
    case "/free": {
      const dateStr = parseDateArg(rest[0]);
      if (!dateStr) {
        await sendMessage(chatId, "Не понял дату. Формат: /free 28.08 (или без аргумента — сегодня)");
        break;
      }
      await sendMessage(chatId, await handleFreeCommand(dateStr), withMenuButton());
      break;
    }
    case "/block": {
      const parsed = parseBlockArgs(argsText);
      if (!parsed.ok) {
        await sendMessage(chatId, parsed.error);
        break;
      }
      await createBlockedSlot(parsed);
      await sendMessage(
        chatId,
        `🔒 Заблокировано: ${parsed.dateStr} ${parsed.startTime}–${parsed.endTime}${
          parsed.reason ? ` (${parsed.reason})` : ""
        }`,
        withMenuButton()
      );
      break;
    }
    default:
      // Не команда — игнорируем молча (админ может просто переписываться в этом чате).
      break;
  }
}

async function handleCallback(query: any) {
  const chatId = String(query.message?.chat?.id ?? "");
  const messageId: number | undefined = query.message?.message_id;
  const data: string = query.data ?? "";

  if (!isAdminChat(chatId)) {
    await answerCallbackQuery(query.id, "Недоступно");
    return;
  }

  const [action, arg] = data.split(":");

  if (action === "confirm" && arg) {
    const result = await confirmBooking(arg);
    if (result.ok) {
      await answerCallbackQuery(query.id, "Подтверждено ✅");
      if (messageId) await editMessageReplyMarkup(chatId, messageId);
      await sendMessage(chatId, `✅ Заявка подтверждена: ${result.booking.clientName}, ${result.booking.startTime}–${result.booking.endTime}`);
    } else if (result.reason === "conflict") {
      await answerCallbackQuery(query.id, "Слот уже занят");
      await sendMessage(chatId, adminSlotTakenWarning());
    } else {
      await answerCallbackQuery(query.id, "Заявку уже обработали");
    }
    return;
  }

  if (action === "reject" && arg) {
    const result = await rejectBooking(arg);
    if (result.ok) {
      await answerCallbackQuery(query.id, "Отклонено");
      if (messageId) await editMessageReplyMarkup(chatId, messageId);
      await sendMessage(chatId, `❌ Заявка отклонена: ${result.booking.clientName}`);
    } else {
      await answerCallbackQuery(query.id, "Заявку уже обработали");
    }
    return;
  }

  if (action === "cancel" && arg) {
    // Кнопка отмены живёт в списках (/today, /week, /bookings), где на
    // одном сообщении может быть несколько броней сразу — поэтому НЕ
    // трогаем клавиатуру исходного сообщения (не убираем чужие кнопки),
    // просто шлём отдельное подтверждение.
    const result = await cancelBooking(arg);
    if (result.ok) {
      await answerCallbackQuery(query.id, "Отменено");
      await sendMessage(chatId, `❌ Бронь отменена: ${result.booking.clientName}, ${result.booking.startTime}–${result.booking.endTime}`);
    } else if (result.reason === "not_confirmed") {
      await answerCallbackQuery(query.id, "Уже не активна");
    } else {
      await answerCallbackQuery(query.id, "Не нашли бронь");
    }
    return;
  }

  if (action === "rs") {
    // Кнопочный флоу переноса брони — данные едут прямо в callback_data,
    // серверного состояния диалога нет (см. комментарий в adminCommands.ts).
    const parts = data.split(":");
    const sub = parts[1];
    const bookingId = parts[2];

    if (sub === "d" && bookingId) {
      await answerCallbackQuery(query.id);
      const reply = await handleRescheduleDayList(bookingId);
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      return;
    }

    if (sub === "t" && bookingId && parts[3]) {
      await answerCallbackQuery(query.id);
      const reply = await handleRescheduleTimeList(bookingId, parts[3]);
      await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
      return;
    }

    if (sub === "c" && bookingId && parts[3] && parts[4]) {
      const dateStr = parts[3];
      const startTime = parts[4];
      const result = await rescheduleBooking(bookingId, dateStr, startTime);
      if (result.ok) {
        await answerCallbackQuery(query.id, "Перенесено ✅");
        const b = result.booking;
        await sendMessage(
          chatId,
          [
            `🔄 Перенесено: ${b.clientName}`,
            `Было: ${formatDateHuman(result.oldDateStr)}, ${result.oldRange}`,
            `Стало: ${formatDateHuman(b.date.toISOString().slice(0, 10))}, ${b.startTime}–${b.endTime}`,
          ].join("\n")
        );
      } else if (result.reason === "conflict") {
        await answerCallbackQuery(query.id, "Это время уже занято");
        await sendMessage(
          chatId,
          "⚠️ Это время только что заняли — выберите другое.",
          withMenuButton([[{ text: "🔁 Выбрать время заново", callback_data: `rs:t:${bookingId}:${dateStr}` }]])
        );
      } else if (result.reason === "not_active") {
        await answerCallbackQuery(query.id, "Бронь уже не активна");
      } else {
        await answerCallbackQuery(query.id, "Не нашли бронь");
      }
      return;
    }

    await answerCallbackQuery(query.id);
    return;
  }

  if (action === "days" && arg === "list") {
    await answerCallbackQuery(query.id);
    const reply = await handleDaysList();
    await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
    return;
  }

  if (action === "day" && arg) {
    // Клик по конкретному дню из списка "🗓 Дни с записями" — arg это
    // YYYY-MM-DD, дальше это тот же экран, что и /today,/tomorrow, только
    // с явной датой.
    await answerCallbackQuery(query.id);
    const reply = await handleDayCommand(arg);
    await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
    return;
  }

  if (action === "pending" && arg === "list") {
    await answerCallbackQuery(query.id);
    const reply = await handlePendingList();
    await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
    return;
  }

  if (action === "menu") {
    await answerCallbackQuery(query.id);
    switch (arg) {
      case "show":
        await sendMessage(chatId, "📋 Меню", mainMenuButtons());
        break;
      case "today": {
        const reply = await handleDayCommand(parseDateArg("сегодня")!);
        await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
        break;
      }
      case "tomorrow": {
        const reply = await handleDayCommand(parseDateArg("завтра")!);
        await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
        break;
      }
      case "week": {
        const reply = await handleWeekCommand();
        await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
        break;
      }
      case "bookings": {
        const reply = await handleUpcomingCommand();
        await sendMessage(chatId, reply.text, withMenuButton(reply.buttons));
        break;
      }
      case "free": {
        const text = await handleFreeCommand(parseDateArg("сегодня")!);
        await sendMessage(chatId, text, withMenuButton());
        break;
      }
      case "block_hint":
        await sendMessage(
          chatId,
          "Формат: /block 28.08 15:00-18:00 Причина\n(причина необязательна, дату можно не указывать — тогда сегодня)",
          withMenuButton()
        );
        break;
      default:
        break;
    }
    return;
  }

  await answerCallbackQuery(query.id);
}

// На всякий случай — прямая проверка, что бот жив, GET-запросом в браузере.
export async function GET() {
  const count = await prisma.booking.count();
  return NextResponse.json({ ok: true, bookings: count });
}
