import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { SiteShell } from "@/components/AppShell";
import rebeca from "@/assets/sobre-rebeca.jpg.asset.json";
import taina from "@/assets/sobre-taina.jpg.asset.json";
import ibrawork from "@/assets/sobre-ibrawork.png.asset.json";
import nidia from "@/assets/sobre-nidia.png.asset.json";
import thomas from "@/assets/sobre-thomas-v2.jpg.asset.json";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Quem somos — Empiria" },
      { name: "description", content: "Empiria é o conhecimento que vem da experiência: as fundadoras Rebeca Franzoni e Tainá Malta, o Ibrawork, a Nidia e quem ensina." },
      { property: "og:title", content: "Quem somos — Empiria" },
      { property: "og:description", content: "Empiria é o conhecimento que vem da experiência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const BELIEFS = [
  "A oportunidade deve encontrar você pronto.",
  "Competência, estratégia e pensamento crítico se constroem fazendo e sendo corrigido.",
  "Tecnologia serve para formar gente, não para substituí-la.",
];

const FOUNDERS = [
  {
    name: "Rebeca Franzoni", photo: rebeca.url, tag: "PUC-SP · CJA/CBMA",
    bio: "Mestranda em Direito das Relações Econômicas Internacionais (com bolsa CAPES) e bacharel pela PUC-SP com honras em 2022. Pós-graduada em Direito dos Contratos, com especialização em arbitragem internacional por Columbia, Roma Tre, USP e Sciences Po. Competidora em três edições do Willem C. Vis Moot e hoje coach da equipe da PUC-SP, foi monitora e professora assistente em processo civil, direito comercial e arbitragem. Preside o Comitê de Jovens Arbitralistas do CBMA desde 2025 e atua há seis anos com arbitragem e contencioso empresarial nos principais escritórios de São Paulo.",
  },
  {
    name: "Tainá Malta", photo: taina.url, tag: "PUC-Rio · CJA/CBMA",
    bio: "Mestranda em Análise e Gestão de Políticas Internacionais pela PUC-Rio e bacharel em Direito pelo Mackenzie Rio em 2021. Pós-graduada em Direito Internacional pela USP, com formação em arbitragem e propriedade intelectual pela CIArb Brasil, CPA Arbitragem, LES Brasil e D. Portilho Academy. Foi competidora da CAMARB, coach da equipe da UERJ vice-campeã do Moot CSD-ABPI e professora convidada na UERJ, UFF e Mackenzie Rio. Vice-presidente do CJA/CBMA desde 2025, atua em contencioso cível, propriedade intelectual e societário, com dez anos de trajetória jurídica.",
  },
];

const PRACTICAL = ["Revisão de cláusula compromissória", "Redação de requerimento de arbitragem", "Indicação de coárbitro", "Pesquisa sobre jurisdição", "Desenvolvimento de written statement", "Análise de sentença arbitral"];
const THEORY = ["Fase contratual", "Fase cautelar", "Fase de instauração", "Constituição do tribunal", "Fase postulatória", "Fase instrutória", "Fase decisória", "Fase executória"];

function TeacherCard({ label, title }: { label: string; title: string }) {
  return (
    <article className="ab-teacher">
      <div className="ab-teacher-av" aria-hidden="true">E</div>
      <div>
        <span className="ab-kicker">{label}</span>
        <h4>{title}</h4>
        <p>Professor(a) a confirmar</p>
      </div>
    </article>
  );
}

