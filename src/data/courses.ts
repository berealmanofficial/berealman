/**
 * ⚠️ কোর্স হেডলাইন ডেটা (SEED DATA)
 * ------------------------------------------------------------------
 * - এই ৬টি কোর্স "কোর্স" পেজের প্রাথমিক দৃশ্যমান তালিকা; অ্যাডমিন পরে এর
 *   বাইরেও নতুন কোর্স যোগ করতে পারবে (/admin/courses)।
 * - অ্যাডমিনের করা সব তথ্য (কোর্স/মডিউল/লেসন/ইউটিউব লিংক) এই seed থেকে আলাদা
 *   localStorage-এ persisted থাকে — src/lib/coursesStore.ts দেখো।
 * - দামগুলো নমুনা (ডেমো) মান — চূড়ান্ত ব্যবসায়িক মূল্য নয়।
 * - সিড লেসনে ইউটিউব লিংক নেই; অ্যাডমিন লিংক জুড়লেই লাইভ হয়।
 * ------------------------------------------------------------------
 */

export type Module = {
  id: string;
  title: string;
  order: number;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  /** অ্যাডমিনে পেস্ট করা ইউটিউব লিংক — প্রথম হইতেই সিরিয়াসলি ভ্যালিডেট হয় */
  youtubeUrl: string | null;
  /** ভ্যালিড লিংক থেকে বের করা ১১-অক্ষরের ভিডিও ID (null = লিংক এখনো সেট নয়) */
  videoId: string | null;
  /** অ্যাডমিনের কাস্টম থাম্বনেইল অবস্থা হলে এটাকে দেখানো হবে */
  customThumbnail: string | null;
  published: boolean;
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  /** বামে দেখানো কভার: URL অবস্থা হলে <img>, না হলে placeholder */
  cover: string | null;
  objectives: string[];
  audience: string;
  /** নমুনা দাম (৳) — ডেমো */
  price: number;
  published: boolean;
  modules: Module[];
  lessons: Lesson[];
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export function newModule(title: string, order: number): Module {
  return { id: uid(), title, order };
}

export function newLesson(
  moduleId: string,
  title: string,
  order: number,
): Lesson {
  return {
    id: uid(),
    moduleId,
    title,
    description: "",
    order,
    youtubeUrl: null,
    videoId: null,
    customThumbnail: null,
    published: true,
  };
}

/* ────────────── সিড কোর্স (৬টি) ────────────── */

type SeedLesson = { title: string; description: string };

function buildCourse(
  slug: string,
  meta: Omit<Course, "modules" | "lessons" | "slug">,
  seedModules: { title: string; lessons: SeedLesson[] }[],
): Course {
  const modules = seedModules.map((sm, i) => newModule(sm.title, i + 1));
  const lessons: Lesson[] = [];
  let lessonNum = 0;
  for (const [i, sm] of seedModules.entries()) {
    for (const sl of sm.lessons) {
      lessonNum += 1;
      const l = newLesson(modules[i].id, sl.title, lessonNum);
      l.description = sl.description;
      l.videoId = null;
      lessons.push(l);
    }
  }
  return { ...meta, slug, modules, lessons };
}

export const seedCourses: Course[] = [
  buildCourse(
    "atmunnayon-atmobishwash",
    {
      title: "আত্মউন্নয়ন ও আত্মবিশ্বাস",
      description:
        "আত্মবিশ্বাস কোনো মোটিভেশন ভিডিওর ফসল নয়; এটা প্রতিদিনের ছোট প্রয়োগ থেকে জমে। এই কোর্সে থাকবে বাস্তব চর্চা, হিসাব ও ধাপে ধাপে অনুশীলন।",
      cover: null,
      objectives: [
        "নিজের আত্মবিশ্বাসের ভিত চিনে সেটাকে প্রতিদিন ঘাটানো শেখা",
        "মানসিক উত্থান-পতনে সামঞ্জস্য ধরে রাখার চর্চা",
        "সাহসের রসদ: প্রতিদিনের ছোট জয় হিসাব রাখার পদ্ধতি",
      ],
      audience: "১৮+ যেকোনো মুসলিম পুরুষ, যে নিজের মন-প্রাণের শৃঙ্খলা নিয়ে কাজ করতে চায়।",
      price: 499,
      published: true,
    },
    [
      {
        title: "ভিত তৈরি",
        lessons: [
          { title: "আত্মবিশ্বাস আসলে কী, কী নয়", description: "মোটিভেশনের সাথে বাস্তব আত্মবিশ্বাসের পার্থক্য।" },
          { title: "নিজের বর্তমান ভিত মাপা", description: "নিজেকে সৎভাবে মাপার শীট ও অনুশীলন।" },
        ],
      },
      {
        title: "প্রতিদিনের চর্চা",
        lessons: [
          { title: "সাহস: ছোট সিদ্ধান্তের ধারাবাহিকতা", description: "অন্যায় দেখে কথা বলা শেখা।" },
          { title: "রাগ নিয়ন্ত্রণের অনুশীলন", description: "সাত সেকেন্ড চুপ থাকা থেকে প্রথম ধাপ।" },
        ],
      },
    ],
  ),
  buildCourse(
    "purusher-dayitto-jibon",
    {
      title: "একজন পুরুষের দায়িত্ব ও জীবন পরিচালনা",
      description:
        "দায়িত্ব কথার বাঘ নয়; প্রতিদিনের ছোট ছোট কাজ। এই কোর্সে থাকবে সময়, কাজ, টাকা ও ঘরের মানুষের জন্য প্রতিরক্ষা গড়ার সাদামাটা পরিকল্পনা।",
      cover: null,
      objectives: [
        "সময় ও শক্তি ভাগ করে নেওয়ার বিদ্যা",
        "নিজের কাজের হিসাব লিখে রাখার অভ্যাস",
        "পরিবারে প্রতিদিনের হাত-ভাগ করে নেওয়া",
      ],
      audience: "যে পুরুষ নিজের জীবনটা এলোমেলো ঢালাও না করে আয়ত্বে চালাতে চায়।",
      price: 599,
      published: true,
    },
    [
      {
        title: "দায়িত্বের চিহ্ন",
        lessons: [
          { title: "শৃঙ্খলা: ভাগ্য নয়, হিসাব", description: "প্রতিদিনের কাজকে ধারাবাহিক করার পদ্ধতি।" },
          { title: "মেধা একা এগিয়ে দেয় না", description: "কাজের হিসাব রাখা কেন জরুরি।" },
          { title: "কথার ক্ষমতা: মানুষ সবচেয়ে খারাপ যখন বেশি কথা বলে", description: "মুখে নয়, কাজে দেখানো রীতি।" },
        ],
      },
      {
        title: "ভবিষ্যৎ হিসাব",
        lessons: [
          { title: "সংযমের পুঁজি", description: "কম কথার মানুষই বেশি কাজ করে — বিশ্বাসের দিকনির্দেশনা।" },
          { title: "মক্কা-মদিনা বইয়ের হিসাব শিক্ষা", description: "বইয়ে শেখা মানুষের হিসাবরক্ষণ দরস।" },
        ],
      },
    ],
  ),
  buildCourse(
    "biyer-prostuti-dampottyo",
    {
      title: "বিয়ের প্রস্তুতি ও দাম্পত্য জীবন",
      description:
        "বিয়ের আগে ভালোবাসার কবিতা নয়; দরকার স্থিতিশীলতা — আর্থিক ছবি, মানসিক পরিপক্বতা ও দায়িত্বের বাস্তব নির্মাণ। এই কোর্সে ধাপে ধাপে প্রস্তুতি।",
      cover: null,
      objectives: [
        "আর্থিক ছবি স্পষ্ট করা — মাসিক হিসাব পকেটে বহন",
        "মতবিরোধ সামলাতে শেখা — সংসারের বড় সংকট এখানেই",
        "নিজের ভুল স্বীকার করার সক্ষমতা তৈরি",
      ],
      audience: "বিয়ের প্রস্তুতির প্রশ্নে সিরিয়াস ছেলে-জ্যোতিষ্যের সামর্থ্য ধারী পুরুষ।",
      price: 699,
      published: true,
    },
    [
      {
        title: "বিয়ের আগে",
        lessons: [
          { title: "আর্থিক ছবি চূড়ান্ত করা", description: "মাসিক হিসাব পকেটে বহন করা।" },
          { title: "মানসিক পরিপক্বতা যাচাই", description: "রাগ, দায়িত্ব আর অভিমানের ব্যাপারগুলো মেটানো।" },
          { title: "কাজের সংস্কৃতি আগে বাইরে, বাড়িতেও বাইরে", description: "দায়িত্বের অনুভূতি আগে তৈরি করা।" },
        ],
      },
      {
        title: "দাম্পত্য জীবন",
        lessons: [
          { title: "মতবিরোধ সামলানোর প্রশিক্ষণ", description: "দাম্পত্য সংকটের ৮০% দীর্ঘসূত্রতা।" },
          { title: "নিজের ভুল স্বীকার করা", description: "দাম্পত্যে সবচেয়ে মরমি প্রশিক্ষণ।" },
        ],
      },
    ],
  ),
  buildCourse(
    "sukhi-shongshar-shomporko",
    {
      title: "সুখী সংসার ও সম্পর্ক পরিচালনা",
      description:
        "পরিবার গড়ে ওঠে প্রতিদিনের ছোট ছোট প্রয়োগে — একদিনে বেঁধে ফেলা ঘোষণা নয়। এই কোর্সে থাকবে ঘরের যত্ন-সেবা, শোনার কাজ ও দায়িত্বের ভাগাভাগি।",
      cover: null,
      objectives: [
        "বাস্তবে রোজের কাজে হাত ভাগ করে নেওয়া",
        "প্রতিদিন ঠিক এক সময়ে ঘরের খবর শোনা",
        "মাসে একবার সাদামাটা পরিবার-মিলন আয়োজন",
      ],
      audience: "যে পুরুষ পরিবারের সঙ্গে আসল সংযোগ ঘন করতে চায়।",
      price: 549,
      published: true,
    },
    [
      {
        title: "ঘরে পাশে দাঁড়ানো",
        lessons: [
          { title: "যত্ন-সেবায় হাত ভাগ", description: "ঘরের জিনিস মেটানোর ভাগাভাগি।" },
          { title: "সংযোগ ঘন করার উপায়", description: "ফোন কানে না ধরে পুরো মন দিয়ে শোনা।" },
        ],
      },
      {
        title: "সম্পর্ক পরিচালনা",
        lessons: [
          { title: "বন্ধুবর্গ: চারপাশে কে আছে", description: "অভ্যাস-প্রভাব চোখে দেখার হিসাব।" },
          { title: "পরিবার-মিলনের দরস", description: "মাসে একবার সবার খোঁজ, পরিকল্পনা ও চায়ের কাপ।" },
        ],
      },
    ],
  ),
  buildCourse(
    "career-money-planning",
    {
      title: "ক্যারিয়ার, অর্থ ব্যবস্থাপনা ও ভবিষ্যৎ পরিকল্পনা",
      description:
        "দক্ষতা থাকলে সুযোগ নিজে থেকেই পথ বানায়। এই কোর্সে থাকবে দক্ষতা-নির্মাণ, অর্থের হিসাব, ব্যবসা-চাকরির পরিকল্পনা এবং ভবিষ্যতের সুপার-হুইল।",
      cover: null,
      objectives: [
        "প্রতিদিনের সাদামাটা কাজকে মেধাচালিত করা",
        "নিজের কাজের হিসাব লিখে রাখা ও মাপা",
        "আয়, খরচ ও ভবিষ্যৎ পরিকল্পনার ছবি স্পষ্ট",
      ],
      audience: "চাকরি হোক বা ব্যবসা — যার হাতে ইমান-সমান পুরুষের ইচ্ছা, হাতে নামানোর সাহস।",
      price: 649,
      published: true,
    },
    [
      {
        title: "দক্ষতা ও কাজ",
        lessons: [
          { title: "মেধার ধারাবাহিকতা", description: "সাপ্তাহিক শিখা-যাচাই পদ্ধতি।" },
          { title: "কাজের হিসাব লিখে রাখা", description: "কী শিখলাম, কীটা ফেলে এলাম — খাতায় লেখা।" },
          { title: "কাজের ফরমান", description: "সুযোগের পথ কোথায়।" },
        ],
      },
      {
        title: "অর্থ ও পরিকল্পনা",
        lessons: [
          { title: "আয়-খরচের বাস্তব ছবি", description: "মাসিক হিসাব পকেটে রাখা।" },
          { title: "পরিকল্পনা: ছোট ধাপে ভাগ করা", description: "সাপ্তাহিক রিভিউ ও মাস শেষে অগ্রগতি মাপা।" },
        ],
      },
    ],
  ),
  buildCourse(
    "manoshik-dridhota",
    {
      title: "পুরুষের মানসিক দৃঢ়তা ও কঠিন পরিস্থিতি মোকাবিলা",
      description:
        "জীবনে ঠেস ঘিরে তখন ঠেস না; ঠেস ঘিরলে শিক্ষা হলো কাজ চালিয়ে যাওয়া। এই কোর্সে থাকবে ধৈর্যের অনুশীলন, হতাশার মোকাবিলা ও মাথা ঠান্ডা রাখার হিসাব।",
      cover: null,
      objectives: [
        "রাগের মাথায় সিদ্ধান্ত না নেওয়ার প্রতিষ্ঠা",
        "হতাশার থেকে মন বের করে আনা",
        "মানসিক দৃঢ়তার প্রতিদিনের হিসাব",
      ],
      audience: "যে পুরুষ কঠিন সময়ে হাট-বাট করে দাঁড়িয়ে থাকতে চায়।",
      price: 449,
      published: true,
    },
    [
      {
        title: "দৃঢ়তার ভিত",
        lessons: [
          { title: "রাগ: তিন মিনিটে পরিস্থিতির চাল বদলানো", description: "সাত সেকেন্ড চুপ থাকার অনুশীলন।" },
          { title: "ধৈর্যের উপায়", description: "বড় কথার জড়ানো নয়, ছোট প্রয়োগ বাছাই।" },
        ],
      },
      {
        title: "কঠিন সময়ে",
        lessons: [
          { title: "হতাশার মধ্যে কাজ চালিয়ে যাওয়া", description: "ফসল ফলানোর ধীর প্রয়োগ।" },
          { title: "কঠিন পরিস্থিতিতে মাথা ঠান্ডা", description: "খাদ্য ও পরিচয়ের প্রশ্নে ধারাবাহিকতা।" },
        ],
      },
    ],
  ),
];

export function findSeedCourse(slug: string): Course | undefined {
  return seedCourses.find((c) => c.slug === slug);
}
