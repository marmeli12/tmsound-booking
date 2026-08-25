import { NextRequest, NextResponse } from "next/server";
import { getMonthStatus } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Некорректные year/month" }, { status: 400 });
  }

  const days = await getMonthStatus(year, month);
  return NextResponse.json({ days });
}
