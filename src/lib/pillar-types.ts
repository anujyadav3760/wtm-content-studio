/**
 * Pillar config types — mirrors public.wtm_social_pillar_configs.
 */

export type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const DAYS: Day[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export type MediaType =
  | "svg_carousel"
  | "single_image"
  | "hybrid_carousel"
  | "video_reel"
  | "carousel_with_video";

export interface PillarConfig {
  brand_id: string;
  pillar_id: string;
  description: string;
  enabled: boolean;
  media_types_supported: MediaType[];
  day_weights: Partial<Record<Day, number>>;
  display_order: number;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}
