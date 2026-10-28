import { useEffect, useLayoutEffect, useState, useMemo, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Container, Badge } from "./ui";
import { SAMPLE_NOTE, articles, books, categories } from "../data/sample";
import { videos } from "../data/videos";
import { PromoPopup, promoConfig } from "./PromoPopup";
import { useSession } from "../lib/auth";
import { AuthModalProvider } from "../lib/authModal";

const LOGO_SRC = "/logo.png";

function LogoMark() {
  return (
    <span className="flex h-11 shrink-0 items-center">
      <img
        src={LOGO_SRC}
        alt="Be Real Man"
        width={220}
        height={34}
        onError={() => {}}
        className="h-7 w-auto max-w-[200px] object-contain object-left sm:h-8 sm:max-w-[260px]"
      />
    </span>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Be Real Man — হোমপেজ">
      <LogoMark />
    </Link>
  );
}

export function SampleBanner() {
  return (
    <div className="border-b border-line bg-shell px-4 py-1.5 text-center text-xs text-muted">
      {SAMPLE_NOTE}
    </div>
  );
}

const navRows = [
  { to: "/", label: "হোম", end: true },
  { to: "/articles", label: "আর্টিকেল" },
  { to: "/videos", label: "ভিডিও" },
  { to: "/courses", label: "কোর্স" },
  { to: "/categories/fitness", label: "ফিটনেস" },
  { to: "/categories/career", label: "কর্মজীবন" },
  { to: "/categories/relationships", label: "সম্পর্ক" },
  { to: "/categories/islamic-lifestyle", label: "ইসলামিক লাইফস্টাইল" },
  { to: "/categories/marriage", label: "দাম্পত্য" },
  { to: "/categories/iman", label: "ঈমান" },
  { to: "/categories/aqeedah", label: "আকিদা" },
  { to: "/premium", label: "প্রিমিয়াম" },
  { to: "/books", label: "বই" },
  { to: "/writers/apply", label: "লেখক হোন" },
];

