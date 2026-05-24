/**
 * /pillars — list + edit + add pillar configs for a brand.
 *
 * Reads via /api/pillars on mount. Each pillar gets an inline-editable
 * card: description textarea, day_weights matrix, enable toggle,
 * media-type checklist. Save button per-card → POST /api/pillars.
 *
 * Add-pillar form at top: pillar_id, description, media types, defaults
 * day_weights = 0 for all days (operator tunes after save).
 *
 * After save: re-fetch list so UI stays in sync. No optimistic updates
 * yet — keeps the code simple; Phase δ adds optimistic + undo.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { DAYS, Day, PillarConfig, MediaType } from "@/lib/pillar-types";

const MEDIA_TYPES: MediaType[] = [
  "svg_carousel",
  "single_image",
  "hybrid_carousel",
  "video_reel",
  "carousel_with_video",
];

export default function PillarsPage() {
  const [pillars, setPillars] = useState<PillarConfig[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPillars = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/pillars?brand_id=wtm");
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error ?? "fetch failed");
        return;
      }
      setPillars(j.pillars ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    fetchPillars();
  }, [fetchPillars]);

  return (
    <main className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <a href="/" className="text-blue-400 text-sm hover:underline">
          ← back to kanban
        </a>
        <h1 className="text-2xl font-bold mt-2">Pillar configuration</h1>
        <p className="text-slate-400 text-sm mt-1">
          Edit cadence (day weights), enable/disable, or add a new pillar. The
          Strategist agent reads this table to pick today&apos;s post.
        </p>
      </header>

      {error && (
        <div className="bg-red-900/40 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <NewPillarForm onSaved={fetchPillars} />

      {pillars === null ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {pillars.map((p) => (
            <PillarCard key={p.pillar_id} pillar={p} onSaved={fetchPillars} />
          ))}
          {pillars.length === 0 && (
            <div className="text-slate-400 text-sm italic">
              No pillars yet. Use the form above to add one — or run{" "}
              <code className="bg-slate-800 px-1 rounded">scripts/sync_pillars_to_supabase.py</code>{" "}
              on the Python side to bootstrap from the YAML seed.
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function PillarCard({
  pillar,
  onSaved,
}: {
  pillar: PillarConfig;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(pillar.description);
  const [enabled, setEnabled] = useState(pillar.enabled);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>(pillar.media_types_supported);
  const [weights, setWeights] = useState<Partial<Record<Day, number>>>(pillar.day_weights);
  const [displayOrder, setDisplayOrder] = useState(pillar.display_order);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: pillar.brand_id,
          pillar_id: pillar.pillar_id,
          description,
          enabled,
          media_types_supported: mediaTypes,
          day_weights: weights,
          display_order: displayOrder,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(`fail: ${j?.error ?? "unknown"}`);
      } else {
        setMsg("saved ✓");
        onSaved();
      }
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  function toggleMedia(t: MediaType) {
    setMediaTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function updateWeight(d: Day, value: string) {
    const n = parseFloat(value);
    setWeights((prev) => {
      const next = { ...prev };
      if (isNaN(n) || n === 0) {
        delete next[d];
      } else {
        next[d] = Math.max(0, Math.min(1, n));
      }
      return next;
    });
  }

  return (
    <div
      className={`border rounded-lg p-4 ${enabled ? "border-slate-700 bg-slate-800/50" : "border-slate-800 bg-slate-900 opacity-60"}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-100 font-mono">{pillar.pillar_id}</h3>
            <label className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded"
              />
              enabled
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              order
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-slate-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs text-slate-400 mb-1.5">Media types supported</label>
        <div className="flex gap-3 flex-wrap">
          {MEDIA_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={mediaTypes.includes(t)}
                onChange={() => toggleMedia(t)}
                className="rounded"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-slate-400 mb-1.5">
          Day weights (0–1, blank = 0 = never picked that day)
        </label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d) => (
            <div key={d}>
              <div className="text-[10px] text-slate-500 mb-0.5 uppercase">{d.slice(0, 3)}</div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={weights[d] ?? ""}
                onChange={(e) => updateWeight(d, e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-center"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-medium px-4 py-1.5 rounded transition"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
        {pillar.last_updated_by && (
          <span className="text-[10px] text-slate-500 ml-auto">
            last edit: {pillar.last_updated_by}
          </span>
        )}
      </div>
    </div>
  );
}

function NewPillarForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [pillarId, setPillarId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const r = await fetch("/api/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: "wtm",
          pillar_id: pillarId,
          description,
          enabled: true,
          media_types_supported: ["svg_carousel"],
          day_weights: {},
          display_order: 100,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(`fail: ${j?.error ?? j?.issues?.[0]?.message ?? "unknown"}`);
      } else {
        setMsg("created ✓");
        setPillarId("");
        setDescription("");
        setOpen(false);
        onSaved();
      }
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded mb-6 transition"
      >
        + Add pillar
      </button>
    );
  }

  return (
    <div className="border border-emerald-700/50 rounded-lg p-4 mb-6 bg-emerald-950/20">
      <h3 className="font-semibold text-emerald-300 mb-3">New pillar</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Pillar ID (lowercase, snake_case)
          </label>
          <input
            type="text"
            value={pillarId}
            onChange={(e) => setPillarId(e.target.value.toLowerCase())}
            placeholder="e.g. quarterly_outlook"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What this pillar covers + when Strategist should pick it"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={save}
            disabled={saving || !pillarId || !description}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 text-white text-sm px-4 py-1.5 rounded"
          >
            {saving ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cancel
          </button>
          {msg && <span className="text-xs text-slate-400">{msg}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          After creation: edit day_weights + media types on the card. Heads-up:
          adding a pillar here doesn&apos;t auto-create visual templates — the
          Strategist+Creator will use whatever templates the chosen media type
          already supports.
        </p>
      </div>
    </div>
  );
}
