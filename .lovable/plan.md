# Empiria — Diagnóstico frente ao backlog e plano de ação

## 1. O que já existe

| Área | Situação |
|---|---|
| Identidade (paleta, Urbanist + Newsreader, sem gradientes, Marca de Revisão) | Pronto |
| Home enxuta (hero, Janela de Revisão, 4 telas do produto, como funciona, cursos, FAQ, chamada final) | Pronto, conteúdo parcialmente provisório |
| Catálogo, página do curso em 2 colunas com card de preço | Pronto (falta nível, carga, docente) |
| Simulação: O Caso, A Demanda (e-mail + vídeo), Entrega, Devolutiva, Gabarito | Pronto, fluxo de 4 passos |
| Nidia (assistente) | Respostas fixas, recusa redigir; sem IA real e sem contador |
| Correção | Manual pelo admin (Workbench com rubrica); sem IA |
| Revisão humana | Botão existe, limite de 2 **por entrega** |
| Certificado com notas por atividade e código | Pronto (verificação só local) |
| Painel admin: KPIs, fila com SLA, editor rico, capas/anexos, status | Pronto |
| Dados | Só no navegador; sem login, sem pagamento, sem acesso real |

## 2. Divergências com o backlog (corrigir)

1. **Revisão humana**: backlog pede cota de **2 atividades por aluno por curso**, não 2 por entrega (EMP-026, QA-11).
2. **Gabarito durante revisão**: deve ficar trancado enquanto a revisão humana estiver pendente (EMP-027, QA-12).
3. **Parceiros**: Arbipédia/CIESP são prospects; não exibir logos sem confirmação (EMP-006, QA-16). Hoje a faixa mostra marcas não confirmadas.
4. **Certificado**: texto não pode sugerir estágio/horas de estágio (EMP-031, QA-15).
5. **Tela "sua tarefa" escolar**: rever textos da Demanda para não virar checklist (EMP-017).
6. **Prazo SLA 24h** foi presumido; backlog cita ~1 semana como não definitivo. Tornar configurável.

## 3. O que falta — por prioridade

### Etapa 1 — E0 Pré-venda (P0, bloqueia o lançamento)
- **Lovable Cloud**: mover cursos, conteúdos, matrículas e entregas para o banco; arquivos no armazenamento.
- **Login** (aluno e admin), recuperação de senha, papéis (aluno, revisor, admin); painel admin protegido.
- **Checkout** com gateway (Stripe ou outro a escolher): aprovado/pendente/negado, sem matrícula duplicada, aceite de termos, página de confirmação com "quando e como terá acesso" (EMP-004, QA-02/03).
- **Conteúdo da home editável no painel** (EMP-005): textos, FAQ, parceiros (com flag "confirmado"), redes sociais, seções liga/desliga.
- **Página do curso completa** (EMP-003/012): nível, carga, público, docente com foto, lista de tarefas com duração, sem expor gabarito/anexos.
- Revisão final de responsividade mobile em todas as telas (EMP-010).

### Etapa 2 — Motor do curso prático (P1)
- **Matrícula com validade de 6 meses** e data de vencimento visível; bloqueio ao expirar (EMP-013).
- **Liberação semanal**: estados bloqueada / disponível / concluída, "próxima liberação em…", bloqueio também por URL direta (EMP-014, QA-04).
- **Upload real** do arquivo (DOC/DOCX/PDF, limite de tamanho), template obrigatório por atividade, erro sem consumir tentativa (EMP-019/020, QA-07).
- **Máximo de 2 envios por atividade** com histórico e tentativas restantes (EMP-025, QA-10).
- Ajustes da seção 2 (cota de revisão por curso, trava do gabarito, SLA configurável).
- Fila de revisão humana completa: revisor, prazo, decisão, resposta, desbloqueio (EMP-036, QA-13).

### Etapa 3 — IA (P1)
- **Correção automática por IA** com a rubrica da atividade: nota por critério, observação, nota geral; registro da versão da rubrica; reprocessar em caso de falha; admin pode revisar (EMP-022/023, QA-08).
- **Bloco separado sobre uso ético de IA**, sem afetar a nota e sem acusar (EMP-024, QA-09).
- **Nidia real**: 2 a 5 perguntas por atividade (configurável), contador visível, escopo restrito ao caso, recusa "escreva/pesquise por mim" (EMP-021, QA-05/06).
- Rubrica com pesos no editor (EMP-022).

### Etapa 4 — Curso teórico e certificação (P1)
- Estrutura de aula com **4 tópicos + 1 modelo por tópico** no editor e na tela do aluno (EMP-029).
- **Marca d'água personalizada** nos PDFs baixados (nome/e-mail do aluno) (EMP-030, QA-14).
- Certificado exportável em PDF, página pública de verificação pelo código (EMP-031).
- **Avaliações dos cursos** por alunos elegíveis, com moderação no painel; exibidas na página do curso só quando reais (EMP-032).

### Etapa 5 — Evolução (P2/P3, após aprovação)
- Docente por atividade (EMP-037), pesquisa rápida por tarefa (EMP-033), painel de métricas por atividade (EMP-034), vídeo de venda por curso (EMP-038), regulamentos como links (EMP-041). Transcrição e bloco de notas ficam fora (P3).

## 4. Fora de escopo (pelo backlog)
Recrutamento/formulários da Forage, integração com Teams, pesquisa de jurisprudência, quiz, fórum, gamificação, portal B2B.

## 5. Decisões que precisamos da Rebeca antes de cada etapa
- Etapa 1: gateway e meios de pagamento (parcelamento, Pix), termos/reembolso, data do evento, quais parceiros estão confirmados, links das redes.
- Etapa 2: os 6 meses contam da compra ou do lançamento; 1ª atividade no dia da compra ou após 7 dias; formatos e tamanho máximo; prazo real da revisão humana.
- Etapa 3: nota de corte, qual nota prevalece entre as 2 tentativas, quando liberar o gabarito, limite de perguntas por atividade ou por tentativa, documento de uso ético de IA.
- Etapa 4: campos da marca d'água, regra de conclusão do certificado, formato das avaliações (estrelas/texto).

## Detalhes técnicos
- Banco: tabelas para cursos, atividades, rubricas, matrículas, pagamentos, tentativas, resultados IA, revisões, certificados, avaliações, parceiros, blocos da home; papéis em tabela separada com RLS.
- Gabarito e materiais pós-entrega servidos só por função no servidor que checa elegibilidade (antivazamento por URL).
- Webhook de pagamento idempotente; IA via Lovable AI Gateway (corretor e assistente separados, com limites de custo).
- Marca d'água gerada no servidor no momento do download.
- Testes automáticos para cada regra: 2 envios, cota de 2 revisões por curso, liberação semanal, trava do gabarito, validade de 6 meses.

## Ordem sugerida
Etapa 1 → 2 → 3 → 4, cada uma entregue e testada antes da próxima. Recomendo começar pela Etapa 1 com a correção dos parceiros e do texto do certificado já no primeiro passo.
