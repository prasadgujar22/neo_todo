create table if not exists public.todo_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.todo_sync_state enable row level security;

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
