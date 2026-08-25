"use client";

/**
 * Главная страница сайта T&M Sound.
 *
 * Портировано из макета в Claude Design canvas (/tmp/tm-sound-canvas/Main.dc.html)
 * в обычный React/Next.js — сам canvas не может грузить внешний контент
 * (в т.ч. iframe с формой бронирования), поэтому «окно записи» встроено
 * здесь как самый обычный компонент <BookingWizard /> — без iframe, без
 * кросс-доменных заголовков, тот же Next.js-процесс что и /booking.
 *
 * Все стили — в ./site.css, каждый селектор там начинается с .tm-site,
 * чтобы точно не пересечься с классами из globals.css (которые использует
 * страница /booking).
 */

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import "./site.css";
import BookingWizard from "@/components/booking/BookingWizard";
import { assetPath } from "@/lib/apiPath";

const SERVICES_RECORDING = [
  {
    id: "s01",
    idx: "01",
    name: "Запись со звукорежиссёром",
    price: "1 500 ₽ / час",
    desc: "Настройка микрофона и оборудования, помощь во время записи, индивидуальный пресет под артиста и базовая обработка вокала. При заказе от 3 часов — четвёртый час бесплатно.",
  },
  {
    id: "s02",
    idx: "02",
    name: "Аренда студии",
    price: "900 ₽ / час",
    desc: "Самостоятельная работа в студии без звукорежиссёра — если у вас уже есть свой инженер или вы записываетесь сами.",
  },
  {
    id: "s03",
    idx: "03",
    name: "Сведение",
    price: "от 7 000 ₽",
    desc: "От готового MP3/WAV — от 7 000 ₽, с раздельными дорожками — 10 000 ₽. Срок — до 7 дней, правки включены.",
  },
  {
    id: "s04",
    idx: "04",
    name: "Мастеринг",
    price: "3 000 ₽",
    desc: "Финальная обработка трека после сведения — по громкости и балансу готов к релизу на стримингах.",
  },
];

const SERVICES_PRODUCTION = [
  {
    id: "s05",
    idx: "05",
    name: "Биты и продакшн",
    price: "от 8 000 ₽",
    desc: "Готовый бит под заказ — от 8 000 ₽. Работа над битом вместе с артистом прямо в студии — 2 000 ₽/час.",
  },
  {
    id: "s06",
    idx: "06",
    name: "Полный пакет «фулл сонг» — бит, текст, запись, сведение",
    price: "16 500 ₽",
    desc: "Весь путь трека за одну сессию 5–6 часов: бит, текст (если нужен), запись и сведение.",
  },
];

const AB_EXAMPLES = [
  {
    id: "ex1",
    idx: "01",
    label: "Пример 1",
    before: [8, 11, 9, 13, 10, 8, 12, 9, 14, 10, 9, 13, 11, 8, 10, 14, 9, 12, 10, 8, 11, 9, 13, 10, 9, 12, 8, 10],
    after: [10, 18, 13, 28, 16, 10, 24, 14, 34, 19, 12, 30, 20, 10, 15, 32, 17, 26, 14, 9, 22, 12, 29, 17, 11, 25, 10, 13],
  },
  {
    id: "ex2",
    idx: "02",
    label: "Пример 2",
    before: [7, 10, 8, 11, 9, 7, 10, 8, 12, 9, 8, 11, 10, 7, 9, 12, 8, 10, 9, 7, 10, 8, 11, 9, 8, 10, 7, 9],
    after: [9, 21, 11, 31, 14, 8, 27, 12, 33, 17, 10, 29, 18, 9, 13, 30, 15, 24, 12, 8, 20, 11, 27, 15, 10, 23, 9, 12],
  },
  {
    id: "ex3",
    idx: "03",
    label: "Пример 3",
    before: [9, 12, 10, 14, 11, 9, 13, 10, 15, 11, 10, 14, 12, 9, 11, 15, 10, 13, 11, 9, 12, 10, 14, 11, 10, 13, 9, 11],
    after: [11, 15, 20, 26, 12, 18, 10, 32, 15, 22, 9, 28, 19, 12, 16, 34, 13, 25, 11, 17, 10, 30, 14, 20, 9, 26, 12, 15],
  },
];

