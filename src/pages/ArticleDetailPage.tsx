import { Link, Navigate, useParams } from "react-router-dom";
import { Badge, Card, ComingSoon, EmptyState } from "../components/ui";
import { ArticleCard } from "../components/cards";
import { articles, categories } from "../data/sample";
import type { Article } from "../data/types";
import { useSession } from "../lib/auth";
import { toggleFavorite, useFavorites } from "../lib/favorites";
import { useAuthModal } from "../lib/authModal";
import { publishedWriterArticles, writerArticleAsArticle, type WriterArticle } from "../lib/writers";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * আর্টিকেল রিজলভার: স্ট্যাটিক নমুনা আর্টিকেল, না পেলে অনুমোদিত-প্রকাশিত লেখকের আর্টিকেল।
 * খসড়া/রিভিউ-চলমান/প্রত্যাখ্যাত আর্টিকেল এখান থেকে কখনো রিজলভ হয় না —
 * অর্থাৎ অনুমোদনের আগে কেবল লেখক/অ্যাডমিন দেখে, সর্বজনীন পাতায় যায় না।
 */
function resolveArticle(slug: string | undefined): { article: Article; writer?: WriterArticle } | undefined {
  if (!slug) return undefined;
  const staticArticle = articles.find((a) => a.slug === slug);
  if (staticArticle) return { article: staticArticle };
  const writer = publishedWriterArticles().find((a) => a.slug === slug);
  if (writer) return { article: writerArticleAsArticle(writer), writer };
  return undefined;
}

export function ArticleDetailPage() {
  const { slug } = useParams();
  const session = useSession();
  const { openAuth } = useAuthModal();
  const savedSlugs = useFavorites(session?.email ?? null);
  const resolved = resolveArticle(slug);

  if (!resolved) return <NotFoundArticle />;

  const article = resolved.article;
  const writerImages = resolved.writer?.images ?? [];

  const articleSlug = article.slug;
  const isSaved = savedSlugs.includes(articleSlug);

  /** ❤️ পছন্দ — লগইন আবশ্যক; লগআউট অবস্থায় মোডালে লগইন, সফল হলে ঠিক এই আর্টিকেলটি সেভ হয় */
  const onFavorite = () => {
    if (session) {
      toggleFavorite(session.email, articleSlug);
      return;
    }
    openAuth({ onSuccess: (s) => toggleFavorite(s.email, articleSlug) });
  };

  const category = categories.find((c) => c.slug === article.categorySlug);

  // 🔐 নিয়ম: পেইড আর্টিকেলের বডি কখনো এই পেজে রেন্ডার হবে না —
  // প্রোডাকশনে বডি সার্ভার থেকে অনুমোদিত ইউজারের জন্য নিয়েই আসবে (Phase 4)।
  if (article.access === "paid") return <Navigate to={`/preview/${article.slug}`} replace />;

  const related = articles
    .filter((a) => a.slug !== article.slug && a.categorySlug === article.categorySlug)
    .slice(0, 3);

  return (
    <article className="mx-auto max-w-2xl">
      <img src={article.cover} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {category && <Badge tone="brand">{category.name}</Badge>}
        {article.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <h1 className="mt-4 font-bnserif text-2xl font-bold leading-snug sm:text-3xl">
        {article.title}
      </h1>
      <p className="mt-2 text-sm text-faint">
        {fmtDate(article.publishedAt)} · {article.readingTimeMin} মিনিট পড়া · লেখক: {article.author}
      </p>

      <div className="article-body mt-8">
        {article.body.map((p, i) => (
          <p key={i} className={i === 0 ? "text-lg" : undefined}>
            {p}
          </p>
        ))}
      </div>

      {/* লেখকের জমা দেওয়া ছবি — শুধু প্রকাশিত লেখকের আর্টিকেলে */}
      {writerImages.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {writerImages.map((src, i) => (
            <img key={i} src={src} alt={`ছবি ${i + 1}`} className="w-full rounded-xl border border-line object-cover" loading="lazy" />
          ))}
        </div>
      )}

      {/* ❤️ পছন্দ এখন সত্যিকারভাবে কাজ করে (লগইন আবশ্যক) — 🔖 বুকমার্ক এখনো নেই, সেটি স্পষ্ট বলা থাকে */}
      <div className="mt-8 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onFavorite}
            aria-pressed={isSaved}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              isSaved
                ? "border-brand-line bg-brand-soft font-semibold text-brand"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
            title={
              session
                ? isSaved
                  ? "পছন্দের তালিকা থেকে সরাও"
                  : "পছন্দের তালিকায় যোগ করো"
                : "পছন্দ করতে লগইন করতে হবে"
            }
          >
            {isSaved ? "❤️ পছন্দে আছে" : "❤️ পছন্দ"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-muted"
            title="শীঘ্রণ — বুকমার্ক সিস্টেম এখনো যুক্ত হয়নি"
          >
            🔖 বুকমার্ক
          </button>
        </div>
        <ComingSoon phase="3 (বুকমার্ক)" />
      </div>

      <div className="mt-10 space-y-3">
        <h2 className="font-bnserif text-lg font-bold">মন্তব্য</h2>
        <ComingSoon phase="3" />
        <EmptyState title="এখনো মন্তব্য সিস্টেম সক্রিয় নয়" hint="লগইন সিস্টেম চালু হলে মন্তব্য করা যাবে।" />
      </div>

      <div className="mt-12">
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 transition-colors w-full"
          aria-label="পেছনে ফেরে"
        >
          ← পেছনে ফেরে
        </button>
        {related.length > 0 && (
          <div className="mt-4">
            <h2 className="font-bnserif mb-4 text-lg font-bold">সম্পর্কিত আর্টিকেল</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function NotFoundArticle() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h1 className="font-bnserif text-xl font-bold">আর্টিকেল পাওয়া যায়নি</h1>
      <p className="mt-2 text-sm text-muted">
        হয়তো লিংক ভুল, নয়তো এই আর্টিকেলও এখনো প্রকাশ হয়নি।
      </p>
      <Link to="/articles" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
        ← সব আর্টিকেলে ফেরা
      </Link>
    </Card>
  );
}
