/**
 * Разовая утилита: полностью очищает таблицу bookings — например, чтобы
 * стереть тестовые заявки перед реальным запуском. НЕОБРАТИМО (удаляет
 * записи из базы насовсем), поэтому требует явного флага --yes, чтобы
 * нельзя было случайно запустить:
 *
 *   npm run db:reset-bookings -- --yes
 *
 * Блокировки времени (/block в боте) и услуги не трогает — только брони.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Это удалит ВСЕ брони без возможности восстановить.\n" +
        "Если точно уверены — запустите с флагом:\n" +
        "  npm run db:reset-bookings -- --yes"
    );
    process.exit(1);
  }

  const result = await prisma.booking.deleteMany({});
  console.log(`Удалено броней: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
