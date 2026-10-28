import { useSearchParams, Link } from "react-router-dom";
import { ArticleCard, BookCard } from "../components/cards";
import { EmptyState } from "../components/ui";
import { articles, books } from "../data/sample";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();

  const match = (s: string) => s.toLowerCase().includes(q);
  const foundArticles = q
    ? articles.filter((a) => match(a.title) || match(a.excerpt) || a.tags.some(match))
    : [];
  const foundBooks = q
    ? books.filter((b) => match(b.title) || match(b.description))
    : [];

  return (
    <div>
      <h1 className="font-bnserif text-2xl font-bold">
        {q ? `“${params.get("q")}” — ফলাফল` : "খুঁজুন"}
      </h1>
      {!q && (
        <p className="mt-2 text-sm text-muted">
          উপরের হেডারে সার্চ আইকনে ক্লিক করে বা হোমপেজে লিখে খুঁজো।
        </p>
      )}
      {q && foundArticles.length === 0 && foundBooks.length === 0 && (
        <div className="mt-6">
          <EmptyState title="কিছু পাওয়া যায়নি" hint="বানান বদলে চেষ্টা করো।" />
        </div>
      )}
      {foundArticles.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bnserif mb-3 text-lg font-bold">আর্টিকেল ({foundArticles.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {foundArticles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
      {foundBooks.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bnserif mb-3 text-lg font-bold">বই ({foundBooks.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {foundBooks.map((b) => (
              <BookCard key={b.slug} book={b} />
            ))}
          </div>
        </section>
      )}
      {q && (
        <p className="mt-8 text-xs text-faint">
          প্রোটোটাইপ নোট: এই সার্চ এখন নমুনা ডেটার মধ্যে কাজ করছে; Phase 3-এ ডেটাবেস-ভিত্তিক সার্চ হবে।{" "}
          <Link to="/" className="underline">
            হোম
          </Link>
        </p>
      )}
    </div>
  );
}
