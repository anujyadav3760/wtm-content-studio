/**
 * GET /api/pillars?brand_id=wtm — list pillar configs for a brand.
 * POST /api/pillars — upsert a single pillar config row.
 *
 * Both routes are session-gated (NextAuth allowlist).
 * POST body shape mirrors public.wtm_social_pillar_configs columns.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";
import { DAYS } from "@/lib/pillar-types";

const PillarUpsertSchema = z.object({
  brand_id: z.string().default("wtm"),
  pillar_id: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, "lowercase letters / digits / underscores only, must start with letter"),
  description: z.string().min(1).max(500),
  enabled: z.boolean().default(true),
  media_types_supported: z
    .array(
      z.enum([
        "svg_carousel",
        "single_image",
        "hybrid_carousel",
        "video_reel",
        "carousel_with_video",
      ]),
    )
    .min(1)
    .default(["svg_carousel"]),
  day_weights: z.record(z.enum(DAYS as [string, ...string[]]), z.number().min(0).max(1)).default({}),
  display_order: z.number().int().min(0).default(100),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const brand_id = searchParams.get("brand_id") ?? "wtm";

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wtm_social_pillar_configs")
    .select("*")
    .eq("brand_id", brand_id)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[/api/pillars GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pillars: data ?? [] });
}

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
  const parsed = PillarUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from("wtm_social_pillar_configs")
    .upsert(
      { ...parsed.data, last_updated_by: session.user.email },
      { onConflict: "brand_id,pillar_id" },
    );
  if (error) {
    console.error("[/api/pillars POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pillar_id: parsed.data.pillar_id }, { status: 200 });
}
