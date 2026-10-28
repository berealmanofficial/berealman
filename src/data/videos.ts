/**
 * ⚠️ নমুনা ডেটা (SAMPLE DATA) — ভিডিও লাইব্রেরি
 * ------------------------------------------------------------------
 * - তিনটি ডেমো ভিডিও; কোনোটাই বাস্তবে প্লেয়েবল নয় (sourceUrl কনফিগার হয়নি)।
 * - ক্যাটেগরি: সাইটের বিদ্যমান ক্যাটেগরি সিস্টেম থেকে ব্যবহার হচ্ছে —
 *   নতুন/ডুপ্লিকেট ক্যাটেগরি (আত্মউন্নয়ন/ব্যক্তিত্ব/আত্মবিশ্বাস) তৈরি করা হয়নি।
 * - এই ফেজে সব ভিডিও ফ্রি; "premium-future" ভিডিওতে শুধু ভিজ্যুয়াল ব্যাজ ও
 *   দামের প্রস্তুতি রাখা হয়েছে — কিছুই রিস্ট্রিক্ট বা চার্জ করা হয় না।
 * ------------------------------------------------------------------
 */

import type { Video } from "./types";
import { sampleCover } from "./sample";

export const videos: Video[] = [
  {
    slug: "atmobishwas-5-upay",
    title: "নিজের আত্মবিশ্বাস বাড়ানোর ৫টি উপায়",
    description:
      "আত্মবিশ্বাস মোটিভেশন ভিডিও দেখে আসে না; আসে প্রতিদিনের ছোট প্রয়োগ থেকে। এই ভিডিওতে বাস্তব ও প্রয়োগযোগ্য ৫টি উপায় ধাপে ধাপে ব্যাখ্যা করা হয়েছে — সাহস ও নিত্য চর্চা নিয়ে বিদ্যমান লেখার ভিডিও সংস্করণ।",
    categorySlug: "iman",
    tags: ["আত্মবিশ্বাস", "মন-প্রাণ", "অভ্যাস"],
    durationMin: 8,
    access: "free",
    thumbnail: sampleCover("atmobishwas-5-upay"),
    sourceType: "youtube",
    sourceUrl: null,
    publishedAt: "2026-10-20",
    featured: true,
  },
  {
    slug: "somoy-kaje-lagano",
    title: "সময়কে কাজে লাগানোর বাস্তব কৌশল",
    description:
      "সময় কম নয়, ব্যবহারের পরিকল্পনা ঘাটতি। দিনচর্যা আচ্ছাদন করে এই ভিডিওতে থাকবে সকাল-রুটিন, ফোন-নিয়ন্ত্রণ ও বাস্তব সময়-হিসাবের কৌশল।",
    categorySlug: "islamic-lifestyle",
    tags: ["সময়", "দিনচর্যা", "শৃঙ্খলা"],
    durationMin: 6,
    access: "free",
    thumbnail: sampleCover("somoy-kaje-lagano"),
    sourceType: "youtube",
    sourceUrl: null,
    publishedAt: "2026-10-14",
  },
  {
    slug: "jiboner-loksho-porikolpona",
    title: "জীবনের লক্ষ্য অর্জনের ধাপে ধাপে পরিকল্পনা",
    description:
      "লক্ষ্য ঠিক করা সহজ, জমা রাখা কঠিন। এই ভিডিওতে আছে ছোট ধাপে ভাগ করার পদ্ধতি, সাপ্তাহিক রিভিউ ও মাস শেষে অগ্রগতি মাপার সাদামাটা পরিকল্পনা।",
    categorySlug: "career",
    tags: ["লক্ষ্য", "পরিকল্পনা", "ধারাবাহিকতা"],
    durationMin: 10,
    access: "premium-future",
    price: 49,
    thumbnail: sampleCover("jiboner-loksho-porikolpona"),
    sourceType: "youtube",
    sourceUrl: null,
    publishedAt: "2026-10-07",
  },
];

/** ভিডিও রাউট হেল্পার */
export function findVideo(slug: string): Video | undefined {
  return videos.find((v) => v.slug === slug);
}
