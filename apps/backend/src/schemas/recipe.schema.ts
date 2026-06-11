import { z } from "zod";

export const recipeListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  diet: z.string().trim().max(50).optional(),
  maxReadyTime: z.coerce.number().int().min(1).max(480).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type RecipeListQuery = z.infer<typeof recipeListQuerySchema>;
