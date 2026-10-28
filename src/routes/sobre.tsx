import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { SiteShell } from "@/components/AppShell";
import ibrawork from "@/assets/sobre-ibrawork.png.asset.json";
import nidia from "@/assets/sobre-nidia.png.asset.json";
import thomas from "@/assets/sobre-thomas-v2.jpg.asset.json";
import rebeca from "@/assets/sobre-rebeca.jpg.asset.json";
import taina from "@/assets/sobre-taina.jpg.asset.json";
import profThais from "@/assets/prof-thais.jpg.asset.json";
import profMaria from "@/assets/prof-maria.jpg.asset.json";
import profGustavo from "@/assets/prof-gustavo.jpg.asset.json";
import profJuliana from "@/assets/prof-juliana.png.asset.json";
import profBruno from "@/assets/prof-bruno.jpg.asset.json";

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

const PRACTICAL = ["Revisão de cláusula compromissória", "Redação de requerimento de arbitragem", "Indicação de árbitro", "Pesquisa sobre jurisdição", "Desenvolvimento de written statement", "Análise de sentença arbitral"];
const THEORY = ["Fase contratual", "Fase cautelar", "Fase de instauração", "Fase administrativa", "Fase instrutória", "Provas", "Audiências", "Fase executória"];

type Teacher = { name: string; photo: string; bio: string };
// Positions follow the teachers letter: index = demand/lesson number - 1.
const PRACTICAL_TEACHERS: (Teacher | undefined)[] = [
  { name: "Bruno Hellmeister Lico Canal", photo: profBruno.url, bio: "Graduado em Direito pela Pontifícia Universidade Católica de São Paulo (PUC-SP), com menção honrosa, possui Diploma on Legal Studies in Spain pela Universidad Pontificia Comillas, em Madri. É Presidente do New Voices, grupo de jovens arbitralistas da CMA CIESP/FIESP, membro da Diretoria do Chartered Institute of Arbitrators Brazil Branch e membro do Conselho Editorial da Revista PUC-SP ADR. É Conselheiro da Jovem Advocacia da OAB-SP, Secretário-Geral da Comissão de Sociedades da OAB-SP, Coordenador do Núcleo de Direito Civil da Comissão da Jovem Advocacia da OAB-SP e pesquisador dos projetos Arbitragem em Números e Mediação em Números." },
  { name: "Thaís Freire de Vasconcellos", photo: profThais.url, bio: "Advogada e Professora Substituta na Faculdade Nacional de Direito da UFRJ, com atuação acadêmica e pesquisa nas áreas de Direito Processual, Direito Civil e Direito Empresarial. Doutoranda e Mestre em Direito pela Universidade Federal Fluminense (UFF). Pós-Graduada em Direito Processual pela UFF e em Direito Civil e Empresarial pelo IBMEC/SP, é graduada em Direito pela UFF. É pesquisadora do Grupo de Estudos Jurisdição, Constituição e Processo." },
  undefined,
  { name: "Juliana Vieira", photo: profJuliana.url, bio: "Associada plena da área de Arbitragem do escritório Tauil & Chequer Advogados, associado a Mayer Brown LLP, em São Paulo. Atua em Arbitragem Internacional, com experiência em disputas comerciais complexas, especialmente nos setores de construção, petróleo e gás e fusões e aquisições (M&A). É pós-graduada em Direito Contratual pela Fundação Getulio Vargas (FGV/SP) e bacharel em Direito pela Universidade Presbiteriana Mackenzie. Possui experiência como secretária administrativa de tribunais arbitrais em procedimentos domésticos e atuação em casos pro bono." },
  undefined,
  { name: "Maria Isabel Gori Montes", photo: profMaria.url, bio: "Sócia de Finkelstein Advogados, com atuação consultiva, contenciosa e em arbitragem. Possui experiência como árbitra única e coárbitra, além de atuar como secretária de tribunais arbitrais. É LL.M. e especialista em Direito Empresarial pela University of California, Berkeley, e possui formação avançada em arbitragem internacional pela Leiden University, em cooperação com a Corte Permanente de Arbitragem (PCA). É bacharel em Direito pela Universidade de São Paulo (USP). Atua como professora assistente do Curso de Extensão em Arbitragem da PUC-SP e professora convidada do Curso de Extensão em Direito Societário da mesma instituição." },
];
const THEORY_TEACHERS: (Teacher | undefined)[] = [
  undefined, undefined, undefined, undefined, undefined, undefined, undefined,
  { name: "Gustavo Favero Vaughn", photo: profGustavo.url, bio: "Sócio de Cesar Asfor Rocha Advogados, com atuação acadêmica e profissional ligada ao Direito Processual e à arbitragem. Mestre em Direito Processual pela Universidade de São Paulo (USP) e LL.M. pela Columbia Law School. É professor do IDP, auditor do Superior Tribunal de Justiça Desportiva (STJD) do Futebol, coordenador acadêmico do Canal Arbitragem e Alumni Advisor na The American Review of International Arbitration (ARIA)." },
];

