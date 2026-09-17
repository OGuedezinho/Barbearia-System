-- Barber System: integração final Agenda + Planos + Financeiro + Profissionais
-- Execute no SQL Editor do Supabase.

alter table public.agendamentos add column if not exists origem text not null default 'avulso';
alter table public.agendamentos add column if not exists assinatura_plano_id uuid references public.assinaturas_planos(id) on delete set null;
alter table public.agendamentos add column if not exists plano_id uuid references public.planos(id) on delete set null;
alter table public.agendamentos add column if not exists profissional_id uuid references public.profissionais(id) on delete set null;

alter table public.pagamentos add column if not exists origem text not null default 'avulso';
alter table public.pagamentos add column if not exists assinatura_plano_id uuid references public.assinaturas_planos(id) on delete set null;
alter table public.pagamentos add column if not exists plano_id uuid references public.planos(id) on delete set null;
alter table public.pagamentos add column if not exists servico_id uuid references public.servicos(id) on delete set null;

create table if not exists public.usos_planos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  assinatura_id uuid not null references public.assinaturas_planos(id) on delete cascade,
  plano_id uuid not null references public.planos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  quantidade integer not null default 1,
  usado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (agendamento_id, servico_id)
);

create index if not exists idx_usos_planos_assinatura on public.usos_planos(assinatura_id);
create index if not exists idx_usos_planos_cliente on public.usos_planos(cliente_id);
create index if not exists idx_usos_planos_agendamento on public.usos_planos(agendamento_id);
create index if not exists idx_agendamentos_profissional on public.agendamentos(profissional_id);

alter table public.usos_planos enable row level security;

drop policy if exists "usos_planos_select" on public.usos_planos;
create policy "usos_planos_select" on public.usos_planos for select to authenticated using (
  exists (select 1 from public.barbearias b where b.id = usos_planos.barbearia_id and (b.owner_id = auth.uid() or public.usuario_membro_barbearia(b.id, auth.uid())))
);

drop policy if exists "usos_planos_insert" on public.usos_planos;
create policy "usos_planos_insert" on public.usos_planos for insert to authenticated with check (
  exists (select 1 from public.barbearias b where b.id = usos_planos.barbearia_id and (b.owner_id = auth.uid() or public.usuario_membro_barbearia(b.id, auth.uid())))
);

drop policy if exists "usos_planos_delete" on public.usos_planos;
create policy "usos_planos_delete" on public.usos_planos for delete to authenticated using (
  exists (select 1 from public.barbearias b where b.id = usos_planos.barbearia_id and b.owner_id = auth.uid())
);

