# Refinamento visual da página inicial — Empiria

Só acabamento visual. Nada de banco de dados, pagamentos, regras de matrícula, permissões ou login.

## 1. Como o topo funciona hoje
- Um único topo (`TopNav` em `AppShell.tsx`) serve todas as páginas: inicial, Cursos, Sobre, Contato, Webinars, área do aluno e Administração.
- Hoje mostra: logo, Início, Cursos, Webinars, Quem somos, Contato, Entrar/Minha conta, botão de tema, "Começar pelo teórico", "Receber a primeira demanda" e o menu do celular.
- Estados existentes: visitante, aluno logado (`user`) e administrador verificado (`isAdmin`, já usado no rodapé).

## 2. Topo novo (visual)
- Sai a cápsula branca flutuante. Entra uma faixa clara presa ao topo, com linha fina embaixo, conteúdo centralizado em três áreas: logo | links | ações.
- O logo continua o mesmo, com rótulo "Empiria — Ir para o início".
- O botão "Receber a primeira demanda" continua totalmente arredondado.

## 3. O que cada pessoa vê
- **Visitante na página inicial:** Cursos · Quem somos · Contato | Entrar · Receber a primeira demanda.
- **Visitante em outras páginas públicas:** Início · Cursos · Quem somos · Contato | Entrar · Receber a primeira demanda.
- **Aluno logado:** Meus programas · Cursos (+ Início fora da página inicial) | menu de perfil com Minha conta, Minhas compras, Aparência (claro/noturno) e Sair. Sem botões de captação.
- **Administrador:** igual ao aluno, com "Administração" a mais no menu de perfil. A proteção real das telas continua no servidor.
- Webinars sai do topo e fica no rodapé (já existe lá), para manter o topo enxuto. "Começar pelo teórico" sai do topo; o curso teórico segue nos cartões e no catálogo.
- O botão de tema sai das páginas públicas e vai para o menu de perfil, usando o mesmo sistema de tema atual. Visitantes veem sempre o modo claro padrão (a escolha salva só vale para quem tem conta).

## 4. Celular e tablet
- Logo à esquerda, botão de menu à direita, painel com os links e os botões empilhados.
- Fecha ao navegar e com Esc; funciona por toque e teclado.
- Conferência em 320, 375, 390, 768, 1024 e 1440 px, sem rolagem lateral.

## 5. Abertura da página (hero)
- Mantém título, frase, selo "Escritório simulado de arbitragem" e "Ver como funciona".
- No computador: duas colunas — texto à esquerda, demonstração à direita, ambos na primeira dobra, com menos espaço vazio.
- No celular: texto em cima, demonstração embaixo, em largura total.

## 6. Demonstração do requerimento
- O conteúdo do `ReviewWindow` não muda: texto, riscos, correções, comentários do sênior e da Nidia, notas e "Ocultar marcas".
- Só ganha uma moldura discreta de janela da plataforma: barrinha com o logo Empiria e a etiqueta "Prévia da plataforma".

## 7. Parceiros
- Seção e logotipos mantidos (Arbipédia e CJA/CBMA), em preto e branco, com a faixa rodando.
- Ajuste de espaçamento e altura igual dos logos, sem distorcer.

## 8. Demais seções
- Ordem e conteúdo mantidos: ciclo do produto, públicos, cursos, professores, perguntas, chamada final, rodapé.
- Só ajustes de espaçamento e hierarquia; nada removido.

## Detalhes técnicos
- Arquivos: `src/components/AppShell.tsx` (TopNav com estados por rota/sessão e menu de perfil usando o DropdownMenu do shadcn), `src/components/ThemeToggle.tsx` (versão item de menu, mesma lógica e chave), `src/routes/__root.tsx` (script de tema só aplica se houver sessão salva — ou mantido e o toggle escondido; ver risco), `src/routes/index.tsx` (hero em grid de duas colunas + moldura), `src/styles.css` (substituir regras `.topnav` existentes, sem duplicar).
- `signOut` já existe em `useAccount`/cliente de autenticação; só é chamado do menu.

## Riscos
- Visitante que ativou o modo noturno antes ficaria preso no escuro sem botão: o tema passará a ser aplicado só quando houver sessão.
- Páginas que dependem da altura da barra flutuante (ciclo fixo com `top: 84px`, `sticky` do preço no curso) precisam ser recalibradas.
- Testes de rotas existentes (`app-routing.test.tsx`) podem procurar links do topo; serão ajustados se necessário.