const AVITO_LINK =
  "https://www.avito.ru/sankt-peterburg/predlozheniya_uslug/studiya_zvukozapisi_zapis_arenda_247_7918233405";
const YANDEX_LINK = "https://yandex.ru/maps/org/t_m_sound/46124220149/";

const QUOTES = [
  { text: "Быстро договорились, сразу понял, что хочется. Час пролетел как пять минут.", attr: "Екатерина", link: AVITO_LINK, source: "Авито" },
  { text: "Аппаратура высший класс. Микрофон — безумно ламповый и живой.", attr: "Илья", link: AVITO_LINK, source: "Авито" },
  { text: "Качественное оборудование, никаких претензий — буду приходить и дальше.", attr: "Богомолов Михаил", link: AVITO_LINK, source: "Авито" },
  { text: "Уют и интерьер полностью совпадают с объявлением.", attr: "alinka", link: AVITO_LINK, source: "Авито" },
  { text: "Записываюсь тут, очень комфортно, по качеству и цене, обстановке и местоположению. Андрей подскажет когда нужно.", attr: "Михаил А.", link: YANDEX_LINK, source: "Яндекс Картах" },
  { text: "Был на этой студии много раз, и каждый раз суперский подход к работе, полная отдача в проект.", attr: "Lori", link: YANDEX_LINK, source: "Яндекс Картах" },
];

const SECTIONS = [
  { id: "s-hero", num: "01", label: "Главная" },
  { id: "s-uslugi", num: "02", label: "Услуги" },
  { id: "s-studio", num: "03", label: "Студия" },
  { id: "s-raboty", num: "04", label: "Работы" },
  { id: "s-booking", num: "05", label: "Запись" },
  { id: "s-faq", num: "06", label: "Вопросы" },
  { id: "s-kontakty", num: "07", label: "Контакты" },
];

const ABON_PLANS = [
  {
    id: "a24",
    name: "24 часа",
    price: "15 000 ₽",
    meta: "без звукорежиссёра · действует 3 месяца",
    desc: "24 часа студийного времени без звукорежиссёра — подходит, если у вас уже есть свой инженер или вы записываетесь сами. Часы можно тратить любыми сессиями удобной длины в течение 3 месяцев с момента покупки.",
    features: ["24 часа аренды студии", "Без звукорежиссёра", "Действует 3 месяца", "Можно делить на несколько сессий"],
    featured: false,
  },
  {
    id: "aArtist",
    name: "Artist",
    price: "12 000 ₽",
    meta: "10 часов со звукорежиссёром · действует 2 месяца",
    desc: "10 часов записи со звукорежиссёром — настройка оборудования, помощь во время сессии и базовая обработка вокала уже входят в стоимость. Действует 2 месяца с момента покупки.",
    features: ["10 часов со звукорежиссёром", "Настройка оборудования и помощь во время записи", "Базовая обработка вокала", "Действует 2 месяца"],
    featured: false,
  },
  {
    id: "aPro",
    name: "Pro",
    price: "19 490 ₽",
    meta: "24 часа со звукорежиссёром · приоритет · действует 3 месяца",
    desc: "Самый популярный абонемент — 24 часа со звукорежиссёром, приоритет при бронировании на удобное время и запас в 3 месяца, чтобы не спешить.",
    features: ["24 часа со звукорежиссёром", "Приоритет при бронировании", "Действует 3 месяца"],
    featured: true,
  },
];

