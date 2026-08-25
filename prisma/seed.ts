import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Начальные услуги — ровно то, что уже написано на сайте (см. Main.dc.html
 * в дизайн-канвасе), чтобы цены совпадали. Меняются потом одной командой
 * `npm run db:seed` после правки этого файла, или напрямую через
 * `npm run db:studio` (Prisma Studio) — без изменения кода приложения.
 */
const SERVICES = [
  { slug: "engineer-recording", name: "Запись со звукорежиссёром", pricePerHour: 1500, sortOrder: 1, isActive: true,
    description: "Настройка микрофона и оборудования, помощь во время записи, индивидуальный пресет под артиста и базовая обработка вокала." },
  { slug: "studio-rental", name: "Аренда студии", pricePerHour: 900, sortOrder: 2, isActive: true,
    description: "Самостоятельная работа в студии без звукорежиссёра." },
  // Сведение и мастеринг — асинхронные услуги (присылаете файл, получаете
  // результат в течение нескольких дней), а не бронь конкретного времени
  // в студии, поэтому их убрали из шага "Услуга" на /booking (isActive:
  // false). На основном сайте они остаются как есть — там это просто
  // информационная карточка с ценой, не связанная с этим бронированием.
  { slug: "mixing", name: "Сведение", pricePerHour: 7000, sortOrder: 3, isActive: false,
    description: "От готового MP3/WAV. Срок — до 7 дней, правки включены." },
  { slug: "mastering", name: "Мастеринг", pricePerHour: 3000, sortOrder: 4, isActive: false,
    description: "Финальная обработка трека после сведения — готов к релизу на стримингах." },
  { slug: "beats-production", name: "Биты и продакшн", pricePerHour: 2000, sortOrder: 5, isActive: true,
    description: "Работа над битом вместе с артистом прямо в студии." },
];

async function main() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: { name: s.name, pricePerHour: s.pricePerHour, sortOrder: s.sortOrder, description: s.description, isActive: s.isActive },
      create: s,
    });
  }

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      workingHours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "23:00" }],
      timezone: "Europe/Moscow",
      studioAddress: "Санкт-Петербург, Пирогова, 17",
    },
  });

  console.log(`Готово: ${SERVICES.length} услуг и настройки по умолчанию (Пн–Вс 10:00–23:00).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
