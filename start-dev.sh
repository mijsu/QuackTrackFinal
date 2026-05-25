#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15"
LOG=/home/z/my-project/dev.log

while true; do
  echo "[$(date)] Starting Next.js (turbopack)..." >> $LOG
  node ./node_modules/.bin/next dev -p 3000 --turbopack >> $LOG 2>&1
  EXIT=$?
  echo "[$(date)] Server exited (code=$EXIT), restarting in 2s..." >> $LOG
  sleep 2
done
