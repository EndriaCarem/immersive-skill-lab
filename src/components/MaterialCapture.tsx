import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interestSchema } from "@/lib/interest-schema";
import { submitInterest } from "@/lib/interest.functions";

export function MaterialCapture({ pdfUrl }: { pdfUrl: string }) {
  const save = useServerFn(submitInterest);
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    const parsed = interestSchema.safeParse({ name: values.get("name"), email: values.get("email"), consent: values.get("consent") === "on", website: values.get("website") ?? "", source: "interest", interest: "Material gratuito — Conheça a Empiria", message: "Origem: /conheca", requestId: requestId.current });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira seus dados."); return; }
    setBusy(true); setError("");
    try {
      const result = await save({ data: parsed.data });
      if (!result.success) throw new Error("save_failed");
      setSent(true);
    } catch { setError("Não foi possível registrar. Tente novamente; seus dados continuam aqui."); }
    finally { setBusy(false); }
  };
  if (sent) return <div role="status" className="material-success"><Check size={24} /><h3>Seu material está liberado.</h3><Button asChild className="btn"><a href={pdfUrl} download target="_blank" rel="noopener noreferrer"><ArrowDownToLine />Baixar PDF gratuito</a></Button></div>;
  return <form className="material-form" onSubmit={submit} aria-busy={busy}>
    <label className="field"><span>Nome</span><input name="name" autoComplete="name" required maxLength={100} /></label>
    <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required maxLength={255} /></label>
    <div className="form-trap" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label="Website" /></div>
    <label className="consent-field"><input name="consent" type="checkbox" required /><span>Autorizo a Empiria a entrar em contato sobre este material. <Link to="/privacidade">Privacidade e LGPD</Link>.</span></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <Button type="submit" className="btn" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}{busy ? "Registrando…" : "Liberar meu material"}</Button>
  </form>;
}