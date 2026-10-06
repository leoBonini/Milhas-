-- Schema inicial do app de pontos (Livelo e Esfera)

create table programas (
  id text primary key,            -- 'livelo' | 'esfera'
  nome text not null
);

create table parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,             -- 'Magalu', 'Fast Shop'
  slug text unique not null,
  aliases text[] default '{}',    -- variações de nome usadas nos blogs e sites
  ativo boolean default true
);

create table parceiro_programa (
  parceiro_id uuid references parceiros(id) on delete cascade,
  programa_id text references programas(id),
  id_externo text,                -- id da loja no site do programa
  url_parceiro text,
  primary key (parceiro_id, programa_id)
);

-- Busca rápida do parceiro pelo id que o programa usa (coletor da Fase 1)
create unique index parceiro_programa_id_externo_idx
  on parceiro_programa (programa_id, id_externo) where id_externo is not null;

create table categorias (
  id text primary key,            -- 'eletronicos'
  nome text not null
);

create table parceiro_categoria (
  parceiro_id uuid references parceiros(id) on delete cascade,
  categoria_id text references categorias(id),
  primary key (parceiro_id, categoria_id)
);

create table palavras_chave (
  termo text primary key,         -- 'iphone', 'notebook', 'airpods' (minúsculo, sem acento)
  categoria_id text references categorias(id)
);

create table pontuacoes (
  id bigserial primary key,
  parceiro_id uuid not null references parceiros(id) on delete cascade,
  programa_id text not null references programas(id),
  data date not null,
  pontos_por_real numeric not null check (pontos_por_real >= 0),
  pontos_base numeric,            -- pontuação padrão da loja, quando disponível
  escopo text,                    -- ex: 'produtos Apple selecionados', 'loja toda'
  fonte text not null check (fonte in ('coleta', 'blog', 'manual')),
  url_fonte text,
  confianca text not null default 'alta' check (confianca in ('alta', 'baixa')),
  coletado_em timestamptz default now(),
  -- "nulls not distinct" (Postgres 15+): sem isso, duas linhas com escopo nulo
  -- nunca conflitam e a coleta repetida no mesmo dia duplicaria registros.
  unique nulls not distinct (parceiro_id, programa_id, data, fonte, escopo)
);

create index pontuacoes_data_idx on pontuacoes (data desc);
create index pontuacoes_parceiro_data_idx on pontuacoes (parceiro_id, programa_id, data);

create table desejos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id text not null references categorias(id),
  parceiro_id uuid references parceiros(id),  -- opcional
  meta_pontos numeric not null,
  ativo boolean default true
);

create table push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text primary key,
  keys jsonb not null
);

-- Regra de leitura: valor do dia = maior pontos_por_real do dia entre todas as fontes.
-- Registros de baixa confiança ficam de fora até serem revisados.
create view pontuacao_diaria
with (security_invoker = true) as
select
  parceiro_id,
  programa_id,
  data,
  max(pontos_por_real) as pontos_por_real
from pontuacoes
where confianca = 'alta'
group by parceiro_id, programa_id, data;

-- ------------------------------------------------------------------
-- RLS: catálogo e pontuações são leitura pública; escrita só pela
-- service_role (jobs). Desejos e push são de cada usuário.
-- ------------------------------------------------------------------
alter table programas enable row level security;
alter table parceiros enable row level security;
alter table parceiro_programa enable row level security;
alter table categorias enable row level security;
alter table parceiro_categoria enable row level security;
alter table palavras_chave enable row level security;
alter table pontuacoes enable row level security;
alter table desejos enable row level security;
alter table push_subscriptions enable row level security;

create policy leitura_publica on programas for select using (true);
create policy leitura_publica on parceiros for select using (true);
create policy leitura_publica on parceiro_programa for select using (true);
create policy leitura_publica on categorias for select using (true);
create policy leitura_publica on parceiro_categoria for select using (true);
create policy leitura_publica on palavras_chave for select using (true);
create policy leitura_publica on pontuacoes for select using (true);

create policy dono on desejos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy dono on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
