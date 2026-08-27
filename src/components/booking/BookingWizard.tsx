"use client";

import { useEffect, useState } from "react";
import { apiPath } from "@/lib/apiPath";
import { addHour } from "@/lib/time";
import { EMPTY_CONTACT, type ContactInfo, type Service, type WizardStep } from "@/types";
import StepService from "./StepService";
import StepDate from "./StepDate";
import StepTime from "./StepTime";
import StepContact from "./StepContact";
import StepSummary from "./StepSummary";
import StepDone from "./StepDone";

const STEP_ORDER: WizardStep[] = ["service", "date", "time", "contact", "summary", "done"];

export default function BookingWizard() {
  const [step, setStep] = useState<WizardStep>("service");

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [service, setService] = useState<Service | null>(null);

  const [dateStr, setDateStr] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [contact, setContact] = useState<ContactInfo>(EMPTY_CONTACT);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiPath("/api/services"))
      .then((r) => r.json())
      .then((data) => setServices(data.services ?? []))
      .finally(() => setServicesLoading(false));
  }, []);

  async function handleConfirm() {
    if (!service || !dateStr || !startTime || !duration) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(apiPath("/api/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          dateStr,
          startTime,
          duration,
          clientName: contact.clientName,
          telegramUsername: contact.telegramUsername || undefined,
          phone: contact.phone || undefined,
          instagram: contact.instagram || undefined,
          comment: contact.comment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Кто-то занял это время буквально только что — возвращаем на выбор времени.
          setSubmitError("Это время только что заняли. Выберите другое.");
          setStep("time");
          setStartTime(null);
          setDuration(null);
          return;
        }
        setSubmitError(data.error ?? "Не получилось отправить заявку");
        return;
      }
      setBotDeepLink(data.botDeepLink ?? null);
      setStep("done");
    } catch {
      setSubmitError("Проблема с сетью — попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  // Закрыть финальный экран "Заявка отправлена" — возвращает форму к началу,
  // чтобы можно было создать новую бронь, не перезагружая страницу.
  function resetWizard() {
    setStep("service");
    setService(null);
    setDateStr(null);
    setStartTime(null);
    setDuration(null);
    setContact(EMPTY_CONTACT);
    setSubmitError(null);
    setBotDeepLink(null);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    const prev = idx > 0 ? STEP_ORDER[idx - 1] : undefined;
    if (prev) setStep(prev);
  }

  // Кнопка "Назад" наверху панели — есть на каждом шаге, кроме первого
  // (возвращаться некуда) и финального экрана после отправки заявки.
  const showBack = step !== "service" && step !== "done" && step !== "summary";

  return (
    <>
      {step !== "done" && (
        <div className="step-dots">
          {STEP_ORDER.slice(0, 5).map((s, i) => (
            <div key={s} className={`step-dot ${i === stepIndex ? "active" : i < stepIndex ? "done" : ""}`} />
          ))}
        </div>
      )}

      {showBack && (
        <button className="wizard-back" onClick={goBack}>
          ← Назад
        </button>
      )}

      {step === "service" && (
        <StepService
          services={services}
          loading={servicesLoading}
          onSelect={(s) => {
            setService(s);
            setStep("date");
          }}
        />
      )}

      {step === "date" && (
        <StepDate
          onSelect={(d) => {
            setDateStr(d);
            setStep("time");
          }}
        />
      )}

      {step === "time" && dateStr && (
        <StepTime
          dateStr={dateStr}
          onSelect={(t, d) => {
            setStartTime(t);
            setDuration(d);
            setStep("contact");
          }}
          onBack={() => setStep("date")}
        />
      )}

      {step === "contact" && (
        <StepContact initial={contact} onSubmit={(c) => { setContact(c); setStep("summary"); }} />
      )}

      {step === "summary" && service && dateStr && startTime && duration && (
        <StepSummary
          service={service}
          dateStr={dateStr}
          startTime={startTime}
          endTime={addHour(startTime, duration)}
          duration={duration}
          submitting={submitting}
          error={submitError}
          onConfirm={handleConfirm}
          onBack={goBack}
        />
      )}

      {step === "done" && dateStr && startTime && duration && (
        <StepDone
          dateStr={dateStr}
          startTime={startTime}
          endTime={addHour(startTime, duration)}
          botDeepLink={botDeepLink}
          onClose={resetWizard}
        />
      )}
    </>
  );
}
