@echo off
setlocal
cd /d "%~dp0"

:: 检查端口 30001 是否被占用
netstat -ano | findstr /R /C:":30001 .*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [!] M20 控制后端已经在运行中 ^(端口 30001 被占用^)
    echo [2/2] 正在打开控制面板...
    start "" "index.html"
    echo 完成。本窗口将在 3 秒后关闭。
    timeout /t 3 /nobreak >nul
    exit /b 0
)

echo [1/2] 正在启动 M20 控制后端 (Node.js)...

:: 启动后台服务并预先打开网页
start "" "index.html"

echo [2/2] 已在默认浏览器中打开控制台面板 index.html
echo.
echo ====================================================
echo 服务运行中。如需停止服务，请直接关闭此命令提示符窗口，
echo 或按下 Ctrl+C。
echo ====================================================

:: 启动服务并阻塞当前窗口
node backend\server.js

endlocal
