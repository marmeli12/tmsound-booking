import { prisma } from "./db";
import { STUDIO_TIMEZONE } from "./time";

export type WorkingHoursRule = {
  /** 0 = воскресенье … 6 = суббота (как Date#getDay()) */
  days: number[];
  open: string; // "HH:mm"
  close: string; // "HH:mm"
};

export const DEFAULT_WORKING_HOURS: WorkingHoursRule[] = [
  { days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "23:00" },
];

/**
 * Настройки — одна строка-синглтон. Если её ещё нет (первый запуск до
 * сидирования), возвращаем разумные значения по умолчанию, ничего не
 * ломая — но советуем прогнать `npm run db:seed`.
 */
export async function getSettings() {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (row) {
    return {
      workingHours: row.workingHours as unknown as WorkingHoursRule[],
      timezone: row.timezone,
      studioAddress: row.studioAddress,
    };
  }
  return {
    workingHours: DEFAULT_WORKING_HOURS,
    timezone: STUDIO_TIMEZONE,
    studioAddress: "Санкт-Петербург, Пирогова, 17",
  };
}

/** Правило рабочих часов, действующее для конкретного дня недели (или null — выходной). */
export function ruleForWeekday(
  rules: WorkingHoursRule[],
  weekday: number
): WorkingHoursRule | null {
  return rules.find((r) => r.days.includes(weekday)) ?? null;
}
