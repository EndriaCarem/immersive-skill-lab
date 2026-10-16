import { useSyncExternalStore , useEffect, useState } from "react";
import type { FileRef } from "./files";
export type { FileRef };

export type Doc = { name: string; content: string };
export type Criterion = { criterion: string };
export type Activity = {
  id: string;
  title: string;
  shortTitle: string;
  duration: string;
  summary: string;
  caseParagraphs: string[];
  caseNote: string;
  attachments: Doc[];
  demandFrom: string;
  demandSubject: string;
  demandBody: string;
  demandVideoCaption: string;
  uploadHint: string;
  feedbackGuidance: string;
  reflectionPoints: string[];
  rubric: Criterion[];
  answerVideoCaption: string;
  answerVideoUrl: string;
  answerIntro: string;
  referenceDoc: Doc & { description: string };
  guideDocs: Doc[];
  caseHtml?: string;
  demandHtml?: string;
  feedbackHtml?: string;
  answerHtml?: string;
  files?: FileRef[];
  answerFiles?: FileRef[];
};
export type Program = {
  id: string;
  slug: string;
  area: string;
  kind: string;
  title: string;
  tagline: string;
  description: string;
  price: number | null;
  fullPrice?: number | null;
  cover?: "pratico" | "teorico";
  learn?: string[];
  includes?: string[];
  descriptionHtml?: string;
  coverFile?: FileRef | null;
  files?: FileRef[];
  status: "published" | "soon" | "draft";
  skills: string[];
  activities: Activity[];
};
export type Grade = { criterion: string; score: number; comment: string };
export type Submission = {
  id: string;
  programId: string;
  activityId: string;
  student: string;
  fileName: string;
  fileSize: number;
  aiUse: string;
  submittedAt: string;
  grades?: Grade[];
  teacherComment?: string;
  /** Timestamps of human-review requests; the brand allows at most 2 per submission. */
  humanReviews?: string[];
};
export type Enrollment = { programId: string; student: string; enrolledAt: string };
export type Certificate = { code: string; programId: string; student: string; issuedAt: string; grade: number | null };
export type Note = { id: string; programId: string; activityId: string; text: string; at: string };

export type State = {
  student: string;
  programs: Program[];
  enrollments: Enrollment[];
  submissions: Submission[];
  certificates: Certificate[];
  notes: Note[];
};

const uid = () => Math.random().toString(36).slice(2, 10);
export const certCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const p = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return `${p()}-${p()}`;
};

