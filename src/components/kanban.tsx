/**
 * Kanban — 8-column view of ContentIdea rows grouped by status.
 *
 * Mirrors the static-HTML dashboard from
 * wtm-social-automation/scripts/idea_dashboard.py, but reads live from
 * Supabase (so post history persists across Railway redeploys, unlike
 * the file-based dashboard).
 *
 * Phase γ V1 = read-only. Phase γ W5 adds the "Submit idea" page that
 * writes new ContentIdea rows. Phase γ W6 adds inline edit / pause / override.
 */

import { ContentIdea, STATUS_COLORS, STATUS_ORDER, IdeaStatus } from "@/lib/types";

function failureSummary(idea: ContentIdea): string | null {
  const c = idea.compliance_result as { passed?: boolean; hits?: Array<{ rule?: string }> } | null;
  if (c && c.passed === false) {
    const counts = new Map<string, number>();
    for (const h of c.hits ?? []) {
      const r = h.rule ?? "?";
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    const ruleStr = Array.from(counts.entries())
      .map(([r, n]) => (n > 1 ? `${r}×${n}` : r))
      .join(", ");
    return `compliance: ${c.hits?.length ?? 0} hit(s) — ${ruleStr}`;
  }
  if (idea.failure_stage) {
    const errs = idea.error_log ?? [];
    if (errs.length > 0) {
      return `${idea.failure_stage}: ${errs[0].error.slice(0, 80)}`;
    }
    return idea.failure_stage;
  }
  return null;
}

function Card({ idea }: { idea: ContentIdea }) {
  const color = STATUS_COLORS[idea.status] ?? "#888";
  const updated = idea.updated_at.slice(0, 19).replace("T", " ");
  const failure = failureSummary(idea);

  return (
    <div
      className="rounded-md bg-slate-950 p-2.5 m-2 text-xs border-l-4 relative"
      style={{ borderLeftColor: color }}
    >
      <div className="flex gap-1.5 flex-wrap mb-2">
        <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
          [{idea.brand_id}]
        </span>
        <span className="bg-blue-950 px-1.5 py-0.5 rounded text-[10px]">{idea.pillar}</span>
        <span
          className="ml-auto text-white px-1.5 py-0.5 rounded text-[10px]"
          style={{ background: color }}
        >
          {idea.status}
        </span>
      </div>
      <div className="font-semibold text-slate-100 mb-1.5 leading-tight">{idea.subject}</div>
      <div className="flex gap-2 text-slate-400 text-[10px] mb-1.5">
        <span>{idea.trigger_type}</span>
        <span>{idea.media_type}</span>
        <span>${idea.total_cost_usd.toFixed(3)}</span>
      </div>
      <div className="flex justify-between text-slate-500 text-[10px]">
        <span>{updated}</span>
        <span>{idea.last_event ?? "—"}</span>
      </div>
      {failure && (
        <div
          className="bg-red-950 text-red-300 px-1.5 py-1 rounded mt-1.5 text-[10px] truncate cursor-help"
          title={failure}
        >
          ⚠ {failure}
        </div>
      )}
      {idea.human_notes && (
        <div className="bg-yellow-950 text-yellow-300 px-1.5 py-1 rounded mt-1.5 text-[10px]">
          📝 {idea.human_notes}
        </div>
      )}
      <div className="absolute top-1 right-1.5 font-mono text-[9px] text-slate-700">
        {idea.idea_id.slice(0, 8)}
      </div>
    </div>
  );
}

export function Kanban({ ideas }: { ideas: ContentIdea[] }) {
  const byStatus = new Map<IdeaStatus, ContentIdea[]>();
  for (const i of ideas) {
    const arr = byStatus.get(i.status) ?? [];
    arr.push(i);
    byStatus.set(i.status, arr);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {STATUS_ORDER.map((status) => {
        const items = byStatus.get(status) ?? [];
        const color = STATUS_COLORS[status];
        return (
          <div key={status} className="bg-slate-800 rounded-lg overflow-hidden flex flex-col">
            <div
              className="px-3 py-2.5 text-white font-semibold text-xs uppercase tracking-wider flex justify-between"
              style={{ background: color }}
            >
              <span>{status}</span>
              <span className="bg-black/30 px-2 rounded-md">{items.length}</span>
            </div>
            <div className="flex-1">
              {items.length === 0 ? (
                <div className="p-4 text-slate-500 italic text-center text-[11px]">— empty —</div>
              ) : (
                items.map((i) => <Card key={i.idea_id} idea={i} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
