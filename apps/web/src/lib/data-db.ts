import { getSupabase } from "@/lib/supabase";
import type {
  HomeScreenData,
  DailyTask,
  TaskContent,
  SubjectId,
  SubjectStatus,
  TaskStep,
  SubjectSummary,
} from "@/types/domain";
import { isMyshroutkaEarned, buildWeek } from "@/types/domain";

/** Supabase join может вернуть связанную таблицу как массив или объект. Приводим к объекту. */
function one<T>(rel: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(rel)) return rel[0];
  return rel ?? undefined;
}

const DEMO_CHILD = "11111111-1111-1111-1111-111111111111";
const SUBJECT_ORDER: SubjectId[] = ["math", "russian", "reading", "english"];

/** Сегодняшняя дата в ISO (YYYY-MM-DD). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Получить/создать сессию на сегодня. Возвращает id сессии. */
async function ensureSession(childId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const date = today();

  const { data: existing } = await sb
    .from("daily_sessions")
    .select("id")
    .eq("child_id", childId)
    .eq("date", date)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created } = await sb
    .from("daily_sessions")
    .insert({ child_id: childId, date, status: "notStarted" })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}

export async function getHomeDataDb(): Promise<HomeScreenData | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: child } = await sb
    .from("child_profiles")
    .select("id,name,grade,stars")
    .eq("id", DEMO_CHILD)
    .single();
  if (!child) return null;

  const sessionId = await ensureSession(child.id);

  // прогресс по предметам (если нет строк — собираем из конфигурации)
  const { data: progressRows } = await sb
    .from("daily_subject_progress")
    .select("subject,status,tasks_total,tasks_done")
    .eq("session_id", sessionId);

  const { data: configs } = await sb
    .from("daily_task_configs")
    .select("subject,task_id")
    .eq("active", true);

  const subjects: SubjectSummary[] = SUBJECT_ORDER.map((sid) => {
    const fromDb = progressRows?.find((r) => r.subject === sid);
    const total = configs?.filter((c) => c.subject === sid).length ?? 0;
    return {
      subjectId: sid,
      status: (fromDb?.status as SubjectStatus) ?? "notStarted",
      tasksTotal: fromDb?.tasks_total ?? total,
      tasksDone: fromDb?.tasks_done ?? 0,
    };
  });

  const myshroutkaGranted = isMyshroutkaEarned(subjects);

  const { data: revisionRows } = await sb
    .from("daily_task_attempts")
    .select("task_id,tasks(subject)")
    .eq("child_id", child.id)
    .eq("status", "needsRevision");

  return {
    profile: { id: child.id, name: child.name, grade: child.grade },
    session: {
      id: sessionId ?? "",
      childId: child.id,
      date: today(),
      status: myshroutkaGranted ? "submitted" : "inProgress",
      subjects,
      myshroutkaGranted,
      submittedAt: null,
    },
    revisions: {
      count: revisionRows?.length ?? 0,
      items:
        revisionRows?.map((r) => ({
          taskId: r.task_id as string,
          subjectId: one((r as unknown as { tasks?: { subject?: SubjectId } | { subject?: SubjectId }[] }).tasks)?.subject ?? "math",
        })) ?? [],
    },
    stickers: { collected: 23, total: 120 }, // TODO: из child_stickers
    week: buildWeek(new Date(), [0, 1], false),
  };
}

export async function getSubjectTasksDb(
  subjectId: SubjectId
): Promise<DailyTask[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data } = await sb
    .from("daily_task_configs")
    .select("ord,tasks(id,subject,title,mode,est_minutes)")
    .eq("subject", subjectId)
    .eq("active", true)
    .order("ord");
  if (!data) return null;

  return data.map((row, i) => {
    const r = row as unknown as {
      ord: number;
      tasks: { id: string; title: string; mode: string; est_minutes: number | null }
        | { id: string; title: string; mode: string; est_minutes: number | null }[];
    };
    const t = one(r.tasks);
    if (!t) {
      return {
        id: "", subjectId, title: "", mode: "platform" as DailyTask["mode"],
        order: r.ord ?? i + 1, status: "notStarted" as const,
      };
    }
    return {
      id: t.id,
      subjectId,
      title: t.title,
      mode: t.mode as DailyTask["mode"],
      order: r.ord ?? i + 1,
      estMinutes: t.est_minutes ?? undefined,
      status: "notStarted",
    };
  });
}

export async function getTaskContentDb(taskId: string): Promise<TaskContent | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: task } = await sb
    .from("tasks")
    .select("id,subject,title,mode,prompt,est_minutes")
    .eq("id", taskId)
    .single();
  if (!task) return null;

  const { data: steps } = await sb
    .from("task_steps")
    .select("id,ord,kind,prompt,passage,hint,options,correct_input")
    .eq("task_id", taskId)
    .order("ord");

  // позиция в предмете
  const { data: cfg } = await sb
    .from("daily_task_configs")
    .select("task_id,ord")
    .eq("subject", task.subject)
    .eq("active", true)
    .order("ord");
  const order = (cfg?.findIndex((c) => c.task_id === taskId) ?? 0) + 1;

  const mappedSteps: TaskStep[] | undefined = steps?.map((row) => {
    const s = row as unknown as {
      id: string; kind: string; prompt: string;
      passage: string | null; hint: string | null;
      options: { id: string; label: string; is_correct: boolean }[] | null;
      correct_input: string | null;
    };
    return {
      id: s.id,
      kind: s.kind as TaskStep["kind"],
      prompt: s.prompt,
      passage: s.passage ?? undefined,
      hint: s.hint ?? undefined,
      options:
        s.options?.map((o) => ({ id: o.id, label: o.label, isCorrect: o.is_correct })) ?? undefined,
      correctInput: s.correct_input ?? undefined,
    };
  });

  return {
    id: task.id,
    subjectId: (task.subject as unknown) as SubjectId,
    title: task.title,
    mode: (task.mode as unknown) as TaskContent["mode"],
    order,
    total: cfg?.length ?? 1,
    estMinutes: task.est_minutes ?? undefined,
    prompt: task.prompt ?? "",
    steps: mappedSteps,
  };
}

export async function getNextTaskIdDb(
  subjectId: SubjectId,
  currentId: string
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("daily_task_configs")
    .select("task_id,ord")
    .eq("subject", subjectId)
    .eq("active", true)
    .order("ord");
  if (!data) return null;
  const idx = data.findIndex((c) => c.task_id === currentId);
  if (idx === -1 || idx === data.length - 1) return null;
  return data[idx + 1].task_id as string;
}
