-- Seguridad por fila: cada usuario solo ve su condominio; el residente solo su lote.
alter table condominios enable row level security;
alter table perfiles enable row level security;
alter table unidades enable row level security;
alter table vehiculos enable row level security;
alter table pases enable row level security;
alter table eventos enable row level security;
alter table presencia enable row level security;
alter table solicitudes enable row level security;

-- condominios: todos leen el suyo; solo admin edita
create policy condo_leer on condominios for select to authenticated using (id = mi_condominio());
create policy condo_editar on condominios for update to authenticated using (id = mi_condominio() and mi_rol() = 'admin');

-- perfiles: cada uno lee el suyo; admin lee y administra los de su condominio
create policy perfil_propio on perfiles for select to authenticated using (id = auth.uid());
create policy perfil_admin on perfiles for all to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- unidades: personal ve todas las del condominio; residente solo la suya
create policy uni_staff on unidades for select to authenticated using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'));
create policy uni_residente on unidades for select to authenticated using (id = mi_unidad());
create policy uni_admin on unidades for all to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- vehiculos: residente administra los de su lote; vigilante lee; admin todo
create policy veh_residente on vehiculos for all to authenticated using (unidad_id = mi_unidad()) with check (unidad_id = mi_unidad() and condominio_id = mi_condominio());
create policy veh_vigilante on vehiculos for select to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'vigilante');
create policy veh_admin on vehiculos for all to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- pases: residente crea y anula los de su lote; vigilante lee y actualiza usos; admin todo
create policy pase_residente on pases for all to authenticated using (unidad_id = mi_unidad()) with check (unidad_id = mi_unidad() and condominio_id = mi_condominio());
create policy pase_vigilante_leer on pases for select to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'vigilante');
create policy pase_vigilante_usar on pases for update to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'vigilante');
create policy pase_admin on pases for all to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- eventos (bitácora): residente lee los de su lote; vigilante lee e inserta; admin todo. Nadie borra desde la app.
create policy ev_residente on eventos for select to authenticated using (unidad_id = mi_unidad());
create policy ev_vigilante_leer on eventos for select to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'vigilante');
create policy ev_vigilante_insertar on eventos for insert to authenticated with check (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'));
create policy ev_vigilante_actualizar on eventos for update to authenticated using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin'));
create policy ev_admin_leer on eventos for select to authenticated using (condominio_id = mi_condominio() and mi_rol() = 'admin');

-- presencia (quién está dentro): residente lee su lote; vigilante y admin administran
create policy pres_residente on presencia for select to authenticated using (unidad_id = mi_unidad());
create policy pres_staff on presencia for all to authenticated using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin')) with check (condominio_id = mi_condominio());

-- solicitudes: vigilante crea y actualiza; residente lee y resuelve las de su lote; admin lee
create policy sol_residente on solicitudes for select to authenticated using (unidad_id = mi_unidad());
create policy sol_residente_resolver on solicitudes for update to authenticated using (unidad_id = mi_unidad());
create policy sol_staff on solicitudes for all to authenticated using (condominio_id = mi_condominio() and mi_rol() in ('vigilante','admin')) with check (condominio_id = mi_condominio());
