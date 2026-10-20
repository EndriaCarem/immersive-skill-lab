import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { founders } from "@/lib/founders";

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
  return (
    <AppShell>
      <main className="pane">
        <div className="eyebrow">Sobre a Empiria</div>
        <p className="quote">Não é um curso sobre arbitragem; é o que você redige quando o caso chega.</p>

        <h4>Fundadoras</h4>
        <div className="cards founders-grid">
          {founders.map((f) => (
            <div className="card founder-card" key={f.name}>
              <img className="founder-portrait" src={f.photo} alt={f.name} width={384} height={384} />
              <h3>{f.name}</h3>
              <div className="kind">Fundadora</div>
            </div>
          ))}
        </div>

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

        <h4>Parceiros institucionais</h4>
        <div className="cards founders-grid">
          <div className="card">
            <div className="kind">Parceiro</div>
            <h3>Arbipédia</h3>
          </div>
          <div className="card">
            <div className="kind">Parceiro</div>
            <h3>CJA/CBMA</h3>
          </div>
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
