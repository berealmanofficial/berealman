import { useSyncExternalStore } from "react";

/**
 * পছন্দের তালিকা (❤️) স্টোর — প্রতি অ্যাকাউন্টের আলাদা তালিকা
 * ------------------------------------------------------------------
 * - অ্যাকাউন্ট ইমেইল অনুযায়ী আলাদা তালিকা — এক অ্যাকাউন্টের পছন্দ অন্য অ্যাকাউন্টে দেখা যায় না।
 * - অ্যাকাউন্ট ছাড়া (ইমেইল null) কোনো লেখা হয় না; অর্থাৎ পছন্দের জন্য লগইন আবশ্যক।
 * - এই ডিভাইসের localStorage-এ থাকে (auth ব্যাকএন্ড না থাকায় সার্ভার-সিঙ্ক নেই)।
 * ------------------------------------------------------------------
 *   brm-favorites-v1 : { "<email>": ["<article-slug>", …] }
 */

const KEY = "brm-favorites-v1";
const EMPTY: string[] = [];

type Bucket = Record<string, string[]>;

function read(): Bucket {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Bucket = {};
    for (const [email, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        out[email] = list.filter((s): s is string => typeof s === "string");
      }
    }
    return out;
  } catch {
    return {};
  }
}

let cache: Bucket = read();
const listeners = new Set<() => void>();

function write(next: Bucket) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* কোটা/প্রাইভেট মোড: মেমোরিতে রাখা হয়, স্থায়িত্বের দাবি করা হয় না */
  }
  listeners.forEach((l) => l());
}

export function subscribeFavorites(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** snapshot: অপরিবর্তিত অবস্থায় অভিন্ন অ্যারে রেফারেন্স ফেরায় */
export function favoritesFor(email: string | null): string[] {
  if (!email) return EMPTY;
  return cache[email.trim().toLowerCase()] ?? EMPTY;
}

export function useFavorites(email: string | null): string[] {
  return useSyncExternalStore(
    subscribeFavorites,
    () => favoritesFor(email),
    () => EMPTY,
  );
}

export function isFavorited(email: string | null, slug: string): boolean {
  return favoritesFor(email).includes(slug);
}

/** টগল করে নতুন অবস্থা ফেরায় (true = এখন পছন্দে আছে) */
export function toggleFavorite(email: string, slug: string): boolean {
  const key = email.trim().toLowerCase();
  const current = cache[key] ?? [];
  const exists = current.includes(slug);
  const nextList = exists ? current.filter((s) => s !== slug) : [slug, ...current];
  write({ ...cache, [key]: nextList });
  return !exists;
}

export function removeFavorite(email: string, slug: string) {
  const key = email.trim().toLowerCase();
  const current = cache[key] ?? [];
  if (!current.includes(slug)) return;
  write({ ...cache, [key]: current.filter((s) => s !== slug) });
}
