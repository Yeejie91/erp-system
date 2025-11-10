#!/bin/bash

echo "🔍 检查ERP系统状态..."
echo "=================================="

# 检查ERP系统
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ ERP系统正在运行 (端口3001)"
else
    echo "❌ ERP系统未运行"
fi

# 检查ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ ! -z "$NGROK_URL" ]; then
    echo "✅ ngrok隧道已建立"
    echo "🌐 公网地址: $NGROK_URL"
else
    echo "❌ ngrok隧道未建立"
fi

echo "=================================="
if [ ! -z "$NGROK_URL" ]; then
    echo "📱 分享给同事的访问信息："
    echo "访问地址: $NGROK_URL"
    echo "用户名: admin"
    echo "密码: admin123"
else
    echo "请运行 ./start-company-access.sh 启动服务"
fi
