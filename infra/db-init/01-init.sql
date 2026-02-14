-- Placeholder for future RLS and policies (commented out for v1)
-- Example skeletons to be enabled when moving to multi-tenant hardening

-- -- Enable row level security on a table
-- ALTER TABLE public.spend_items ENABLE ROW LEVEL SECURITY;

-- -- Example policy allowing owners to read/write their rows
-- CREATE POLICY spend_items_owner_policy ON public.spend_items
--   USING (owner_it_id = current_setting('app.current_user_id')::uuid)
--   WITH CHECK (owner_it_id = current_setting('app.current_user_id')::uuid);

-- -- Set current user id for session (set this from API connection where applicable)
-- -- SELECT set_config('app.current_user_id', '<uuid>', false);

