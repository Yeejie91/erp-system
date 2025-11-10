#!/bin/bash

echo "🚀 安装ngrok工具..."
echo "=================================="

# 检查是否已安装
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok已安装！"
    ngrok version
    exit 0
fi

echo "📥 下载ngrok..."
echo "请选择安装方法："
echo "1. 使用npm安装 (推荐)"
echo "2. 手动下载安装"
echo ""

read -p "请选择 (1-2): " choice

case $choice in
    1)
        echo "📦 使用npm安装ngrok..."
        if command -v npm &> /dev/null; then
            npm install -g ngrok
            if [ $? -eq 0 ]; then
                echo "✅ ngrok安装成功！"
            else
                echo "❌ npm安装失败，请尝试手动安装"
                exit 1
            fi
        else
            echo "❌ npm未安装，请先安装Node.js"
            exit 1
        fi
        ;;
    2)
        echo "📥 手动下载安装..."
        echo "1. 访问 https://ngrok.com/download"
        echo "2. 下载macOS版本"
        echo "3. 解压到桌面"
        echo "4. 运行以下命令："
        echo "   sudo mv ~/Desktop/ngrok /usr/local/bin/"
        echo "   sudo chmod +x /usr/local/bin/ngrok"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🔑 配置ngrok..."
echo "1. 访问 https://ngrok.com/"
echo "2. 注册免费账户"
echo "3. 获取您的authtoken"
echo "4. 运行: ngrok config add-authtoken YOUR_AUTHTOKEN"
echo ""
echo "✅ 安装完成！现在可以使用 ./start-company-access.sh 启动公司访问模式"
