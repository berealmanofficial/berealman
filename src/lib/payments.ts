/**
 * ⚠️ পেমেন্ট সিস্টেম — সততার ঘোষণা (গুরুত্বপূর্ণ)
 * ------------------------------------------------------------------
 * এই প্রজেক্টে এখনো কোনো ব্যাকএন্ড/ডেটাবেস/auth-ব্যাকএন্ড/ইমেইল সার্ভিস নেই।
 * তাই পেমেন্ট রিকোয়েস্ট এই ডিভাইসের localStorage-এ সেভ হয় — রিলোডে টিকে
 * থাকে, কিন্তু এটি **প্রোডাকশন-গ্রেড সিকিউর পেমেন্ট সিস্টেম নয়**।
 *
 * যা কঠোরভাবে মানা হচ্ছে (এমনকি এই সীমিত আর্কিটেকচারেও):
 *  - ফর্ম জমা = পেমেন্টের প্রমাণ নয়; ট্রানজেকশন ID একা যথেষ্ট নয়।
 *  - কোনো অটো-অ্যাপ্রুভাল নেই; অনুমোদন শুধু অ্যাডমিন অ্যাকশনে।
 *  - অনুমোদনের আগে কনটেন্ট আনলক হয় না (pending/rejected = অ্যাক্সেস নেই)।
 *  - ভুয়া "সফল পেমেন্ট" মেসেজ কখনো দেখানো হয় না।
 *  - দাম ব্রাউজার-সরবরাহিত মানে বিশ্বাস করা হয় না — আইটেম লুকআপ থেকে
 *    বর্তমান দাম যাচাই করা হয় (প্রোডাকশনে এটি সার্ভারে হবে)।
 * প্রোডাকশনের জন্য প্রয়োজন: সার্ভার-সাইড জমা/যাচাই, ডেটাবেস, নিরাপদ auth,
 * নিরাপদ স্ক্রিনশট স্টোরেজ, ইমেইল ইনফ্রা — নিচে ফাংশনগুলোর জায়গা রাখা আছে।
 * ------------------------------------------------------------------
 */

import { articles, books, categories } from "../data/sample";
import { loadCourses } from "./coursesStore";

/* ───────────────── পেমেন্ট প্রোভাইডার কনফিগারেশন ───────────────── */

export type PaymentProviderId = "bkash" | "nagad" | "rocket";

/** মালিক-সরবরাহিত প্রাপক নম্বর (সব প্রোভাইডারে একই) */
export const OWNER_RECIPIENT_NUMBER = "01304463530";

export type ProviderConfig = {
  id: PaymentProviderId;
  nameBn: string;
  nameEn: string;
  accountType: "Personal";
  recipientNumber: string;
  /** কার্ড টেক্সট-রঙের অ্যাকসেন্ট (অফিসিয়াল লোগো অ্যাসেট পেলে সেটাই বসবে) */
  accent: string;
  /** রিসিভিং মেথড + নম্বর যাচাই করা হয়েছে কি না (অ্যাডমিন কনফার্মেশনে) — ডিফল্ট false: "কনফিগারেশন প্রয়োজন" */
  verified: boolean;
  /** অ্যাডমিন নিশ্চিত করা সমর্থিত লেনদেন মেথড, যেমন "Send Money" — নিজে থেকে আবিষ্কার নয় */
  method: string | null;
  /** অ্যাডমিন-কনফিগার করা বাংলা পেমেন্ট নির্দেশনা */
  instructions: string | null;
};

