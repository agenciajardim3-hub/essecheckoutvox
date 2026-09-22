-- Habilita o Supabase Realtime para que o painel e os checkouts
-- recebam alterações sem precisar recarregar a página.
-- Seguro para executar mais de uma vez.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe neste projeto.';
    RETURN;
  END IF;

  FOREACH table_name IN ARRAY ARRAY['checkouts', 'leads', 'coupons', 'expenses']
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_rel pr
         JOIN pg_class c ON c.oid = pr.prrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_publication p ON p.oid = pr.prpubid
         WHERE p.pubname = 'supabase_realtime'
           AND n.nspname = 'public'
           AND c.relname = table_name
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
