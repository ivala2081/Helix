-- Add signup fields to profiles: phone, telegram_id, referral code (who
-- referred them). Populated from auth user metadata by handle_new_user().

alter table public.profiles
  add column if not exists phone            text,
  add column if not exists telegram_id      text,
  add column if not exists referred_by_code text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, telegram_id, referred_by_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'telegram_id',
    new.raw_user_meta_data ->> 'referred_by_code'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
