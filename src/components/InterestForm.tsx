import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interestSchema } from "@/lib/interest-schema";
import { submitInterest } from "@/lib/interest.functions";
import { useStore } from "@/lib/store";

export function InterestForm({ source = "interest", initialInterest = "" }: { source?: "interest" | "contact"; initialInterest?: string }) {
  const programs = useStore((s) => s.programs);
  const options = [...new Set([...programs.filter((p) => p.status !== "draft").map((p) => p.title), "Parceria com escritório", "Outro assunto"])];
  const [interest, setInterest] = useState(initialInterest);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestId = useRef<string | null>(null);
  const save = useServerFn(submitInterest);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    const parsed = interestSchema.safeParse({ name: form.get("name"), email: form.get("email"), interest,
      message: form.get("message") ?? "", consent: form.get("consent") === "on", website: form.get("website") ?? "", source, requestId: requestId.current });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await save({ data: parsed.data });
      if (!result.success) throw new Error("save_failed");
      setSent(true);
    } catch {
      setErrors({ form: "Não foi possível registrar agora. Seus dados continuam aqui; tente novamente." });
    } finally { setBusy(false); }
  };
  if (sent) return <div className="interest-success" role="status" tabIndex={-1}>
    <CheckCircle2 size={36} aria-hidden="true" />
    <h2>{source === "contact" ? "Mensagem registrada" : "Interesse registrado"}</h2>
    <p>Seus dados foram recebidos pela Empiria para contato sobre {interest}.</p>
    <Button className="btn ghost" onClick={() => { setSent(false); requestId.current = null; }}>Enviar outro registro</Button>
  </div>;
  const error = (field: string) => errors[field] ? <small id={`error-${field}`} className="form-error">{errors[field]}</small> : null;
  return <form className="interest-form" onSubmit={submit} noValidate aria-busy={busy}>
    <h2>{source === "contact" ? "Envie sua mensagem" : "Deixe seu interesse"}</h2>
    <div className="interest-fields">
      <label className="field"><span>Nome completo</span><input name="name" autoComplete="name" required maxLength={100} aria-invalid={!!errors.name} aria-describedby={errors.name ? "error-name" : undefined} />{error("name")}</label>
      <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={255} aria-invalid={!!errors.email} aria-describedby={errors.email ? "error-email" : undefined} />{error("email")}</label>
    </div>
    <label className="field"><span>Interesse</span><select value={interest} onChange={(e) => setInterest(e.target.value)} required aria-invalid={!!errors.interest} aria-describedby={errors.interest ? "error-interest" : undefined}>
      <option value="">Selecione um curso ou assunto</option>
      {initialInterest && !options.includes(initialInterest) && <option>{initialInterest}</option>}
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>{error("interest")}</label>
    <label className="field"><span>Mensagem{source === "interest" ? " (opcional)" : ""}</span><textarea name="message" rows={4} maxLength={2000} required={source === "contact"} aria-invalid={!!errors.message} aria-describedby={errors.message ? "error-message" : undefined} />{error("message")}</label>
    <div className="form-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="consent-field"><input type="checkbox" name="consent" required aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "error-consent" : undefined} /><span>Autorizo a Empiria a usar meu nome e e-mail para entrar em contato sobre o assunto escolhido.</span></label>
    {error("consent")}
    {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
    <Button type="submit" className="btn wide lg" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{busy ? "Registrando…" : source === "contact" ? "Enviar mensagem" : "Registrar interesse"}</Button>
  </form>;
}