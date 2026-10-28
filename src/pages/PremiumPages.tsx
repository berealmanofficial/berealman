import { Link, Navigate, useParams } from "react-router-dom";
import { PremiumCard } from "../components/cards";
import { Badge, ButtonLink } from "../components/ui";
import { articles, categories } from "../data/sample";
import { hasPurchase } from "../lib/payments";

/** বর্তমান প্রোফাইল ইমেইল (auth ব্যাকএন্ড Phase 2) */
function profileEmail(): string | null {
  try {
    const raw = localStorage.getItem("brm-profile-v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as { email?: unknown };
    return typeof p.email === "string" && p.email ? p.email : null;
  } catch {
    return null;
  }
}

export function PremiumPage() {
  const premium = articles.filter((a) => a.access === "paid");
  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="font-bnserif text-2xl font-bold">প্রিমিয়াম আর্টিকেল</h1>
        <p className="mt-2 text-sm text-muted">
          গভীর, বিস্তারিত বাংলা লেখা — আগে ফ্রি প্রিভিউ পড়ো, পছন্দ হলে কিনে নাও;
          একবার কিনলে সারাজীবন পড়ার অ্যাক্সেস।
        </p>
        <p className="mt-1 text-xs text-faint">
          দামগুলো এখন নমুনা (ডেমো) মান — চূড়ান্ত ব্যবসায়িক মূল্য নয়; পেমেন্ট সিস্টেম (Phase 4) এখনো সক্রিয় নয়।
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premium.map((a) => (
          <PremiumCard key={a.slug} article={a} />
        ))}
      </div>
    </div>
  );
}

export function PreviewPage() {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug && a.access === "paid");
  if (!article) return <Navigate to="/premium" replace />;

  const category = categories.find((c) => c.slug === article.categorySlug);
  const purchased = hasPurchase("article", article.slug, profileEmail());

  return (
    <article className="mx-auto max-w-2xl">
      <nav aria-label="ব্রেডক্রাম্ব" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-brand">হোম</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/premium" className="hover:text-brand">প্রিমিয়াম আর্টিকেল</Link>
          </li>
        </ol>
      </nav>

      <img src={article.cover} alt="" className="mt-4 aspect-[16/9] w-full rounded-xl object-cover" />
      <div className="mt-6 flex items-center gap-2">
        <Badge tone="warn">প্রিমিয়াম</Badge>
        {category && <Badge tone="brand">{category.name}</Badge>}
      </div>
      <h1 className="mt-4 font-bnserif text-2xl font-bold leading-snug sm:text-3xl">
        {article.title}
      </h1>
      <p className="mt-2 text-sm text-faint">
        {article.readingTimeMin} মিনিট পড়া · লেখক: {article.author} · দাম: ৳ {article.price} (নমুনা দাম)
      </p>
      <p className="mt-3 text-muted">{article.excerpt}</p>

      {/* ফ্রি প্রিভিউ: লেখার শুরুর অংশ সবাই পড়তে পারবে */}
      <section className="mt-6">
        <h2 className="font-bnserif text-lg font-bold">ফ্রি প্রিভিউ</h2>
        <div className="article-body mt-3">
          {article.body.slice(0, 2).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* লকড প্রিমিয়াম অংশ — অনুমোদিত কেনার পর পুরো লেখা খোলা */}
      {purchased ? (
        <section className="mt-6 rounded-xl border border-brand-line bg-brand-soft p-6">
          <div className="flex items-center gap-2">
            <Badge tone="brand">✓ অনুমোদিত — তোমার কেনা আর্টিকেল</Badge>
          </div>
          <div className="article-body mt-3">
            {article.body.slice(2).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2">
            <Badge tone="warn">প্রিমিয়াম অংশ (লকড)</Badge>
          </div>
          <p className="mt-3 text-sm text-muted">
            শেষ {article.body.length - 2}টি অংশ প্রিমিয়াম — কেনার পর এখানে সম্পূর্ণ লেখাটি দেখা যাবে।
          </p>
          <div className="pointer-events-none relative mt-3 max-h-24 overflow-hidden select-none" aria-hidden>
            <div className="article-body space-y-5 opacity-30 blur-[2px]">
              {article.body.slice(2).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="font-bnserif text-2xl font-bold text-brand">৳ {article.price}</div>
            <ButtonLink to={`/checkout/article/${article.slug}`} size="lg">
              প্রিমিয়াম আর্টিকেল কিনুন
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-muted">
            ম্যানুয়াল পেমেন্ট (বিকাশ/নগদ/রকেট) তথ্য জমা দিয়ে কেনা যাবে; অ্যাডমিন যাচাই-পরবর্তী অনুমোদনে
            অ্যাক্সেস খুলবে — জমার সাথে সাথে নয়।
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bnserif text-lg font-bold">কেনার প্রক্রিয়া (শীঘিনী)</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>বাছাই করেন বি­কাশ / ন‌গদ / রকেট (নম্বর ও নির্দেশনা অ্যাডমিন দেবেন)</li>
          <li>টাকা পাঠান</li>
          <li>TrxID ও পেমেন্ট নম্বরের শেষ ৪ সংখ্যা জমা দেন</li>
          <li>অ্যাডমিন পেমেন্ট ভেরিফাই করে অ্যাপ্রুভ করলে আর্টিকেল আপনার হয়ে যাবে</li>
        </ol>
      </section>

      <p className="mt-6 text-sm">
        <Link to="/premium" className="text-brand hover:underline">
          ← সব প্রিমিয়াম আর্টিকেল
        </Link>
      </p>
    </article>
  );
}