function act(n: number, title: string, shortTitle: string, duration: string, summary: string, extra: Partial<Activity> = {}): Activity {
  return {
    id: `a${n}`,
    title,
    shortTitle,
    duration,
    summary,
    caseParagraphs: [
      "A banca representa a Helvetia Componentes S.A., fornecedora de peças industriais. Em março de 2024 a Helvetia celebrou contrato de fornecimento de longo prazo com a Nordeste Montagens Ltda., com cláusula compromissória prevendo arbitragem institucional, sede em São Paulo, três árbitros e idioma português.",
      "Entre agosto e dezembro de 2025 a Nordeste deixou de pagar sete faturas, totalizando R$ 4,2 milhões, e passou a alegar defeito de qualidade nas peças — sem nunca ter formalizado recusa no prazo contratual de dez dias.",
      "A Nordeste agora sustenta que a cláusula é inválida, por não indicar a instituição arbitral de forma precisa, e que a disputa deveria correr no Judiciário.",
    ],
    caseNote:
      "Procedimento arbitral é confidencial. Todo material parte de caso construído para o exercício — o que resolve o sigilo e permite plantar deliberadamente os erros que o aluno precisa encontrar.",
    attachments: [
      { name: "Contrato de fornecimento", content: "CONTRATO DE FORNECIMENTO — Helvetia Componentes S.A. x Nordeste Montagens Ltda.\n\nCláusula 18 — Arbitragem: as partes elegem a arbitragem institucional, sede em São Paulo, três árbitros, idioma português.\nCláusula 9 — Recusa de mercadoria: no prazo de 10 dias do recebimento." },
      { name: "Faturas em aberto", content: "Faturas vencidas entre ago/2025 e dez/2025: 7 faturas, total R$ 4.200.000,00." },
      { name: "Correspondência das partes", content: "E-mail da Nordeste (jan/2026): alega defeito de qualidade e invalidade da cláusula compromissória." },
    ],
    demandFrom: "Dra. Helena Vasconcelos, sócia",
    demandSubject: "Helvetia — providência urgente",
    demandBody: `Precisamos avançar nesta etapa até sexta. ${summary}. Qualquer dúvida me chama.`,
    demandVideoCaption: "Sua chefe · 2 min",
    uploadHint: ".docx ou .pdf · até 5 páginas",
    feedbackGuidance:
      "Sua entrega foi recebida. Antes de abrir o gabarito, releia a demanda da sócia e confira se cada instrução expressa foi atendida — é o primeiro ponto que um revisor sênior verifica.",
    reflectionPoints: [
      "Você respondeu a todos os pontos que a sócia sinalizou expressamente?",
      "Cada afirmação de fato está ancorada em um documento do caso?",
      "Se usou IA, consegue sustentar cada parágrafo se for questionado?",
    ],
    rubric: [
      { criterion: "Atendimento à instrução da demanda" },
      { criterion: "Fundamentação" },
      { criterion: "Clareza, concisão e limite" },
    ],
    answerVideoCaption: "Prof. comentando · 4 min",
    answerVideoUrl: "",
    answerIntro: "O que um revisor sênior olha primeiro nesta peça, e por quê. Assista depois de ler sua ficha.",
    referenceDoc: {
      name: `${shortTitle} — versão de referência`,
      description: "Peça completa com anotações marginais explicando cada escolha de redação e as alternativas possíveis.",
      content: `VERSÃO DE REFERÊNCIA — ${title}\n\n[Peça modelo com anotações do professor]`,
    },
    guideDocs: [
      { name: "Guia de elaboração — instituição arbitral", content: "Guia de elaboração." },
      { name: "Checklist de requisitos de validade da cláusula", content: "1. Forma escrita\n2. Indicação da instituição\n3. Sede\n4. Número de árbitros" },
    ],
    ...extra,
  };
}

