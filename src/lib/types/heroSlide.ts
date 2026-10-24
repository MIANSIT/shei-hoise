export const HERO_BUTTON_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type HeroButtonPosition = (typeof HERO_BUTTON_POSITIONS)[number];

export interface HeroSlide {
  id: string;
  store_id: string;
  image_url: string;
  headline: string | null;
  subtext: string | null;
  button_text: string | null;
  button_link: string | null;
  /** null = under the headline/subtext, as before. */
  button_position: HeroButtonPosition | null;
  /** null = phones use button_position. */
  button_position_mobile: HeroButtonPosition | null;
  button_new_tab: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
