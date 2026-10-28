import { useSyncExternalStore } from "react";

/**
 * ডিভাইস-লোকাল অ্যাকাউন্ট ও সেশন স্টোর
 * ------------------------------------------------------------------
 * ⚠️ সততা (গুরুত্বপূর্ণ):
 *  - এটি এই ব্রাউজারের localStorage-ভিত্তিক অ্যাকাউন্ট ব্যবস্থা — ফর্ম সাবমিট আসলেই
 *    অ্যাকাউন্ট তৈরি/লগইন করে, সেশন রিলোড ও লগআউট→লগইনের পরও টেকে। কিন্তু এটি
 *    সার্ভার-সাইড প্রমাণিত authentication নয়; এখানে কোনো ইমেইল ভেরিফিকেশন, রিসেট
 *    বা নিরাপদ সেশন টোকেন নেই। ক্রিপ্টো-নেটিভ হ্যাশ ও ইমেইল-মালিকানা কোনো সার্ভার
 *    যাচাই করে না, কেউ localStorage বদলে দিলে সেটা ঠেকানোর উপায় নেই।
 *  - পাসওয়ার্ড কখনো সাধারণ টেক্সটে রাখা হয় না — প্রতি অ্যাকাউন্টের আলাদা সল্ট দিয়ে
 *    SHA-256 হ্যাশ করে রাখা হয়। এতে হ্যাশ ফাইল পড়া গেলেও মূল পাসওয়ার্ড সরাসরি পড়া যায় না
 *    (তবে এটাকে "প্রোডাকশন-গ্রেড নিরাপত্তা" বলা ভুল হবে)।
 *  - Google সাইন-ইন এখনো কনফিগার করা হয়নি — কেবল UI, কখনো ভুয়া "সফল" অবস্থা দেখানো হয় না।
 *  - প্রোডাকশনে সত্যিকারের auth ব্যাকএন্ড (Supabase/সমতুল্য) যুক্ত হলে এই মডিউলটি তার
 *    জায়গা নেবে; বাকি কম্পোনেন্ট একই API ব্যবহার করবে।
 * ------------------------------------------------------------------
 *
 * স্থানীয় (device-local) data:
 *   brm-accounts-v1 : নিবন্ধিত অ্যাকাউন্ট তালিকা (নাম, ইমেইল, সল্ট, হ্যাশ)
 *   brm-session-v1  : বর্তমান সেশন (ইমেইল, নাম, সময়)
 *   brm-profile-v1  : ব্যক্তিগত তথ্য (বায়ো/অ্যাভাটার) — বিদ্যমান কী, backward-compatible
 */

export type Account = {
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

export type Session = {
  email: string;
  name: string;
  signedInAt: string;
};

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

const ACCOUNTS_KEY = "brm-accounts-v1";
const SESSION_KEY = "brm-session-v1";
const PROFILE_KEY = "brm-profile-v1";

/* ───────────────────────── অ্যাকাউন্ট স্টোর ───────────────────────── */

function readAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Account =>
        !!a &&
        typeof a === "object" &&
        typeof (a as Account).email === "string" &&
        typeof (a as Account).passwordHash === "string",
    );
  } catch {
    return [];
  }
}

function writeAccounts(list: Account[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* প্রাইভেট মোড/কোটা — সেশন চালু রাখা হয়, কিন্তু স্থায়ীভাবে সেভ না হওয়া পর্যন্ত দাবি করা হয় না */
  }
}

export function accountExists(email: string): boolean {
  const key = email.trim().toLowerCase();
  return readAccounts().some((a) => a.email === key);
}

/* ───────────────────────── হ্যাশিং ───────────────────────── */

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** সল্ট-বিহীন ফলব্যাক (crypto.subtle না থাকলে) — deterministic, security-কেন্দ্রিক নয় */
function weakHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = (h1 ^ c) * 16777619;
    h2 = (h2 + c) * 2654435761;
    h1 >>>= 0;
    h2 >>>= 0;
  }
  return (h1.toString(16) + h2.toString(16)).padStart(16, "0");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `brm:${salt}:${password}`;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const digest = await subtle.digest("SHA-256", new TextEncoder().encode(payload));
      return toHex(new Uint8Array(digest));
    } catch {
      /* নিচের ফলব্যাকে যাওয়া হয় */
    }
  }
  return weakHash(payload);
}

function makeSalt(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return toHex(bytes);
  }
  return weakHash(`${Date.now()}:${Math.random()}:${Math.random()}`).repeat(2).slice(0, 32);
}

/* ───────────────────────── সেশন স্টোর (React-রিয়েক্টিভ) ───────────────────────── */

