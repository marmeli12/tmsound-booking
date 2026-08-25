/**
 * Разовая настройка: регистрирует список админских команд в Telegram,
 * чтобы они всплывали автодополнением, когда вы начинаете вводить "/" в
 * чате с ботом — не нужно печатать их руками и помнить синтаксис.
 *
 *   npm run bot:set-commands
 *
 * Список привязан к конкретному чату (scope: "chat", TELEGRAM_ADMIN_CHAT_ID) —
 * видно только вам как админу, обычные клиенты бота этого меню не видят
 * (им эти команды и не нужны — см. src/app/api/telegram/webhook/route.ts).
 */

const COMMANDS = [
  { command: "menu", description: "Открыть меню с кнопками" },
  { command: "today", description: "Брони на сегодня" },
  { command: "tomorrow", description: "Брони на завтра" },
  { command: "week", description: "Расписание на неделю" },
  { command: "bookings", description: "Ближайшие подтверждённые записи" },
  { command: "free", description: "Свободные часы — можно с датой, напр. /free 28.08" },
  { command: "block", description: "Заблокировать время: /block 28.08 15:00-18:00 Причина" },
];

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  if (!adminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID не задан");

  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: COMMANDS,
      scope: { type: "chat", chat_id: Number(adminChatId) },
    }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  if (!data.ok) {
    process.exit(1);
  }
  console.log("\nГотово — откройте чат с ботом и наберите \"/\", должна появиться подсказка со списком команд.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// См. такой же комментарий в scripts/set-webhook.ts — без этого TS
// ругается на "Duplicate function implementation" между скриптами.
export {};
