#!/bin/bash
cd /home/z/my-project
while true; do
  bun run dev
  echo "[$(date)] Server died, restarting..." >> /home/z/my-project/dev.log
  sleep 2
done
