"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiPath } from "@/lib/apiPath";
import { formatDateHuman } from "@/lib/time";
import type { HourSlot } from "@/types";

export default function StepTime({
  dateStr,
  onSelect,
  onBack,
}: {
  dateStr: string;
  onSelect: (startTime: string, duration: number) => void;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  // Индекс часа, с которого начали тянуть, и текущий (уже "прижатый" к
  // границам занятости/лимита) индекс — вместе они определяют диапазон.
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [rangeEndIndex, setRangeEndIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnchorIndex(null);
    setRangeEndIndex(null);
    fetch(apiPath(`/api/availability?date=${dateStr}`))
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  const selection = useMemo(() => {
    if (anchorIndex === null || rangeEndIndex === null) return null;
    return { from: Math.min(anchorIndex, rangeEndIndex), to: Math.max(anchorIndex, rangeEndIndex) };
  }, [anchorIndex, rangeEndIndex]);

  function indexFromClientY(clientY: number): number | null {
    const el = trackRef.current;
    if (!el || slots.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const rowHeight = rect.height / slots.length;
    const raw = Math.floor((clientY - rect.top) / rowHeight);
    return Math.min(slots.length - 1, Math.max(0, raw));
  }

  // Растягиваем выбор от anchor в сторону target на шкале, но
  // останавливаемся на первом занятом часе — дальше тянуть физически
  // некуда. Явного потолка в часах нет, только реальная свободность.
  function clampToward(anchor: number, target: number): number {
    const dir = target >= anchor ? 1 : -1;
    let i = anchor;
    while (i !== target) {
      const next = i + dir;
      if (next < 0 || next >= slots.length) break;
      if (!slots[next]?.free) break;
      i = next;
    }
    return i;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const idx = indexFromClientY(e.clientY);
    if (idx === null || !slots[idx]?.free) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setAnchorIndex(idx);
    setRangeEndIndex(idx);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || anchorIndex === null) return;
    const idx = indexFromClientY(e.clientY);
    if (idx === null) return;
    setRangeEndIndex(clampToward(anchorIndex, idx));
  }

  function handlePointerUp() {
    setDragging(false);
  }

  function reset() {
    setAnchorIndex(null);
    setRangeEndIndex(null);
  }

  function confirm() {
    if (!selection) return;
    const start = slots[selection.from];
    if (!start) return;
    onSelect(start.time, selection.to - selection.from + 1);
  }

  return (
    <div className="step-panel">
      <div className="step-label">Шаг 3 · Время — {formatDateHuman(dateStr)}</div>
      {loading ? (
        <div className="loading-line">Проверяем занятость…</div>
      ) : slots.length === 0 ? (
        <div className="loading-line">
          На эту дату нет свободных часов.{" "}
          <button className="btn-ghost btn" onClick={onBack}>Выбрать другую дату</button>
        </div>
      ) : (
        <>
          <div className="time-hint">
            Потяните по шкале, чтобы выбрать период, или нажмите один час
          </div>
          <div
            className="time-track"
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {slots.map((s, i) => {
              const inSelection = !!selection && i >= selection.from && i <= selection.to;
              return (
                <div key={s.time} className={`time-row ${s.free ? "" : "busy"} ${inSelection ? "selected" : ""}`}>
                  <span className="time-row-label">{s.time}</span>
                  <span className="time-row-bar" />
                </div>
              );
            })}
          </div>

          {selection && (
            <div className="time-selection-bar">
              <div>
                <span className="time-selection-range">
                  {slots[selection.from]?.time}–{nextHourLabel(slots[selection.to]?.time ?? "00:00")}
                </span>
                <span className="time-selection-duration">
                  {" "}
                  ({selection.to - selection.from + 1} {hoursWord(selection.to - selection.from + 1)})
                </span>
              </div>
              <div className="btn-row" style={{ marginTop: 0 }}>
                <button className="btn btn-ghost" onClick={reset}>Сбросить</button>
                <button className="btn btn-primary" onClick={confirm}>Продолжить</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function hoursWord(n: number): string {
  if (n === 1) return "час";
  if (n < 5) return "часа";
  return "часов";
}

function nextHourLabel(time: string): string {
  const [h] = time.split(":").map(Number);
  return `${String(((h ?? 0) + 1) % 24).padStart(2, "0")}:00`;
}
