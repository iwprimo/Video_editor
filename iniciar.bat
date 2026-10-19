@echo off
chcp 65001 >nul
title Editor de Video
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

if exist node_modules goto rodar
echo Instalando dependencias - so na primeira vez, pode levar alguns minutos...
call npm install
if errorlevel 1 goto erro

:rodar
echo.
echo Abrindo o editor em http://localhost:5173
echo Para encerrar, feche esta janela.
echo.
call npm run dev
goto fim

:semnode
echo Node.js nao encontrado.
echo Instale a versao 22 LTS ou mais nova em https://nodejs.org e rode este arquivo de novo.
pause
exit /b 1

:erro
echo A instalacao falhou. Verifique a conexao com a internet e tente de novo.
pause
exit /b 1

:fim
pause
