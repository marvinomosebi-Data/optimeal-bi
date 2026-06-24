@echo off
chcp 65001 > nul
title OptiMeal BI — Bowen University
cd /d "%~dp0"

echo.
echo  OptiMeal BI - Bowen University
echo  -----------------------------------------------

where node >nul 2>&1
if %errorlevel% == 0 (
    echo  Starting on http://localhost:3000 ...
    start "" "http://localhost:3000"
    npx --yes serve dist -p 3000 -s
    goto :end
)

where python >nul 2>&1
if %errorlevel% == 0 (
    echo  Starting on http://localhost:8080 ...
    start "" "http://localhost:8080"
    python -m http.server 8080 --directory dist
    goto :end
)

where py >nul 2>&1
if %errorlevel% == 0 (
    echo  Starting on http://localhost:8080 ...
    start "" "http://localhost:8080"
    py -m http.server 8080 --directory dist
    goto :end
)

echo.
echo  Node.js or Python is required to run this app locally.
echo  Download Node.js from https://nodejs.org and run this file again.
echo.

:end
pause
