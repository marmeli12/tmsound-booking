import { PrismaClient } from "@prisma/client";

// Next.js dev-server перезагружает модули при каждом изменении файла —
// без глобального кэша это плодило бы новый PrismaClient (и новый пул
// соединений) на каждый hot-reload. Стандартный паттерн для Next.js.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
