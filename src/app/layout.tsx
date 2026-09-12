import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const SITE_URL = "https://www.tmsound.site";
const SITE_TITLE = "OPEN ROOM — студия звукозаписи, Пирогова 17";
const SITE_DESCRIPTION =
  "Запись, сведение и мастеринг в Санкт-Петербурге. Пишем вокал, сводим и мастерим — работаем допоздна, по записи.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "студия звукозаписи Санкт-Петербург",
    "запись вокала СПб",
    "сведение и мастеринг",
    "аренда студии звукозаписи",
    "звукозаписывающая студия",
    "OPEN ROOM",
  ],
  alternates: {
    canonical: "/",
  },
  // Мета-тег подтверждения прав в Яндекс.Вебмастере — DNS-способ у Яндекса
  // почему-то завис (сама запись при этом давно верна и видна всем DNS-
  // серверам, включая Yandex.DNS), поэтому подтверждаем через код страницы.
  verification: {
    yandex: "0cac5e2f442bae6a",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "OPEN ROOM",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/room.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/room.jpg"],
  },
};

// Структурированные данные (schema.org) — помогают Яндексу и Google
// показать в выдаче название, адрес и телефон студии прямо в сниппете,
// а не только синюю ссылку с описанием.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "OPEN ROOM",
  image: `${SITE_URL}/room.jpg`,
  url: SITE_URL,
  telephone: "+7-918-944-36-97",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Пирогова, 17",
    addressLocality: "Санкт-Петербург",
    addressCountry: "RU",
  },
  sameAs: ["https://t.me/openroomgm", "https://t.me/openroom_studio", "https://www.instagram.com/openroom_studio/"],
};

const YANDEX_METRIKA_ID = 112003655;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}

        {/* Структурированные данные для поисковиков — см. STRUCTURED_DATA выше. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />

        {/* Yandex.Metrika counter — next/script с afterInteractive грузит
            счётчик уже после того, как страница стала интерактивной, чтобы
            не мешать первой отрисовке и не замедлять сайт. */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}', 'ym');
            ym(${YANDEX_METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            <img src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
      </body>
    </html>
  );
}
