const TELEGRAM_API = "https://api.telegram.org";

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN не задан в переменных окружения");
  }
  return token;
}

export type InlineButton =
  | { text: string; callback_data: string; url?: undefined }
  | { text: string; url: string; callback_data?: undefined };

async function call(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    // Не бросаем исключение наверх для не критичных вызовов (например,
    // сообщение клиенту, у которого ещё нет chat_id) — просто логируем.
    console.error("Telegram API error:", method, data);
  }
  return data;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  buttons?: InlineButton[][]
) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  buttons?: InlineButton[][]
) {
  return call("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: buttons ? { inline_keyboard: buttons } : { inline_keyboard: [] },
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export function isAdminChat(chatId: string | number): boolean {
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  return !!adminId && String(chatId) === String(adminId);
}
