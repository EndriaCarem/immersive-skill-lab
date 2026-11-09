import { z } from "zod";

export const rubricCriteriaSchema = z.array(z.object({
  criterion: z.string().trim().min(1, "Informe o nome do critério.").max(200),
  description: z.string().trim().min(1, "Descreva o que o critério avalia.").max(4000),
  weight: z.number().finite().positive("O peso deve ser maior que zero."),
})).min(1, "Cadastre pelo menos um critério.").max(30).superRefine((items, ctx) => {
  const names = items.map(i => i.criterion.toLocaleLowerCase("pt-BR"));
  if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "Os critérios não podem ter nomes repetidos." });
});

export const saveRubricSchema = z.object({
  programId: z.string().min(1).max(80), activityId: z.string().min(1).max(80),
  updatedAt: z.string().min(1), criteria: rubricCriteriaSchema,
});