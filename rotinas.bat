@echo off
cd /d C:\Users\mjapa\rotinas
start "" cmd /k "npm run dev"
timeout /t 4 /nobreak > nul
start "" "http://localhost:3000"