/**
 * প্রাথমিক কনফিগ: মালিকের দেওয়া নম্বর (০১৩০৪৪৬৩৫৩০) ও Account type "Personal"
 * সব কার্ডে কনফিগার করা; কিন্তু রিসিভিং মেথড/অ্যাকাউন্ট যাচাই **হয়নি** —
 * তাই যাচাই-পূর্ব অবস্থায় কোনো প্রোভাইডারের জন্য "রিয়েল পেমেন্ট চালু"
 * কনফি দাবি করা হয় না। অ্যাডমিন যাচাই করে verified=true ও মেথট সেট করবে।
 */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "bkash",
    nameBn: "বিকাশ পার্সোনাল",
    nameEn: "bKash Personal",
    accountType: "Personal",
    recipientNumber: OWNER_RECIPIENT_NUMBER,
    accent: "#E2136E",
    verified: false,
    method: null,
    instructions: null,
  },
  {
    id: "nagad",
    nameBn: "নগদ পার্সোনাল",
    nameEn: "Nagad Personal",
    accountType: "Personal",
    recipientNumber: OWNER_RECIPIENT_NUMBER,
    accent: "#F1420D",
    verified: false,
    method: null,
    instructions: null,
  },
  {
    id: "rocket",
    nameBn: "রকেট পার্সোনাল",
    nameEn: "Rocket Personal",
    accountType: "Personal",
    recipientNumber: OWNER_RECIPIENT_NUMBER,
    accent: "#8C12A9",
    verified: false,
    method: null,
    instructions: null,
  },
];

const PROVIDERS_KEY = "brm-payment-providers-v1";

export function loadProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProviderConfig[];
      if (Array.isArray(parsed)) {
        return DEFAULT_PROVIDERS.map((d) => {
          const override = parsed.find((p) => p.id === d.id);
          const incoming = override ?? d;
          return {
            ...d,
            ...incoming,
            accountType: "Personal" as const,
            recipientNumber: incoming.recipientNumber?.trim() || OWNER_RECIPIENT_NUMBER,
          };
        });
      }
    }
  } catch {
    /* দুর্বল ডেটা — ডিফল্ট ফিরিয়ে দাও */
  }
  return DEFAULT_PROVIDERS;
}

export function saveProviders(list: ProviderConfig[]): void {
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
}

/* ───────────────── কনটেন্ট আইটেম লুকআপ (বর্তমান দাম) ───────────────── */

export type ContentType = "article" | "book" | "course";

export type ContentItem = {
  slug: string;
  title: string;
  price: number;
  cover: string | null;
};

/** ব্রাউজারের বলা দামে বিশ্বাস নয় — ডেটা স্টোর থেকে বর্তমান দাম ও শিরোনাম নেওয়া হয় */
export function lookupContentItem(type: ContentType, slug: string): ContentItem | null {
  if (type === "article") {
    const a = articles.find((x) => x.access === "paid" && x.slug === slug);
    if (!a) return null;
    return { slug: a.slug, title: a.title, price: a.price ?? 0, cover: a.cover };
  }
  if (type === "book") {
    const b = books.find((x) => x.slug === slug);
    if (!b) return null;
    return {
      slug: b.slug,
      title: b.title,
      price: b.physicalPrice ?? 0,
      cover: b.cover,
    };
  }
  if (type === "course") {
    const c = loadCourses().find((x) => x.slug === slug && x.published);
    if (!c) return null;
    return { slug: c.slug, title: c.title, price: c.price, cover: c.cover };
  }
  return null;
}

const TYPE_LABEL_BN: Record<ContentType, string> = {
  article: "প্রিমিয়াম আর্টিকেল",
  book: "বই",
  course: "কোর্স",
};

export function contentTypeLabelBn(t: ContentType): string {
  return TYPE_LABEL_BN[t];
}

/* ───────────────── পেমেন্ট রিকোয়েস্ট স্টোর ───────────────── */

export type PaymentStatus = "pending" | "approved" | "rejected";

export type AuditEntry = {
  at: string;
  action: string;
  note?: string;
};

export type PaymentRequest = {
  id: string;
  contentType: ContentType;
  itemSlug: string;
  itemTitle: string;
  amount: number;
  providerId: PaymentProviderId;
  fullName: string;
  customerMobile: string;
  senderMobile: string;
  txnId: string;
  screenshot: string | null;
  accountEmail: string | null;
  status: PaymentStatus;
  rejectReason: string | null;
  duplicateOf: string | null;
  createdAt: string;
  audit: AuditEntry[];
};

const REQUESTS_KEY = "brm-payment-requests-v1";

