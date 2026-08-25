"use client";

import { useEffect, useState } from "react";
import { apiPath } from "@/lib/apiPath";
import type { DayStatus } from "@/types";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function todayParts() {
  // Дата по МСК, не по таймзоне сервера/браузера — важно для "нельзя выбрать прошедшую дату".
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export default function StepDate({ onSelect }: { onSelect: (dateStr: string) => void }) {
  const today = todayParts();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month); // 1-12
  const [days, setDays] = useState<Record<string, DayStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(apiPath(`/api/availability/days?year=${year}&month=${month}`))
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDays(data.days ?? {});
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const isCurrentMonth = year === today.year && month === today.month;

  function goPrev() {
    if (isCurrentMonth) return;
    if (month === 1) { setYear((y) => y - 1); setMonth(12); } else { setMonth((m) => m - 1); }
  }
  function goNext() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); } else { setMonth((m) => m + 1); }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Пн=0

  const cells: Array<{ dateStr: string; day: number } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
  }

  return (
    <div className="step-panel">
      <div className="step-label">Шаг 2 · Дата</div>
      <div className="calendar-nav">
        <button onClick={goPrev} disabled={isCurrentMonth} aria-label="Предыдущий месяц">‹</button>
        <div className="calendar-month">{MONTHS[month - 1]} {year}</div>
        <button onClick={goNext} aria-label="Следующий месяц">›</button>
      </div>
      {loading ? (
        <div className="loading-line">Загружаем расписание…</div>
      ) : (
        <div className="calendar-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="calendar-weekday">{w}</div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} className="calendar-day empty" />;
            const status = days[cell.dateStr] ?? "full";
            const disabled = status === "past" || status === "full";
            return (
              <button
                key={cell.dateStr}
                className="calendar-day"
                disabled={disabled}
                onClick={() => onSelect(cell.dateStr)}
                title={status === "full" ? "Нет свободных часов" : undefined}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
