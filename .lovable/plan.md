# /conheca — página depois do formulário, no estilo do protótipo e bem animada

Vale só para o que aparece depois que a pessoa envia o formulário (vídeo, método, cursos). O formulário de entrada, o cadastro e o rodapé ficam como estão.

## Estrutura (igual ao protótipo)

1. **Topo do vídeo**: logo à esquerda, selo "PRÉ-VENDA" à direita, "OBRIGADA, {NOME}. O VÍDEO ESTÁ LIBERADO.", título "A plataforma, *por dentro.*" e uma linha de apoio. Vídeo largo com cantos arredondados e a barra "Área do aluno · duração" embaixo. Mesmo fundo roxo animado do formulário: foto se mexendo, luzes suaves e arcos finos girando devagar.
2. **O que é a Empiria**: "Aprenda o ofício *antes da oportunidade.*", texto curto e três cards numerados: 1 A demanda chega / 2 Você entrega; o sênior corrige / 3 Só então, o documento de referência.
3. **Os dois cursos**: "Cursos em *dois formatos.*". Dois cards: Simulado (cabeçalho claro, botão lavanda) e Teórico (cabeçalho plum, botão com contorno). Cada card mostra preço R$ 890 / R$ 590, o preço cheio riscado, "até 3x · acesso por seis meses", o ícone da árvore e o selo "SEU INTERESSE" de acordo com a escolha feita no formulário.
4. **A inteligência artificial no curso**: "Quem corrige é a Nidia. *O critério é dos professores.*" e, ao lado, um quadro com o texto sobre os professores, terminando em "IA para formar, não para substituir."

Saem os blocos atuais "Da teoria à sua mesa" e "O conhecimento ganha vida…", que não fazem parte do protótipo.

## Animações (no mesmo nível do formulário, nada parado)

- **Títulos**: as letras sobem uma a uma, como no formulário, e depois fica uma onda leve contínua com brilho na parte em destaque.
- **Vídeo**: entra crescendo e se inclina um pouco conforme a rolagem; a borda tem um brilho girando e a barra de progresso pulsa.
- **Cards do método**: entram um depois do outro, de baixo para cima, e o número faz uma contagem. Ao passar o mouse, o card se ergue e uma luz acompanha o cursor.
- **Cards dos cursos**: entram virando levemente em 3D a partir dos lados. O preço sobe contando até o valor e o risco do preço cheio aparece desenhado. O selo "SEU INTERESSE" pulsa, a árvore gira devagar e o botão tem um reflexo passando.
- **Seção da Nidia**: o título aparece palavra por palavra e o quadro entra deslizando. A frase final aparece como se estivesse sendo digitada.
- **Fundo das seções**: arcos e luzes em movimento lento em todas elas, para que nenhuma fique parada.
- A página continua animada mesmo quando o computador pede menos movimento, como já fizemos no formulário. Os textos ficam parados e fáceis de ler.

## Detalhes técnicos
- Arquivos: `src/routes/conheca.tsx` (parte com `viewer`) e as classes `cq-*` em `src/styles.css`. Os componentes `AnimatedWords` e `data-cq-reveal`, que observam a rolagem, são reaproveitados.
- A contagem dos preços usa IntersectionObserver com requestAnimationFrame. A luz que segue o cursor usa variáveis CSS.
- Para conferir: Playwright em 1280px e 390px, envio do formulário, conferência de que cada seção aparece, transform/opacity mudando com o tempo e nenhuma faixa saindo da tela.
