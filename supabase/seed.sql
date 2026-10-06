-- Dados iniciais. Nomes das lojas a confirmar com o resultado da Fase 0.

insert into programas (id, nome) values
  ('livelo', 'Livelo'),
  ('esfera', 'Esfera')
on conflict (id) do nothing;

insert into categorias (id, nome) values
  ('eletronicos', 'Eletrônicos')
on conflict (id) do nothing;

insert into palavras_chave (termo, categoria_id)
select termo, 'eletronicos' from unnest(array[
  'iphone', 'celular', 'smartphone', 'galaxy', 'samsung', 'motorola', 'xiaomi',
  'ipad', 'tablet', 'notebook', 'macbook', 'computador', 'monitor', 'tv',
  'televisao', 'smart tv', 'airpods', 'fone', 'apple watch', 'smartwatch',
  'playstation', 'ps5', 'xbox', 'nintendo', 'switch', 'console', 'camera',
  'caixa de som', 'jbl', 'alexa', 'echo', 'kindle'
]) as termo
on conflict (termo) do nothing;

insert into parceiros (nome, slug, aliases) values
  ('Apple',         'apple',         '{"Apple Store","Apple Brasil"}'),
  ('Fast Shop',     'fast-shop',     '{"FastShop","Fastshop"}'),
  ('Magalu',        'magalu',        '{"Magazine Luiza","Magazine Luíza"}'),
  ('Casas Bahia',   'casas-bahia',   '{"CasasBahia"}'),
  ('Extra',         'extra',         '{"Extra.com.br","Extra Online"}'),
  ('Ponto',         'ponto',         '{"Ponto Frio","Pontofrio"}'),
  ('Amazon',        'amazon',        '{"Amazon Brasil","Amazon.com.br"}'),
  ('Carrefour',     'carrefour',     '{"Carrefour Online"}'),
  ('Americanas',    'americanas',    '{"Lojas Americanas","Americanas.com"}'),
  ('Samsung',       'samsung',       '{"Samsung Shop","Loja Samsung"}'),
  ('Mercado Livre', 'mercado-livre', '{"MercadoLivre","Meli"}'),
  ('Kabum',         'kabum',         '{"KaBuM","KaBuM!"}'),
  ('Girafa',        'girafa',        '{"Girafa.com.br"}')
on conflict (slug) do nothing;

insert into parceiro_categoria (parceiro_id, categoria_id)
select id, 'eletronicos' from parceiros
where slug in ('apple', 'fast-shop', 'magalu', 'casas-bahia', 'extra', 'ponto', 'amazon',
               'carrefour', 'americanas', 'samsung', 'mercado-livre', 'kabum', 'girafa')
on conflict do nothing;
