-- Tablas del Bootcamp IA (diagnostico + seguimiento de tareas).
-- Vive en el proyecto Supabase de Polibio (hyylhendjtwdtflzsjdx), reusando su
-- backend (OPENAI_API_KEY, RESEND_API_KEY ya configurados como secretos).
-- No toca ninguna tabla existente de Polibio.

create table if not exists bootcamp_diagnostico (
  id uuid primary key default gen_random_uuid(),
  sesion text,
  nombre text,
  equipo text,
  email text,
  respuestas jsonb,
  dimensiones jsonb,
  arquetipo text,
  created_at timestamptz default now()
);
alter table bootcamp_diagnostico enable row level security;
drop policy if exists "bootcamp insert anon" on bootcamp_diagnostico;
drop policy if exists "bootcamp select anon" on bootcamp_diagnostico;
create policy "bootcamp insert anon" on bootcamp_diagnostico for insert to anon with check (true);
create policy "bootcamp select anon" on bootcamp_diagnostico for select to anon using (true);

create table if not exists bootcamp_tareas (
  id uuid primary key,
  sesion text,
  participante text,
  email text,
  arquetipo text,
  orden int,
  paso jsonb,
  estado text default 'pendiente',
  creada_at timestamptz,
  fecha_limite timestamptz,
  respuesta text,
  entregada_at timestamptz,
  evaluacion jsonb,
  recordatorios int default 0,
  ultimo_recordatorio_at timestamptz
);
alter table bootcamp_tareas enable row level security;
drop policy if exists "tareas anon rw" on bootcamp_tareas;
create policy "tareas anon rw" on bootcamp_tareas for all to anon using (true) with check (true);

create index if not exists idx_bootcamp_tareas_sesion on bootcamp_tareas(sesion);
create index if not exists idx_bootcamp_tareas_participante on bootcamp_tareas(participante);
create index if not exists idx_bootcamp_diagnostico_sesion on bootcamp_diagnostico(sesion);
