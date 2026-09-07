-- Mejoras del piloto: turnos de garita, libro de ocurrencias, invitaciones de acceso,
-- tipos de pase para familia y obra, y trazabilidad del vigilante en la bitácora.

-- Nuevos tipos de pase y agrupador de evento u obra.
alter table pases drop constraint if exists pases_tipo_check;
alter table pases add constraint pases_tipo_check check (tipo in ('invitado','proveedor','huesped','personal','familiar','obra'));
alter table pases add column if not exists grupo text;

-- Quién registró cada movimiento y en qué turno.
alter table eventos add column if not exists vigilante text;
alter table eventos add column if not exists turno_id uuid;

-- Responsable de datos personales del condominio (aparece en el aviso y el cartel).
alter table condominios add column if not exists responsable_datos text;

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  vigilante text not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  notas_apertura text,
  notas_cierre text
);
create index if not exists turnos_condo_inicio on turnos (condominio_id, inicio desc);

create table if not exists ocurrencias (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  turno_id uuid references turnos(id) on delete set null,
  ts timestamptz not null default now(),
  texto text not null,
  gravedad text not null default 'nota' check (gravedad in ('nota','incidente')),
  vigilante text
);
create index if not exists ocurrencias_condo_ts on ocurrencias (condominio_id, ts desc);

create table if not exists invitaciones (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  email text not null,
  rol text not null check (rol in ('residente','vigilante','admin')),
  nombre text not null,
  unidad_id uuid references unidades(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptada','anulada')),
  creado_en timestamptz not null default now(),
  aceptado_en timestamptz
);
create unique index if not exists invitaciones_email_pendiente on invitaciones (condominio_id, lower(email)) where estado = 'pendiente';

alter table turnos enable row level security;
alter table ocurrencias enable row level security;
alter table invitaciones enable row level security;

-- Turnos y ocurrencias: vigilante y administración escriben; el residente no los ve.
create policy turno_staff on turnos for all to authenticated
  using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'))
  with check (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'));
create policy ocurr_staff on ocurrencias for all to authenticated
  using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'))
  with check (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'));

-- Invitaciones: solo la administración las ve y administra.
create policy inv_admin on invitaciones for all to authenticated
  using (condominio_id = mi_condominio() and mi_rol() = 'admin')
  with check (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- Al entrar por primera vez, la invitación pendiente de ese correo crea el perfil.
create or replace function aceptar_invitacion() returns boolean
language plpgsql security definer set search_path = public as $$
declare inv invitaciones%rowtype; correo text;
begin
  if exists (select 1 from perfiles where id = auth.uid()) then return false; end if;
  select email into correo from auth.users where id = auth.uid();
  if correo is null then return false; end if;
  select * into inv from invitaciones
    where lower(email) = lower(correo) and estado = 'pendiente'
    order by creado_en desc limit 1;
  if inv.id is null then return false; end if;
  insert into perfiles (id, condominio_id, rol, nombre, unidad_id)
    values (auth.uid(), inv.condominio_id, inv.rol, inv.nombre, inv.unidad_id);
  update invitaciones set estado = 'aceptada', aceptado_en = now() where id = inv.id;
  return true;
end $$;
grant execute on function aceptar_invitacion() to authenticated;

-- Tiempo real para las tablas nuevas.
alter publication supabase_realtime add table turnos, ocurrencias, invitaciones;
