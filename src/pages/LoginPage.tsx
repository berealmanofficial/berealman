import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPanel } from "../components/AuthPanel";
import { useSession } from "../lib/auth";

/**
 * /login — অ্যাকাউন্ট ঢোকার মূল পেজ (হেডারের "অ্যাকাউন্ট" ও ♡ গেট থেকে আসা)।
 *  - লগইন/নতুন অ্যাকাউন্ট ট্যাব, নাম/ইমেইল/পাসওয়ার্ড, ১৮+ শর্ত, Google UI — সব AuthPanel-এ।
 *  - ?next=/... থাকলে সফল লগইনের পর সেই গন্তব্যে ফেরা হয় (নিরাপদে শুধু সাইট-ভিতরের পাথ)।
 *  - আগে থেকেই লগইন থাকলে সরাসরি অ্যাকাউন্ট ড্যাশবোর্ডে যাওয়া হয়।
 */

/** নিরাপদ ফিরতি পথ — বাইরের URL বা protocol-relative পাথ গ্রহণ করা হয় না */
function safeNext(raw: string | null): string {
  if (!raw) return "/profile";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/profile";
  return raw;
}

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const session = useSession();
  const next = safeNext(params.get("next"));

  // ইতিমধ্যেই লগইন করা থাকলে ড্যাশবোর্ড/কাঙ্ক্ষিত গন্তব্যে
  if (session) return <Navigate to={next} replace />;

  return (
    <div className="mx-auto max-w-5xl">
      <AuthPanel variant="page" onSuccess={() => navigate(next, { replace: true })} />
      <p className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-200 px-4 py-3 text-center text-sm text-amber-900 sm:mt-6">
        ⓘ সততা: লগইন/রেজিস্ট্রেশন এখন এই ব্রাউজারেই (localStorage) কাজ করে — অ্যাকাউন্ট তৈরি হয়,
        পাসওয়ার্ড সল্টেড হ্যাশ হিসেবে রাখা হয় এবং সেশন রিলোডের পরও থাকে। তবে এটি সার্ভার-সাইড
        authentication নয় (ইমেইল ভেরিফিকেশন, সেশন টোকেন বা Google OAuth নেই), তাই অন্য
        ডিভাইসে সেশন ও পছন্দ দেখা যাবে না।
      </p>
    </div>
  );
}