create or replace function public.registrar_uso_plano(p_assinatura_id uuid, p_agendamento_id uuid, p_servico_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_assinatura public.assinaturas_planos%rowtype;
  v_limite integer;
  v_usado integer;
  v_barbearia_id uuid;
  v_uso_id uuid;
begin
  select * into v_assinatura from public.assinaturas_planos where id = p_assinatura_id for update;
  if not found then raise exception 'Assinatura não encontrada.'; end if;
  if v_assinatura.status not in ('ativo','vencendo') then raise exception 'A assinatura não está ativa.'; end if;
  if v_assinatura.data_vencimento is not null and v_assinatura.data_vencimento < current_date then raise exception 'A assinatura está vencida.'; end if;

  select quantidade into v_limite from public.plano_servicos where plano_id = v_assinatura.plano_id and servico_id = p_servico_id;
  if v_limite is null then raise exception 'Este serviço não faz parte do plano.'; end if;

  select coalesce(sum(quantidade),0) into v_usado from public.usos_planos where assinatura_id = p_assinatura_id and servico_id = p_servico_id;
  if v_usado >= v_limite then raise exception 'Não há mais utilizações disponíveis para este serviço.'; end if;

  select barbearia_id into v_barbearia_id from public.agendamentos where id = p_agendamento_id;
  if v_barbearia_id is distinct from v_assinatura.barbearia_id then raise exception 'Agendamento e assinatura pertencem a barbearias diferentes.'; end if;

  insert into public.usos_planos(barbearia_id, assinatura_id, plano_id, cliente_id, agendamento_id, servico_id, quantidade)
  values(v_assinatura.barbearia_id, v_assinatura.id, v_assinatura.plano_id, v_assinatura.cliente_id, p_agendamento_id, p_servico_id, 1)
  on conflict (agendamento_id, servico_id) do nothing
  returning id into v_uso_id;
  return v_uso_id;
end;
$$;

grant execute on function public.registrar_uso_plano(uuid,uuid,uuid) to authenticated;

create or replace function public.estornar_usos_agendamento_plano(p_agendamento_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_total integer;
begin
  delete from public.usos_planos where agendamento_id = p_agendamento_id;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

grant execute on function public.estornar_usos_agendamento_plano(uuid) to authenticated;

create or replace function public.obter_usos_plano(p_assinatura_id uuid)
returns table(servico_id uuid, servico_nome text, quantidade_total integer, quantidade_usada integer, quantidade_restante integer)
language sql security definer set search_path = public stable as $$
  select ps.servico_id, s.nome, ps.quantidade::integer,
    coalesce(sum(up.quantidade)::integer,0),
    greatest(0, ps.quantidade::integer - coalesce(sum(up.quantidade)::integer,0))
  from public.plano_servicos ps
  join public.servicos s on s.id = ps.servico_id
  left join public.usos_planos up on up.servico_id = ps.servico_id and up.assinatura_id = p_assinatura_id
  where ps.plano_id = (select ap.plano_id from public.assinaturas_planos ap where ap.id = p_assinatura_id)
  group by ps.servico_id, s.nome, ps.quantidade order by s.nome;
$$;

grant execute on function public.obter_usos_plano(uuid) to authenticated;

-- Pagamento automático para atendimento avulso concluído, sem duplicação.
create or replace function public.registrar_pagamento_agendamento_concluido()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_valor numeric(10,2); v_cliente uuid; v_barbearia uuid; v_origem text;
begin
  if new.status = 'concluido' and coalesce(old.status,'') <> 'concluido' and coalesce(new.origem,'avulso') = 'avulso' then
    select a.barbearia_id, a.cliente_id, coalesce(sum(s.preco),0)
      into v_barbearia, v_cliente, v_valor
    from public.agendamentos a
    left join public.agendamento_servicos ags on ags.agendamento_id = a.id
    left join public.servicos s on s.id = ags.servico_id
    where a.id = new.id
    group by a.barbearia_id, a.cliente_id;
    if not exists (select 1 from public.pagamentos p where p.agendamento_id = new.id and p.status <> 'cancelado') then
      insert into public.pagamentos(barbearia_id,agendamento_id,cliente_id,valor,forma_pagamento,status,descricao,origem,data_pagamento)
      values(v_barbearia,new.id,v_cliente,v_valor,'pix','pago','Atendimento concluído','avulso',now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pagamento_agendamento_concluido on public.agendamentos;
create trigger trg_pagamento_agendamento_concluido after update of status on public.agendamentos for each row execute function public.registrar_pagamento_agendamento_concluido();

alter table public.barbearias add column if not exists mensagem_confirmacao text;


-- Permite que um usuário autenticado crie a própria barbearia.
-- O owner_id obrigatoriamente precisa ser o usuário da sessão.
alter table public.barbearias enable row level security;

drop policy if exists "barbearias_insert_owner" on public.barbearias;
create policy "barbearias_insert_owner"
on public.barbearias
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "barbearias_select_owner_or_member" on public.barbearias;
create policy "barbearias_select_owner_or_member"
on public.barbearias
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.usuario_membro_barbearia(id, auth.uid())
);

drop policy if exists "barbearias_update_owner" on public.barbearias;
create policy "barbearias_update_owner"
on public.barbearias
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "barbearias_delete_owner" on public.barbearias;
create policy "barbearias_delete_owner"
on public.barbearias
for delete
to authenticated
using (owner_id = auth.uid());
