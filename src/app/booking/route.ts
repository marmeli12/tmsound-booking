import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingConflictError, createBooking } from "@/lib/bookingActions";
import { isPastDate, nowTimeStr, todayDateStr } from "@/lib/time";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  // Верхний предел тут — просто защита от мусорного значения в запросе;
  // реальное ограничение — сколько подряд свободных часов есть в рабочем
  // дне (см. lib/availability.ts), а не фиксированное число часов.
  duration: z.number().int().min(1).max(24),
  clientName: z.string().trim().min(2, "Укажите имя").max(120),
  telegramUsername: z
    .string()
    .trim()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, "Некорректный Telegram username")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля формы", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  if (isPastDate(input.dateStr)) {
    return NextResponse.json({ error: "Нельзя записаться на прошедшую дату" }, { status: 400 });
  }
  // Дата сегодняшняя, но время на неё уже прошло (например, сейчас 15:00,
  // а прислали 12:00) — раньше это не проверялось, и заявку можно было
  // создать "на прошедшее время". См. также getHourlyAvailability, которая
  // теперь и на шаге выбора времени не предлагает такие часы.
  if (input.dateStr === todayDateStr() && input.startTime <= nowTimeStr()) {
    return NextResponse.json({ error: "Это время уже прошло — выберите другое" }, { status: 400 });
  }

  try {
    const { booking, botDeepLink } = await createBooking({
      ...input,
      telegramUsername: input.telegramUsername || undefined,
      phone: input.phone || undefined,
      instagram: input.instagram || undefined,
      comment: input.comment || undefined,
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        date: input.dateStr,
        startTime: booking.startTime,
        endTime: booking.endTime,
        price: booking.price,
        status: booking.status,
      },
      botDeepLink,
    });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("POST /api/bookings failed:", err);
    return NextResponse.json({ error: "Не получилось создать заявку, попробуйте ещё раз" }, { status: 500 });
  }
}
