export interface PromoBanner {
  id: string;
  store_id: string;
  image_url: string;
  headline: string | null;
  subtext: string | null;
  button_text: string | null;
  button_link: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
