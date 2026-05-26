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

import { CollapsibleColumnBody } from "@/components/collapsible-column-body";
import {
  ContentIdea,
  PostAnalytics,
  STATUS_COLORS,
  STATUS_ORDER,
  IdeaStatus,
} from "@/lib/types";

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

function intakeSummary(idea: ContentIdea): {
  mode: string;
  confidence: string;
  rationale: string;
} | null {
  const o = idea.overrides as
    | {
        intake_decision?: {
          accepted_mode?: string;
          confidence?: string;
          rationale?: string;
        };
      }
    | null;
  const d = o?.intake_decision;
  if (!d?.accepted_mode) return null;
  return {
    mode: d.accepted_mode,
    confidence: d.confidence ?? "high",
    rationale: d.rationale ?? "",
  };
}

/** Per-surface schedule badge data: icon + short time label + tooltip. */
type ScheduleBadge = {
  icon: string;
  label: string;
  tooltip: string;
  bg: string;
};

/** Extract scheduled_for timestamps from publisher_results (set by the
 *  Python pipeline's mark_scheduled in pipeline/idea_lifecycle.py) and
 *  format them as compact badges the kanban can render in the card.
 *
 *  Returns empty array for ideas that pre-date the scheduled_for field
 *  or never reached the "scheduled" status — graceful degradation, no
 *  layout shift when the data isn't there yet.
 */
function scheduleBadges(idea: ContentIdea): ScheduleBadge[] {
  const pr = idea.publisher_results;
  if (!pr || typeof pr !== "object") return [];

  const badges: ScheduleBadge[] = [];
  const surfaces: Array<{ key: string; icon: string; bg: string; label: string }> = [
    { key: "metricool_ig", icon: "📷", bg: "bg-pink-950/60 text-pink-200", label: "IG" },
    { key: "metricool_x", icon: "🐦", bg: "bg-sky-950/60 text-sky-200", label: "X" },
    { key: "metricool_reel", icon: "🎬", bg: "bg-purple-950/60 text-purple-200", label: "Reel" },
  ];

  for (const s of surfaces) {
    const entry = (pr as Record<string, unknown>)[s.key];
    if (!entry || typeof entry !== "object") continue;
    const scheduledFor = (entry as Record<string, unknown>).scheduled_for;
    if (typeof scheduledFor !== "string" || !scheduledFor) continue;

    const d = new Date(scheduledFor);
    if (Number.isNaN(d.getTime())) continue;

    // Compact label: "Mon 16:00" in viewer's local time. ISO in tooltip
    // so ops can verify the canonical UTC + cross-platform cross-post
    // (FB Reel + YT Short ride the same Metricool slot as IG Reel).
    const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
    const timeLabel = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    badges.push({
      icon: s.icon,
      label: `${s.label} ${dayLabel} ${timeLabel}`,
      tooltip: `${s.label} publishes at ${scheduledFor} (your local time: ${d.toLocaleString()})`,
      bg: s.bg,
    });
  }
  return badges;
}

function AnalyticsRow({ a }: { a: PostAnalytics }) {
  const ageMin = Math.round((Date.now() - new Date(a.captured_at).getTime()) / 60000);
  const ageStr = ageMin < 60 ? `${ageMin}m` : ageMin < 1440 ? `${Math.round(ageMin / 60)}h` : `${Math.round(ageMin / 1440)}d`;
  return (
    <div
      className="bg-emerald-950/40 text-emerald-200 px-1.5 py-1 rounded mt-1.5 text-[10px] flex gap-2 flex-wrap"
      title={`Last synced ${ageStr} ago · engagement rate ${(a.engagement_rate * 100).toFixed(2)}%`}
    >
      <span className="font-semibold uppercase text-[9px]">{a.surface}</span>
      <span>👁 {a.impressions.toLocaleString()}</span>
      <span>❤ {a.likes.toLocaleString()}</span>
      <span>💬 {a.comments.toLocaleString()}</span>
      <span>🔖 {a.saves.toLocaleString()}</span>
      {a.link_clicks > 0 && <span>🔗 {a.link_clicks.toLocaleString()}</span>}
    </div>
  );
}

