/**
 * /new — 3-tab idea submission form.
 *
 * Three modes match the Python IdeaSubmission contract:
 *   1. Subject only   → backend runs Strategist+Creator+render+publish
 *   2. Subject+constraints → skips Strategist; uses constraints to guide Creator
 *   3. Full draft → operator writes copy; backend just renders + publishes
 *
 * On submit: POST /api/ideas. On success: redirect to / with the new idea
 * row visible in the kanban under 'queued' status. Within 15 min the
 * queue_drain cron classifies it and flips status → strategist_decided.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "subject" | "subject_plus" | "full_draft";
type Pillar =
  | "trend_analysis"
  | "concept_explainer"
  | "stock_of_week"
  | "moat_case_study";

export default function NewIdeaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("subject");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared form state across all 3 tabs — irrelevant fields ignored on submit
  const [subject, setSubject] = useState("");
  const [mustMention, setMustMention] = useState("");
  const [toneHint, setToneHint] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [captionIg, setCaptionIg] = useState("");
  const [xTweet, setXTweet] = useState("");
  const [blogMd, setBlogMd] = useState("");
  const [pillarOverride, setPillarOverride] = useState<Pillar | "">("");
  const [imageFormatOverride, setImageFormatOverride] = useState<
    "svg_carousel" | "hybrid_carousel" | "single_image" | ""
  >("");
  const [humanNotes, setHumanNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const must_mention = mustMention
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      brand_id: "wtm",
      mode,
      human_notes: humanNotes || "",
    };

    if (mode === "subject" || mode === "subject_plus") {
      payload.subject = subject;
    }
    if (mode === "subject_plus") {
      payload.must_mention = must_mention;
      payload.tone_hint = toneHint || null;
      payload.image_prompt = imagePrompt || null;
    }
    if (mode === "full_draft") {
      payload.subject = subject || null;
      payload.full_draft_caption_ig = captionIg;
      payload.full_draft_x_tweet = xTweet;
      payload.full_draft_blog_markdown = blogMd;
    }
    if (pillarOverride) payload.pillar_override = pillarOverride;
    if (imageFormatOverride) payload.image_format_override = imageFormatOverride;

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? "submission failed");
        setSubmitting(false);
        return;
      }
      // Redirect to kanban — the new idea appears in 'queued' column
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <a href="/" className="text-blue-400 text-sm hover:underline">
          ← back to kanban
        </a>
        <h1 className="text-2xl font-bold mt-2">Submit an idea</h1>
        <p className="text-slate-400 text-sm mt-1">
          The 15-min Railway poller picks this up. Within 15 minutes you&apos;ll see
          the Intake Agent&apos;s classification on the kanban card.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-slate-700">
        {(
          [
            { v: "subject", label: "Subject only" },
            { v: "subject_plus", label: "Subject + constraints" },
            { v: "full_draft", label: "Full draft" },
          ] as { v: Mode; label: string }[]
        ).map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setMode(t.v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              mode === t.v
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Subject field — shown in all modes */}
        <Field label={mode === "full_draft" ? "Subject (optional)" : "Subject *"}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`e.g. "Apple's App Store moat" or "What is FCF?"`}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
            minLength={mode === "full_draft" ? 0 : 10}
            maxLength={200}
            required={mode !== "full_draft"}
          />
        </Field>

        {/* subject_plus extra fields */}
        {mode === "subject_plus" && (
          <>
            <Field label="Must mention (one per line, max 5)">
              <textarea
                value={mustMention}
                onChange={(e) => setMustMention(e.target.value)}
                placeholder="e.g. App Store 30% commission&#10;Epic Games lawsuit"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 font-mono text-sm"
              />
            </Field>
            <Field label="Tone hint">
              <input
                type="text"
                value={toneHint}
                onChange={(e) => setToneHint(e.target.value)}
                placeholder="e.g. Skeptical, curious, contrarian, defensive..."
                maxLength={200}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              />
            </Field>
            <Field label="Image prompt (only for hybrid_carousel)">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Editorial illustration. Navy + gold palette. ..."
                rows={2}
                maxLength={600}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </Field>
          </>
        )}

        {/* full_draft fields */}
        {mode === "full_draft" && (
          <>
            <Field label="IG caption *">
              <textarea
                value={captionIg}
                onChange={(e) => setCaptionIg(e.target.value)}
                placeholder="Caption text (max 2200 chars)..."
                rows={6}
                maxLength={2200}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              />
              <div className="text-xs text-slate-500 mt-1">
                {captionIg.length} / 2200
              </div>
            </Field>
            <Field label="X tweet *">
              <textarea
                value={xTweet}
                onChange={(e) => setXTweet(e.target.value)}
                placeholder="Tweet (max 280 chars)..."
                rows={3}
                maxLength={280}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              />
              <div className="text-xs text-slate-500 mt-1">{xTweet.length} / 280</div>
            </Field>
            <Field label="Blog markdown *">
              <textarea
                value={blogMd}
                onChange={(e) => setBlogMd(e.target.value)}
                placeholder="# Title&#10;&#10;Body markdown, min 400 chars..."
                rows={12}
                minLength={400}
                maxLength={8000}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 font-mono text-sm"
              />
              <div className="text-xs text-slate-500 mt-1">
                {blogMd.length} / 8000 (min 400)
              </div>
            </Field>
          </>
        )}

        {/* Overrides — shown in all modes */}
        <details className="bg-slate-800 rounded p-4">
          <summary className="cursor-pointer font-medium text-sm">
            Overrides (optional)
          </summary>
          <div className="space-y-4 mt-4">
            <Field label="Pillar (override Intake Agent's pick)">
              <select
                value={pillarOverride}
                onChange={(e) => setPillarOverride(e.target.value as Pillar | "")}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
              >
                <option value="">(let agent decide)</option>
                <option value="trend_analysis">trend_analysis</option>
                <option value="concept_explainer">concept_explainer</option>
                <option value="stock_of_week">stock_of_week</option>
                <option value="moat_case_study">moat_case_study</option>
              </select>
            </Field>
            <Field label="Image format">
              <select
                value={imageFormatOverride}
                onChange={(e) =>
                  setImageFormatOverride(
                    e.target.value as
                      | "svg_carousel"
                      | "hybrid_carousel"
                      | "single_image"
                      | "",
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
              >
                <option value="">(let agent decide)</option>
                <option value="svg_carousel">svg_carousel</option>
                <option value="hybrid_carousel">hybrid_carousel (AI cover)</option>
                <option value="single_image">single_image (AI only)</option>
              </select>
            </Field>
            <Field label="Human notes (visible on kanban card)">
              <input
                type="text"
                value={humanNotes}
                onChange={(e) => setHumanNotes(e.target.value)}
                placeholder="e.g. Anuj's idea while waiting for coffee"
                maxLength={500}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
              />
            </Field>
          </div>
        </details>

        {error && (
          <div className="bg-red-900/40 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded transition"
          >
            {submitting ? "Submitting…" : "Queue idea"}
          </button>
          <a
            href="/"
            className="text-slate-400 hover:text-slate-200 px-6 py-2.5 transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
