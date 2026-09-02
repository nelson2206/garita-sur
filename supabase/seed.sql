-- Datos de arranque para un condominio piloto. Ejecutar después de las migraciones.
insert into condominios (id, nombre) values ('11111111-1111-1111-1111-111111111111', 'Condominio Piloto') on conflict do nothing;
insert into unidades (condominio_id, lote, propietario, telefono, cuotas_pendientes) values
  ('11111111-1111-1111-1111-111111111111', 'Lote 1', 'Propietario de prueba', '+51 999 999 999', 0),
  ('11111111-1111-1111-1111-111111111111', 'Lote 2', 'Segundo propietario', '+51 988 888 888', 2)
on conflict do nothing;

-- Después de que cada persona entre por primera vez con su correo, crea su perfil.
-- Reemplaza el uuid por el id que aparece en Authentication > Users.
-- insert into perfiles (id, condominio_id, rol, nombre) values ('<uuid-del-usuario>', '11111111-1111-1111-1111-111111111111', 'admin', 'Administración');
-- insert into perfiles (id, condominio_id, rol, nombre) values ('<uuid-del-usuario>', '11111111-1111-1111-1111-111111111111', 'vigilante', 'Garita turno día');
-- insert into perfiles (id, condominio_id, rol, nombre, unidad_id) values ('<uuid-del-usuario>', '11111111-1111-1111-1111-111111111111', 'residente', 'Familia Prueba', (select id from unidades where lote = 'Lote 1'));
