import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { books } from "../data/sample";
import { ButtonLink } from "./ui";

/** লাল বাহু (ফ্লেক্সড মাসল-আর্ম) মোটিফ — সাপ্লাই করা আর্টের মতো ব্যানারের সাইডে ডেকোরেটিভ */
function BicepArm({ side = "left" }: { side?: "left" | "right" }) {
  const bg = "#3f0d12";
  return (
    <svg
      viewBox="0 0 150 150"
      className={`h-24 w-24 text-red-700 lg:h-32 lg:w-32 ${side === "left" ? "" : "-scale-x-100"}`}
      aria-hidden="true"
      stroke="currentColor"
      fill="currentColor"
    >
      {/* কাঁধ ব্যানারের ধারে ব্লিড করে থাকা */}
      <line x1="-10" y1="122" x2="80" y2="86" strokeWidth="42" strokeLinecap="round" />
      {/* বাইসেপ বাল্জ */}
      <circle cx="55" cy="72" r="26" />
      {/* ফোরআর্ম — কনুই থেকে মুঠো পর্যন্ত প্রায় খাড়া */}
      <line x1="88" y1="88" x2="96" y2="34" strokeWidth="30" strokeLinecap="round" />
      {/* মুঠো */}
      <circle cx="98" cy="22" r="19" />
      {/* বাইসেপ ও ফোরআর্মের অংশবিভাজ — পটভূমির রঙের খোদাই */}
      <path
        d="M76 54 C 88 58, 92 70, 88 82"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke={bg}
      />
      {/* নিচের দিকে বাইসেপ-কাঁধ সীমা */}
      <path
        d="M38 94 C 48 100, 62 100, 72 94"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        stroke={bg}
      />
    </svg>
  );
}

function SlideAsMen() {
  // হিরো স্লাইড ১ — সাপ্লাই করা আর্টের লেআউট অনুসরণ (গাঢ় মেরুন ব্যাকগ্রাউন্ড, সাদা/লাল লকআপ)
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#3f0d12] text-center">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(190,18,26,0.34), transparent 60%), radial-gradient(90% 90% at 50% 115%, rgba(60,8,11,0.9), transparent)",
        }}
        aria-hidden="true"
      />
      {/* ডেকোরেটিভ লাল বাহু — ডেস্কটপে দুই পাশে */}
      <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-y-1/2 opacity-95 sm:block lg:left-8" aria-hidden="true">
        <BicepArm side="left" />
      </div>
      <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 opacity-95 sm:block lg:right-8" aria-hidden="true">
        <BicepArm side="right" />
      </div>
      <div className="relative px-6 py-6 sm:py-7">
        <p className="font-bnserif text-2xl font-black leading-none tracking-tight text-white sm:text-4xl lg:text-5xl">
          Be Real Man
        </p>
        <p className="font-bnserif relative mt-1.5 inline-block text-2xl font-black leading-none text-white sm:mt-2 sm:text-4xl lg:text-5xl">
          হও আসল পুরুষ
          <svg
            className="absolute -bottom-1.5 left-0 h-2.5 w-full text-red-600 sm:h-3.5"
            viewBox="0 0 200 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 8 C 60 1, 140 1, 198 6"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </p>
        <p className="mx-auto mt-4 max-w-[17rem] text-xs font-semibold leading-relaxed text-stone-200 sm:mt-5 sm:max-w-md sm:text-sm">
          Beautiful girls are everywhere. Successful men are rare. You are the prize.
        </p>
        <Link
          to="/articles"
          className="mt-4 sm:mt-5 inline-flex items-center rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          শিখতে শুরু করুন
        </Link>
      </div>
    </div>
  );
}

function SlideDiscipline() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-brand-soft">
      <div className="max-w-xl px-8 text-center">
        <h2 className="font-bnserif text-xl font-bold leading-snug sm:text-3xl">
          বাস্তবের পুরুষ হতে <span className="text-brand">অভ্যাস</span> দরকার
        </h2>
        <p className="mt-2 text-sm text-muted">
          ইমান, শৃঙ্খলা, শরীরচর্চা, কর্মজীবন ও দাম্পত্য — বাংলা দিকনির্দেশনা।
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/articles">আর্টিকেল পড়ুন</ButtonLink>
          <ButtonLink to="/books" variant="secondary">
            বই দেখুন
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function SlideBook() {
  const book = books[0]!;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#f4f1e8]">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-8 sm:flex-row sm:gap-10">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">বই</p>
          <h2 className="font-bnserif mt-1 text-xl font-bold leading-snug sm:text-2xl">
            “{book.title}”
          </h2>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{book.description}</p>
          <ButtonLink to={`/books/${book.slug}`} className="mt-4">
            বই দেখুন
          </ButtonLink>
        </div>
        <img
          src={book.cover}
          alt=""
          className="hidden h-36 w-28 rotate-3 rounded-lg object-cover shadow-lg sm:block"
          loading="lazy"
        />
      </div>
    </div>
  );
}

const slides = [
  { key: "as-men", node: <SlideAsMen /> },
  { key: "discipline", node: <SlideDiscipline /> },
  { key: "book", node: <SlideBook /> },
];

export function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => clearInterval(t);
  }, [paused, n]);

  const go = (d: number) => setI((v) => (v + d + n) % n);

  return (
    <section
      aria-label="মূল স্লাইডার"
      className="group relative overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* রেফারেন্স ব্যানারের অনুপাত — ডেস্কটপে প্রশস্ত, মোবাইলে পড়ার উপযোগী */}
      <div className="relative min-h-[230px] sm:min-h-[260px] lg:min-h-[300px]">
        {slides.map((s, idx) => (
          <div
            key={s.key}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-500 ${
              idx === i ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {s.node}
          </div>
        ))}
      </div>

      {/* প্রতীক/নেভিগেশন */}
      <button
        onClick={() => go(-1)}
        aria-label="আগের স্লাইড"
        className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-lg text-ink shadow-sm transition-colors hover:bg-surface"
      >
        ‹
      </button>
      <button
        onClick={() => go(1)}
        aria-label="পরের স্লাইড"
        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-lg text-ink shadow-sm transition-colors hover:bg-surface"
      >
        ›
      </button>

      {/* ডট ইন্ডিকেটর — যেকোনো পটভূমিতে পড়ার জন্য হালকা পিলে বাঁশি */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1.5 shadow-sm ring-1 ring-line">
        {slides.map((s, idx) => (
          <button
            key={s.key}
            onClick={() => setI(idx)}
            aria-label={`স্লাইড ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-6 bg-brand" : "w-1.5 bg-ink/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
