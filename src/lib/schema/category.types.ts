import { CreateCategoryType } from "./category.schema";

export type CategoryWithRelationsType = CreateCategoryType & {
  id: string;
  created_at: string;
  edited_at: string | null;
};
