/**
 * POST /api/ideas — queue a UI-submitted idea for the 15-min Railway poller.
 *
 * Writes to `public.wtm_social_content_ideas` with:
 *   - status='queued', trigger_type='manual'
 *   - subject = whatever the operator typed (or first 100 chars of full draft)
 *   - overrides.submission = the full IdeaSubmission JSON (Python side reads
 *     this out + classifies via the Intake Agent)
 *
 * Auth: NextAuth session required. Middleware ALREADY gates this route at the
 * top level, but we re-check getServerSession here as belt+braces — never
 * accept an unauthenticated write to the production queue.
 *
 * Validation: Zod schema mirrors the Python Pydantic IdeaSubmission. If the
 * frontend somehow sends invalid data we 400 before hitting Supabase.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";
import { randomUUID } from "crypto";

const PillarEnum = z.enum([
  "trend_analysis",
  "concept_explainer",
  "stock_of_week",
  "moat_case_study",
]);

const ImageFormatEnum = z.enum(["svg_carousel", "hybrid_carousel", "single_image"]);

const SubmissionSchema = z
  .object({
    brand_id: z.string().default("wtm"),
    mode: z.enum(["subject", "subject_plus", "full_draft"]),
    subject: z.string().min(10).max(200).optional().nullable(),
    must_mention: z.array(z.string().max(80)).max(5).default([]),
    tone_hint: z.string().max(200).optional().nullable(),
    image_prompt: z.string().max(600).optional().nullable(),
    full_draft_caption_ig: z.string().max(2200).optional().nullable(),
    full_draft_x_tweet: z.string().max(280).optional().nullable(),
    full_draft_blog_markdown: z.string().min(400).max(8000).optional().nullable(),
    pillar_override: PillarEnum.optional().nullable(),
    image_format_override: ImageFormatEnum.optional().nullable(),
    target_publish_at: z.string().datetime().optional().nullable(),
    human_notes: z.string().max(500).default(""),
  })
  .refine(
    (s) => {
      // Mode-specific minimum-content requirement
      if (s.mode === "subject" || s.mode === "subject_plus") {
        return !!s.subject;
      }
      // full_draft requires all three draft fields
      if (s.mode === "full_draft") {
        return (
          !!s.full_draft_caption_ig &&
          !!s.full_draft_x_tweet &&
          !!s.full_draft_blog_markdown
        );
      }
      return true;
    },
    { message: "Mode-specific required fields missing" },
  );

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = SubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const submission = parsed.data;

  const ideaId = `manual-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const subjectForDisplay =
    submission.subject ??
    submission.full_draft_caption_ig?.slice(0, 100) ??
    "(no subject)";

  const supabase = getSupabase();
  const { error } = await supabase
    .from("wtm_social_content_ideas")
    .insert({
      idea_id: ideaId,
      brand_id: submission.brand_id,
      trigger_type: "manual",
      pillar: submission.pillar_override ?? "(pending intake)",
      subject: subjectForDisplay,
      media_type: submission.image_format_override ?? "svg_carousel",
      target_publish_at: submission.target_publish_at,
      status: "queued",
      // Stash the full submission for the Intake Agent to read out
      overrides: { submission, submitted_by: session.user.email },
      human_notes: submission.human_notes,
      events: [
        {
          timestamp: new Date().toISOString(),
          event_type: "ui_submitted",
          from_status: null,
          to_status: "queued",
          note: `submitted via /new by ${session.user.email}`,
          payload: { mode: submission.mode },
        },
      ],
      last_event: "ui_submitted",
    });

  if (error) {
    console.error("[/api/ideas] Supabase insert error:", error);
    return NextResponse.json(
      { error: "supabase", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ idea_id: ideaId, status: "queued" }, { status: 201 });
}