const seed: State = {
  student: "Rebeca Ferreira",
  programs: [
    {
      id: "p1",
      slug: "arbitragem-nivel-1",
      area: "Direito",
      kind: "Curso prático",
      title: "Arbitragem — Nível 1",
      tagline: "Seis atividades encadeadas em uma banca fictícia. Correção individual por rubrica com nota, devolutiva e gabarito comentado.",
      description:
        "Você assume a posição de estagiário em uma banca de arbitragem e conduz um procedimento do início ao fim — com um sócio te passando as demandas.",
      price: 890,
      fullPrice: 1190,
      cover: "pratico",
      learn: [
        "Analisar a validade de uma cláusula compromissória e responder a quem a ataca",
        "Redigir requerimento de arbitragem, impugnação e alegações iniciais",
        "Indicar árbitros e conduzir a checagem de conflito de interesses",
        "Contar prazos sob o regulamento da câmara sem margem de erro",
        "Usar IA no limite do que o escritório aceita",
      ],
      includes: ["6 atividades com correção individual", "Gabaritos comentados", "Certificado com nota", "6 meses de acesso"],
      status: "published",
      skills: ["Cláusula compromissória", "Peça inaugural", "Conflito de interesses", "Prazos processuais", "Impugnação", "Estruturação de tese"],
      activities: [
        act(1, "Análise da cláusula compromissória", "Cláusula compromissória", "30–60 min", "Verificar cabimento, sede e requisitos de validade", { demandBody: "Rebeca, chegou o contrato da Helvetia com a Nordeste. Antes de qualquer providência, analisa a cláusula compromissória: cabimento, sede, número de árbitros e se ela preenche os requisitos de validade. A Nordeste já ameaça dizer que é inválida. Me manda um parecer curto, de até duas páginas." }),
        act(2, "Requerimento de arbitragem", "Requerimento de arbitragem", "1–2 h", "Redigir a peça inaugural", {
          demandBody:
            "Rebeca, precisamos protocolar o requerimento de arbitragem da Helvetia até sexta. Monta a peça: qualificação das partes, base na cláusula compromissória, síntese dos fatos, o inadimplemento, o pedido e a indicação de árbitro. Atenção à alegação de invalidade que eles levantaram — não deixa isso sem resposta. Máximo cinco páginas. Qualquer dúvida me chama.",
          rubric: [
            { criterion: "Qualificação das partes e representação" },
            { criterion: "Fundamento na cláusula compromissória" },
            { criterion: "Resposta à alegação de invalidade" },
            { criterion: "Síntese fática e inadimplemento" },
            { criterion: "Formulação do pedido" },
            { criterion: "Indicação de árbitro" },
            { criterion: "Clareza, concisão e limite" },
          ],
        }),
        act(3, "Indicação de árbitro e conflito de interesses", "Indicação de árbitro", "1 h", "Pesquisa de perfil e checagem de disclosure", { demandBody: "Rebeca, precisamos indicar o coárbitro da Helvetia. Levanta três perfis adequados à disputa técnica, checa publicações, atuação recente e qualquer vínculo com a Nordeste ou seus advogados. Quero uma recomendação fundamentada e os pontos de disclosure que cada um precisaria revelar." }),
        act(4, "Contagem de prazos sob o regulamento", "Contagem de prazos", "30 min", "Montar o calendário processual", { demandBody: "Rebeca, o requerimento foi protocolado. Monta o calendário processual sob o regulamento da câmara: resposta, constituição do tribunal, termo de arbitragem e alegações. Indica o marco inicial de cada prazo e como você contou. Erro de prazo aqui não tem volta." }),
        act(5, "Impugnação de árbitro", "Impugnação de árbitro", "1–2 h", "Fundamentar e redigir", { demandBody: "Rebeca, descobrimos que o árbitro indicado pela Nordeste atuou como parecerista para ela no ano passado e não revelou. Prepara a impugnação: fundamento, prazo, prova do fato e pedido. Confere se ainda estamos dentro do prazo contado da ciência." }),
        act(6, "Alegações iniciais", "Alegações iniciais", "2 h", "Estruturar tese, fatos e provas", { demandBody: "Rebeca, chegou a hora das alegações iniciais. Estrutura a tese da Helvetia: fatos, validade da cláusula, inadimplemento das sete faturas, ausência de recusa formal no prazo de dez dias e os pedidos com juros e correção. Indica a prova de cada fato. Até dez páginas." }),
      ],
    },
    {
      id: "p2",
      slug: "introducao-arbitragem",
      area: "Direito",
      kind: "Curso teórico",
      title: "Introdução à Arbitragem",
      tagline: "8 aulas cobrindo o procedimento fase a fase, com 32 modelos comentados em português na praxe das câmaras brasileiras.",
      description: "O procedimento arbitral fase a fase, da convenção à sentença, acompanhado de 32 modelos comentados em português, na praxe das câmaras brasileiras.",
      price: 590,
      fullPrice: 890,
      cover: "teorico",
      learn: [
        "O procedimento arbitral fase a fase, da convenção à sentença",
        "A praxe das câmaras brasileiras em cada etapa",
        "Como adaptar modelos às particularidades do caso",
      ],
      includes: ["8 aulas", "32 modelos comentados em português", "Certificado de conclusão", "6 meses de acesso"],
      status: "published",
      skills: ["Convenção de arbitragem", "Instauração", "Tribunal arbitral", "Instrução", "Sentença arbitral"],
      activities: [
        ["Convenção de arbitragem", "Cláusula e compromisso: requisitos e patologias"],
        ["Instauração do procedimento", "Requerimento, resposta e custas"],
        ["Constituição do tribunal", "Indicação, disclosure e impugnação"],
        ["Termo de arbitragem", "Ata de missão e calendário processual"],
        ["Alegações escritas", "Estrutura de tese e documentos"],
        ["Instrução e audiência", "Provas, peritos e testemunhas"],
        ["Sentença arbitral", "Requisitos, prazos e pedidos de esclarecimento"],
        ["Pós-sentença", "Cumprimento, anulação e homologação"],
      ].map(([t, sm], i) => act(i + 1, `Aula ${i + 1} — ${t}`, t!, "40 min", sm!)),
    },
    ...[
      ["contencioso-civel-nivel-1", "Contencioso Cível — Nível 1", "Prazos, estrutura de peça e peticionamento eletrônico."],
      ["secretario-tribunal-arbitral", "Secretário de Tribunal Arbitral", "A rotina de quem secretaria o tribunal: atas, ordens processuais e minutas."],
      ["lawyer-101", "Lawyer 101", "O repertório de escritório que ninguém ensina formalmente."],
    ].map(([slug, title, tagline], i) => ({
      id: `soon${i}`,
      slug: slug!,
      area: "Direito",
      kind: "Em breve",
      title: title!,
      tagline: tagline!,
      description: "",
      price: null,
      status: "soon" as const,
      skills: [],
      activities: [],
    })),
  ],
  enrollments: [{ programId: "p1", student: "Rebeca Ferreira", enrolledAt: "2026-09-02T12:00:00Z" }],
  submissions: [
    {
      id: "s1",
      programId: "p1",
      activityId: "a1",
      student: "Rebeca Ferreira",
      fileName: "analise-clausula.docx",
      fileSize: 48211,
      aiUse: "Pesquisa exploratória inicial",
      submittedAt: "2026-09-05T15:00:00Z",
      grades: [
        { criterion: "Atendimento à instrução da demanda", score: 8, comment: "Respondeu aos três pontos pedidos." },
        { criterion: "Fundamentação", score: 7.5, comment: "Faltou citar o requisito de forma escrita." },
        { criterion: "Clareza, concisão e limite", score: 8.2, comment: "Objetivo e dentro do limite." },
      ],
    },
  ],
  certificates: [],
  notes: [{ id: "n1", programId: "p1", activityId: "a2", text: "Verificar sempre se houve recusa formal no prazo contratual antes de alegar inadimplemento puro.", at: "2026-09-08T10:00:00Z" }],
};

