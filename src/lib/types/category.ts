export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  slug: string;
  parent_id?: string | null;
  is_active: boolean;
}
