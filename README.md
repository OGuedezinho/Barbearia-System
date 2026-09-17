# Barber System

Sistema de gestão para barbearia com Next.js, TypeScript, Tailwind CSS e Supabase.

## Rodar localmente

1. Instale Node.js 20+.
2. Crie `.env.local` na raiz usando `.env.example` como referência.
3. Execute `npm install`.
4. Execute `npm run dev`.
5. Abra `http://localhost:3000`.

## Supabase

Execute `supabase/final_migration.sql` no SQL Editor do Supabase. Não coloque chaves secretas no GitHub.

## Recursos integrados nesta versão

- Autenticação Supabase.
- Multi-barbearia com dono e membros.
- Dashboard.
- Agenda semanal com arrastar e soltar.
- Atendimento avulso ou pelo plano.
- Desconto de utilização de plano por serviço.
- Estorno do uso do plano ao cancelar/excluir atendimento.
- Clientes com indicador de última presença.
- Profissionais.
- Financeiro.
- Planos e assinaturas.
- Mensagem personalizada e confirmação por WhatsApp via `wa.me`.
- Separação por `barbearia_id` e RLS.
