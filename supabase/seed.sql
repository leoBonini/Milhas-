-- Dados iniciais.
-- Lojas NÃO são cadastradas aqui: o coletor cadastra cada parceiro que aparece
-- no site da Livelo/Esfera. Assim só existem lojas que são parceiras de verdade.

insert into programas (id, nome) values
  ('livelo', 'Livelo'),
  ('esfera', 'Esfera')
on conflict (id) do nothing;

insert into categorias (id, nome, ordem) values
  ('eletronicos', 'Eletrônicos', 1),
  ('moda',        'Moda',        2),
  ('beleza',      'Beleza',      3),
  ('viagem',      'Viagem',      4),
  ('casa',        'Casa',        5),
  ('pet',         'Pet',         6),
  ('esporte',     'Esporte',     7),
  ('mercado',     'Mercado',     8),
  ('saude',       'Saúde',       9),
  ('infantil',    'Infantil',   10),
  ('livros',      'Livros',     11),
  ('servicos',    'Serviços',   12)
on conflict (id) do update set nome = excluded.nome, ordem = excluded.ordem;

insert into palavras_chave (termo, categoria_id)
select termo, categoria_id from (values
  ('eletronicos', array['iphone','celular','smartphone','galaxy','samsung','motorola','xiaomi','ipad','tablet','notebook','macbook','computador','monitor','tv','televisao','smart tv','airpods','fone','apple watch','smartwatch','playstation','ps5','xbox','nintendo','switch','console','camera','caixa de som','jbl','alexa','echo','kindle','geladeira','fogao','microondas','ar condicionado','eletrodomestico']),
  ('moda',        array['roupa','roupas','tenis','sapato','camisa','camiseta','calca','vestido','bolsa','jaqueta','moda','oculos','relogio']),
  ('beleza',      array['perfume','maquiagem','batom','shampoo','creme','cosmetico','cosmeticos','skincare','hidratante']),
  ('viagem',      array['viagem','passagem','passagens','hotel','hoteis','hospedagem','aluguel de carro','carro alugado','pacote']),
  ('casa',        array['sofa','cama','colchao','movel','moveis','decoracao','cozinha','panela','luminaria']),
  ('pet',         array['racao','pet','cachorro','gato','petshop']),
  ('esporte',     array['bicicleta','academia','suplemento','bola','esporte','corrida','chuteira']),
  ('mercado',     array['mercado','supermercado','vinho','cerveja','bebida','comida','delivery']),
  ('saude',       array['remedio','farmacia','vitamina','drogaria']),
  ('infantil',    array['brinquedo','brinquedos','bebe','infantil','fralda']),
  ('livros',      array['livro','livros','ebook']),
  ('servicos',    array['curso','streaming','assinatura','seguro'])
) as t(categoria_id, termos), unnest(termos) as termo
on conflict (termo) do nothing;
