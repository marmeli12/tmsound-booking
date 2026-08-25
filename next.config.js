/** @type {import('next').NextConfig} */
const nextConfig = {
  // Booking-приложение живёт на своём Next.js-сервере (Railway) и монтируется
  // на клиентский домен по пути /booking через reverse-proxy/redirect на
  // стороне DNS-хостинга основного сайта. См. README.md → "Домен".
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

module.exports = nextConfig;
