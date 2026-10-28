import { useParams } from "react-router-dom";
import { CategoryCard, ArticleCard } from "../components/cards";
import { EmptyState } from "../components/ui";
import { articles, categories } from "../data/sample";

export function CategoriesPage() {
  return (
    <div>
      <h1 className="font-bnserif text-2xl font-bold">ক্যাটেগরি</h1>
      <p className="mt-2 text-sm text-muted">
        অ্যাডমিন প্যানেল থেকে নতুন ক্যাটেগরি যোগ/সম্পাদনা করা যাবে (Phase 7)।
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <CategoryCard key={c.slug} c={c} />
        ))}
      </div>
    </div>
  );
}

export function CategoryPage() {
  const { slug } = useParams();
  const category = categories.find((c) => c.slug === slug);
  const list = articles.filter((a) => a.categorySlug === slug);

  if (!category) {
    return (
      <EmptyState
        title="ক্যাটেগরি পাওয়া যায়নি"
        hint="লিংক ভুল হতে পারে।"
      />
    );
  }

  return (
    <div>
      <h1 className="font-bnserif text-2xl font-bold">{category.name}</h1>
      <p className="mt-2 text-sm text-muted">{category.description}</p>
      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState title="এখনো আর্টিকেল নেই" hint="শীঘিনী নতুন লেখা যোগ হবে।" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
