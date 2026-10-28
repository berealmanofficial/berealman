import { useState } from "react";
import { ArticleCard } from "../components/cards";
import { Button, EmptyState } from "../components/ui";
import { articles, categories } from "../data/sample";

const PAGE = 6;

export function ArticlesPage() {
  const [cat, setCat] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const list = cat ? articles.filter((a) => a.categorySlug === cat) : articles;
  const visible = list.slice(0, shown);

  return (
    <div>
      <h1 className="font-bnserif text-2xl font-bold">সব আর্টিকেল</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCat(null);
            setShown(PAGE);
          }}
          className={`rounded-full border px-3 py-1 text-sm ${
            cat === null
              ? "border-brand-line bg-brand-soft text-brand"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          সব
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => {
              setCat(c.slug);
              setShown(PAGE);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              cat === c.slug
                ? "border-brand-line bg-brand-soft text-brand"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <EmptyState title="এই ক্যাটেগরিতে আর্টিকেল নেই" hint="অন্য ক্যাটেগরি দেখো।" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
            {shown < list.length && (
              <div className="mt-6 text-center">
                <Button variant="secondary" onClick={() => setShown((s) => s + PAGE)}>
                  আরও দেখো
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