export function loadPaymentRequests(): PaymentRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PaymentRequest[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* দুর্বল ডেটা */
  }
  return [];
}

function saveRequests(list: PaymentRequest[]): void {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
}

/* ───────────────── কেনা-রেকর্ড (অ্যাক্সেস এন্টাইটেলমেন্ট) ───────────────── */

export type Purchase = {
  contentType: ContentType;
  slug: string;
  email: string | null;
  grantedAt: string;
  requestId: string;
};

const PURCHASES_KEY = "brm-purchases-v1";

export function loadPurchases(): Purchase[] {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Purchase[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* দুর্বল ডেটা */
  }
  return [];
}

export function hasPurchase(contentType: ContentType, slug: string, email: string | null): boolean {
  return loadPurchases().some(
    (p) =>
      p.contentType === contentType &&
      p.slug === slug &&
      (p.email === null || (email !== null && p.email === email)),
  );
}

export function purchasesForEmail(email: string | null): Purchase[] {
  return loadPurchases().filter((p) => p.email === (email ?? null));
}

/** ইউনিক কেনা-রেকর্ড — একই অনুমোদন বারবার করলেও ডুপ্লিকেট তৈরি হয় না */
function addPurchase(
  contentType: ContentType,
  slug: string,
  email: string | null,
  requestId: string,
): void {
  const list = loadPurchases();
  if (
    list.some(
      (p) => p.contentType === contentType && p.slug === slug && p.requestId === requestId,
    )
  )
    return;
  list.push({ contentType, slug, email, grantedAt: new Date().toISOString(), requestId });
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
}

/* ───────────────── ভ্যালিডেশন (বাংলা মেসেজসহ) ───────────────── */

export type PaymentFormDraft = {
  providerId: PaymentProviderId;
  fullName: string;
  customerMobile: string;
  senderMobile: string;
  txnId: string;
  amount: string;
  screenshot: string | null;
};

/** বাংলাদেশি মোবাইল নম্বর: 01[3-9]xxxxxxxx (১১ ডিজিট) */
export function isValidBdMobile(v: string): boolean {
  return /^01[3-9]\d{8}$/.test(v.trim().replace(/[\s-]/g, ""));
}

/** ট্রানজেকশন/রেফারেন্স কোড: ৪–৩০ অক্ষর (শুধু A-Z, a-z, 0-9, -, _) */
export function isValidTxnId(v: string): boolean {
  const t = v.trim();
  return t.length >= 4 && t.length <= 30 && /^[A-Za-z0-9_-]+$/.test(t);
}

/** সেন্ডার নম্বরের শেষ অংশ: কমপক্ষে ৪ ডিজিট (সম্পূর্ণ নম্বর না দিলেও গ্রহণযোগ্য) */
export function isValidSenderTail(v: string): boolean {
  return /^\d{4,}$/.test(v.trim().replace(/[\s-]/g, ""));
}

