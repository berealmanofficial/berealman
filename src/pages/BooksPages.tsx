import { Link, useParams } from "react-router-dom";
import { BookCard } from "../components/cards";
import { Badge, Button, ButtonLink, ComingSoon } from "../components/ui";
import { books } from "../data/sample";
import { hasPurchase, lookupContentItem } from "../lib/payments";

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

export function BooksPage() {
  return (
    <div>
      <h1 className="font-bnserif text-2xl font-bold">বই</h1>
      <p className="mt-2 text-sm text-muted">
        দুটো আলাদা সুবিধা: ১) অনলাইনে PDF পড়া (শর্ত পূরণ করলে) ২) কাগজে বই অর্ডার (বাংলাদেশের
        ভেতরে)। PDF আলাদাভাবে বিক্রি হয় না।
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {books.map((b) => (
          <BookCard key={b.slug} book={b} />
        ))}
      </div>
    </div>
  );
}

export function BookDetailPage() {
  const { slug } = useParams();
  const book = books.find((b) => b.slug === slug);
  if (!book) {
    return <p className="text-muted">বই পাওয়া যায়নি।</p>;
  }
  const purchased = hasPurchase("book", book.slug, profileEmail());

  return (
    <article className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-6 sm:flex-row">
        <img src={book.cover} alt="" className="h-64 w-44 shrink-0 rounded-xl object-cover" />
        <div>
          <h1 className="font-bnserif text-2xl font-bold">{book.title}</h1>
          <p className="mt-1 text-sm text-faint">লেখক/প্রকাশক: {book.author}</p>
          <p className="mt-3 text-muted">{book.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {book.pdfUnlockable && <Badge>অনলাইন PDF পড়া যাবে</Badge>}
            {book.physicalAvailable && <Badge>কাগজে বই অর্ডার করা যাবে</Badge>}
          </div>
        </div>
      </div>

      {book.pdfUnlockable && (
        <section className="mt-10 rounded-xl border border-line bg-surface p-6">
          <h2 className="font-bnserif text-lg font-bold">PDF পড়ার শর্ত</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>প্রোফাইল সম্পূর্ণ করা (ছবি সহ সব ঘর পূরণ)</li>
            <li>নিজের রেফারেল লিংক দিয়ে অন্তত ১ জন নতুন পাঠক জোগাড়</li>
            <li>প্লেজ ফর্ম পূরণ ও জমা দেওয়া</li>
          </ol>
          <div className="mt-4">
            <ComingSoon phase="5 (লগইন + প্রোফাইল)" />
          </div>
        </section>
      )}

      {/* কেনা (ম্যানুয়াল পেমেন্ট) — রেডি; অ্যাক্সেস শুধু অ্যাডমিন অনুমোদনে */}
      <section id="purchase" className="mt-6 scroll-mt-24 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-bnserif text-lg font-bold">বইটি কিনুন</h2>
        {purchased ? (
          <div className="mt-3 rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand">
            ✓ অনুমোদিত — বইটি তোমার কেনা কালেকশনে (লাইফটাইম অ্যাক্সেস)।
          </div>
        ) : book.physicalAvailable ? (
          <>
            <p className="mt-2 text-sm text-muted">
              মূল্য: <strong className="font-bnserif text-lg text-brand">৳ {book.physicalPrice}</strong> (বাংলাদেশের
              ভেতরে ডেলিভারি-চার্জ পরে অ্যাডমিন নির্ধারণ করবে) — ম্যানুয়াল পেমেন্ট (বিকাশ/নগদ/রকেট) তথ্য জমা
              দেওয়ার পরে অ্যাডমিন যাচাই করে অনুমোদন করলে কেনা চূড়ান্ত হবে; জমার সাথে সাথে নয়।
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ButtonLink to={`/checkout/book/${book.slug}`} size="lg">
                বইটি কিনুন
              </ButtonLink>
              <span className="text-sm text-muted">
                বিকাশ / নগদ / রকেট পার্সোনাল — সেম স্টেক-স্টেপ ফ্লো
              </span>
            </div>
            {lookupContentItem("book", book.slug) === null && (
              <p className="mt-3 text-xs text-danger">⚠ এই বইয়ের দাম-রেফারেন্স স্টোরে সেট করা নেই — অ্যাডমিন সেট করলে কেনা চালু হবে।</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">এই বইটি এখন কেনা জন্য উপলব্ধ নয়।</p>
        )}
      </section>

      {book.physicalAvailable && (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="font-bnserif text-lg font-bold">কাগজে বই অর্ডার</h2>
          <p className="mt-2 text-sm text-muted">
            দাম: {book.physicalPrice ? `৳ ${book.physicalPrice}` : "—"} + ডেলিভারি চার্জ (ভেতরে/বাইরে
            ঢাকা অনুযায়ী আলাদা; অ্যাডমিন নির্ধারণ করবে)। অর্ডার বাংলাদেশের ভেতরের সীমাবদ্ধ।
          </p>
          <Button className="mt-4" size="md" disabled title="Phase 6-এ অর্ডার ফ্লোটে সক্রিয় হবে">
            📦 অর্ডার করতে ইচ্ছুক
          </Button>
          <div className="mt-4">
            <ComingSoon phase="6 (অর্ডার + COD/Advance)" />
          </div>
        </section>
      )}

      <button
        onClick={() => window.history.back()}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 transition-colors w-full mb-4"
        aria-label="পেছনে ফেরে"
      >
        ← পেছনে ফেরে
      </button>
      <p className="mt-6 text-sm">
        <Link to="/books" className="text-brand hover:underline">
          ← সব বই
        </Link>
      </p>
    </article>
  );
}
