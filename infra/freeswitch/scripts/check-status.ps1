$ErrorActionPreference = 'Stop'

docker compose exec freeswitch fs_cli -x 'status'
docker compose exec freeswitch fs_cli -x 'module_exists mod_sofia'
docker compose exec freeswitch fs_cli -x 'module_exists mod_opus'
docker compose exec freeswitch fs_cli -x 'sofia status profile internal'
