export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string | null;
  is_active: boolean;
  /** false = kept off the storefront's category menu, filter and home page. Missing counts as shown. */
  show_in_store?: boolean;
  createdAt?: string;
  store_id?: string;
}
