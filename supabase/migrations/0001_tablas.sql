-- Garita Sur · esquema base (Postgres / Supabase)
create extension if not exists pgcrypto;

create table condominios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  regla_morosidad text not null default 'informar' check (regla_morosidad in ('informar','amenidades')),
  acuerdo text,
  retencion_dias int not null default 30 check (retencion_dias between 1 and 60),
  creado_en timestamptz not null default now()
);

create table unidades (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  lote text not null,
  propietario text not null,
  telefono text,
  cuotas_pendientes int not null default 0,
  cupo_vehiculos int not null default 3,
  unique (condominio_id, lote)
);

-- Un perfil por usuario autenticado: rol y condominio. Los residentes además tienen su unidad.
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  condominio_id uuid not null references condominios(id) on delete cascade,
  rol text not null check (rol in ('residente','vigilante','admin')),
  nombre text not null,
  unidad_id uuid references unidades(id) on delete set null,
  telefono text
);

create table vehiculos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  unidad_id uuid not null references unidades(id) on delete cascade,
  placa text not null,
  descripcion text,
  unique (condominio_id, placa)
);

create table pases (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  unidad_id uuid not null references unidades(id) on delete cascade,
  codigo text not null,
  tipo text not null check (tipo in ('invitado','proveedor','huesped','personal')),
  nombre text not null,
  rol text,
  placa text,
  desde timestamptz not null,
  hasta timestamptz not null,
  dias int[],
  hora_desde text,
  hora_hasta text,
  usos int not null default 0,
  usos_max int not null default 1,
  estado text not null default 'activo' check (estado in ('activo','usado','vencido','anulado')),
  creado_en timestamptz not null default now(),
  unique (condominio_id, codigo)
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  unidad_id uuid references unidades(id) on delete set null,
  ts timestamptz not null default now(),
  tipo text not null check (tipo in ('ingreso','salida')),
  nombre text not null,
  placa text,
  medio text not null check (medio in ('qr','manual','placa')),
  autorizo text,
  foto_url text,
  pase_id uuid,
  registrado_por uuid,
  sincronizado boolean not null default true
);
create index eventos_condo_ts on eventos (condominio_id, ts desc);

create table presencia (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  unidad_id uuid references unidades(id) on delete set null,
  nombre text not null,
  placa text,
  desde timestamptz not null default now(),
  tipo text not null default 'visita'
);

create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  unidad_id uuid not null references unidades(id) on delete cascade,
  ts timestamptz not null default now(),
  nombre text not null,
  placa text,
  nota text,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada','telefono','ingreso')),
  resuelto_en timestamptz
);

-- Funciones auxiliares para las políticas de seguridad (leen el perfil del usuario conectado).
create or replace function mi_condominio() returns uuid language sql stable security definer set search_path = public as $$
  select condominio_id from perfiles where id = auth.uid()
$$;
create or replace function mi_rol() returns text language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;
create or replace function mi_unidad() returns uuid language sql stable security definer set search_path = public as $$
  select unidad_id from perfiles where id = auth.uid()
$$;
