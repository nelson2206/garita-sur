-- Pase público: el invitado abre el enlace sin cuenta y ve solo lo necesario.
create or replace function pase_publico(p_codigo text)
returns table (nombre text, codigo text, tipo text, desde timestamptz, hasta timestamptz, hora_desde text, hora_hasta text, usos int, usos_max int, lote text, propietario text, condominio text)
language sql stable security definer set search_path = public as $$
  select p.nombre, p.codigo, p.tipo, p.desde, p.hasta, p.hora_desde, p.hora_hasta, p.usos, p.usos_max, u.lote, u.propietario, c.nombre
  from pases p join unidades u on u.id = p.unidad_id join condominios c on c.id = p.condominio_id
  where upper(p.codigo) = upper(p_codigo) and p.estado = 'activo'
$$;
grant execute on function pase_publico(text) to anon, authenticated;

-- Fotos de la bitácora en un bucket privado; la app las muestra con enlaces firmados.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = mi_condominio()::text and mi_rol() in ('vigilante','admin'));
create policy fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = mi_condominio()::text and mi_rol() in ('vigilante','admin'));
create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = mi_condominio()::text and mi_rol() = 'admin');

-- Tiempo real: la app se suscribe a cambios de estas tablas.
alter publication supabase_realtime add table condominios, unidades, vehiculos, pases, eventos, presencia, solicitudes;

-- Retención: borra la referencia a fotos más antiguas que la retención del condominio (máximo 60 días).
-- Programar con pg_cron (Database > Extensions > pg_cron), por ejemplo cada noche:
--   select cron.schedule('limpiar_fotos', '0 3 * * *', $$select limpiar_fotos()$$);
create or replace function limpiar_fotos() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with viejos as (
    update eventos e set foto_url = null
    from condominios c
    where e.condominio_id = c.id and e.foto_url is not null and e.ts < now() - make_interval(days => least(c.retencion_dias, 60))
    returning e.id
  ) select count(*) into n from viejos;
  return n;
end $$;

-- Pases vencidos: marca como vencidos los que pasaron su fecha (también se puede programar con pg_cron).
create or replace function vencer_pases() returns int language sql security definer set search_path = public as $$
  with v as (update pases set estado = 'vencido' where estado = 'activo' and hasta < now() and tipo <> 'personal' returning id)
  select count(*)::int from v
$$;