const FAQ_ITEMS = [
  {
    id: "f1",
    q: "Как забронировать студию?",
    a: "Выберите дату и время прямо в блоке «Как записаться» выше — бронь подтвердится сразу. Если удобнее в переписке, напишите нам в Telegram: @tms0und.",
  },
  {
    id: "f2",
    q: "Нужен ли свой звукорежиссёр?",
    a: "Нет — если выбрать тариф со звукорежиссёром, он настроит оборудование и поможет во время записи. Можно приехать и со своим инженером — тогда бронируйте студию без звукорежиссёра.",
  },
  {
    id: "f3",
    q: "Можно ли отменить или перенести бронь?",
    a: "Да, напишите нам в Telegram или позвоните заранее — перенесём на удобное время. Подробности — в разделе «Полные правила аренды».",
  },
  {
    id: "f4",
    q: "Сколько человек может прийти на сессию?",
    a: "Студия рассчитана на 5–7 человек одновременно — можно прийти с продюсером, бэк-вокалистами или всей командой.",
  },
  {
    id: "f5",
    q: "Как оплатить?",
    a: "Наличными или переводом на месте, либо предоплатой при бронировании — способ оплаты обсудим в переписке.",
  },
  {
    id: "f6",
    q: "Работаете ли ночью?",
    a: "Да, работаем 24/7 по записи — выбирайте любое удобное время в форме бронирования, включая ночные часы.",
  },
];

type ServiceRow = { id: string; idx: string; name: string; price: string; desc: string };
type AbState = "before" | "after";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleBookClick(e: ReactMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  scrollToSection("s-booking");
}

function handleSpotlight(e: ReactMouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--sx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--sy", `${e.clientY - rect.top}px`);
}

