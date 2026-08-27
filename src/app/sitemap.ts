import type { MetadataRoute } from "next";

// Next.js сам отдаёт это по адресу /sitemap.xml. Список страниц пока
// небольшой и статичный — если на сайте появятся новые публичные разделы
// (например, отдельные страницы услуг), их стоит добавить сюда же.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.tmsound.site";
  const now = new Date();
  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/booking`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
