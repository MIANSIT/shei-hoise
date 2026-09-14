export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string | null;
  is_active: boolean;
  createdAt?: string;
  store_id?: string;
}
