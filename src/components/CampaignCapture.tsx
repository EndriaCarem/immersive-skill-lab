import { useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, LoaderCircle, ShieldCheck, BookOpen, BriefcaseBusiness, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interestSchema } from "@/lib/interest-schema";
import { submitInterest } from "@/lib/interest.functions";

export function CampaignCapture({ onSaved }: { onSaved: (name: string, interest: string) => void }) {
  const save = useServerFn(submitInterest);
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [interest, setInterest] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    const parsed = interestSchema.safeParse({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), interest,
      consent: form.get("consent") === "on", marketingOptIn: form.get("marketing") === "on", website: form.get("website") ?? "",
      source: "interest", campaignPath: "/conheca", message: "", requestId: requestId.current });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    try {
      const result = await save({ data: parsed.data });
      if (!result.success) throw new Error("save_failed");
      onSaved(parsed.data.name.split(" ")[0] ?? parsed.data.name, interest);
    } catch { setErrors({ form: "Não foi possível salvar agora. Seus dados continuam aqui; tente novamente." }); }
    finally { setBusy(false); }
  };
  const error = (name: string) => errors[name] ? <small className="cq-error" id={`cq-error-${name}`}>{errors[name]}</small> : null;
  const options = [{ value: "Curso Simulado", Icon: BriefcaseBusiness }, { value: "Curso Teórico", Icon: BookOpen }, { value: "Os dois", Icon: Layers }];
  return <form className="cq-form" noValidate onSubmit={submit} aria-busy={busy}>
    <div className="cq-form-heading"><span>SEU PRIMEIRO PASSO</span><span>01 / 02</span></div>
    <h2>Entre. A casa é sua.</h2>
    <p>Conheça a Empiria por dentro.</p>
    <div className="cq-fields">
      {[{ name: "name", label: "Nome completo", placeholder: "Como podemos chamar você?", autoComplete: "name", type: "text", max: 100 },
        { name: "phone", label: "WhatsApp", placeholder: "(92) 90000-0000", autoComplete: "tel", type: "tel", max: 30 },
        { name: "email", label: "E-mail", placeholder: "voce@exemplo.com", autoComplete: "email", type: "email", max: 255 }].map((field) =>
        <label className="cq-field" key={field.name}><span>{field.label}</span><input name={field.name} type={field.type} autoComplete={field.autoComplete} placeholder={field.placeholder} maxLength={field.max} required aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `cq-error-${field.name}` : undefined} />{error(field.name)}</label>)}
    </div>
    <fieldset className="cq-interest"><legend>O que desperta seu interesse?</legend><div className="cq-options">{options.map(({ value, Icon }) => <label key={value} className={interest === value ? "selected" : ""}>
      <input type="radio" name="interest" value={value} checked={interest === value} onChange={() => setInterest(value)} /><Icon size={18} /><span>{value}</span>{interest === value && <Check className="cq-option-check" size={12} />}
    </label>)}</div>{error("interest")}</fieldset>
    <div className="form-trap" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label="Website" /></div>
    <label className="cq-consent"><input type="checkbox" name="consent" required aria-invalid={Boolean(errors["consent"])} /><span>Autorizo o tratamento dos meus dados para contato sobre os cursos, conforme a <Link to="/privacidade" target="_blank">Política de Privacidade e LGPD</Link>.</span></label>{error("consent")}
    <label className="cq-consent"><input type="checkbox" name="marketing" /><span>Quero receber novidades da Empiria por e-mail e WhatsApp. <small>Opcional.</small></span></label>
    {errors["form"] && <p role="alert" className="cq-error">{errors["form"]}</p>}
    <Button className="cq-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : null}{busy ? "Salvando seus dados…" : "Liberar o vídeo"}{!busy && <ArrowRight size={20} />}</Button>
    <div className="cq-safe"><ShieldCheck size={14} /> Seus dados protegidos. Sem criar uma conta.</div>
  </form>;
}