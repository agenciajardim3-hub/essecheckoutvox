-- Correção pontual: o checkout "Guaratinguetá - 16 de Maio" está com o ID do
-- Gerenciador de Negócios (755811430085255) no campo do pixel, não com um Pixel ID.
-- O código não tem como adivinhar o número certo, então esta é manual.

-- PASSO 1 — confira que é este mesmo registro (só leitura):
SELECT id, product_name, meta_pixel_id
FROM checkouts
WHERE meta_pixel_id = '755811430085255';

-- PASSO 2 — escolha UMA das opções abaixo e rode só ela.

-- Opção A: o evento já passou e não vende mais. Limpa o campo.
-- UPDATE checkouts SET meta_pixel_id = ''
-- WHERE meta_pixel_id = '755811430085255';

-- Opção B: ainda vende. Troque COLOQUE_O_PIXEL_AQUI pelo Pixel ID correto
-- (pegue no Gerenciador de Eventos, é o número de 15-16 dígitos).
-- UPDATE checkouts SET meta_pixel_id = 'COLOQUE_O_PIXEL_AQUI'
-- WHERE meta_pixel_id = '755811430085255';
