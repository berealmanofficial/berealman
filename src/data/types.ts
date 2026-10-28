export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readingTimeMin: number;
  /** "free" | "paid" — paid articles have a separate preview page + price */
  access: "free" | "paid";
  price?: number;
  cover: string;
  body: string[];
};

export type Book = {
  slug: string;
  title: string;
  description: string;
  author: string;
  cover: string;
  /** প্রিমিয়াম; unlock শর্ত: প্রোফাইল সম্পূর্ণ + ১ রেফারেল + প্লেজ */
  pdfUnlockable: boolean;
  physicalAvailable: boolean;
  physicalPrice?: number;
};

export type FeaturedBook = Book;

/** ভিডিও লাইব্রেরি — নমুনা ডেটা টাইপ (Phase 2-এ ব্যাকএন্ড) */
export type VideoAccess = "free" | "premium-future";

export type Video = {
  slug: string;
  title: string;
  description: string;
  /** ⚠️ শুধু বিদ্যমান ক্যাটেগরি সিস্টেমের slug ব্যবহার হয় — নতুন/ডুপ্লিকেট ক্যাটেগরি তৈরি করা হয়নি */
  categorySlug: string;
  tags: string[];
  durationMin: number;
  /** এই ফেজে সব ডেমো ভিডিও ফ্রি; "premium-future" = ভবিষ্যতে প্রিমিয়াম হবে (শুধু ভিজ্যুয়াল প্রস্তুতি) */
  access: VideoAccess;
  price?: number;
  thumbnail: string;
  /** "youtube" | "file" — সোর্স পরে কনফিগার হবে; sourceUrl না থাকলে ডেমো প্লেয়ার দেখাবে */
  sourceType: "youtube" | "file";
  sourceUrl: string | null;
  publishedAt: string;
  featured?: boolean;
};
