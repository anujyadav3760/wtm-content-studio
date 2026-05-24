/**
 * / — main kanban view.
 *
 * Server component: fetches ContentIdeas directly from Supabase on the
 * server (service-role key never reaches the client), passes to the
 * Kanban client component for rendering.
 *
 * Auth: protected by middleware.ts — unauthenticated visitors hit /login.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { ContentIdea, PostAnalytics } from "@/lib/types";
import { Kanban } from "@/components/kanban";

async function fetchIdeas(): Promise<ContentIdea[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wtm_social_content_ideas")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[page] Supabase error:", error);
    return [];
  }
  return (data ?? []) as ContentIdea[];
}

async function fetchAnalyticsByIdea(
  ideaIds: string[],
): Promise<Map<string, PostAnalytics[]>> {
  if (ideaIds.length === 0) return new Map();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wtm_social_post_analytics")
    .select("*")
    .in("idea_id", ideaIds);
  if (error) {
    console.error("[page] Analytics fetch error:", error);
    return new Map();
  }
  const map = new Map<string, PostAnalytics[]>();
  for (const row of (data ?? []) as PostAnalytics[]) {
    const arr = map.get(row.idea_id) ?? [];
    arr.push(row);
    map.set(row.idea_id, arr);
  }
  return map;
}

export const dynamic = "force-dynamic"; // never cache — always live

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const ideas = await fetchIdeas();
  const analyticsByIdea = await fetchAnalyticsByIdea(ideas.map((i) => i.idea_id));
  const successCount = ideas.filter((i) =>
    ["scheduled", "published"].includes(i.status),
  ).length;
  const failCount = ideas.filter((i) => i.status === "failed").length;
  const analyticsCount = Array.from(analyticsByIdea.values()).reduce(
    (a, arr) => a + arr.length,
    0,
  );

  return (
    <main className="min-h-screen px-6 py-6">
      <header className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <h1 className="text-2xl font-bold">📡 WTM Content Studio</h1>
          <div className="text-sm text-slate-400">
            {session.user.email}
            {" · "}
            <a href="/api/auth/signout" className="text-blue-400 hover:underline">
              sign out
            </a>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {ideas.length} ideas tracked · {successCount} scheduled/published ·{" "}
          {failCount} failed · {analyticsCount} analytics snapshots
        </div>
      </header>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-300 font-semibold">
          Idea kanban (state machine view)
        </h2>
        <div className="flex gap-2">
          <a
            href="/pillars"
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded transition"
          >
            Pillars
          </a>
          <a
            href="/new"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded transition"
          >
            + New idea
          </a>
        </div>
      </div>
      <Kanban ideas={ideas} analyticsByIdea={analyticsByIdea} />

      <footer className="mt-12 text-xs text-slate-500 border-t border-slate-800 pt-4">
        Phase γ · W3 read-only kanban · W5 adds idea submission · W7 adds
        Metricool analytics readback
      </footer>
    </main>
  );
}
