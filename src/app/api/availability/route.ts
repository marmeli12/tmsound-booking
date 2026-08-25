import { NextRequest, NextResponse } from "next/server";
import { getAvailableDurations, getHourlyAvailability } from "@/lib/availability";
import { isPastDate } from "@/lib/time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  const startTime = searchParams.get("startTime");

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }
  if (isPastDate(date)) {
    return NextResponse.json({ slots: [], durations: [] });
  }

  const slots = await getHourlyAvailability(date);

  if (startTime) {
    const durations = await getAvailableDurations(date, startTime);
    return NextResponse.json({ slots, durations });
  }

  return NextResponse.json({ slots });
}
