# Painel da Lojinha

Painel web para gerenciar a loja: preços, catálogo com fichas de impressão, insumos, gastos, pedidos e produção.

É um site estático (HTML, CSS e JS, sem etapa de build) que guarda os dados no **Supabase**, com login.
Sem o Supabase configurado, ele roda em **modo demonstração**, com dados de exemplo salvos só no navegador.

## 1. Criar o banco no Supabase (grátis)

1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Crie seu usuário em **Authentication → Users → Add user → Create new user** (e-mail e senha; marque *Auto Confirm User*).
4. Feche o cadastro público: **Authentication → Sign In / Providers → desligue "Allow new users to sign up"**.
   Assim só quem você criar consegue entrar.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** e cole em [`public/config.js`](public/config.js).

> A chave *anon* é feita para ficar no site. Os dados ficam protegidos pelo login e pelas regras do banco:
> cada conta só vê os próprios registros. Nunca coloque a chave *service_role* no site.

## 2. Publicar o site

O que vai para o ar é a pasta `public/`. Escolha um:

- **Netlify** (o mais simples): em https://app.netlify.com/drop, arraste a pasta `public`. Para atualizar, arraste de novo.
  Se conectar um repositório do GitHub, o `netlify.toml` já aponta para `public`.
- **Vercel**: importe o repositório; o `vercel.json` já aponta para `public`.
- **Cloudflare Pages** ou **GitHub Pages**: diretório de saída `public`, sem comando de build.

Depois de publicar, volte ao Supabase em **Authentication → URL Configuration** e coloque o endereço do site
em **Site URL**. É para onde vai o link de "Esqueci minha senha".

## 3. Testar no computador

Dê dois cliques em `iniciar.bat` (ou rode `node server.js`) e abra http://localhost:3737.
Com `config.js` preenchido, o teste local já usa o Supabase de verdade. Com ele vazio, abre o modo demonstração.

## Primeiros passos no painel

Com a conta nova, o painel abre vazio. Na Visão geral dá para **carregar dados de exemplo** e ver tudo funcionando.
Para apagar todos de uma vez: **Ajustes → Apagar registros de exemplo**.
Em Ajustes você também baixa um backup (JSON) e restaura um backup.

## Como as contas funcionam

- **Custo do insumo**: média do que você pagou nas compras lançadas em Gastos (valor + frete ÷ quantidade). Sem compras, usa o custo informado no cadastro do insumo.
- **Custo do produto**: materiais (quantidade ÷ rendimento × custo) + perda % + mão de obra (minutos × valor-hora) + outros custos.
- **Preço sugerido**: custo × (1 + margem) ÷ (1 − taxa da plataforma), arredondado para cima em ,90.
- **Estoque de insumos**: estoque inicial + compras − o que os lotes de produção consumiram.
- **Peças prontas**: estoque inicial + lotes produzidos − pedidos (menos os cancelados).

## Estrutura

```
public/              o site (é isto que vai para a hospedagem)
  index.html         página e tela de login
  style.css          visual
  app.js             telas, cálculos e conexão com o Supabase
  config.js          URL e chave do seu projeto Supabase
  exemplo.json       dados de exemplo
  logo.webp          logo
supabase/schema.sql  tabela, regras de acesso e bucket de imagens
server.js            servidor local só para testes
```
