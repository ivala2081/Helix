-- Fix: the role-escalation guard was too strict. It reset role changes whenever
-- is_admin() was false — including server-side contexts (SQL editor, service
-- role, the bot) where auth.uid() is NULL. That made it impossible to grant the
-- first admin. Now it only blocks an AUTHENTICATED non-admin user; trusted
-- server contexts (auth.uid() IS NULL) and admins may change roles.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;
