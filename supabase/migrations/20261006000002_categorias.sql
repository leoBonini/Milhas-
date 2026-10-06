-- Categorias exibidas na barra do app. A ordem define a posição na barra.
alter table categorias add column if not exists ordem int not null default 100;
-- Nome da categoria como aparece no site do programa (ex: "Eletro e Tecnologia"),
-- usado pelo coletor para classificar parceiros novos automaticamente.
alter table categorias add column if not exists nomes_externos text[] not null default '{}';
