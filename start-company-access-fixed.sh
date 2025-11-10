#!/bin/bash

echo "🚀 启动ERP系统公司访问模式..."
echo "=================================="

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装！"
    echo "请先安装ngrok："
    echo "1. 访问 https://ngrok.com/download"
    echo "2. 下载macOS版本"
    echo "3. 解压并移动到 /usr/local/bin/"
    echo ""
    echo "或者使用npm安装："
    echo "npm install -g ngrok"
    exit 1
fi

# 检查是否配置了authtoken
if ! ngrok config check &> /dev/null; then
    echo "❌ ngrok未配置authtoken！"
    echo "请先配置："
    echo "ngrok config add-authtoken YOUR_AUTHTOKEN"
    echo ""
    echo "获取authtoken："
    echo "1. 访问 https://ngrok.com/"
    echo "2. 注册账户"
    echo "3. 获取authtoken"
    exit 1
fi

# 检查ERP系统是否在运行
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "📦 启动ERP系统..."
    npm run dev &
    ERP_PID=$!
    
    # 等待系统启动
    echo "⏳ 等待系统启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3001 > /dev/null; then
            echo "✅ ERP系统启动成功！"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if ! curl -s http://localhost:3001 > /dev/null; then
        echo "❌ ERP系统启动失败！"
        kill $ERP_PID 2>/dev/null
        exit 1
    fi
else
    echo "✅ ERP系统已在运行"
fi

echo ""
echo "🌐 启动ngrok隧道..."
echo "=================================="

# 启动ngrok
ngrok http 3001 --log=stdout &
NGROK_PID=$!

# 等待ngrok启动
sleep 3

# 获取ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取ngrok URL"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 成功！您的ERP系统现在可以通过以下地址访问："
echo "=================================="
echo "🌐 公网地址: $NGROK_URL"
echo "🏠 本地地址: http://localhost:3001"
echo ""
echo "📱 分享给同事的访问信息："
echo "--------------------------------"
echo "访问地址: $NGROK_URL"
echo "用户名: admin"
echo "密码: admin123"
echo ""
echo "🔒 安全提醒："
echo "--------------------------------"
echo "1. 立即更改admin密码"
echo "2. 为员工创建独立账户"
echo "3. 分配适当权限"
echo ""
echo "📊 监控地址: http://localhost:4040"
echo "=================================="
echo ""
echo "按 Ctrl+C 停止服务"

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $NGROK_PID 2>/dev/null
    if [ ! -z "$ERP_PID" ]; then
        kill $ERP_PID 2>/dev/null
    fi
    echo "✅ 服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 保持脚本运行
while true; do
    sleep 1
done