const listeners = new Set<() => void>();

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed || typeof parsed.email !== "string" || !parsed.email) return null;
    return {
      email: parsed.email,
      name: typeof parsed.name === "string" ? parsed.name : "",
      signedInAt: typeof parsed.signedInAt === "string" ? parsed.signedInAt : "",
    };
  } catch {
    return null;
  }
}

/** useSyncExternalStore-এর snapshot — অভিন্ন অবস্থায় অভিন্ন রেফারেন্স ফেরায় */
let sessionCache: Session | null = readSession();

function emit() {
  sessionCache = readSession();
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession(): Session | null {
  return sessionCache;
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}

/* ───────────────────────── ব্যক্তিগত প্রোফাইল সিঙ্ক ───────────────────────── */

/**
 * বিদ্যমান প্রোফাইল ডেটার (bio/avatar) সাথে অ্যাকাউন্ট পরিচয় মিলিয়ে রাখে —
 * চেকআউট ও পেমেন্ট ইতিহাস আগের মতোই brm-profile-v1 থেকে ইমেইল পড়তে পারে।
 */
function syncLocalProfile(session: Session) {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next: Record<string, unknown> = {
      name: "",
      email: "",
      bio: "",
      avatar: "",
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
    next.email = session.email;
    if (!String(next.name ?? "").trim()) next.name = session.name;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    return String(next.name ?? "");
  } catch {
    return session.name;
  }
}

/* ───────────────────────── নিবন্ধন / লগইন / লগআউট ───────────────────────── */

function startSession(email: string, name: string) {
  const session: Session = { email, name, signedInAt: new Date().toISOString() };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    return { ok: false as const, error: "সেশন সেভ করা যায়নি — ব্রাউজার স্টোরেজ বন্ধ থাকতে পারে।" };
  }
  const syncedName = syncLocalProfile(session);
  emit();
  return { ok: true as const, session: { ...session, name: syncedName || session.name } };
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 3) return { ok: false, error: "নাম কমপক্ষে ৩ অক্ষরের হতে হবে।" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { ok: false, error: "সঠিক ইমেইল ঠিকানা লিখো (যেমন: name@example.com)।" };
  if (input.password.length < 8) return { ok: false, error: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" };
  if (accountExists(email))
    return { ok: false, error: "এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে — উপরের লগইন ট্যাব ব্যবহার করো।" };

  const salt = makeSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const accounts = readAccounts();
  accounts.push({ name, email, salt, passwordHash, createdAt: new Date().toISOString() });
  writeAccounts(accounts);
  return startSession(email, name);
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { ok: false, error: "সঠিক ইমেইল ঠিকানা লিখো (যেমন: name@example.com)।" };
  if (!input.password) return { ok: false, error: "পাসওয়ার্ড দাও।" };

  const account = readAccounts().find((a) => a.email === email);
  if (!account)
    return { ok: false, error: "এই ইমেইলে অ্যাকাউন্ট নেই — উপরের ‘নতুন অ্যাকাউন্ট’ ট্যাবে গিয়ে তৈরি করো।" };

  const hash = await hashPassword(input.password, account.salt);
  if (hash !== account.passwordHash)
    return { ok: false, error: "পাসওয়ার্ড মেলেনি — আবার চেষ্টা করো।" };

  return startSession(account.email, account.name);
}

export function logoutAccount() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* উপেক্ষা */
  }
  emit();
}

/** অ্যাকাউন্ট ও সেশনের প্রদর্শিত নাম বদল (প্রোফাইল সম্পাদনা থেকে) */
export function updateAccountName(email: string, name: string) {
  const key = email.trim().toLowerCase();
  const trimmed = name.trim();
  if (!trimmed) return;
  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.email === key);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx]!, name: trimmed };
    writeAccounts(accounts);
  }
  const current = readSession();
  if (current && current.email === key) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, name: trimmed }));
    } catch {
      /* উপেক্ষা */
    }
    emit();
  }
}

/**
 * সেশন-নির্ভর নোট: আসল ব্যাকএন্ড না থাকায় কোনো সার্ভার সেশন নেই।
 * UI-তে এই সীমাবদ্ধতা সবসময় স্পষ্টভাবে লেখা থাকে।
 */
export const AUTH_LIMITATION_BN =
  "এই অ্যাকাউন্ট এই ব্রাউজারে (localStorage) সেভ হয় — সার্ভার-সাইড authentication এখনো যুক্ত হয়নি, তাই অন্য ডিভাইসে সেশন/পছন্দ দেখা যাবে না।";