function Card({
  idea,
  analytics,
}: {
  idea: ContentIdea;
  analytics: PostAnalytics[];
}) {
  const color = STATUS_COLORS[idea.status] ?? "#888";
  const updated = idea.updated_at.slice(0, 19).replace("T", " ");
  const failure = failureSummary(idea);
  const intake = intakeSummary(idea);
  const scheduleBadgeList = scheduleBadges(idea);

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
      {scheduleBadgeList.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-1.5">
          {scheduleBadgeList.map((b, idx) => (
            <span
              key={idx}
              className={`${b.bg} px-1.5 py-0.5 rounded text-[10px] cursor-help font-medium`}
              title={b.tooltip}
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex justify-between text-slate-500 text-[10px]">
        <span>{updated}</span>
        <span>{idea.last_event ?? "—"}</span>
      </div>
      {intake && (
        <div
          className="bg-blue-950/50 text-blue-200 px-1.5 py-1 rounded mt-1.5 text-[10px] cursor-help"
          title={intake.rationale}
        >
          🤖 intake: {intake.mode} · {intake.confidence}
        </div>
      )}
      {analytics.map((a) => (
        <AnalyticsRow key={`${a.idea_id}-${a.surface}`} a={a} />
      ))}
      {failure && (
        <div
          className="bg-red-950 text-red-300 px-1.5 py-1 rounded mt-1.5 text-[10px] truncate cursor-help"
          title={failure}
        >
          ⚠ {failure}
        </div>
      )}
      {/* Source-asset links — useful for post-mortem when a render goes weird */}
      {idea.rendered_artifacts &&
        (() => {
          const r = idea.rendered_artifacts as {
            png_urls?: string[];
            svg_urls?: string[];
          };
          const pngs = r.png_urls ?? [];
          const svgs = r.svg_urls ?? [];
          if (pngs.length === 0 && svgs.length === 0) return null;
          return (
            <div className="text-[9px] text-slate-500 mt-1.5 flex gap-1.5">
              {pngs.length > 0 && (
                <a
                  href={pngs[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-300 underline"
                  title={`View slide 1 PNG (${pngs.length} total)`}
                >
                  PNG×{pngs.length}
                </a>
              )}
              {svgs.length > 0 && (
                <a
                  href={svgs[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-300 underline"
                  title={`View slide 1 SVG source (${svgs.length} total)`}
                >
                  SVG×{svgs.length}
                </a>
              )}
            </div>
          );
        })()}
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

/**
 * Status columns that get auto-collapse for old items. `published` is the
 * obvious one — once auto-publish is on, this column grows indefinitely.
 * `failed` + `paused` benefit too — old failures stay visible for ~1 week
 * for forensic value, then collapse.
 *
 * Items older than COLLAPSE_AFTER_DAYS in these columns hide behind a
 * "+ Show N older" button. Other columns (queued / scheduled / etc.) stay
 * fully expanded because they represent live work, not history.
 */
const STATUSES_TO_COLLAPSE: ReadonlySet<IdeaStatus> = new Set<IdeaStatus>([
  "published",
  "failed",
  "paused_for_review",
]);
const COLLAPSE_AFTER_DAYS: number = 7;

export function Kanban({
  ideas,
  analyticsByIdea,
}: {
  ideas: ContentIdea[];
  analyticsByIdea?: Map<string, PostAnalytics[]>;
}) {
  const byStatus = new Map<IdeaStatus, ContentIdea[]>();
  for (const i of ideas) {
    const arr = byStatus.get(i.status) ?? [];
    arr.push(i);
    byStatus.set(i.status, arr);
  }

  // Cutoff: items with updated_at strictly older than this are "older"
  const cutoffMs = Date.now() - COLLAPSE_AFTER_DAYS * 24 * 60 * 60 * 1000;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {STATUS_ORDER.map((status) => {
        const items = byStatus.get(status) ?? [];
        const color = STATUS_COLORS[status];

        // For collapsing columns, split into recent + older. We use
        // updated_at (not created_at) so a recently-edited old item stays
        // visible. Order within each bucket follows the input order.
        const shouldCollapse = STATUSES_TO_COLLAPSE.has(status);
        const recent: ContentIdea[] = [];
        const older: ContentIdea[] = [];
        for (const i of items) {
          const ts = new Date(i.updated_at).getTime();
          if (!shouldCollapse || Number.isNaN(ts) || ts >= cutoffMs) {
            recent.push(i);
          } else {
            older.push(i);
          }
        }

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
              ) : older.length === 0 ? (
                recent.map((i) => (
                  <Card
                    key={i.idea_id}
                    idea={i}
                    analytics={analyticsByIdea?.get(i.idea_id) ?? []}
                  />
                ))
              ) : (
                <CollapsibleColumnBody
                  visibleChildren={recent.map((i) => (
                    <Card
                      key={i.idea_id}
                      idea={i}
                      analytics={analyticsByIdea?.get(i.idea_id) ?? []}
                    />
                  ))}
                  hiddenChildren={older.map((i) => (
                    <Card
                      key={i.idea_id}
                      idea={i}
                      analytics={analyticsByIdea?.get(i.idea_id) ?? []}
                    />
                  ))}
                  hiddenLabel={`${older.length} older than ${COLLAPSE_AFTER_DAYS} day${COLLAPSE_AFTER_DAYS === 1 ? "" : "s"}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
