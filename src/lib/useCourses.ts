import { useEffect, useState } from "react";
import { loadCourses } from "./coursesStore";
import type { Course } from "../data/courses";

/** স্টোর রিফ্রেশে (অ্যাডমিন অন্য ট্যাবে সেভ করলেও) কোর্স তালিকা ফ্রেশ লোড হয় */
export function useCourses(): Course[] {
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  useEffect(() => {
    const sync = () => setCourses(loadCourses());
    sync();
    const handler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("brm-")) sync();
    };
    window.addEventListener("storage", handler);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", sync);
    };
  }, []);
  return courses;
}
