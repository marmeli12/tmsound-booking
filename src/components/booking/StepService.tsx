"use client";

import type { Service } from "@/types";

export default function StepService({
  services,
  loading,
  onSelect,
}: {
  services: Service[];
  loading: boolean;
  onSelect: (service: Service) => void;
}) {
  return (
    <div className="step-panel">
      <div className="step-label">Шаг 1 · Услуга</div>
      {loading ? (
        <div className="loading-line">Загружаем услуги…</div>
      ) : services.length === 0 ? (
        <div className="loading-line">Услуги пока не настроены.</div>
      ) : (
        <div className="service-list">
          {services.map((s) => (
            <button key={s.id} className="service-card" onClick={() => onSelect(s)}>
              <div>
                <div className="service-name">{s.name}</div>
                {s.description && <div className="service-desc">{s.description}</div>}
              </div>
              <div className="service-price">{s.pricePerHour} ₽/час</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
