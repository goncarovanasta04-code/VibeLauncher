@echo off
chcp 65001 > nul
title VibeLauncher - Публикация обновления на GitHub

echo ====================================================
echo        VibeLauncher - Публикация обновления
echo ====================================================
echo.
echo Текущая версия указана в package.json.
set /p NEW_VER="Введите новую версию (например 1.3.6) или нажмите Enter для сборки текущей: "

if "%NEW_VER%"=="" (
    node scripts/publish-release.js
) else (
    node scripts/publish-release.js %NEW_VER%
)

echo.
echo ====================================================
pause
