"use client";

import { formatDateHuman } from "@/lib/time";

export default function StepDone({
  dateStr,
  startTime,
  endTime,
  botDeepLink,
  onClose,
}: {
  dateStr: string;
  startTime: string;
  endTime: string;
  botDeepLink: string | null;
  onClose: () => void;
}) {
  return (
    <div className="step-panel status-screen">
      <button className="status-close" onClick={onClose} aria-label="Закрыть">
        ✕
      </button>
      <div className="status-icon">⏳</div>
      <div className="status-title">Заявка отправлена</div>
      <div className="status-desc">Мы получили вашу заявку и скоро подтвердим запись.</div>
      <div className="status-details">
        {formatDateHuman(dateStr)}<br />
        {startTime}–{endTime}
      </div>

      {botDeepLink && (
        <div className="btn-row" style={{ marginTop: 28 }}>
          <a className="btn btn-primary" href={botDeepLink} target="_blank" rel="noopener noreferrer">
            Открыть бота, чтобы получить подтверждение
          </a>
        </div>
      )}
      {!botDeepLink && (
        <div className="form-hint" style={{ marginTop: 20 }}>
          Мы свяжемся с вами в Telegram, как только подтвердим запись.
        </div>
      )}
    </div>
  );
}
