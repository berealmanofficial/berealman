/**
 * অ্যাডমিন গেট (shared) — কোর্স ও পেমেন্ট ম্যানেজমেন্টে ব্যবহৃত।
 * ⚠️ সততার ঘোষণা: এটি ক্লায়েন্ট-সাইড ডেমো প্রোটেকশন মাত্র — সত্যিকারের
 * অ্যাডমিন নিরাপত্তা auth ব্যাকএন্ড (Phase 2) + সার্ভার-সাইড অথরাইজেশনে আসবে।
 * ফ্রন্টএন্ড-অনলি পাসওয়ার্ড বাস্তব নিরাপত্তা নয়; প্রোডাকশনের আগে VITE_ADMIN_PASSCODE
 * env সেট করা যায়, কিন্তু সার্ভার সাইড চেক ছাড়া সেটিও যথেষ্ট নয়।
 */

import { useState } from "react";

const GATE_KEY = "brm-admin-access-v1";
const ADMIN_PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string | undefined) ?? "brm-admin-demo";

export function useAdminAccess() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const unlock = (pass: string): boolean => {
    if (pass.trim() === ADMIN_PASSCODE) {
      sessionStorage.setItem(GATE_KEY, "1");
      setUnlocked(true);
      return true;
    }
    return false;
  };
  const lock = () => {
    sessionStorage.removeItem(GATE_KEY);
    setUnlocked(false);
  };
  return { unlocked, unlock, lock };
}

export { ADMIN_PASSCODE };
