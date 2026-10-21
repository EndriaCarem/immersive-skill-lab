import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e LGPD — Empiria" },
      { name: "description", content: "Como a Empiria trata seus dados pessoais, com quais finalidades e como exercer seus direitos pela LGPD." },
      { property: "og:title", content: "Privacidade e LGPD — Empiria" },
      { property: "og:description", content: "Como a Empiria trata seus dados pessoais e como exercer seus direitos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

const PENDING = "a definir";
const sections: [string, string[]][] = [
  ["Quem é a controladora", [`Empiria — razão social e CNPJ: ${PENDING}. Encarregado(a) pelo tratamento de dados: ${PENDING}.`]],
  ["Dados que tratamos", [
    "Cadastro: nome, e-mail, telefone e CPF/CNPJ informados por você.",
    "Compra e matrícula: cursos escolhidos, valores, cupom, forma de pagamento, aceite dos termos com data, hora e IP.",
    "Formação: peças entregues, notas, devolutivas e certificados.",
    "Interesse e contato: nome, e-mail e mensagem enviados pelos formulários.",
    "Navegação: acessos a webinars por link com tag, registrados de forma anônima.",
  ]],
  ["Para que usamos", [
    "Criar e manter sua conta e sua matrícula (execução de contrato).",
    "Corrigir entregas, emitir devolutivas e certificados (execução de contrato).",
    "Cumprir obrigações fiscais e de defesa do consumidor (obrigação legal).",
    "Responder contatos e enviar comunicações de marketing apenas com seu consentimento, que pode ser retirado a qualquer momento.",
    "Medir o alcance dos webinars sem identificar quem acessou (legítimo interesse).",
  ]],
  ["Com quem compartilhamos", [`Somente com prestadores necessários à operação (hospedagem, pagamento e e-mail), sob contrato e dever de sigilo. Lista de prestadores ativos: ${PENDING}. Não vendemos dados pessoais.`]],
  ["Por quanto tempo guardamos", ["Pelo tempo da matrícula e pelos prazos legais aplicáveis (fiscais e de consumo). Depois disso, os dados são eliminados ou anonimizados."]],
  ["Seus direitos", [
    "Confirmar se tratamos seus dados e acessá-los.",
    "Corrigir dados incompletos ou desatualizados.",
    "Pedir anonimização, bloqueio ou eliminação de dados desnecessários.",
    "Pedir portabilidade e informações sobre compartilhamento.",
    "Revogar consentimentos e se opor a tratamentos.",
  ]],
  ["Segurança", ["Acesso restrito por perfil, dados de pedidos e contatos protegidos no servidor e registro das versões de termos aceitas. Incidentes relevantes são comunicados à ANPD e aos titulares nos prazos legais."]],
];

function Privacy() {
  return (
    <SiteShell>
      <main className="wrap legal-page">
        <span className="pillbadge soft">✦ LGPD · Lei 13.709/2018</span>
        <h1 className="display" style={{ textAlign: "left" }}>Privacidade e proteção de dados</h1>
        <p className="legal-note">Versão preliminar em revisão jurídica. Os itens marcados como "{PENDING}" serão preenchidos antes da publicação definitiva.</p>
        {sections.map(([t, items]) => (
          <section key={t}>
            <h2>{t}</h2>
            {items.length > 1 ? <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul> : <p>{items[0]}</p>}
          </section>
        ))}
        <section>
          <h2>Como exercer seus direitos</h2>
          <p>Escreva para o canal de privacidade ({PENDING}) ou use a página <Link to="/contato">Fale conosco</Link>. Respondemos nos prazos da LGPD. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
        </section>
        <p className="muted sm">Veja também os <Link to="/termos">Termos de uso e matrícula</Link>.</p>
      </main>
    </SiteShell>
  );
}
