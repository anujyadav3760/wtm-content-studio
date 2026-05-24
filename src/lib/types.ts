/**
 * ContentIdea type — mirrors `wtm-social-automation/models/content_idea.py`.
 *
 * Source of truth is the Python Pydantic model + the Supabase
 * `public.wtm_social_content_ideas` table schema. Keep this in sync if
 * either changes — there's no codegen yet (Phase δ candidate).
 */

export type IdeaStatus =
  | "queued"
  | "strategist_decided"
  | "creator_drafted"
  | "rendered"
  | "scheduled"
  | "published"
  | "failed"
  | "paused_for_review";

export type IdeaTriggerType =
  | "earnings"
  | "non_earnings_cron"
  | "manual"
  | "glossary"
  | "stock_of_week_series";

export type MediaType =
  | "svg_carousel"
  | "single_image"
  | "hybrid_carousel"
  | "video_reel"
  | "carousel_with_video";

export interface ContentIdea {
  idea_id: string;
  brand_id: string;
  trigger_type: IdeaTriggerType;
  pillar: string;
  subject: string;
  media_type: MediaType;
  target_publish_at: string | null;
  status: IdeaStatus;
  failure_stage: string | null;
  strategist_decision: Record<string, unknown> | null;
  research_pack: Record<string, unknown> | null;
  creator_payload: Record<string, unknown> | null;
  compliance_result: Record<string, unknown> | null;
  facts_result: Record<string, unknown> | null;
  rendered_artifacts: Record<string, unknown> | null;
  publisher_results: Record<string, unknown> | null;
  human_notes: string;
  overrides: Record<string, unknown>;
  events: Array<{
    timestamp: string;
    event_type: string;
    from_status: IdeaStatus | null;
    to_status: IdeaStatus | null;
    note: string;
    payload: Record<string, unknown>;
  }>;
  last_event: string | null;
  error_log: Array<{ stage: string; error: string; timestamp: string }>;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
}

export const STATUS_ORDER: IdeaStatus[] = [
  "queued",
  "strategist_decided",
  "creator_drafted",
  "rendered",
  "scheduled",
  "published",
  "failed",
  "paused_for_review",
];

export interface PostAnalytics {
  idea_id: string;
  surface: "ig" | "x";
  metricool_post_id: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profile_visits: number;
  link_clicks: number;
  engagement_rate: number;
  captured_at: string;
}

export const STATUS_COLORS: Record<IdeaStatus, string> = {
  queued: "#6b7280",
  strategist_decided: "#8b5cf6",
  creator_drafted: "#3b82f6",
  rendered: "#06b6d4",
  scheduled: "#f59e0b",
  published: "#10b981",
  failed: "#ef4444",
  paused_for_review: "#ec4899",
};
