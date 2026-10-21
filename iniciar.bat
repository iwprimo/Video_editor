@echo off
chcp 65001 >nul
title Editor de Video
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

if not exist node_modules (
  echo.
  echo [1/2] Instalando dependencias do editor (Node.js)...
  echo Isso so acontece na primeira vez e pode levar 1 a 2 minutos.
  call npm install
  if errorlevel 1 goto erro
)

where python >nul 2>nul
if not errorlevel 1 (
  if exist requirements.txt (
    echo [2/2] Verificando dependencias de IA (Python)...
    call pip install -r requirements.txt -q --disable-pip-version-check 2>nul
  )
) else (
  echo [Aviso] Python nao detectado no PATH. O editor funcionara normalmente,
  echo mas para usar o Recorte com IA instale o Python em https://python.org.
)

:rodar
echo.
echo ========================================================
echo   Editor de Video pronto!
echo   Abrindo no navegador: http://localhost:5173
echo   Para encerrar o editor, feche esta janela.
echo ========================================================
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
