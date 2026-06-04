-- Опционально: Supabase → SQL Editor → выполнить целиком.
-- Затем в js/config/friendsEnv.js укажите Project URL и anon public key.

create table if not exists etheria_profiles (
    player_id text primary key,
    sync_token text not null,
    friend_code text not null unique,
    profile jsonb not null default '{}'::jsonb,
    updated_at bigint not null default 0
);

create table if not exists etheria_friendships (
    player_id text not null references etheria_profiles (player_id) on delete cascade,
    friend_id text not null references etheria_profiles (player_id) on delete cascade,
    primary key (player_id, friend_id)
);

create index if not exists etheria_friendships_player_idx on etheria_friendships (player_id);

create or replace function etheria_sync_profile(
    p_player_id text default null,
    p_sync_token text default null,
    p_profile jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id text;
    v_token text;
    v_code text;
    v_updated bigint;
    chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    i int;
    exists_row etheria_profiles%rowtype;
begin
    if p_profile is null then
        return jsonb_build_object('ok', false, 'error', 'invalid_profile');
    end if;

    if p_player_id is null or length(trim(p_player_id)) = 0 then
        v_id := 'p_' || encode(gen_random_bytes(8), 'hex');
        v_token := encode(gen_random_bytes(16), 'hex');
        v_code := '';
        for i in 1..6 loop
            v_code := v_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
        end loop;
        loop
            begin
                insert into etheria_profiles (player_id, sync_token, friend_code, profile, updated_at)
                values (v_id, v_token, v_code, p_profile, (extract(epoch from now()) * 1000)::bigint);
                exit;
            exception when unique_violation then
                v_code := '';
                for i in 1..6 loop
                    v_code := v_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
                end loop;
            end;
        end loop;
        return jsonb_build_object(
            'ok', true,
            'playerId', v_id,
            'syncToken', v_token,
            'friendCode', v_code,
            'updatedAt', (extract(epoch from now()) * 1000)::bigint
        );
    end if;

    select * into exists_row from etheria_profiles where player_id = p_player_id;
    if not found or exists_row.sync_token is distinct from p_sync_token then
        return jsonb_build_object('ok', false, 'error', 'unauthorized');
    end if;

    update etheria_profiles
    set profile = p_profile,
        updated_at = (extract(epoch from now()) * 1000)::bigint
    where player_id = p_player_id;

    return jsonb_build_object(
        'ok', true,
        'playerId', p_player_id,
        'syncToken', p_sync_token,
        'friendCode', exists_row.friend_code,
        'updatedAt', (extract(epoch from now()) * 1000)::bigint
    );
end;
$$;

create or replace function etheria_add_friend(
    p_player_id text,
    p_sync_token text,
    p_friend_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_friend_id text;
    v_snap jsonb;
begin
    if not exists (
        select 1 from etheria_profiles
        where player_id = p_player_id and sync_token = p_sync_token
    ) then
        return jsonb_build_object('ok', false, 'error', 'unauthorized');
    end if;

    select player_id into v_friend_id
    from etheria_profiles
    where friend_code = upper(trim(p_friend_code));

    if v_friend_id is null then
        return jsonb_build_object('ok', false, 'error', 'code_not_found');
    end if;

    if v_friend_id = p_player_id then
        return jsonb_build_object('ok', false, 'error', 'self_friend');
    end if;

    insert into etheria_friendships (player_id, friend_id)
    values (p_player_id, v_friend_id)
    on conflict do nothing;

    insert into etheria_friendships (player_id, friend_id)
    values (v_friend_id, p_player_id)
    on conflict do nothing;

    select jsonb_build_object(
        'ok', true,
        'friend', jsonb_build_object(
            'playerId', fp.player_id,
            'friendCode', fp.friend_code,
            'updatedAt', fp.updated_at,
            'profile', fp.profile
        )
    ) into v_snap
    from etheria_profiles fp
    where fp.player_id = v_friend_id;

    return v_snap;
end;
$$;

create or replace function etheria_list_friends(
    p_player_id text,
    p_sync_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_friends jsonb;
begin
    if not exists (
        select 1 from etheria_profiles
        where player_id = p_player_id and sync_token = p_sync_token
    ) then
        return jsonb_build_object('ok', false, 'error', 'unauthorized');
    end if;

    select coalesce(jsonb_agg(
        jsonb_build_object(
            'playerId', fp.player_id,
            'friendCode', fp.friend_code,
            'updatedAt', fp.updated_at,
            'profile', fp.profile
        ) order by fp.updated_at desc
    ), '[]'::jsonb)
    into v_friends
    from etheria_friendships f
    join etheria_profiles fp on fp.player_id = f.friend_id
    where f.player_id = p_player_id;

    return jsonb_build_object('ok', true, 'friends', v_friends);
end;
$$;

grant execute on function etheria_sync_profile to anon, authenticated;
grant execute on function etheria_add_friend to anon, authenticated;
grant execute on function etheria_list_friends to anon, authenticated;
