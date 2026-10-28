import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthPanel } from "../components/AuthPanel";
import type { Session } from "./auth";

/**
 * লগইন/সাইন-আপ মোডাল — ♡ (পছন্দ) বা অ্যাকাউন্ট-প্রয়োজনীয় কোনো কাজে লগইন দরকার হলে
 * ব্যবহারকারীকে অসম্পর্কিত বা ভাঙা পেজে পাঠানো হয় না; একই জায়গাতেই লগইন ইন্টারফেস খোলে
 * (PromoPopup-এর বিদ্যমান মোডাল প্যাটার্ন অনুসরণ করে)।
 *
 * openAuth({ redirectTo })      → লগইনের পর নির্দিষ্ট পেজে ফেরা (যেমন পছন্দের তালিকা)
 * openAuth({ onSuccess })       → লগইনের পর আসল কাঙ্ক্ষিত কাজটি করা (যেমন আর্টিকেলটি ❤️ করা)
 */

type OpenAuthOptions = {
  redirectTo?: string;
  onSuccess?: (session: Session) => void;
};

type AuthModalApi = {
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalApi | null>(null);

export function useAuthModal(): AuthModalApi {
  const api = useContext(AuthModalContext);
  if (!api) throw new Error("useAuthModal অবশ্যই AuthModalProvider-এর ভিতরে ব্যবহার করতে হবে।");
  return api;
}

function AuthModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (session: Session) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="লগইন বা নতুন অ্যাকাউন্ট"
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="লগইন প্যানেল বন্ধ করুন"
          className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-lg font-bold text-ink shadow-md hover:bg-surface-2"
        >
          ×
        </button>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <AuthPanel variant="modal" onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [request, setRequest] = useState<OpenAuthOptions | null>(null);

  const openAuth = useCallback((options?: OpenAuthOptions) => setRequest(options ?? {}), []);
  const closeAuth = useCallback(() => setRequest(null), []);

  const complete = useCallback(
    (session: Session) => {
      const pending = request;
      setRequest(null);
      if (pending?.onSuccess) pending.onSuccess(session);
      else if (pending?.redirectTo) navigate(pending.redirectTo);
    },
    [navigate, request],
  );

  const value = useMemo<AuthModalApi>(() => ({ openAuth, closeAuth }), [openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {request && <AuthModal onSuccess={complete} onClose={closeAuth} />}
    </AuthModalContext.Provider>
  );
}