export function validatePaymentDraft(
  type: ContentType,
  slug: string,
  draft: PaymentFormDraft,
  providers: ProviderConfig[],
): string[] {
  const errs: string[] = [];

  if (draft.fullName.trim().length < 3) errs.push("পুরো নাম অবশ্যই কমপক্ষে ৩ অক্ষরের হতে হবে।");

  if (!isValidBdMobile(draft.customerMobile))
    errs.push("নিজের মোবাইল নম্বর সঠিক ফরম্যাটে লিখো — ১১ ডিজিট, যেমন: 01XXXXXXXXX।");

  // সেন্ডার: সম্পূর্ণ ১১ ডিজিটের নম্বর অথবা নম্বরের শেষ কমপক্ষে ৪ ডিজিট — দুটোই গ্রহণযোগ্য
  if (!isValidBdMobile(draft.senderMobile) && !isValidSenderTail(draft.senderMobile))
    errs.push("সেন্ডার নম্বর ১১ ডিজিটে (01XXXXXXXXX) অথবা নম্বরের শেষ কমপক্ষে ৪ ডিজিট লিখো।");

  if (!isValidTxnId(draft.txnId))
    errs.push("ট্রানজেকশন আইডি/রেফারেন্স কোড ৪–৩০ অক্ষরের হবে (শুধু অক্ষর, সংখ্যা, - ও _)।");

  const provider = providers.find((p) => p.id === draft.providerId);
  if (!provider) errs.push("একটি সমর্থিত পেমেন্ট প্রোভাইডার নির্বাচন করো।");
  // নোট: `provider.verified` এখানে জমা আটকায় না — ওই ফ্ল্যাগ বলে "প্রোভাইডারের রিসিভিং মেথড
  // অ্যাডমিন-যাচাই হয়েছে কি না", যা ক্রেতার জমার বৈধতা নয়। যাচাই-পূর্ব অবস্থা checkout-এ
  // স্পষ্ট সতর্কবার্তা হিসেবে দেখানো হয়, আর কনটেন্ট অ্যাক্সেস সর্বদা অ্যাডমিন অনুমোদনের পরে।

  const item = lookupContentItem(type, slug);
  if (!item) {
    errs.push("নির্বাচিত কনটেন্ট পাওয়া যায়নি — আবার নির্বাচন করো।");
  } else {
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      errs.push("পাঠানো অ্যামাউন্ট সঠিক সংখ্যায় পূরণ করো।");
    else if (amount !== item.price)
      errs.push(`অ্যামাউন্ট হুবহু কনটেন্টের বর্তমান দাম (৳ ${item.price}) হতে হবে।`);
  }

  // স্ক্রিনশট: টাইপ/সাইজ আপলোডের সময়ে যাচাই হয়; এখানে শুধু অতিরিক্ত বড় ব্লক
  if (draft.screenshot && draft.screenshot.length > 2_000_000)
    errs.push("স্ক্রিনশট ফাইল খুব বড় (সর্বোচ্চ ২ MB)।");

  return errs;
}

/* ───────────────── রিকোয়েস্ট তৈরি (অ্যাক্সেস দেয় না!) ───────────────── */

export type CreateResult =
  | { ok: true; request: PaymentRequest; screenshotWarning?: string }
  | { ok: false; errors: string[] };

let lastCreatedId: string | null = null;

function newRequestId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PM-${t}-${r}`;
}

/**
 * রিকোয়েস্ট সেভ করে — **কোনো এন্টাইটেলমেন্ট তৈরি করে না** এবং কোনো
 * "সফল পেমেন্ট" ঘোষণা করে না। সন্দেহজনক ডুপ্লিকেট (একই প্রোভাইডার +
 * ট্রানজেকশন রেফারেন্স + অ্যামাউন্ট) স্ট্যাটাস না বদলে flag করা হয়
 * যাতে অ্যাডমিন রিভিউ করে।
 */
export function createPaymentRequest(
  type: ContentType,
  slug: string,
  draft: PaymentFormDraft,
  accountEmail: string | null,
): CreateResult {
  const providers = loadProviders();
  const errors = validatePaymentDraft(type, slug, draft, providers);
  if (errors.length) return { ok: false, errors };

  const item = lookupContentItem(type, slug)!;
  const list = loadPaymentRequests();

  // সন্দেহজনক ডুপ্লিকেট ডিটেকশন: একই প্রোভাইডার + রেফারেন্স + অ্যামাউন্ট
  const txnNorm = draft.txnId.trim().toLowerCase();
  const duplicate = list.find(
    (r) => r.providerId === draft.providerId && r.txnId.toLowerCase() === txnNorm && r.amount === item.price,
  );

  const req: PaymentRequest = {
    id: newRequestId(),
    contentType: type,
    itemSlug: slug,
    itemTitle: item.title,
    amount: item.price,
    providerId: draft.providerId,
    fullName: draft.fullName.trim(),
    customerMobile: draft.customerMobile.trim().replace(/[\s-]/g, ""),
    senderMobile: draft.senderMobile.trim().replace(/[\s-]/g, ""),
    txnId: draft.txnId.trim(),
    screenshot: draft.screenshot,
    accountEmail,
    status: "pending",
    rejectReason: null,
    duplicateOf: duplicate ? duplicate.id : null,
    createdAt: new Date().toISOString(),
    audit: [
      { at: new Date().toISOString(), action: "জমা দেওয়া হয়েছে", note: duplicate ? `#${duplicate.id} — একই প্রোভাইডার+রেফারেন্স+অ্যামাউন্ট; অ্যাডমিন রিভিউ প্রয়োজন` : undefined },
    ],
  };

  list.push(req);
  try {
    saveRequests(list);
  } catch {
    // localStorage কোটা (বড় স্ক্রিনশট) — স্ক্রিনশট বাদ দিয়ে আবার
    const withoutShot = { ...req, screenshot: null };
    const retry = [...list.filter((r) => r.id !== req.id), withoutShot];
    try {
      saveRequests(retry);
      return {
        ok: true,
        request: withoutShot,
        screenshotWarning: "স্ক্রিনশট সংরক্ষণ করা যায়নি (স্টোরেজ কোটা) — ফর্মের অন্য তথ্য সেভ হয়েছে; অ্যাডমিনকে আলাদাভাবে জানাও।",
      };
    } catch {
      return { ok: false, errors: ["রিকোয়েস্ট সেভ সফল হয়নি — অবস্থা সাময়িক; আবার চেষ্টা করো।"] };
    }
  }
  lastCreatedId = req.id;
  return { ok: true, request: req };
}

