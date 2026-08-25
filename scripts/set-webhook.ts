/**
 * Разовая настройка: говорит Telegram, куда слать апдейты для бота.
 * Запускать один раз после деплоя (и снова — если сменился домен/секрет):
 *
 *   npm run bot:set-webhook
 *
 * Читает TELEGRAM_BOT_TOKEN, PUBLIC_APP_URL, TELEGRAM_WEBHOOK_SECRET и
 * (опционально) NEXT_PUBLIC_BASE_PATH из окружения. Значения подхватываются
 * из .env файла в текущей папке через `node --env-file` (см. package.json,
 * нужен Node 20.6+) — отдельный пакет для этого не нужен.
 */

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  if (!appUrl) throw new Error("PUBLIC_APP_URL не задан (например https://your-app.up.railway.app)");

  const webhookUrl = `${appUrl.replace(/\/$/, "")}${basePath}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret || undefined,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  if (!data.ok) {
    process.exit(1);
  }
  console.log(`\nВебхук установлен: ${webhookUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Пустой export делает файл ES-модулем для TypeScript, а не глобальным
// скриптом — иначе его `main()` конфликтует с одноимённой функцией в
// других scripts/*.ts (они бы делили один и тот же глобальный scope).
export {};
