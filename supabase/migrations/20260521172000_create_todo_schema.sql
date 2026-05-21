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

create index if not exists groups_user_position_idx on public.groups(user_id, position);
create index if not exists todos_user_position_idx on public.todos(user_id, position);
create index if not exists todos_user_group_idx on public.todos(user_id, group_id);

alter table public.groups enable row level security;
alter table public.todos enable row level security;

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
