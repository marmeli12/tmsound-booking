import type { MetadataRoute } from "next";

// Next.js сам отдаёт это по адресу /robots.txt — отдельный файл в public/
// не нужен. Разрешаем индексацию всего сайта и указываем на карту сайта,
// чтобы поисковики быстрее находили страницы (см. sitemap.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.tmsound.site/sitemap.xml",
  };
}
