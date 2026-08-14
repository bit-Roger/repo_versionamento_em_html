# Versionamento + Supabase + Netlify

## 1. Supabase
1. Crie um projeto no Supabase.
2. Abra SQL Editor.
3. Execute `supabase/schema.sql`.
4. Em Settings > API Keys, crie/obtenha uma **Secret key** (`sb_secret_...`).
5. Nunca coloque essa chave no `script.js` ou no `index.html`.

## 2. Netlify
Configure estas variáveis no Netlify em Project configuration > Environment variables:
- `SUPABASE_URL` = URL do seu projeto Supabase
- `SUPABASE_SECRET_KEY` = Secret key do Supabase

A variável precisa estar disponível para Functions.

## 3. Dependência
O `package.json` contém `@supabase/supabase-js`.

## 4. Frontend
O `index.html` carrega `html2pdf.js` por CDN.
O `script.js`:
- coleta modelo, versão, data, seções e itens;
- gera um PDF real como Blob;
- envia o PDF e os dados para `/.netlify/functions/salvar-versionamento`;
- baixa uma cópia do PDF para o usuário.

## 5. Observação sobre tamanho
A Netlify informa limite padrão de 6 MB para payload buffered de Functions; como uploads binários enviados como Base64 têm cerca de 30% de overhead, é prudente manter o PDF abaixo de aproximadamente 4,5 MB.

## 6. Segurança
O PDF fica em bucket privado.
A Secret key do Supabase fica somente na Netlify Function.
Não coloque `SUPABASE_SECRET_KEY` no código do navegador.

## 7. Importante
Este projeto ainda não possui autenticação. Portanto, qualquer pessoa que consiga acessar o site poderá tentar chamar a função de gravação. Para uso interno/produção, a próxima etapa recomendada é adicionar login (Supabase Auth) e restringir a Function aos usuários autenticados.
