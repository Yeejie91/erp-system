# ngrok设置指南 - 让ERP系统全公司使用

## 🚀 什么是ngrok？

ngrok是一个反向隧道工具，可以将您的本地开发服务器暴露到互联网上，让其他人通过公网URL访问您的ERP系统。

## 📥 安装ngrok

### 方法1: 使用Homebrew (推荐)
```bash
# 安装Homebrew (如果还没有安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 使用Homebrew安装ngrok
brew install ngrok/ngrok/ngrok
```

### 方法2: 直接下载
1. 访问 https://ngrok.com/download
2. 下载适合macOS的版本
3. 解压到 `/usr/local/bin/` 目录

### 方法3: 使用npm
```bash
npm install -g ngrok
```

## 🔑 注册和配置ngrok

### 1. 注册ngrok账户
1. 访问 https://ngrok.com/
2. 注册免费账户
3. 获取您的authtoken

### 2. 配置authtoken
```bash
# 替换 YOUR_AUTHTOKEN 为您的实际token
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## 🌐 启动ERP系统并暴露到公网

### 步骤1: 启动ERP系统
```bash
cd erp-system
npm run dev
```
系统将在 http://localhost:5173 启动

### 步骤2: 启动ngrok隧道
```bash
# 在另一个终端窗口中运行
ngrok http 5173
```

### 步骤3: 获取公网URL
ngrok会显示类似这样的信息：
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:5173
Forwarding                    http://abc123.ngrok.io -> http://localhost:5173
```

**重要**: 复制 `https://abc123.ngrok.io` 这个URL，这就是您的ERP系统的公网访问地址！

## 👥 让全公司使用

### 1. 分享访问信息
将以下信息分享给公司同事：

**ERP系统访问地址**: `https://您的ngrok地址.ngrok.io`

**默认登录账户**:
- 用户名: `admin`
- 密码: `admin123`

### 2. 创建用户账户
为了安全，建议为每个员工创建独立的账户：

1. 使用admin账户登录系统
2. 进入"用户管理"页面
3. 为每个员工创建账户
4. 分配适当的角色权限

### 3. 角色权限建议
- **经理**: 拥有大部分权限
- **收银员**: 销售和客户管理权限
- **仓库管理员**: 库存和商品管理权限
- **普通员工**: 基础查看权限

## 🔒 安全注意事项

### 1. 更改默认密码
```bash
# 立即更改admin账户密码
# 在系统中进入"用户管理"页面修改
```

### 2. 使用HTTPS
ngrok免费版自动提供HTTPS，确保数据传输安全

### 3. 限制访问
- 定期更换ngrok URL
- 监控系统使用情况
- 设置强密码策略

## 📱 移动端访问

ngrok暴露的系统支持移动端访问：
- 手机浏览器可以直接访问
- 响应式设计适配移动设备
- 支持触摸操作

## 🔧 高级配置

### 1. 自定义子域名 (付费版)
```bash
ngrok http 5173 --subdomain=yourcompany-erp
```

### 2. 设置密码保护
```bash
ngrok http 5173 --basic-auth="username:password"
```

### 3. 白名单IP (付费版)
```bash
ngrok http 5173 --cidr-allow="192.168.1.0/24"
```

## 🚨 故障排除

### 常见问题

**1. ngrok命令未找到**
```bash
# 检查安装
which ngrok
# 如果没有，重新安装
brew install ngrok/ngrok/ngrok
```

**2. authtoken错误**
```bash
# 重新配置authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**3. 端口被占用**
```bash
# 检查端口使用情况
lsof -i :5173
# 杀死占用进程或使用其他端口
```

**4. 连接超时**
- 检查网络连接
- 重启ngrok
- 检查防火墙设置

### 调试工具
```bash
# 查看ngrok状态
ngrok status

# 查看隧道详情
ngrok api tunnels list
```

## 📊 监控和统计

### ngrok Web界面
访问 http://127.0.0.1:4040 查看：
- 请求统计
- 响应时间
- 错误日志
- 实时流量

### ERP系统日志
在ERP系统中查看：
- 用户登录记录
- 操作日志
- 系统使用统计

## 💡 使用建议

### 1. 生产环境建议
- 考虑使用付费版ngrok获得固定域名
- 设置数据备份策略
- 配置监控和告警

### 2. 性能优化
- 使用CDN加速
- 优化数据库查询
- 启用缓存机制

### 3. 团队协作
- 建立使用规范
- 定期培训用户
- 收集反馈意见

## 🎯 快速启动脚本

创建一个启动脚本 `start-company-access.sh`:

```bash
#!/bin/bash
echo "🚀 启动ERP系统公司访问模式..."

# 启动ERP系统
cd erp-system
npm run dev &
ERP_PID=$!

# 等待系统启动
sleep 5

# 启动ngrok
echo "🌐 启动ngrok隧道..."
ngrok http 5173

# 清理进程
trap "kill $ERP_PID" EXIT
```

使用脚本：
```bash
chmod +x start-company-access.sh
./start-company-access.sh
```

## 📞 技术支持

如果遇到问题：
1. 检查ngrok状态: `ngrok status`
2. 查看ERP系统日志
3. 检查网络连接
4. 重启服务和ngrok

---

**现在您的ERP系统可以让全公司使用了！** 🎉

记住：
- 分享ngrok提供的HTTPS URL
- 为员工创建独立账户
- 定期备份数据
- 监控系统使用情况
