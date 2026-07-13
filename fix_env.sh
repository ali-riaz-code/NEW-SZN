#!/bin/bash
sed -i '3d' /home/admin/newszn/.env
sed -i 's/?pgbouncer=true&connection_limit=2"//' /home/admin/newszn/apps/web/.env.local
echo '=== Root .env ==='
cat -n /home/admin/newszn/.env | head -5
echo '=== Web .env.local ==='
cat -n /home/admin/newszn/apps/web/.env.local | head -12
