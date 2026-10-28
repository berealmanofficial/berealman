import { useState } from "react"; import { Link } from "react-router-dom";
import { SectionHeading } from "../components/ui";
import { HeroSlider } from "../components/HeroSlider";
import {
  CategoryCard,
  BookCard,
  PremiumCard,
  CompactArticleCard,
} from "../components/cards";
import { articles, books, categories } from "../data/sample";

export function HomePage() {
  const freeArticles = articles.filter((a) => a.access === "free");
  const premium = articles.filter((a) => a.access === "paid");

  // Track expanded/collapsed state for the articles section only
  const [showAllArticles, setShowAllArticles] = useState(false);

  return (
    <div className="space-y-12">
      {/* ১. হিরো স্লাইডার */}
      <HeroSlider />

      {/* ২. ফ্রি আর্টিকেল — কমপ্যাক্ট, শুধু ৪টি (হিরো-এর নিচে) */}
      <section>
        <SectionHeading
          title="নতুন আর্টিকেল"
          action={
            <Link
              to="/articles"
              className="text-sm font-medium text-brand hover:underline"
              onClick={e => { e.stopPropagation(); setShowAllArticles(!showAllArticles); }}
            >
              {showAllArticles ? "কম দেখো" : "সব দেখো →"}
            </Link>
          }
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {showAllArticles
            ? freeArticles.map((a) => (
                <CompactArticleCard key={a.slug} article={a} />
              ))
            : freeArticles.slice(0, 4).map((a) => (
                <CompactArticleCard key={a.slug} article={a} />
              ))}
        </div>
      </section>

      {/* ৩. ক্যাটেগরি */}
      <section>
        <SectionHeading
          title="ক্যাটেগরি সমূহ"
          action={
            <Link
              to="/categories"
              className="text-sm font-medium text-brand hover:underline"
            >
              সব দেখো →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 4).map((c) => (
            <CategoryCard key={c.slug} c={c} />
          ))}
        </div>
      </section>

      {/* ৪. প্রিমিয়াম প্রিভিউ */}
      <section>
        <SectionHeading
          title="প্রিমিয়াম আর্টিকেল"
          action={
            <Link
              to="/premium"
              className="text-sm font-medium text-brand hover:underline"
            >
              সব দেখো →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premium.map((a) => (
            <PremiumCard key={a.slug} article={a} />
          ))}
          {/* Demo premium cards - clearly marked, do not bypass payment */}
          <PremiumCard
            key="demo-prem-1"
            article={{ ...articles[3], title: "দশক সময়নৈতিকবাদ", excerpt: "ডেমো উদাহরণ" }}
          />
          <PremiumCard
            key="demo-prem-2"
            article={{ ...articles[4], title: "ভয়ের আগে পুরুষের প্রস্তুতি", excerpt: "ডেমো উদাহরণ" }}
          />
        </div>
      </section>

      {/* ৫. বই */}
      <section>
        <SectionHeading
          title="বই"
          action={
            <Link
              to="/books"
              className="text-sm font-medium text-brand hover:underline"
            >
              সব দেখো →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((b) => (
            <BookCard key={b.slug} book={b} />
          ))}
          {/* Demo book cards - placeholder covers, clearly marked */}
          <BookCard
            key="demo-book-1"
            book={{ ...books[0], title: "ডেমো বই ১", description: "ডেমো বই" }}
          />
          <BookCard
            key="demo-book-2"
            book={{ ...books[1], title: "ডেমো বই ২", description: "ডেমো বই" }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          অনলাইনে PDF পড়তে চাইলে শর্ত পূরণ করতে হবে; কাগজে বই অর্ডার করতে চাইলে আলাদা ফ্লো আছে।
        </p>
      </section>
    </div>
  );
}