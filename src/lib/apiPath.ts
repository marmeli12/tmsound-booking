// NEXT_PUBLIC_BASE_PATH зеркалит basePath из next.config.js (см. комментарий
// там) — если приложение смонтировано под поддиректорией (например, когда
// прокси отдаёт его на tmsound.ru/booking), API-роуты Next.js тоже уезжают
// под этот префикс, и голый fetch("/api/...") промахнётся мимо. На проде с
// поддоменом (booking.tmsound.ru) переменная просто пустая и это no-op.
export function apiPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}${path}`;
}

// Тот же приём для статики из public/ (картинки и т.д.) — на десктопе <img
// src="/desk.jpg"> ничего не знает про basePath, Next.js её сам не префиксует
// (в отличие от next/image), так что префикс нужно добавлять руками.
export function assetPath(path: string): string {
  return apiPath(path);
}