const KEY = "empiria-v3";
let state: State = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}
function set(fn: (s: State) => State) {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

// Read saved data as soon as the module loads in the browser, not after a mount effect.
if (typeof window !== "undefined") load();

/** True once the component runs in the browser with saved data loaded. */
export function useStoreReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export function hydrateStore() {
  load();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnap = () => state;
const getServerSnap = () => seed;

export function useStore<T>(sel: (s: State) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnap, getServerSnap);
  return sel(snap);
}

// ---- derived helpers ----
export const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null);
export const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1).replace(".", ","));
export const brl = (n: number | null | undefined) => (n == null ? "—" : `R$ ${n.toLocaleString("pt-BR")}`);
export const subScore = (s?: Submission) => (s?.grades?.length ? avg(s.grades.map((g) => g.score)) : null);

export function latestSubmission(s: State, programId: string, activityId: string, student = s.student) {
  return s.submissions.filter((x) => x.programId === programId && x.activityId === activityId && x.student === student).at(-1);
}
export function programAverage(s: State, p: Program, student = s.student) {
  const scores = p.activities.map((a) => subScore(latestSubmission(s, p.id, a.id, student))).filter((x): x is number => x != null);
  return avg(scores);
}
export function completedCount(s: State, p: Program, student = s.student) {
  return p.activities.filter((a) => latestSubmission(s, p.id, a.id, student)).length;
}