function About() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in");
      else if (e.boundingClientRect.top > 0) e.target.classList.remove("in");
    }), { threshold: 0.12 });
    node.querySelectorAll<HTMLElement>("[data-rv]").forEach((el, i) => { el.style.setProperty("--d", String(i % 4)); io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <SiteShell>
      <div ref={root} className="ab">
        <section className="ab-hero">
          <div className="wrap ab-hero-grid">
            <div data-rv>
              <span className="ab-eyebrow">Quem somos</span>
              <h1>Empiria é o conhecimento que vem da <em>experiência</em>.</h1>
            </div>
            <div className="ab-hero-text" data-rv>
              <p>A ideia surgiu de quase seis anos das fundadoras em salas de aula das melhores faculdades de São Paulo e do Rio de Janeiro, e da troca com a comunidade jovem no Comitê de Jovens Arbitralistas do CBMA.</p>
              <p>A faculdade ensina a teoria. O dia a dia do advogado é a soma de tarefas que não têm nome: protocolar na plataforma da câmara, escrever ao cliente, pesquisar a jurisprudência minoritária. A Empiria existe para que se aprendam <b>antes</b>, num escritório simulado, com feedback específico e especializado.</p>
            </div>
          </div>
        </section>

        <section className="wrap ab-sec">
          <div className="ab-head" data-rv><span className="ab-eyebrow">No que acreditamos</span><h2>Três convicções.</h2></div>
          <div className="ab-beliefs">
            {BELIEFS.map((b, i) => (
              <div key={b} className="ab-belief" data-rv><span>0{i + 1}</span><p>{b}</p></div>
            ))}
          </div>
        </section>

        <section className="wrap ab-sec">
          <div className="ab-head" data-rv><span className="ab-eyebrow">As fundadoras</span><h2>Quem faz a Empiria.</h2></div>
          <div className="ab-founders">
            {FOUNDERS.map((f) => (
              <article key={f.name} className="ab-founder" data-rv>
                <img src={f.photo} alt={f.name} loading="lazy" />
                <div>
                  <span className="ab-kicker">Fundadora · {f.tag}</span>
                  <h3>{f.name}</h3>
                  <p>{f.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ab-band">
          <div className="wrap ab-sec">
            <div className="ab-head" data-rv><span className="ab-eyebrow">Investimento e tecnologia</span><h2>Quem está por trás.</h2></div>
            <div className="ab-orgs">
              <article className="ab-org" data-rv>
                <img src={ibrawork.url} alt="Ibrawork" className="ab-org-logo" loading="lazy" />
                <span className="ab-kicker">Investimento</span>
                <p>O Ibrawork financia a construção da plataforma e do catálogo. Fundado por Thomas Law e sediado em São Paulo, é um centro de pesquisa em negócios, direito, inovação e cidades inteligentes, com unidade de P&D no Parque Científico e Tecnológico da Unicamp.</p>
              </article>
              <article className="ab-org" data-rv>
                <img src={nidia.url} alt="Nidia" className="ab-org-logo" loading="lazy" />
                <span className="ab-kicker">Tecnologia</span>
                <p>Licenciada pelo Ibrawork, a Nidia é uma inteligência artificial especializada em direito brasileiro. Corrige cada entrega pela rubrica dos professores e acompanha o aluno no chat. A tecnologia está a serviço do critério, não no lugar dele.</p>
              </article>
              <article className="ab-org ab-person" data-rv>
                <img src={thomas.url} alt="Thomas Law" className="ab-person-photo" loading="lazy" />
                <div>
                  <span className="ab-kicker">Fundador do Ibrawork</span>
                  <h3>Thomas Law</h3>
                  <p>Doutor em Direito Comercial e mestre pela PUC-SP, com pós-doutorado pela USP. Coach e árbitro do Willem C. Vis Moot, preside a Coordenação Nacional das Relações Brasil-China do Conselho Federal da OAB e o Ibrachina. Sócio do Thomas Law Advogados.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="wrap ab-sec">
          <div className="ab-head" data-rv>
            <span className="ab-eyebrow">Quem ensina</span>
            <h2>Um professor por demanda, um por aula.</h2>
            <p>Advogados das principais bancas de arbitragem do país, de casas diferentes: o padrão de correção não é o de um escritório só. O critério de cada um vira a rubrica que a Nidia aplica.</p>
          </div>
          <h3 className="ab-sub" data-rv>Curso Simulado · seis demandas</h3>
          <div className="ab-grid3">
            {PRACTICAL.map((t, i) => <div key={t} data-rv><TeacherCard label={`Demanda ${i + 1}`} title={t} /></div>)}
          </div>
          <h3 className="ab-sub" data-rv>Curso Teórico · oito aulas</h3>
          <div className="ab-grid4">
            {THEORY.map((t, i) => <div key={t} data-rv><TeacherCard label={`Aula ${i + 1}`} title={t} /></div>)}
          </div>
        </section>

        <section className="wrap">
          <div className="ab-final" data-rv>
            <h2>A oportunidade deve encontrar você pronto.</h2>
            <p>Curso Teórico por R$ 590 e Curso Simulado por R$ 890 até a liberação dos cursos em 14 de dezembro, com acesso por seis meses.</p>
            <div className="ab-acts">
              <Link to="/cursos" className="ab-btn">Garantir o preço de lançamento</Link>
              <Link to="/contato" className="ab-btn ghost">Fale com a gente</Link>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