export default function HomePage() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const [activeId, setActiveId] = useState("s-hero");
  const [abStates, setAbStates] = useState<Record<string, AbState>>({ ex1: "before", ex2: "before", ex3: "before" });
  const [openServices, setOpenServices] = useState<Record<string, boolean>>({});
  const [openFaq, setOpenFaq] = useState<Record<string, boolean>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [openAbonId, setOpenAbonId] = useState<string | null>(null);

  // Смена цитаты каждые 5.4с, с плавным затуханием на 0.5с — как в макете.
  useEffect(() => {
    let swapTimeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setQuoteFading(true);
      swapTimeout = setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteFading(false);
      }, 500);
    }, 5400);
    return () => {
      clearInterval(interval);
      if (swapTimeout) clearTimeout(swapTimeout);
    };
  }, []);

  // Скроллспай (подсветка текущего раздела в боковой рейке) + плавное
  // появление секций при скролле — оба через IntersectionObserver, один раз
  // при монтировании.
  useEffect(() => {
    const activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { threshold: 0.4 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) activeObserver.observe(el);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".tm-site .reveal").forEach((el) => revealObserver.observe(el));

    return () => {
      activeObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  // Модалки «Правила аренды» и карточка абонемента — блокируем скролл
  // фона, пока хоть одна открыта, и закрываем по Esc.
  useEffect(() => {
    const anyOpen = rulesOpen || !!openAbonId;
    if (!anyOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRulesOpen(false);
        setOpenAbonId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [rulesOpen, openAbonId]);

  function toggleService(id: string) {
    setOpenServices((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleFaq(id: string) {
    setOpenFaq((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function renderServiceGroup(list: ServiceRow[]) {
    return list.map((s) => {
      const isOpen = !!openServices[s.id];
      return (
        <div key={s.id} className={`price-item${isOpen ? " is-open" : ""}`}>
          <div className="price-row" onClick={() => toggleService(s.id)}>
            <span className="price-idx">{s.idx}</span>
            <span className="price-name">{s.name}</span>
            <span className="price-val">{s.price}</span>
            <span className="price-chevron">+</span>
          </div>
          <div className="price-desc">
            <div className="price-desc-inner">{s.desc}</div>
          </div>
        </div>
      );
    });
  }

  const q = QUOTES[quoteIndex % QUOTES.length]!;
  const openAbon = ABON_PLANS.find((p) => p.id === openAbonId) ?? null;

  return (
    <div className="tm-site">
      <div className="root">
        <section id="s-hero" className="hero-section reveal" onMouseMove={handleSpotlight}>
          <div className="bg">
            <img src={assetPath("/desk.jpg")} alt="Рабочее место студии" />
          </div>
          <div className="bg-tint" />
          <div className="bg-fade" />
          <div className="grain" />
          <div className="hero-fade-out" />
          <div className="spotlight" />

          <div className="nav stagger" style={{ ["--i" as string]: 0 }}>
            <div className="logo-mark">
              <img src={assetPath("/logo.jpg")} alt="T&amp;M" />
              <span className="logo-word">T&amp;M SOUND</span>
            </div>
            <div className="navlinks">
              <a href="#s-uslugi">Услуги</a>
              <a href="#s-studio">Студия</a>
              <a href="#s-raboty">Работы</a>
              <a href="#s-booking">Как записаться</a>
              <a href="#s-faq">Вопросы</a>
              <a href="#s-kontakty">Контакты</a>
            </div>
            <a className="book-btn" href="#s-booking" onClick={handleBookClick}>
              Записаться
            </a>
          </div>

          <div className="hero">
            <div className="eyebrow stagger" style={{ ["--i" as string]: 1 }}>
              Санкт-Петербург · Пирогова, 17
            </div>
            <h1 className="wordmark stagger" style={{ ["--i" as string]: 2 }}>
              T&amp;M SOUND
            </h1>
            <p className="desc stagger" style={{ ["--i" as string]: 3 }}>
              Пишем вокал, сводим и мастерим — с балконом, на который можно выйти подышать между дублями. Работаем
              допоздна и относимся как к своим, а не к клиентам.
            </p>
            <div className="cta-row stagger" style={{ ["--i" as string]: 4 }}>
              <a className="cta-solid cta-primary" href="#s-booking" onClick={handleBookClick}>
                Записаться на сессию
              </a>
              <a className="cta-ghost" href="#s-kontakty">
                Посмотреть студию →
              </a>
            </div>
          </div>

          <div className="quote" style={{ opacity: quoteFading ? 0 : 1, transform: `translateY(${quoteFading ? 10 : 0}px)` }}>
            <p className="quote-mark">&#8220;</p>
            <p className="quote-text">{q.text}</p>
            <a className="quote-attr" href={q.link} target="_blank" rel="noopener noreferrer">
              {q.attr} · отзыв на {q.source} →
            </a>
            <div className="quote-dots">
              {QUOTES.map((item, i) => (
                <span
                  key={item.attr + i}
                  className="dot"
                  style={{ background: i === quoteIndex % QUOTES.length ? "#d98a3d" : "rgba(236,231,223,0.28)" }}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="s-uslugi" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="uslugi-frame">
            <div className="section-head section-head--center stagger" style={{ ["--i" as string]: 0 }}>
              <h2 className="section-title">Услуги</h2>
            </div>

            <div className="uslugi-body">
              <div className="uslugi-copy">
                <div className="service-group stagger" style={{ ["--i" as string]: 1 }}>
                  <div className="group-label">Запись и сведение</div>
                  <div className="price-list">{renderServiceGroup(SERVICES_RECORDING)}</div>
                </div>

                <div className="service-group stagger" style={{ ["--i" as string]: 2 }}>
                  <div className="group-label">Продакшн</div>
                  <div className="price-list">{renderServiceGroup(SERVICES_PRODUCTION)}</div>
                </div>

                <button
                  type="button"
                  className="section-link stagger"
                  style={{ ["--i" as string]: 3 }}
                  onClick={() => setRulesOpen(true)}
                >
                  Полные правила аренды →
                </button>
              </div>

              <div className="uslugi-photo stagger img-reveal" style={{ ["--i" as string]: 2 }}>
                <img src={assetPath("/ambient.jpg")} alt="Сессия в студии T&amp;M Sound" />
                <div className="uslugi-photo-cap">Одна из сессий в студии — до 5–7 человек одновременно</div>
              </div>
            </div>

            <div className="abon-frame stagger" style={{ ["--i" as string]: 4 }}>
              <div className="group-label group-label--center">Абонементы</div>
              <div className="compare-table">
                {ABON_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`compare-col${plan.featured ? " compare-col--featured" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenAbonId(plan.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenAbonId(plan.id);
                      }
                    }}
                  >
                    {plan.featured && <div className="compare-badge">Популярный</div>}
                    <div className="compare-name">{plan.name}</div>
                    <div className="compare-price">{plan.price}</div>
                    <div className="compare-meta">{plan.meta}</div>
                    <div className="compare-more">Подробнее →</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="s-studio" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="section-head stagger" style={{ ["--i" as string]: 0 }}>
            <h2 className="section-title">Студия</h2>
          </div>
          <div className="studio-grid">
            <div>
              <div className="stat-row stagger" style={{ ["--i" as string]: 1 }}>
                <div className="stat-num">5–7</div>
                <div className="stat-label">человек — можно прийти с продюсером или всей командой</div>
              </div>
              <div className="studio-copy stagger" style={{ ["--i" as string]: 2 }}>
                <p>
                  Большая студия на Пирогова, 17. Есть балкон с видом на питерские крыши — выйти подышать между
                  дублями.
                </p>
              </div>
              <div className="studio-spec stagger" style={{ ["--i" as string]: 3 }}>
                <div className="spec-title">Оборудование</div>
                <div className="spec-row">
                  <span className="spec-label">Микрофоны</span>
                  <span className="spec-value">Союз 023 Bomblet, Sony C-80, AKG P120</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Мониторы</span>
                  <span className="spec-value">ADAM T5V</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Интерфейс</span>
                  <span className="spec-value">Audient iD14 MKII</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">MIDI-клавиатура</span>
                  <span className="spec-value">M-Audio Keystation 49 MK3</span>
                </div>
              </div>
            </div>
            <div className="studio-photos">
              <img className="wide stagger img-reveal" style={{ ["--i" as string]: 1 }} src={assetPath("/room.jpg")} alt="Студия" />
              <img className="stagger img-reveal" style={{ ["--i" as string]: 2 }} src={assetPath("/mic.jpg")} alt="Микрофон" />
              <img className="stagger img-reveal" style={{ ["--i" as string]: 3 }} src={assetPath("/desk.jpg")} alt="Рабочее место" />
            </div>
          </div>
        </section>

        <section id="s-raboty" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="section-head section-head--center stagger" style={{ ["--i" as string]: 0 }}>
            <h2 className="section-title">Работы</h2>
          </div>
          <div className="works-lead stagger" style={{ ["--i" as string]: 1 }}>
            Записывались у нас и сводили с нами
          </div>
          <p className="name-wall stagger" style={{ ["--i" as string]: 2 }}>
            <span className="featured">LUMI</span>
            <span className="dot"> · </span>
            <span className="featured">Alitishka</span>
            <span className="dot"> · </span>
            Og&nbsp;Buda<span className="dot"> · </span>
            Lizer<span className="dot"> · </span>
            163ONMYNECK<span className="dot"> · </span>
            SIDODGI&nbsp;DUBOSHIT<span className="dot"> · </span>
            Blockkid<span className="dot"> · </span>
            Stephan&nbsp;Pie<span className="dot"> · </span>
            Suramura<span className="dot"> · </span>
            Lustova<span className="dot"> · </span>
            Romanova
          </p>
          <div className="works-foot stagger" style={{ ["--i" as string]: 3 }}>
            <span className="legend-dot" /> — записывались в студии · жанры: экспериментальная музыка, хип-хоп,
            поп, рок
          </div>

          <div className="ab-section stagger" style={{ ["--i" as string]: 4 }}>
            <div className="ab-section-lead">
              Послушайте разницу — <span className="accent">до и после сведения</span>
            </div>
            <div className="ab-examples">
              {AB_EXAMPLES.map((ex) => {
                const st = abStates[ex.id] ?? "before";
                const bars = st === "after" ? ex.after : ex.before;
                return (
                  <div key={ex.id} className="ab-example">
                    <div className="ab-example-head">
                      <div className="ab-example-title">
                        <span className="ab-example-idx">{ex.idx}</span>
                        <span className="ab-example-name">{ex.label}</span>
                      </div>
                      <div className="ab-toggle">
                        <button
                          className={st === "before" ? "active" : ""}
                          onClick={() => setAbStates((prev) => ({ ...prev, [ex.id]: "before" }))}
                        >
                          До
                        </button>
                        <button
                          className={st === "after" ? "active" : ""}
                          onClick={() => setAbStates((prev) => ({ ...prev, [ex.id]: "after" }))}
                        >
                          После
                        </button>
                      </div>
                    </div>
                    <div className={`ab-wave${st === "after" ? " state-after" : ""}`}>
                      {bars.map((h, i) => (
                        <span key={i} style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="ab-note">[РЕАЛЬНЫЕ АУДИО-ПРИМЕРЫ — добавим, когда пришлёшь треки]</span>
          </div>
        </section>

        <section id="s-booking" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="booking-frame">
            <div className="section-head section-head--center stagger" style={{ ["--i" as string]: 0 }}>
              <h2 className="section-title">Как записаться</h2>
            </div>

            <p className="booking-lead stagger" style={{ ["--i" as string]: 1 }}>
              Выберите время прямо здесь — ниже, без звонков и переписки. Если удобнее в переписке — пишите в
              Telegram, тоже ответим быстро.
            </p>

            <div className="booking-embed stagger" style={{ ["--i" as string]: 2 }}>
              <div className="wizard">
                <div className="wizard-header">
                  <div className="wizard-logo">T&amp;M Sound</div>
                  <div className="wizard-title">Забронировать студию</div>
                </div>
                <BookingWizard />
              </div>
            </div>

            <a className="cta-ghost stagger" style={{ ["--i" as string]: 3 }} href="https://t.me/tms0und" target="_blank" rel="noopener noreferrer">
              Написать в Telegram →
            </a>
          </div>
        </section>

        <section id="s-faq" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="section-head section-head--center stagger" style={{ ["--i" as string]: 0 }}>
            <h2 className="section-title">Частые вопросы</h2>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((f, i) => {
              const isOpen = !!openFaq[f.id];
              return (
                <div
                  key={f.id}
                  className={`faq-item stagger${isOpen ? " is-open" : ""}`}
                  style={{ ["--i" as string]: Math.min(i + 1, 6) }}
                >
                  <div className="faq-row" onClick={() => toggleFaq(f.id)}>
                    <span className="faq-q">{f.q}</span>
                    <span className="faq-chevron">+</span>
                  </div>
                  <div className="faq-a">
                    <div className="faq-a-inner">{f.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="s-kontakty" className="section reveal" onMouseMove={handleSpotlight}>
          <div className="section-spotlight" />
          <div className="section-head stagger" style={{ ["--i" as string]: 0 }}>
            <h2 className="section-title">Контакты</h2>
          </div>
          <div className="contacts-row">
            <div className="contacts-info stagger" style={{ ["--i" as string]: 1 }}>
              <a
                className="contact-line map-link"
                href="https://yandex.ru/maps/org/t_m_sound/46124220149/?ll=30.301998%2C59.928970&z=17"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <div>
                  <b>Пирогова, 17</b>
                  <br />
                  Санкт-Петербург · на Яндекс Картах
                </div>
              </a>
              <div className="contact-sub">Метро Сенная площадь · Адмиралтейская</div>
              <div className="contact-sub">Работаем 24/7 — по записи</div>

              <div className="contact-actions">
                <div className="contact-line">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <a className="contact-value" href="tel:+79189443697">
                    +7 918 944-36-97
                  </a>
                </div>
                <div className="contact-line">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                  </svg>
                  <a className="contact-value" href="https://t.me/tms0und" target="_blank" rel="noopener noreferrer">
                    Написать в Telegram
                  </a>
                </div>
              </div>

              <div className="social-row">
                <a href="https://t.me/tmsounddd" target="_blank" rel="noopener noreferrer">
                  Telegram-канал
                </a>
                <a href="https://vk.ru/tmsoundd" target="_blank" rel="noopener noreferrer">
                  VK
                </a>
                <a href="https://www.instagram.com/tm__sound/" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </div>
            </div>
            <a className="cta-solid cta-primary stagger" style={{ ["--i" as string]: 2 }} href="#s-booking" onClick={handleBookClick}>
              Записаться на сессию
            </a>
          </div>
          <div className="footer-mini stagger" style={{ ["--i" as string]: 3 }}>
            T&amp;M SOUND · Санкт-Петербург · 2026
          </div>
        </section>
      </div>

      <div className="rail">
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            className="rail-item"
            onClick={() => scrollToSection(s.id)}
            style={{ color: activeId === s.id ? "#d98a3d" : "rgba(236,231,223,0.55)" }}
          >
            <b style={{ color: activeId === s.id ? "#d98a3d" : "rgba(236,231,223,0.35)" }}>{s.num}</b>
            {s.label}
          </div>
        ))}
      </div>

      {rulesOpen && (
        <div className="modal-overlay" onClick={() => setRulesOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setRulesOpen(false)} aria-label="Закрыть">
              ×
            </button>
            <h3 className="modal-title">Правила аренды</h3>
            <div className="modal-body">
              <p>
                Пожалуйста, ознакомьтесь с правилами перед бронированием — это поможет сессии пройти без сюрпризов
                для вас и для студии.
              </p>
              <ol>
                <li>Бронь подтверждается после согласования даты и времени — в форме на сайте или в Telegram.</li>
                <li>
                  Оплата — на месте наличными или переводом, либо предоплатой при бронировании (обсуждается
                  индивидуально).
                </li>
                <li>
                  Отмена или перенос — не позднее чем за 4 часа до начала сессии. При более позднем отказе
                  предоплата не возвращается.
                </li>
                <li>Опоздание больше 15 минут сокращает оплаченное время — бронь не продлевается автоматически.</li>
                <li>В студии одновременно могут находиться до 5–7 человек.</li>
                <li>
                  Бережно относитесь к оборудованию — порча или поломка по вине арендатора компенсируется по
                  стоимости ремонта или замены.
                </li>
                <li>Курение в студии запрещено — можно выйти на балкон.</li>
                <li>После сессии просим оставить помещение в том виде, в котором вы его застали.</li>
                <li>Работаем 24/7 по предварительной записи.</li>
              </ol>
              <p className="modal-note">
                Если у вас есть вопросы по правилам — напишите нам в{" "}
                <a href="https://t.me/tms0und" target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {openAbon && (
        <div className="modal-overlay" onClick={() => setOpenAbonId(null)}>
          <div className="modal-card modal-card--abon" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setOpenAbonId(null)} aria-label="Закрыть">
              ×
            </button>
            {openAbon.featured && <div className="compare-badge abon-modal-badge">Популярный</div>}
            <h3 className="modal-title">{openAbon.name}</h3>
            <div className="abon-modal-price">{openAbon.price}</div>
            <div className="abon-modal-meta">{openAbon.meta}</div>
            <p className="abon-modal-desc">{openAbon.desc}</p>
            <ul className="abon-modal-features">
              {openAbon.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="abon-modal-cta">
              <a
                className="cta-solid cta-primary"
                href="https://t.me/tms0und"
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать нам →
              </a>
              <div className="abon-modal-links">
                <a href="tel:+79189443697">+7 918 944-36-97</a>
                <a href="https://t.me/tms0und" target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
                <a href="https://vk.ru/tmsoundd" target="_blank" rel="noopener noreferrer">
                  VK
                </a>
                <a href="https://www.instagram.com/tm__sound/" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
