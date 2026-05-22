create table if not exists public.groups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  position integer not null default 0
);

create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text references public.groups(id) on delete set null,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  due_date text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  position integer not null default 0
);

create table if not exists public.todo_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists groups_user_position_idx on public.groups(user_id, position);
create index if not exists todos_user_position_idx on public.todos(user_id, position);
create index if not exists todos_user_group_idx on public.todos(user_id, group_id);

alter table public.groups enable row level security;
alter table public.todos enable row level security;
alter table public.todo_sync_state enable row level security;

drop policy if exists "Users can read their groups" on public.groups;
drop policy if exists "Users can insert their groups" on public.groups;
drop policy if exists "Users can update their groups" on public.groups;
drop policy if exists "Users can delete their groups" on public.groups;

create policy "Users can read their groups"
  on public.groups for select
  using (auth.uid() = user_id);

create policy "Users can insert their groups"
  on public.groups for insert
  with check (auth.uid() = user_id);

create policy "Users can update their groups"
  on public.groups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their groups"
  on public.groups for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their todos" on public.todos;
drop policy if exists "Users can insert their todos" on public.todos;
drop policy if exists "Users can update their todos" on public.todos;
drop policy if exists "Users can delete their todos" on public.todos;

create policy "Users can read their todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their todos"
  on public.todos for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their sync state" on public.todo_sync_state;
drop policy if exists "Users can insert their sync state" on public.todo_sync_state;
drop policy if exists "Users can update their sync state" on public.todo_sync_state;

create policy "Users can read their sync state"
  on public.todo_sync_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their sync state"
  on public.todo_sync_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their sync state"
  on public.todo_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.save_todo_state(
  p_expected_updated_at timestamptz,
  p_groups jsonb default '[]'::jsonb,
  p_todos jsonb default '[]'::jsonb
)
returns table(status text, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_updated_at timestamptz;
  v_next_updated_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select todo_sync_state.updated_at
    into v_current_updated_at
    from public.todo_sync_state
    where user_id = v_user_id;

  if v_current_updated_at is distinct from p_expected_updated_at then
    return query select 'conflict'::text, v_current_updated_at;
    return;
  end if;

  delete from public.todos where user_id = v_user_id;
  delete from public.groups where user_id = v_user_id;

  insert into public.groups (id, user_id, title, created_at, position)
  select
    incoming.id,
    v_user_id,
    incoming.title,
    coalesce(incoming.created_at, v_next_updated_at),
    coalesce(incoming.position, 0)
  from jsonb_to_recordset(coalesce(p_groups, '[]'::jsonb)) as incoming(
    id text,
    title text,
    created_at timestamptz,
    position integer
  );

  insert into public.todos (
    id,
    user_id,
    group_id,
    text,
    completed,
    created_at,
    due_date,
    priority,
    position
  )
  select
    incoming.id,
    v_user_id,
    case when existing_group.id is null then null else incoming.group_id end,
    incoming.text,
    coalesce(incoming.completed, false),
    coalesce(incoming.created_at, v_next_updated_at),
    incoming.due_date,
    coalesce(incoming.priority, 'medium'),
    coalesce(incoming.position, 0)
  from jsonb_to_recordset(coalesce(p_todos, '[]'::jsonb)) as incoming(
    id text,
    group_id text,
    text text,
    completed boolean,
    created_at timestamptz,
    due_date text,
    priority text,
    position integer
  )
  left join public.groups existing_group
    on existing_group.id = incoming.group_id
    and existing_group.user_id = v_user_id;

  insert into public.todo_sync_state (user_id, initialized, updated_at)
  values (v_user_id, true, v_next_updated_at)
  on conflict (user_id) do update
    set initialized = excluded.initialized,
        updated_at = excluded.updated_at;

  return query select 'saved'::text, v_next_updated_at;
end;
$$;
