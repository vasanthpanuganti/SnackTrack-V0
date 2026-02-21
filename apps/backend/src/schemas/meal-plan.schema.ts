import { z } from "zod";

export const updateMealPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived", "draft"]).optional(),
});

export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
