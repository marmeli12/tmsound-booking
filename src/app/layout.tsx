import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T&M Sound — студия звукозаписи, Пирогова 17",
  description: "Запись, сведение и мастеринг в Санкт-Петербурге. Пишем вокал, сводим и мастерим — работаем допоздна, по записи.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
