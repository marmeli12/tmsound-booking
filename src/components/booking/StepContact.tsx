"use client";

import { useState } from "react";
import type { ContactInfo } from "@/types";

const USERNAME_RE = /^@?[a-zA-Z0-9_]{5,32}$/;

export default function StepContact({
  initial,
  onSubmit,
}: {
  initial: ContactInfo;
  onSubmit: (contact: ContactInfo) => void;
}) {
  const [form, setForm] = useState<ContactInfo>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInfo, string>>>({});

  function set<K extends keyof ContactInfo>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ContactInfo, string>> = {};
    if (form.clientName.trim().length < 2) next.clientName = "Укажите имя";
    if (!form.telegramUsername.trim()) {
      next.telegramUsername = "Нужен Telegram — так придёт подтверждение записи";
    } else if (!USERNAME_RE.test(form.telegramUsername.trim())) {
      next.telegramUsername = "Похоже на неверный username (без t.me/, просто @username)";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <div className="step-panel">
      <div className="step-label">Шаг 5 · Ваши контакты</div>

      <div className="form-field">
        <label htmlFor="clientName">Имя</label>
        <input
          id="clientName"
          value={form.clientName}
          onChange={(e) => set("clientName", e.target.value)}
          placeholder="Как к вам обращаться"
        />
        {errors.clientName && <div className="form-error">{errors.clientName}</div>}
      </div>

      <div className="form-field">
        <label htmlFor="telegramUsername">Telegram username</label>
        <input
          id="telegramUsername"
          value={form.telegramUsername}
          onChange={(e) => set("telegramUsername", e.target.value)}
          placeholder="@username"
        />
        {errors.telegramUsername ? (
          <div className="form-error">{errors.telegramUsername}</div>
        ) : (
          <div className="form-hint">После отправки заявки откроется бот — нажмите там «Старт», чтобы получать статус записи.</div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="phone">Телефон (необязательно)</label>
        <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+7 900 000-00-00" />
      </div>

      <div className="form-field">
        <label htmlFor="instagram">Instagram (необязательно)</label>
        <input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@username" />
      </div>

      <div className="form-field">
        <label htmlFor="comment">Комментарий (необязательно)</label>
        <textarea
          id="comment"
          rows={3}
          value={form.comment}
          onChange={(e) => set("comment", e.target.value)}
          placeholder="Что-то, что стоит знать заранее"
        />
      </div>

      <div className="btn-row">
        <button
          className="btn btn-primary"
          onClick={() => {
            if (validate()) onSubmit(form);
          }}
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