function TeacherCard({ teacher }: { teacher?: Teacher | undefined }) {
  return (
    <article className="ab-teacher ab-teacher-card">
      {teacher ? (
        <img className="ab-teacher-photo ab-teacher-img" src={teacher.photo} alt={teacher.name} loading="lazy" />
      ) : (
        <div className="ab-teacher-photo" aria-label="Foto do professor (em breve)"><span>Foto</span></div>
      )}
      <h4>{teacher?.name ?? "Nome do professor"}</h4>
      <p>{teacher?.bio ?? "Sócio(a) · [escritório]"}</p>
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

        <section className="wrap ab-sec">
          <div className="ab-head" data-rv><span className="ab-eyebrow">Investimento e tecnologia</span><h2>Quem está por trás.</h2></div>
          <div className="ab-who">
            <article data-rv>
              <div className="ab-who-media"><img src={ibrawork.url} alt="Ibrawork" className="ab-who-logo" /></div>
              <span className="ab-kicker">Investimento</span>
              <h3>Ibrawork</h3>
              <p>Financia a construção da plataforma e do catálogo. Centro de pesquisa em negócios, direito, inovação e cidades inteligentes, sediado em São Paulo, com unidade de P&D no Parque Científico e Tecnológico da Unicamp.</p>
            </article>
            <article data-rv>
              <div className="ab-who-media"><img src={nidia.url} alt="Nidia" className="ab-who-logo" /></div>
              <span className="ab-kicker">Tecnologia</span>
              <h3>Nidia</h3>
              <p>Inteligência artificial especializada em direito brasileiro, licenciada pelo Ibrawork. Corrige cada entrega pela rubrica dos professores e acompanha o aluno no chat. A tecnologia está a serviço do critério, não no lugar dele.</p>
            </article>
            <article data-rv>
              <div className="ab-who-media"><img src={thomas.url} alt="Thomas Law" className="ab-who-photo" /></div>
              <span className="ab-kicker">Fundador do Ibrawork</span>
              <h3>Thomas Law</h3>
              <p>Doutor em Direito Comercial e mestre pela PUC-SP, com pós-doutorado pela USP. Coach e árbitro do Willem C. Vis Moot, preside a Coordenação Nacional das Relações Brasil-China do Conselho Federal da OAB e o Ibrachina. Sócio do Thomas Law Advogados.</p>
            </article>
          </div>
        </section>

        <section className="wrap ab-sec">
          <div className="ab-head" data-rv>
            <span className="ab-eyebrow">Quem ensina</span>
            <h2>Um professor por demanda, um por aula.</h2>
            <p>Advogados das principais bancas de arbitragem do país, de casas diferentes: o padrão de correção não é o de um escritório só. O critério de cada um vira a rubrica que a Nidia aplica.</p>
          </div>
          <h3 className="ab-sub" data-rv>Curso prático</h3>
          <div className="ab-grid3">
            {PRACTICAL.map((t, i) => <div key={t} data-rv><TeacherCard teacher={PRACTICAL_TEACHERS[i]} /></div>)}
          </div>
          <h3 className="ab-sub" data-rv>Curso teórico</h3>
          <div className="ab-grid4">
            {THEORY.map((t, i) => <div key={t} data-rv><TeacherCard teacher={THEORY_TEACHERS[i]} /></div>)}
          </div>
        </section>

      </div>
    </SiteShell>
  );
}
