# ERP系统公司访问指南

## 🎯 目标
让您的ERP系统可以通过互联网访问，供全公司员工使用。

## 📋 快速开始

### 1. 安装ngrok
```bash
./install-ngrok.sh
```

### 2. 注册并配置ngrok
1. 访问 https://ngrok.com/ 注册账户
2. 获取authtoken
3. 运行: `ngrok config add-authtoken YOUR_AUTHTOKEN`

### 3. 启动公司访问
```bash
./start-company-access.sh
```

## 📱 分享访问信息

启动后您会看到：
```
🌐 公网地址: https://abc123.ngrok.io
用户名: admin
密码: admin123
```

## 👥 为员工创建账户

1. 使用admin账户登录
2. 进入"用户管理"页面
3. 为每个员工创建账户
4. 分配适当角色权限

## 🔒 安全提醒

1. 立即更改admin密码
2. 为员工创建独立账户
3. 设置合适的权限

## 📞 需要帮助？

查看详细文档：
- `NGROK_SETUP.md` - 详细ngrok设置
- `QUICK_NGROK_SETUP.md` - 快速设置指南

---

**现在全公司都可以使用您的ERP系统了！** 🎉
