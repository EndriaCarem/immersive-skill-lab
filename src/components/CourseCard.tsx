import { Link } from "@tanstack/react-router";
import { brl, type Program } from "@/lib/store";
import coverPratico from "@/assets/cover-pratico.jpg";
import coverTeorico from "@/assets/cover-teorico.jpg";
import art from "@/assets/art-hero.jpg";
import { useFileUrl } from "@/lib/files";

export const coverFor = (p: Program) => (p.cover === "pratico" ? coverPratico : p.cover === "teorico" ? coverTeorico : art);

export function CourseCard({ p }: { p: Program }) {
  const soon = p.status === "soon";
  const custom = useFileUrl(p.coverFile?.id);
  const inner = (
    <>
      <div className="cover">
        <img src={custom ?? coverFor(p)} alt="" loading="lazy" width={1024} height={640} style={soon ? { filter: "grayscale(.6) opacity(.6)" } : undefined} />
        {p.fullPrice ? (
          <span className="promo-badge">
            <b>★ Promoção válida até 14/12</b>
            <small>Preço sujeito a alteração</small>
          </span>
        ) : null}
      </div>
      {soon && <Link to="/interesse" search={{ curso: p.title }} className="btn ghost course-interest">Avisar quando abrir</Link>}
      <div className="cbody">
        <span className="tag">{soon ? "Em breve" : p.kind}</span>
        <h3>{p.title}</h3>
        <p>{p.tagline}</p>
        {!soon && (
          <div style={{ fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: 24, color: "var(--plum)", margin: "4px 0 14px" }}>
            {brl(p.price)}
            {p.fullPrice ? <s style={{ fontSize: 14, color: "var(--slate-soft)", fontWeight: 500, marginLeft: 8 }}>{brl(p.fullPrice)}</s> : null}
          </div>
        )}
        <div className="cfoot">
          <span>
            <b style={{ color: "var(--ink)" }}>Rebeca Franzoni · Tainá Malta Rodrigues</b>
          </span>
        </div>
      </div>
    </>
  );
  return soon ? (
    <div className="ccard soon">{inner}</div>
  ) : (
    <Link to="/programa/$slug" params={{ slug: p.slug }} className="ccard">
      {inner}
    </Link>
  );
}
