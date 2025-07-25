@echo off
echo Starting Python HTTP server...
python -m http.server 8000 --bind 127.0.0.1
echo Server stopped.
pause
