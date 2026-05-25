#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15"
while true; do
  node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1 | tee -a /home/z/my-project/dev.log
  sleep 2
done