/** ডাবল-সাবমিট প্রোটেকশনে UI ব্যবহার করে; স্টোর-সাইড গার্ড হিসেবে শেষ রিকোয়েস্ট ID */
export function getLastCreatedRequestId(): string | null {
  return lastCreatedId;
}

/* ───────────────── অ্যাডমিন অ্যাকশন (একমাত্র অ্যাক্সেস-দরজা) ───────────────── */

/**
 * ⚠️ প্রোডাকশনে: অ্যাপ্রুভ/রিজেক্ট অবশ্যই সার্ভার-সাইডে অথরাইজ হবে।
 * ক্লায়েন্ট সাইডে "ডেটা বদলে অ্যাক্সেস" প্রোডাকশনে সার্ভার আটকাবে।
 */
export function approvePaymentRequest(id: string, note?: string): PaymentRequest | null {
  const list = loadPaymentRequests();
  const req = list.find((r) => r.id === id);
  if (!req || req.status !== "pending") return null; // রিপিট অ্যাপ্রুভাল প্রভাবহীন

  req.status = "approved";
  req.audit.push({
    at: new Date().toISOString(),
    action: "অনুমোদিত",
    note: note?.trim() || `প্রোভাইডার: ${req.providerId}, ট্রানজেকশন: ${req.txnId}`,
  });
  saveRequests(list);

  // এখানেই কনটেন্ট আনলক — শুধুমাত্র অ্যাডমিন অনুমোদনের পরে, ইউনিক রেকর্ড
  addPurchase(req.contentType, req.itemSlug, req.accountEmail, req.id);
  return req;
}

export function rejectPaymentRequest(id: string, reason: string): PaymentRequest | null {
  const list = loadPaymentRequests();
  const req = list.find((r) => r.id === id);
  if (!req || req.status !== "pending") return null;
  const clean = reason.trim();
  if (clean.length < 3) return null; // কারণ ছাড়া রিজেক্ট নয়

  req.status = "rejected";
  req.rejectReason = clean;
  req.audit.push({ at: new Date().toISOString(), action: "প্রত্যাখ্যাত", note: clean });
  saveRequests(list);
  return req; // কোনো এন্টাইটেলমেন্ট তৈরি হয় না
}

/** অ্যাডমিনের জন্য ইউটিলিটি: প্রোফাইল-সংযুক্ত টেস্ট এন্টাইটেলমেন্ট (কোর্স) */
export function purchasesFor(contentType: ContentType, slug: string): Purchase[] {
  return loadPurchases().filter((p) => p.contentType === contentType && p.slug === slug);
}

/** তারিখ বিন্যাস (বাংলা) */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { categories };
