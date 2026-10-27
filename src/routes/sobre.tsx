import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { founders } from "@/lib/founders";
import { useEffect } from "react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Empiria — fundadoras, método e parceiros" },
      { name: "description", content: "Conheça Rebeca Franzoni e Tainá Malta Rodrigues, o método da Empiria e os parceiros Arbipédia e CJA/CBMA." },
      { property: "og:title", content: "Sobre a Empiria" },
      { property: "og:description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const method = [
  ["O caso", "O contexto chega antes da demanda, na mesma ordem em que chegaria no escritório."],
  ["A demanda", "Uma sócia de uma banca fictícia pede a peça. Sem roteiro — com o assistente de ofício ao lado."],
  ["A devolutiva", "Correção individual por rubrica, critério a critério, com nota e leitura do uso de IA."],
  ["O gabarito", "Liberado só depois da entrega: peça de referência comentada e vídeo de debriefing."],
];

function About() {
  useEffect(() => {
    const els = document.querySelectorAll(".fbio");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.25 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <AppShell>
      <main className="pane">
        <div className="eyebrow">Sobre a Empiria</div>
        <p className="quote">Não é um curso sobre arbitragem; é o que você redige quando o caso chega.</p>

        <h4>O método</h4>
        <ul className="acts">
          {method.map(([t, d], i) => (
            <li key={t}>
              <span className="num">{i + 1}</span>
              <span>
                <span className="ttl">{t}</span>
                <div className="meta">{d}</div>
              </span>
            </li>
          ))}
        </ul>
        <p className="muted sm">
          Rebeca e Tainá desenharam a sequência a partir da rotina de bancas de arbitragem: o aluno recebe, produz e é avaliado como seria no
          primeiro ano de escritório.
        </p>

        <h4>Fundadoras</h4>
        <div className="fbios">
          {founders.map((f, i) => (
            <article className="fbio" key={f.name} style={{ ["--i" as string]: i }}>
              <img className="fbio-photo" src={f.photo} alt={f.name} width={120} height={120} loading="lazy" />
              <div>
                <h3>{f.name}</h3>
                <div className="fbio-role">{f.role}</div>
                <p className="fbio-text doc-voice">
                  {f.bio.split(" ").map((w, k) => (
                    <span key={k} style={{ ["--w" as string]: k }}>{w} </span>
                  ))}
                </p>
              </div>
            </article>
          ))}
        </div>


        <div style={{ marginTop: 28 }}>
          <Link to="/" className="btn">
            Ver os cursos
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