function SearchForm({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // Client-side search across all content types
  const filteredResults = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];

    const results: Array<{ type: string; title: string; slug: string }> = [];

    // Search articles
    const articleMatches = articles.filter((a) => {
      return (
        a.title.toLowerCase().includes(query) ||
        a.excerpt.toLowerCase().includes(query) ||
        a.tags.some((t: string) => t.toLowerCase().includes(query))
      );
    });
    for (const a of articleMatches) {
      results.push({ type: "article", title: a.title, slug: a.slug });
    }

    // Search books
    const bookMatches = books.filter((b) => {
      return (
        b.title.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
      );
    });
    for (const b of bookMatches) {
      results.push({ type: "book", title: b.title, slug: b.slug });
    }

    // Search categories
    const categoryMatches = categories.filter((c) => c.name.toLowerCase().includes(query));
    for (const c of categoryMatches) {
      results.push({ type: "category", title: c.name, slug: c.slug });
    }

    // Search videos
    const videoMatches = videos.filter((v) => v.title.toLowerCase().includes(query));
    for (const v of videoMatches) {
      results.push({ type: "video", title: v.title, slug: v.slug });
    }

    return results;
  }, [q]);

  // Show dropdown when user types
  useEffect(() => {
    if (q.trim().length > 0) {
      setShowDropdown(true);
    }
  }, [q]);

  // Hide dropdown when query is cleared
  useEffect(() => {
    if (!q.trim()) {
      setShowDropdown(false);
    }
  }, [q]);

  // Hide dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".search-form-wrapper") === null) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        setShowDropdown(false);
      }}
      className={className}
      role="search"
    >
      <div className="search-form-wrapper relative inset-0">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="আর্টিকেল ও বইয়ের নাম লিখে অনুসন্ধান করুন"
          aria-label="অনুসন্ধান"
          className="h-10 w-full rounded-lg border border-line bg-surface px-4 pr-10 text-sm text-ink placeholder:text-faint focus-visible:outline-none focus-visible:ring-0"
        />
        <button
          type="submit"
          aria-label="খুঁজুন"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 mt-2 search-results-dropdown z-20 max-h-96 overflow-y-auto border border-line bg-surface rounded-lg shadow-md w-full max-w-full"
            role="menu"
            aria-label="সার্চ ফলাফল"
          >
            {filteredResults.length === 0 && (
              <div className="p-4 text-center text-muted">
                কোনো ফলাফল পাওয়া যায়নি
              </div>
            )}
            {filteredResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {filteredResults.map((result) => {
                  let path = "/";
                  if (result.type === "article") path = "/articles/" + result.slug;
                  if (result.type === "book") path = "/books/" + result.slug;
                  if (result.type === "category") path = "/categories/" + result.slug;
                  if (result.type === "video") path = "/videos/" + result.slug;
                  return (
                    <div
                      key={result.title}
                      onClick={() => {
                        navigate(path);
                      }}
                      className="cursor-pointer p-3 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">[{result.type}]</span>
                        <span className="text-sm text-brand">{result.title}</span>
                      </div>
                      <p className="text-xs text-faint mt-0.5 line-clamp-1">
                        {result.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function Header() {
  const session = useSession();
  const navigate = useNavigate();

  const openFavorites = () => {
    if (session) navigate("/profile?section=saved");
    else navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-shell">
      <div className="border-b border-line bg-shell py-1.5 text-center text-xs text-muted">
        <Container className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>প্রতি সপ্তাহে নতুন বাংলা দিকনির্দেশনা যোগ হচ্ছে</span>
          <Link
            to="/articles"
            className="inline-flex items-center rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-white hover:bg-brand-strong"
          >
            পড়া শুরু করুন
          </Link>
        </Container>
      </div>

      <Container className="flex items-center gap-4 py-3">
        <Brand />
        <div className="hidden flex-1 md:block">
          <SearchForm />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={openFavorites}
            title={session ? "আমার পছন্দের তালিকা" : "পছন্দের তালিকা — লগইন করতে হবে"}
            aria-label="পছন্দের তালিকা"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 12.572 12 20l-7.5-7.428A4.5 4.5 0 0 1 12 6.29 4.5 4.5 0 0 1 19.5 12.572Z" />
            </svg>
          </button>
          <Link
            to="/profile"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:text-brand sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
            </svg>
            অ্যাকাউন্ট
          </Link>
        </div>
      </Container>

      <Container className="pb-3 md:hidden">
        <SearchForm />
      </Container>

      <nav className="border-t border-line bg-shell" aria-label="ক্যাটেগরি নেভিগেশন">
        <Container className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {navRows.map((it) => (
            <NavLink
              key={it.label}
              to={it.to}
              end={it.end}
              className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-sm transition-colors"
            >
              {it.label}
            </NavLink>
          ))}
        </Container>
      </nav>
    </header>
  );
}

export function Footer() {
  const links = [
    { to: "/about", label: "আমাদের সম্পর্কে" },
    { to: "/contact", label: "যোগাযোগ" },
    { to: "/privacy", label: "প্রাইভেসি পলিসি" },
    { to: "/terms", label: "ব্যবহারের শর্তাবলী" },
    { to: "/author-rules", label: "লেখকের নিয়মাবলী" },
    { to: "/faq", label: "সাধারণ প্রশ্ন" },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-shell">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Brand />
          <p className="text-sm text-muted">
            Musliman পুরুষদের জন্য ইমান, শৃঙ্খলা, শরীরচর্চা, কর্মজীবন ও দাম্পত্য-জীবনের বাংলা দিকনির্দেশনা।
          </p>
          <Badge>১৮+ শুধু প্রাপ্তবয়স্কদের জন্য</Badge>
        </div>
        <nav className="space-y-2 text-sm" aria-label="ফুটার লিংক">
          <p className="font-semibold">প্ল্যাটফর্ম</p>
          {links.slice(0, 3).map((l) => (
            <Link key={l.to} to={l.to} className="block text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <nav className="space-y-2 text-sm" aria-label="ফুটার লিংক (চালiede)">
          <p className="font-semibold">পলিসি</p>
          {links.slice(3).map((l) => (
            <Link key={l.to} to={l.to} className="block text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">সোশ্যাল</p>
          <p className="text-muted">
            অফিসিয়াল পেজ নথিভুক্ত হওয়ার পর (মালিক সিদ্ধান্ত) এখানে যোগ করা হবে।
          </p>
        </div>
      </Container>
      <div className="border-t border-line py-4 text-center text-xs text-faint">
        © 2026 Be Real Man — সব সংকেত সংরক্ষित।
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const lastPathname = useRef(pathname);

  // useLayoutEffect: reset scroll BEFORE the new page paints,
  // so the destination never visibly opens at the old position.
  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return; // same route (incl. hash) -> don't touch scroll
    lastPathname.current = pathname;
    if (typeof window === "undefined") return;

    // `behavior: "auto"` would inherit html { scroll-behavior: smooth }
    // and animate slowly from the old offset on long mobile pages.
    // "instant" forces an immediate jump; the scrollTop assignments
    // are a fallback for browsers without "instant" support.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const el = document.scrollingElement || document.documentElement;
    el.scrollTop = 0;
    el.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;

    // Some mobile browsers re-apply a stale offset after paint.
    const id = requestAnimationFrame(() => {
      if (lastPathname.current === pathname) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

export function Layout() {
  const location = useLocation();

  const [showPromo, setShowPromo] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem("brm-promo-dismissed") !== "1" && location.pathname === "/";
  });

  useEffect(() => {
    if (location.pathname !== "/") {
      setShowPromo(false);
      return;
    }
    if (sessionStorage.getItem("brm-promo-dismissed") === "1") {
      setShowPromo(false);
      return;
    }
    setShowPromo(true);
  }, [location.pathname]);

  const dismissPromo = () => {
    sessionStorage.setItem("brm-promo-dismissed", "1");
    setShowPromo(false);
  };


  return (
    <AuthModalProvider>
      <ScrollToTop />
      <div className="flex min-h-dvh flex-col bg-shell">
        <SampleBanner />
        <Header />
        <main className="flex-1 bg-white">
          <Container className="py-8 sm:py-10">
            <Outlet />
          </Container>
        </main>
        <Footer />
        {showPromo && <PromoPopup config={promoConfig} onClose={dismissPromo} />}
      </div>
    </AuthModalProvider>
  );
}