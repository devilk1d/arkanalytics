-- =========================================================
-- Arkanalytics: Patch arka_id format to ark-(max 3 kata nama)-NN
-- =========================================================
-- Use this migration if DB was already created before 001 update.

-- Keep schema compatible with list_workspace_members()
alter table public.users
add column if not exists avatar_url text;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_clean_name text;
  v_name_parts text[];
  v_slug text;
  v_arka_id text;
  v_try int;
begin
  v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_clean_name := lower(regexp_replace(coalesce(v_full_name, 'user'), '[^a-zA-Z0-9 ]', ' ', 'g'));
  v_clean_name := btrim(regexp_replace(v_clean_name, '\s+', ' ', 'g'));
  v_name_parts := regexp_split_to_array(v_clean_name, '\s+');
  v_slug := array_to_string(v_name_parts[1:3], '-');

  if v_slug is null or v_slug = '' then
    v_slug := 'user';
  end if;

  for v_try in 1..120 loop
    v_arka_id := 'ark-' || v_slug || '-' || lpad((floor(random() * 100)::int)::text, 2, '0');

    begin
      insert into public.users (id, arka_id, full_name, email, avatar_url)
      values (
        new.id,
        v_arka_id,
        coalesce(v_full_name, ''),
        new.email,
        new.raw_user_meta_data ->> 'avatar_url'
      );
      return new;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception 'Failed to generate unique arka_id after % attempts', 120;
end;
$$;

-- Backfill existing users into new arka_id format
do $$
declare
  r record;
  v_clean_name text;
  v_name_parts text[];
  v_slug text;
  v_arka_id text;
  v_try int;
begin
  for r in select id, full_name from public.users loop
    v_clean_name := lower(regexp_replace(coalesce(nullif(btrim(r.full_name), ''), 'user'), '[^a-zA-Z0-9 ]', ' ', 'g'));
    v_clean_name := btrim(regexp_replace(v_clean_name, '\s+', ' ', 'g'));
    v_name_parts := regexp_split_to_array(v_clean_name, '\s+');
    v_slug := array_to_string(v_name_parts[1:3], '-');

    if v_slug is null or v_slug = '' then
      v_slug := 'user';
    end if;

    v_arka_id := null;
    for v_try in 1..120 loop
      v_arka_id := 'ark-' || v_slug || '-' || lpad((floor(random() * 100)::int)::text, 2, '0');
      exit when not exists (
        select 1
        from public.users u
        where u.arka_id = v_arka_id
          and u.id <> r.id
      );
    end loop;

    if v_arka_id is null then
      raise exception 'Failed to backfill arka_id for user %', r.id;
    end if;

    update public.users
    set arka_id = v_arka_id,
        updated_at = now()
    where id = r.id;
  end loop;
end;
$$;
