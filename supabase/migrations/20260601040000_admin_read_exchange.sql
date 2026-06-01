-- Let admins SEE exchange connection status (not the plaintext secrets — those
-- are AES-encrypted with a key the DB never holds). The admin panel queries
-- only user_id/exchange/status, never the *_enc columns. Customer ownership
-- policy (exchange_conn_all) still governs all writes.

create policy exchange_conn_admin_read on public.exchange_connections
  for select using (public.is_admin());
