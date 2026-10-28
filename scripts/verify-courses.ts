/**
 * Functional verification (node --experimental-strip-types).
 * Tests the real production code: src/lib/youtube.ts and src/lib/coursesStore.ts.
 */
import assert from "node:assert";

// localStorage shim — project persistence is browser-API based
const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.sessionStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

const { extractYouTubeId, youTubeWatchUrl, youTubeThumbnail, youTubeEmbedUrl } = await import(
  "../src/lib/youtube.ts"
);
const { loadCourses, addLesson, moveLesson } = await import("../src/lib/coursesStore.ts");

/* ── 1. YouTube URL format tests (4 supported formats + invalid inputs) ── */
const CASES: [string, string | null][] = [
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL123", "jNQXAC9IVRw"],
  ["https://youtu.be/9bZkp7q19f0", "9bZkp7q19f0"],
  ["https://www.youtube.com/shorts/5NVBRz6t0gA", "5NVBRz6t0gA"],
  ["https://www.youtube.com/embed/M7lc1UVf-VE", "M7lc1UVf-VE"],
  ["https://vimeo.com/123456789", null],
  ["https://youtube.com/watch?v=short9", null], // not an 11-char ID
  ["this is not a link", null],
  ["", null],
];

for (const [input, expected] of CASES) {
  const got = extractYouTubeId(input);
  assert.strictEqual(got, expected, `extract(${input}) → ${got}, expected ${expected}`);
}
console.log(`✓ YouTube ID extraction: ${CASES.length} cases pass`);

/* ── 2. Constructed links point at the right video ── */
assert.strictEqual(youTubeWatchUrl("5NVBRz6t0gA"), "https://www.youtube.com/watch?v=5NVBRz6t0gA");
assert.strictEqual(youTubeThumbnail("9bZkp7q19f0"), "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg");
assert.strictEqual(
  youTubeThumbnail("9bZkp7q19f0", "https://example.com/thumb.jpg"),
  "https://example.com/thumb.jpg",
);
assert.strictEqual(youTubeEmbedUrl("M7lc1UVf-VE"), "https://www.youtube.com/embed/M7lc1UVf-VE");
console.log("✓ watch/thumbnail/embed URL construction passes");

/* ── 3. Real save + reload persistence test against the actual store ── */

// a) Default seed loads
const courses = loadCourses();
assert.strictEqual(courses.length, 6, "seed contains 6 courses");
const firstCourse = courses.find((c) => c.slug === "atmunnayon-atmobishwash")!;
assert.ok(firstCourse.lessons.length > 0);
assert.strictEqual(firstCourse.lessons[0].videoId, null, "seed lessons contain NO fake links");

// b) Save a lesson using an admin-entered YouTube URL (youtu.be format)
const saved1 = addLesson(firstCourse.slug, {
  moduleId: firstCourse.modules[0].id,
  title: "টেস্ট লেসন A",
  description: "verification lesson",
  youtubeUrl: "https://youtu.be/6NZiPn9Tb_g",
  customThumbnail: null,
  published: true,
});
assert.ok(saved1, "valid link saves the lesson");
assert.strictEqual(saved1.videoId, "6NZiPn9Tb_g");
assert.strictEqual(saved1.youtubeUrl, "https://youtu.be/6NZiPn9Tb_g");

// c) Simulate page reload (fresh store read) — lesson persists
const reloaded = loadCourses().find((c) => c.slug === firstCourse.slug)!;
const found = reloaded.lessons.find((l) => l.title === "টেস্ট লেসন A")!;
assert.ok(found, "saved lesson survives reload");
assert.strictEqual(found.videoId, "6NZiPn9Tb_g");
assert.strictEqual(
  reloaded.lessons.filter((l) => l.videoId === "6NZiPn9Tb_g").length,
  1,
  "no hard-coded demo video sharing — the ID exists only where saved",
);

// d) Invalid link is rejected
const bad = addLesson(firstCourse.slug, {
  moduleId: firstCourse.modules[0].id,
  title: "ভুল লেসন",
  description: "",
  youtubeUrl: "https://vimeo.com/123456789",
  customThumbnail: null,
  published: true,
});
assert.strictEqual(bad, null, "invalid YouTube link is not saved");

// e) Reorder — sibling lesson order swaps and persists
const siblings = reloaded.lessons
  .filter((l) => l.moduleId === found.moduleId)
  .sort((a, b) => a.order - b.order);
assert.ok(siblings.length >= 2, "at least two sibling lessons to reorder");
const [first, second] = siblings;
const o1 = first.order;
const o2 = second.order;
moveLesson(firstCourse.slug, first.id, 1);
const after = loadCourses().find((c) => c.slug === firstCourse.slug)!;
assert.strictEqual(after.lessons.find((l) => l.id === first.id)!.order, o2, "order swapped after move");
assert.strictEqual(after.lessons.find((l) => l.id === second.id)!.order, o1, "sibling order swapped");

console.log("✓ persistence + link management tests pass");
console.log("\nALL FUNCTIONAL TESTS PASS ✔");
