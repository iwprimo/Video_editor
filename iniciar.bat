@echo off
chcp 65001 >nul
title Editor de Video
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

if not exist node_modules (
  echo Instalando dependencias do editor (Node.js) - so na primeira vez...
  call npm install
  if errorlevel 1 goto erro
)

where python >nul 2>nul
if not errorlevel 1 (
  if exist requirements.txt (
    call pip install -r requirements.txt -q --disable-pip-version-check 2>nul
  )
)

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
