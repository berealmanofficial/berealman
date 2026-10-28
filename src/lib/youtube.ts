/**
 * YouTube হেল্পার — লিংক ভ্যালিডেশন, ভিডিও ID বের করা, থাম্বনেইল ও খোলার URL।
 * সমর্থিত ফরম্যাট:
 *  - https://www.youtube.com/watch?v=VIDEO_ID (অতিরিক্ত কোয়েরি প্যারামিটারসহ)
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID (অ্যাডমিন এম্বেড লিংক পেস্ট করলেও)
 * ভুল/অসমর্থিত লিংক → null (UI বাংলা এরর দেখাবে)।
 */

const ID_RE = "[A-Za-z0-9_-]{11}";

const PATTERNS: RegExp[] = [
  new RegExp(`youtube\\.com/watch\\?[^\\s]*\\bv=${ID_RE}`),
  new RegExp(`youtu\\.be/${ID_RE}`),
  new RegExp(`youtube\\.com/shorts/${ID_RE}`),
  new RegExp(`youtube\\.com/embed/${ID_RE}`),
];

/** লিংক থেকে ১১-অক্ষরের ভিডিও ID বের করে; না পেলে null */
export function extractYouTubeId(rawUrl: string): string | null {
  const url = (rawUrl ?? "").trim();
  if (!url) return null;
  for (const re of PATTERNS) {
    if (!re.test(url)) continue;
    const m =
      url.match(new RegExp(`[?&]v=(${ID_RE})`)) ??
      url.match(new RegExp(`youtu\\.be/(${ID_RE})`)) ??
      url.match(new RegExp(`youtube\\.com/(?:shorts|embed)/(${ID_RE})`));
    if (m) return m[1];
  }
  return null;
}

/** থাম্বনেইল: ভিডিও ID থেকে ছবি; customThumbnail দিলে সেটাই আগে */
export function youTubeThumbnail(videoId: string, customThumbnail?: string | null): string {
  if (customThumbnail && customThumbnail.trim()) return customThumbnail.trim();
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** নতুন ট্যাবে খোলার নিরাপদ (canonical) ওয়াচ লিংক — shorts/watch/youtu.be সব ক্ষেত্রেই কাজ করে */
export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** এম্বেড প্লেয়ার URL — YouTube এম্বেড ব্লক থাকলে সরাসরি লিংক-ই চালু থাকে */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/** বাংলা এরর মেসেজ — ভুল/অসমর্থিত লিংকের জন্য */
export const INVALID_YT_MESSAGE =
  "ভুল ইউটিউব লিংক। সমর্থিত ফরম্যাট: youtube.com/watch?v=… , youtu.be/… অথবা youtube.com/shorts/…";

/** সেভ করা লেসন ডেটা থেকে ব্যবহারযোগ্য খোলার লিংক — না থাকলে null */
export function lessonOpenUrl(saved: { youtubeUrl?: string | null; videoId: string | null }): string | null {
  if (saved.videoId) return youTubeWatchUrl(saved.videoId);
  const savedUrl = (saved.youtubeUrl ?? "").trim();
  return savedUrl && PATTERNS.some((re) => re.test(savedUrl)) ? savedUrl : null;
}
