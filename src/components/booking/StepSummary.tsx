"use client";

import { formatDateHuman } from "@/lib/time";
import type { Service } from "@/types";

export default function StepSummary({
  service,
  dateStr,
  startTime,
  endTime,
  duration,
  submitting,
  error,
  onConfirm,
  onBack,
}: {
  service: Service;
  dateStr: string;
  startTime: string;
  endTime: string;
  duration: number;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const price = service.pricePerHour * duration;

  return (
    <div className="step-panel">
      <div className="step-label">Шаг 6 · Подтверждение</div>

      <div className="summary-card">
        <div className="summary-row">
          <span className="k">Студия</span>
          <span>T&amp;M Sound</span>
        </div>
        <div className="summary-row">
          <span className="k">Услуга</span>
          <span>{service.name}</span>
        </div>
        <div className="summary-row">
          <span className="k">Дата</span>
          <span>{formatDateHuman(dateStr)}</span>
        </div>
        <div className="summary-row">
          <span className="k">Время</span>
          <span>{startTime}–{endTime}</span>
        </div>
        <div className="summary-total">
          <span className="k">Итого</span>
          <span className="price">{price} ₽</span>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack} disabled={submitting}>Назад</button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? "Отправляем…" : "Отправить заявку"}
        </button>
      </div>
    </div>
  );
}
