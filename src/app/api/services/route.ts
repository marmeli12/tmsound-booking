import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Роут ходит в базу на каждый запрос — Next.js не должен пытаться
// заранее посчитать его один раз при сборке (`next build`).
export const dynamic = "force-dynamic";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      pricePerHour: s.pricePerHour,
    })),
  });
}
