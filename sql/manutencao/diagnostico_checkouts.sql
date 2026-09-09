-- Diagnóstico dos checkouts. Só LEITURA — não altera nada.
-- Rode no SQL Editor do Supabase e veja o que aparece antes de corrigir qualquer coisa.

-- 1. Checkouts com pixel que não parece um Pixel ID válido.
--    O código agora extrai o número de um <script> colado inteiro, então esses
--    casos já funcionam sozinhos. O que sobra aqui é o que ele NÃO consegue salvar.
SELECT product_name,
       meta_pixel_id,
       CASE
         WHEN meta_pixel_id ~ '^\d{10,20}$' THEN 'ok'
         WHEN meta_pixel_id ILIKE '%fbq(%'  THEN 'script colado — o código extrai sozinho'
         ELSE 'INVÁLIDO — precisa corrigir na mão'
       END AS situacao
FROM checkouts
WHERE meta_pixel_id IS NOT NULL AND meta_pixel_id <> ''
ORDER BY situacao DESC, product_name;

-- 2. Checkouts sem pixel nenhum (não rastreiam nada).
SELECT product_name, turma, city
FROM checkouts
WHERE meta_pixel_id IS NULL OR meta_pixel_id = ''
ORDER BY product_name;

-- 3. Checkouts duplicados (mesmo nome, registros diferentes).
SELECT LOWER(TRIM(product_name)) AS nome,
       COUNT(*) AS quantidade,
       STRING_AGG(id::text, ', ') AS ids
FROM checkouts
GROUP BY LOWER(TRIM(product_name))
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- 4. Checkouts marcados como ativos mas sem nenhuma venda nos últimos 90 dias.
--    Hoje TODOS estão com is_active = true, inclusive os de teste, então esse
--    campo não serve para separar o que está vendendo do que já passou.
SELECT c.product_name,
       c.is_active,
       COUNT(l.id) AS vendas_90d
FROM checkouts c
LEFT JOIN leads l ON l.product_id = c.id AND l.created_at > NOW() - INTERVAL '90 days'
GROUP BY c.id, c.product_name, c.is_active
HAVING COUNT(l.id) = 0
ORDER BY c.product_name;
