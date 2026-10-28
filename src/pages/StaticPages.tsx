import { Link } from "react-router-dom";
import { Badge, EmptyState } from "../components/ui";

function Draft({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="font-bnserif text-2xl font-bold">{title}</h1>
        <Badge tone="warn">খসড়া</Badge>
      </div>
      <div className="mt-6 space-y-4 text-sm leading-7 text-muted">{children}</div>
    </div>
  );
}

export function AboutPage() {
  return (
    <Draft title="আমাদের সম্পর্কে">
      <p>
        Be Real Man হলো বাংলা ভাষায় ১৮+ বয়সের মুসলিম পুরুষদের লক্ষ্যে ইমান, আত্মশৃঙ্খলা,
        শরীরচর্চা, কর্মজীবন ও দাম্পত্যজীবনের বাস্তব দিকনির্দেশনা পৌঁছানোর একটা প্রচেষ্টা।
      </p>
      <p>
        ফুল সাইন-ইন, প্রিমিয়াম আর্টিকেল, বিশ্বস্ত পেমেন্ট ফ্লো, বই লাইব্রেরি ও রেফারেল এজন্য
        পরবর্তী ধাপে যোগ হবে। এখন দেখছেন ডিজাইন প্রোটোটাইপ।
      </p>
    </Draft>
  );
}

export function ContactPage() {
  return (
    <Draft title="যোগাযোগ">
      <p>যোগাযোগের ইমেইল/ফর্ম সেটআপ হওয়ার পর এখানে যোগ করা হবে — আপাতত ফাঁকা।</p>
    </Draft>
  );
}

export function PrivacyPage() {
  return (
    <Draft title="প্রাইভেসি পলিসি">
      <p>
        এটা খসড়া। ফাইনাল পলিসি ডেটা কে, কীভাবে, কতসময় রাখবে ও কার-কার-এর সঙ্গে শেয়ার হবে —
        এই বিষয়গুলো স্পষ্টভাবে লিখতে হবে (মালিক + অ্যাটর্নি মতামত)।
      </p>
      <ul className="list-disc pl-5">
        <li>কী ডেটা ধরা হচ্ছে এবং কেন — মালিকের সিদ্ধান্ত অনুযায়ী</li>
        <li>সংবেদনশীল তথ্য (ফোন, ঠিকানা) কখনো পাবলিক দেখা যাবে না</li>
        <li>পেমেন্ট বিষয়ে ডেটা কেবল ট্রানজ্যাকশন ভেরিফায়ের জন্য</li>
      </ul>
    </Draft>
  );
}

export function TermsPage() {
  return (
    <Draft title="ব্যবহারের শর্তাবলী">
      <p>
        খসড়া। বিষয়গুলো: কনটেন্ট লাইসেন্স, কেনা আর্টিকেলে অ্যাক্সেস পলিসি, বই অর্ডার ও ডেলিভারি
        নিয়ম, তোলপাড় (refusal) ও COD বন্ধের শর্ত।
      </p>
    </Draft>
  );
}

export function AuthorRulesPage() {
  return (
    <Draft title="লেখকের নিয়মাবলী">
      <ul className="list-disc pl-5 space-y-2">
        <li>সব লেখা আগে অ্যাডমিন অনুমোদন ছাড়া প্রকাশ হবে না</li>
        <li>কুরআন/হাদিসের উদ্ধৃতি ও রেফারেন্স কেবল যাচাই করা হলে প্রকাশ</li>
        <li>লেখকের জন্য ফোন নম্বর দেওয়া বাধ্যতামূলক — পাবলিক দেখা যাবে না</li>
        <li>মূল লেখা বাংলায়; ইংরেজি অনুবাদ মূলের নিচে আলাদা ট্যাবে দেখা যাবে</li>
      </ul>
    </Draft>
  );
}

export function FaqPage() {
  const faqs: { q: string; a: string }[] = [
    {
      q: "সাইটটা কি সবার জন্য?",
      a: "না — এটা ১৮+ প্রাপ্তবয়স্কদের জন্য। রেজিস্ট্রেশনের সময় আপনি বয়স জানাবেন (স্বঘোষিত)।",
    },
    {
      q: "প্রিমিয়াম আর্টিকেল কীভাবে কিনবো?",
      a: "bKash / Nagad / Rocket দিয়ে টাকা পাঠিয়ে TrxID ও নম্বরের শেষ চার সংখ্যা জমা দিয়ে অ্যাডমিন ভেরিফিকেশন করবেন। কোনো অটো পেমেন্ট গেটওয়ে আপন হবে না।",
    },
    {
      q: "বইয়ের PDF কি আলাদাভাবে কেনা করার সুযোগ আছে?",
      a: "না। PDF পড়তে প্রোফাইল সম্পূর্ণ করা, ১ জন রেফারেল জোগাড় এবং প্লেজ ফর্ম পূরণ করতে হবে। কাগজে বই অর্ডার করতে আলাদা ফ্লো আছে।",
    },
    {
      q: "বই কি বাইরে পাঠানো যাবে?",
      a: "না। কাগজে বই শুধু বাংলাদেশের মধ্যে ডেলিভারি হবে (মালিক সিদ্ধান্ত)।",
    },
    {
      q: "আমি কি লেখা লিখতে পারি?",
      a: "হ্যাঁ — লগইন সিস্টেম চালু হলে লেখা জমা দেওয়া যাবে (জমা দেওয়ার নিয়মাবলী পেজে দেখুন)। অ্যাডমিন সেটা দেখে অনুমোদন দেবে বা পরিবর্তন চাইবেন।",
    },
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-bnserif text-2xl font-bold">সাধারণ প্রশ্ন</h1>
      <div className="mt-6 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg">
      <EmptyState title="৪০৪ — পেজ পাওয়া যায়নি" hint="এই লিংকে কিছু নেই বা স্থাপন হয়নি।" />
      <p className="mt-4 text-center">
        <Link to="/" className="text-sm text-brand hover:underline">
          ← হোমপেজে ফেরা
        </Link>
      </p>
    </div>
  );
}
