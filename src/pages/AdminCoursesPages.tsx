import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminAccess } from "../lib/adminGate";
import { AdminGate } from "../lib/AdminGate";
import { Badge, Button, Card, Input } from "../components/ui";
import type { Course, Lesson } from "../data/courses";
import {
  addLesson,
  addModule,
  createCourse,
  deleteCourse,
  deleteLesson,
  deleteModule,
  loadCourses,
  moveLesson,
  moveModule,
  renameModule,
  resetCourses,
  revokeTestEntitlement,
  grantTestEntitlement,
  updateCourse,
  updateLesson,
} from "../lib/coursesStore";
import {
  INVALID_YT_MESSAGE,
  extractYouTubeId,
  youTubeEmbedUrl,
  youTubeThumbnail,
  youTubeWatchUrl,
} from "../lib/youtube";

/* ───────────── হেল্পার ───────────── */

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint";

function bnNum(n: number) {
  return n.toLocaleString("bn-BD", { useGrouping: false });
}

/* ─────────────────────────── কোর্স তালিকা + তৈরি (/admin/courses) ─────────────────────────── */

export function AdminCoursesPage() {
  const { unlocked, lock } = useAdminAccess();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [showCreate, setShowCreate] = useState(false);
  const refresh = () => setCourses(loadCourses());

  if (!unlocked) return <AdminGate title="কোর্স ম্যানেজমেন্ট (অ্যাডমিন)" />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bnserif text-2xl font-bold">কোর্স ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted">
            কোর্স/মডিউল/লেসন ম্যানেজ করো, ইউটিউব লিংক বসাও। সব পরিবর্তন localStorage-এ saved থাকে
            (রিলোডে টিকে থাকে; সার্ভার-সিঙ্ক Phase 2)।
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(true)}>নতুন কোর্স</Button>
          <Button variant="ghost" onClick={lock}>
            লক করো
          </Button>
        </div>
      </div>

      {/* নতুন কোর্স তৈরি ফর্ম */}
      {showCreate && (
        <CreateCourseForm
          onCreated={(slug) => {
            setShowCreate(false);
            refresh();
            navigate(`/admin/courses/${slug}`);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="mt-6 space-y-3">
        {courses.map((c) => (
          <Card key={c.slug} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bnserif text-base font-bold">{c.title}</h2>
                {c.published ? <Badge tone="brand">প্রকাশিত</Badge> : <Badge tone="warn">অপ্রকাশিত</Badge>}
              </div>
              <p className="mt-1 text-xs text-faint">
                slug: <code>{c.slug}</code> · ৳ {bnNum(c.price)} · {bnNum(c.modules.length)} মডিউল ·{" "}
                {bnNum(c.lessons.length)} লেসন ·{" "}
                {bnNum(c.lessons.filter((l) => l.videoId).length)}টি লিংক সেট
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/admin/courses/${c.slug}`)}
              >
                ম্যানেজ
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  updateCourse(c.slug, (x) => {
                    x.published = !x.published;
                  });
                  refresh();
                }}
              >
                {c.published ? "অপ্রকাশ করো" : "প্রকাশ করো"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm(`“${c.title}” কোর্সটি মুছে ফেলবে?`)) {
                    deleteCourse(c.slug);
                    refresh();
                  }
                }}
              >
                মুছে ফেলো
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("অ্যাডমিনের সব পরিবর্তন মুছে seed কোর্সে ফিরে যাবে?")) {
              resetCourses();
              refresh();
            }
          }}
        >
          সব রিসেট (seed-এ ফের)
        </Button>
        <Link to="/courses" className="text-sm text-brand hover:underline">
          পাবলিক কোর্স পেজ দেখো →
        </Link>
      </div>
    </div>
  );
}

function CreateCourseForm({
  onCreated,
  onCancel,
}: {
  onCreated: (slug: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("499");
  const [cover, setCover] = useState("");
  const [objectives, setObjectives] = useState("");
  const [audience, setAudience] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card className="mt-4 p-5">
      <h2 className="font-bnserif text-lg font-bold">নতুন কোর্স তৈরি</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim().length < 3) {
            setErr("শিরোনাম কমপক্ষে ৩ অক্ষরের হতে হবে।");
            return;
          }
          const c = createCourse({
            title,
            description,
            price: Number(price) || 0,
            cover: cover.trim() || null,
            objectives: objectives.split(/\n+/).map((s) => s.trim()).filter(Boolean),
            audience,
          });
          if (c) onCreated(c.slug);
        }}
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">কোর্স শিরোনাম *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="যেমন: আত্মউন্নয়ন ও আত্মবিশ্বাস" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">সংক্ষিপ্ত বর্ণনা</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">দাম (৳) — নমুনা</label>
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">কভার ছবির URL (ঐচ্ছিক)</label>
          <Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">শেখা-উদ্দেশ্য (এক লাইনে একটি করে)</label>
          <textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">কার জন্য এই কোর্স</label>
          <textarea rows={2} value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls} />
        </div>
        {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">তৈরি করো</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            বাতিল
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ───────────── কোর্স/মডিউল/লেসন এডিটর (/admin/courses/:slug) ───────────── */

type LessonDraft = {
  title: string;
  description: string;
  moduleId: string;
  youtubeUrl: string;
  customThumbnail: string;
  published: boolean;
};

const emptyDraft: LessonDraft = {
  title: "",
  description: "",
  moduleId: "",
  youtubeUrl: "",
  customThumbnail: "",
  published: true,
};

export function AdminCourseDetailPage() {
  const { slug } = useParams();
  const { unlocked } = useAdminAccess();
  const [course, setCourse] = useState<Course | null>(() => {
    const found = loadCourses().find((c) => c.slug === slug);
    return found ?? null;
  });
  const [err, setErr] = useState<string | null>(null); // ইউটিউব ভ্যালিডেশন এরর
  const [editing, setEditing] = useState<Lesson | null>(null); // এডিট-মোডে লেসন
  const [draft, setDraft] = useState<LessonDraft>(emptyDraft);
  const [saved, setSaved] = useState(false);

  if (!unlocked) return <AdminGate title="কোর্স ম্যানেজমেন্ট (অ্যাডমিন)" />;
  if (!course) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p>কোর্স পাওয়া যায়নি।</p>
        <Link to="/admin/courses" className="mt-3 inline-block text-sm text-brand hover:underline">
          ← কোর্স তালিকা
        </Link>
      </Card>
    );
  }
  if (slug === undefined) return null;

  const set = (patch: Partial<LessonDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const refresh = () => {
    setCourse({ ...loadCourses().find((x) => x.slug === slug)! });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const startEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setDraft({
      title: lesson.title,
      description: lesson.description,
      moduleId: lesson.moduleId,
      youtubeUrl: lesson.youtubeUrl ?? "",
      customThumbnail: lesson.customThumbnail ?? "",
      published: lesson.published,
    });
    setErr(null);
  };

  const saveLesson = () => {
    const youtubeUrl = draft.youtubeUrl.trim() ? draft.youtubeUrl : null;
    if (youtubeUrl && !extractYouTubeId(youtubeUrl)) {
      setErr(INVALID_YT_MESSAGE);
      return;
    }
    setErr(null);
    if (editing) {
      const ok = updateLesson(slug, editing.id, {
        moduleId: draft.moduleId,
        title: draft.title,
        description: draft.description,
        youtubeUrl,
        customThumbnail: draft.customThumbnail,
        published: draft.published,
      });
      if (!ok) {
        setErr(INVALID_YT_MESSAGE);
        return;
      }
    } else {
      addLesson(slug, {
        moduleId: draft.moduleId || course.modules[0]?.id,
        title: draft.title,
        description: draft.description,
        youtubeUrl,
        customThumbnail: draft.customThumbnail,
        published: draft.published,
      });
    }
    setEditing(null);
    setDraft(emptyDraft);
    refresh();
  };

  const draftVideoId = extractYouTubeId(draft.youtubeUrl);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/courses" className="text-sm text-brand hover:underline">
        ← কোর্স তালিকা
      </Link>
      <h1 className="font-bnserif mt-2 text-2xl font-bold">{course.title}</h1>
      <p className="mt-1 text-xs text-faint">
        slug: <code>{course.slug}</code> · {course.published ? "প্রকাশিত" : "অপ্রকাশিত"}
      </p>

      {/* কোর্স ফিল্ড এডিট */}
      <Card className="mt-4 p-5">
        <h2 className="font-bnserif text-lg font-bold">কোর্স আপডেট</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateCourse(slug, (c) => {
              c.title = String(fd.get("title") || c.title);
              c.description = String(fd.get("description") || c.description);
              c.price = Number(fd.get("price")) || c.price;
              const cover = String(fd.get("cover") || "").trim();
              c.cover = cover || null;
              c.audience = String(fd.get("audience") || c.audience);
              c.objectives = String(fd.get("objectives") || "")
                .split(/\n+/)
                .map((s) => s.trim())
                .filter(Boolean);
            });
            refresh();
          }}
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">শিরোনাম</label>
            <Input name="title" defaultValue={course.title} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">বর্ণনা</label>
            <textarea name="description" rows={2} defaultValue={course.description} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">দাম (৳)</label>
            <Input name="price" type="number" min={0} defaultValue={course.price} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">কভার URL (ঐচ্ছিক)</label>
            <Input name="cover" defaultValue={course.cover ?? ""} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">শেখা-উদ্দেশ্য (এক লাইনে একটি)</label>
            <textarea name="objectives" rows={3} defaultValue={course.objectives.join("\n")} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">কার জন্য</label>
            <textarea name="audience" rows={2} defaultValue={course.audience} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">সেভ করো</Button>
          </div>
        </form>
      </Card>

      {/* মডিউল ম্যানেজার */}
      <Card className="mt-4 p-5">
        <h2 className="font-bnserif text-lg font-bold">মডিউল</h2>
        <div className="mt-3 space-y-2">
          {course.modules
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
                <span className="w-24 text-xs text-faint">মডিউল {bnNum(m.order)}</span>
                <Input
                  value={m.title}
                  className="min-w-0 flex-1"
                  onChange={(e) => {
                    renameModule(slug, m.id, e.target.value);
                    setCourse(loadCourses().find((x) => x.slug === slug)!);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => { moveModule(slug, m.id, -1); refresh(); }} title="উপরে">
                  ↑
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { moveModule(slug, m.id, 1); refresh(); }} title="নিচে">
                  ↓
                </Button>
                <Button size="sm" variant="danger" onClick={() => { deleteModule(slug, m.id); refresh(); }}>
                  মুছে
                </Button>
              </div>
            ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const title = String(fd.get("modTitle") || "").trim();
              if (title) {
                addModule(slug, title);
                refresh();
              }
            }}
          >
            <input name="modTitle" className={inputCls} placeholder="নতুন মডিউলের নাম" />
            <Button type="submit" variant="secondary">
              যোগ করো
            </Button>
          </form>
        </div>
      </Card>

      {/* লেসন ম্যানেজার — ইউটিউব লিংক প্রতি-লেসনে */}
      <Card className="mt-4 p-5">
        <h2 className="font-bnserif text-lg font-bold">লেসন (ইউটিউব লিংক ম্যানেজমেন্ট)</h2>
        <p className="mt-1 text-xs text-muted">
          প্রতি লেসনে ইউটিউব লিংক পেস্ট করো — watch?v=…, youtu.be/… আর shorts/… ফরম্যাট সমর্থিত।
          ভিডিও ID বের করে থাম্বনেইল অটো-তৈরি হয় (কাস্টম থাম্বনেইল দিলে সেটাই)।
        </p>

        {/* লেসন লিস্ট */}
        <div className="mt-4 space-y-3">
          {course.modules
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((m) => {
              const lessons = course.lessons
                .filter((l) => l.moduleId === m.id)
                .sort((a, b) => a.order - b.order);
              return (
                <div key={m.id}>
                  <h3 className="text-sm font-semibold text-brand">মডিউল {bnNum(m.order)}: {m.title}</h3>
                  {lessons.length === 0 ? (
                    <p className="mt-1 text-xs text-faint">(খালি)</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {lessons.map((l) => (
                        <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2.5">
                          {/* থাম্বনেইল প্রিভিউ (লিংক রেকनা শুধু) */}
                          <a
                            href={l.videoId ? youTubeWatchUrl(l.videoId) : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!l.videoId) e.preventDefault();
                            }}
                            className="block h-14 w-24 shrink-0 overflow-hidden rounded-md border border-line"
                            title={l.videoId ? "ইউটিউবে খোলো (নতুন ট্যাব)" : "লিংক সেট নয়"}
                          >
                            {l.videoId ? (
                              <img src={youTubeThumbnail(l.videoId, l.customThumbnail)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full w-full place-items-center bg-surface-2 text-faint">—</span>
                            )}
                          </a>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{l.title}</p>
                            <p className="truncate text-xs text-faint">
                              {l.videoId ? (
                                <>
                                  YouTube ID: <code>{l.videoId}</code>
                                </>
                              ) : (
                                "লিংক সেট করা হয়নি"
                              )}
                              {" · "}
                              {l.published ? "প্রকাশিত" : "অপ্রকাশিত"}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => { moveLesson(slug, l.id, -1); refresh(); }} title="উপরে">
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { moveLesson(slug, l.id, 1); refresh(); }} title="নিচে">
                            ↓
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => startEdit(l)}>
                            এডিট
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              updateLesson(slug, l.id, {
                                moduleId: l.moduleId,
                                title: l.title,
                                description: l.description,
                                youtubeUrl: l.youtubeUrl,
                                customThumbnail: l.customThumbnail,
                                published: !l.published,
                              });
                              refresh();
                            }}
                          >
                            {l.published ? "অপ্রকাশ" : "প্রকাশ"}
                          </Button>
                          {l.videoId && (
                            <a
                              href={youTubeWatchUrl(l.videoId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:text-brand"
                            >
                              ইউটিউবে ভিডিও দেখুন
                            </a>
                          )}
                          <Button size="sm" variant="danger" onClick={() => { deleteLesson(slug, l.id); refresh(); }}>
                            মুছে
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* লেসন ফর্ম (নতুন অথবা এডিট) */}
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveLesson();
          }}
        >
          <div className="sm:col-span-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
            {editing ? (
              <>
                এডিট মোড: <strong>{editing.title}</strong>
                <button type="button" className="ml-2 text-brand hover:underline" onClick={() => { setEditing(null); setDraft(emptyDraft); setErr(null); }}>
                  (নতুন লেসনে ফিরো)
                </button>
              </>
            ) : (
              "নতুন লেসন যোগ করো"
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">লেসন শিরোনাম *</label>
            <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">মডিউল</label>
            <select
              value={draft.moduleId || course.modules[0]?.id || ""}
              onChange={(e) => set({ moduleId: e.target.value })}
              className={inputCls}
            >
              {course.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  মডিউল {bnNum(m.order)}: {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">বর্ণনা</label>
            <textarea rows={2} value={draft.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">YouTube URL (watch?v=… / youtu.be/… / shorts/…)</label>
            <Input
              value={draft.youtubeUrl}
              onChange={(e) => set({ youtubeUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              className={draft.youtubeUrl.trim() && !draftVideoId ? "border-danger" : undefined}
            />
            {draft.youtubeUrl.trim() && !draftVideoId && (
              <p className="mt-1 text-sm text-danger" role="alert">
                {INVALID_YT_MESSAGE}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">কাস্টম থাম্বনেইল URL (ঐচ্ছিক)</label>
            <Input value={draft.customThumbnail} onChange={(e) => set({ customThumbnail: e.target.value })} placeholder="https://…" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => set({ published: e.target.checked })}
                className="h-4 w-4 accent-[#047857]"
              />
              প্রকাশিত
            </label>
          </div>

          {/* লিভ প্রিভিউ: থাম্বনেইল + এম্বেড, সেভ করার আগেই */}
          {draftVideoId && (
            <div className="sm:col-span-2 rounded-lg border border-line p-3">
              <p className="text-xs font-semibold text-muted">প্রিভিউ (প্রকাশের আগেই যাচাই)</p>
              <div className="mt-2 flex gap-3">
                <a
                  href={youTubeWatchUrl(draftVideoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-24 w-44 shrink-0 overflow-hidden rounded-md border border-line"
                >
                  <img src={youTubeThumbnail(draftVideoId, draft.customThumbnail)} alt="" className="h-full w-full object-cover" />
                </a>
                <div className="aspect-video w-full max-w-xs overflow-hidden rounded-md bg-black">
                  <iframe
                    src={youTubeEmbedUrl(draftVideoId)}
                    title="লেসন প্রিভিউ"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
              <a
                href={youTubeWatchUrl(draftVideoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
              >
                ইউটিউবে ভিডিও দেখুন →
              </a>
            </div>
          )}

          {err && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2" role="alert">
              {err}
            </p>
          )}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">{editing ? "লেসন আপডেট সেভ করো" : "লেসন সেভ করো"}</Button>
            {saved && <span className="text-sm font-medium text-brand">✓ সেভ হয়েছে (localStorage)</span>}
          </div>
        </form>
      </Card>

      {/* টেস্ট এন্টাইটেলমেন্ট — স্পষ্ট লেবেল */}
      <Card className="mt-4 p-5">
        <h2 className="font-bnserif text-lg font-bold">টেস্ট এন্টাইটেলমেন্ট (শুধু যাচাইয়ের জন্য)</h2>
        <p className="mt-1 text-xs text-muted">
          পেমেন্ট ফ্লো এই ফেজে সক্রিয় নয় — কেনার বাটন কোনো অ্যাক্সেস দেয় না। অ্যাক্সেস-নিয়ম পরীক্ষার
          জন্য নিজের লোকাল অ্যাকাউন্টে সাময়িক এন্টাইটেলমেন্ট দেওয়া/ফিরিয়ে নেওয়া যায় (localStorage)।
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => { grantTestEntitlement(slug, null); setCourse(loadCourses().find((x) => x.slug === slug)!); }}>
            এই কোর্সে টেস্ট অ্যাক্সেস দাও
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { revokeTestEntitlement(slug, null); setCourse(loadCourses().find((x) => x.slug === slug)!); }}>
            টেস্ট অ্যাক্সেস ফিরিয়ে নাও
          </Button>
          <Link to={`/courses/${slug}`} className="self-center text-sm text-brand hover:underline">
            পাবলিক কোর্স পেজ দেখো →
          </Link>
        </div>
      </Card>
    </div>
  );
}
