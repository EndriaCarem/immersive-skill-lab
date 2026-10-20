import { z } from "zod";

export const interestSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  email: z.string().trim().email("Informe um e-mail válido.").max(255).transform((v) => v.toLowerCase()),
  interest: z.string().trim().min(1, "Selecione seu interesse.").max(160),
  message: z.string().trim().max(2000, "Use até 2.000 caracteres."),
  source: z.enum(["interest", "contact"]),
  consent: z.boolean().refine((v) => v, "Autorize o contato para continuar."),
  website: z.string().max(0, "Não foi possível enviar."),
  requestId: z.string().uuid(),
}).superRefine((data, ctx) => {
  if (data.source === "contact" && !data.message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "Escreva sua mensagem." });
  }
});

export type InterestInput = z.infer<typeof interestSchema>;