// ---- actions ----
export const MAX_HUMAN_REVIEWS = 2;
export const reviewsLeft = (s?: Submission) => Math.max(0, MAX_HUMAN_REVIEWS - (s?.humanReviews?.length ?? 0));
/** SLA for grading a submission, in hours. */
export const SLA_HOURS = 24;
export function slaStatus(submittedAt: string, now = Date.now()) {
  const h = (now - new Date(submittedAt).getTime()) / 36e5;
  const k = h < SLA_HOURS * 0.5 ? "ok" : h < SLA_HOURS ? "mid" : "no";
  const label = h < 1 ? "há menos de 1h" : h < 48 ? `há ${Math.floor(h)}h` : `há ${Math.floor(h / 24)} dias`;
  return { k, hours: h, label };
}

export const actions = {
  requestHumanReview: (submissionId: string) =>
    set((s) => ({
      ...s,
      submissions: s.submissions.map((x) =>
        x.id === submissionId && reviewsLeft(x) > 0 ? { ...x, humanReviews: [...(x.humanReviews ?? []), new Date().toISOString()] } : x,
      ),
    })),
  setStudent: (name: string) => set((s) => ({ ...s, student: name })),
  enroll: (programId: string) =>
    set((s) =>
      s.enrollments.some((e) => e.programId === programId && e.student === s.student)
        ? s
        : { ...s, enrollments: [...s.enrollments, { programId, student: s.student, enrolledAt: new Date().toISOString() }] },
    ),
  submit: (programId: string, activityId: string, fileName: string, fileSize: number, aiUse: string) =>
    set((s) => ({
      ...s,
      submissions: [
        ...s.submissions,
        { id: uid(), programId, activityId, student: s.student, fileName, fileSize, aiUse, submittedAt: new Date().toISOString() },
      ],
    })),
  grade: (submissionId: string, grades: Grade[], teacherComment: string) =>
    set((s) => ({ ...s, submissions: s.submissions.map((x) => (x.id === submissionId ? { ...x, grades, teacherComment } : x)) })),
  issueCertificate: (programId: string): string => {
    const existing = state.certificates.find((c) => c.programId === programId && c.student === state.student);
    if (existing) return existing.code;
    const p = state.programs.find((x) => x.id === programId)!;
    const code = certCode();
    set((s) => ({
      ...s,
      certificates: [...s.certificates, { code, programId, student: s.student, issuedAt: new Date().toISOString(), grade: programAverage(s, p) }],
    }));
    return code;
  },
  addNote: (programId: string, activityId: string, text: string) =>
    set((s) => ({ ...s, notes: [...s.notes, { id: uid(), programId, activityId, text, at: new Date().toISOString() }] })),
  saveProgram: (p: Program) =>
    set((s) => ({ ...s, programs: s.programs.some((x) => x.id === p.id) ? s.programs.map((x) => (x.id === p.id ? p : x)) : [...s.programs, p] })),
  deleteProgram: (id: string) => set((s) => ({ ...s, programs: s.programs.filter((x) => x.id !== id) })),
  newProgram: (): Program => ({
    id: uid(),
    slug: `programa-${uid()}`,
    area: "Direito",
    kind: "Estágio pré-programado",
    title: "Novo programa",
    tagline: "",
    description: "",
    price: 0,
    status: "draft",
    skills: [],
    activities: [],
  }),
  newActivity: (n: number): Activity => ({ ...act(n, "Nova atividade", "Nova atividade", "1 h", "Descreva a tarefa"), id: uid() }),
  reset: () => set(() => seed),
};

export function downloadDoc(doc: Doc) {
  const blob = new Blob([doc.content || doc.name], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
