# Fazer a animação de rolagem aparecer em /conheca

## Causa provável
O computador do Diego está com a opção "reduzir movimento" ligada (já vimos isso antes com o fundo). A página /conheca tem várias regras que, nesse caso, desligam todas as animações de entrada e de rolagem dos blocos, deixando tudo parado. O fundo foi liberado antes, mas os blocos não.

## O que vou fazer
1. Confirmar a causa abrindo /conheca num navegador de teste com "reduzir movimento" ligado e desligado, rolando e comparando capturas.
2. Liberar as animações de rolagem dos blocos (entrada, deslize, zoom, inclinação, barra de progresso no topo e inclinação do vídeo) mesmo com essa opção ligada, como já foi feito com o fundo.
3. Se o teste mostrar outra causa (por exemplo, o efeito não sendo recalculado ao rolar), corrigir esse ponto também.
4. Testar de novo rolando a página e confirmar que cada bloco se move de forma visível.

## Detalhes técnicos
- Remover/ajustar os blocos `@media (prefers-reduced-motion: reduce)` de `src/styles.css` (linhas ~1462, 1566, 1583, 1595) apenas para `.cq-reveal`, `[data-cq-reveal]`, `.cq-scroll-progress` e `.cq-v2-video`.
- Conferir em `src/routes/conheca.tsx` que o observer e o listener de scroll atualizam as variáveis em todos os blocos.
