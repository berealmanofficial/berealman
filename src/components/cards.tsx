import { Link } from "react-router-dom";
import type { Article, Book, Category } from "../data/types";
import { Badge } from "./ui";
import { categories } from "../data/sample";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** কমপ্যাক্ট কার্ড — হোমে ফ্রি আর্টিকেল তালিকার জন্য (ছোট থাম্বনেইল + পূর্ণ বাংলা টাইটেল) */
export function CompactArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-brand-line"
    >
      <img
        src={article.cover}
        alt=""
        loading="lazy"
        className="h-16 w-24 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-bnserif line-clamp-2 text-sm font-bold leading-snug group-hover:text-brand">
          {article.title}
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
          <span className="font-medium text-brand">{article.categorySlug}</span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt)}</span>
          <span>·</span>
          <span>{article.readingTimeMin} মিনিট পড়া</span>
          {article.access === "paid" && <Badge tone="warn">প্রিমিয়াম</Badge>}
        </p>
      </div>
    </Link>
  );
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand-line"
    >
      <img
        src={article.cover}
        alt=""
        loading="lazy"
        className="aspect-[16/9] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{article.categorySlug}</Badge>
          {article.access === "paid" && <Badge tone="warn">প্রিমিয়াম</Badge>}
        </div>
        <h3 className="font-bnserif text-base font-bold leading-snug group-hover:text-brand">
          {article.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{article.excerpt}</p>
        <p className="mt-auto pt-2 text-xs text-faint">
          {fmtDate(article.publishedAt)} · {article.readingTimeMin} মিনিট পড়া
        </p>
      </div>
    </Link>
  );
}

export function CategoryCard({ c }: { c: Category }) {
  return (
    <Link
      to={`/categories/${c.slug}`}
      className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-line hover:bg-brand-soft"
    >
      <h3 className="font-bnserif text-base font-bold">{c.name}</h3>
      <p className="mt-1 text-sm text-muted">{c.description}</p>
    </Link>
  );
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      to={`/books/${book.slug}`}
      className="group flex gap-4 overflow-hidden rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-line"
    >
      <img
        src={book.cover}
        alt=""
        loading="lazy"
        className="h-28 w-20 shrink-0 rounded-lg object-cover"
      />
      <div className="flex min-w-0 flex-col">
        <h3 className="font-bnserif text-base font-bold group-hover:text-brand">{book.title}</h3>
        <p className="line-clamp-2 mt-1 text-sm text-muted">{book.description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {book.pdfUnlockable && <Badge>PDF পড়া যাবে</Badge>}
          {book.physicalAvailable && <Badge>কাগজে বই</Badge>}
        </div>
      </div>
    </Link>
  );
}

export function PremiumCard({ article }: { article: Article }) {
  const category = categories.find((c) => c.slug === article.categorySlug);
  return (
    <Link
      to={`/preview/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand-line"
    >
      <div className="relative">
        <img src={article.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
        <span className="absolute left-3 top-3">
          <Badge tone="warn">প্রিমিয়াম</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {category ? <Badge tone="brand">{category.name}</Badge> : <span />}
          <span className="font-bnserif text-lg font-bold text-brand">৳ {article.price}</span>
        </div>
        <h3 className="font-bnserif text-base font-bold leading-snug group-hover:text-brand">
          {article.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{article.excerpt}</p>
        <p className="mt-auto pt-2 text-xs text-faint">
          {article.readingTimeMin} মিনিট পড়া · কিনলে সারাজীবন পড়া →
        </p>
      </div>
    </Link>
  );
}
