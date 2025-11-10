# 快速ngrok设置指南

## 🚀 简单安装方法

### 方法1: 直接下载ngrok (推荐)
1. 访问 https://ngrok.com/download
2. 下载 macOS 版本
3. 解压到桌面
4. 打开终端，运行：
```bash
# 将ngrok移动到系统路径
sudo mv ~/Desktop/ngrok /usr/local/bin/
sudo chmod +x /usr/local/bin/ngrok
```

### 方法2: 使用npm安装
```bash
npm install -g ngrok
```

## 🔑 快速配置

### 1. 注册ngrok账户
- 访问 https://ngrok.com/
- 注册免费账户
- 获取您的authtoken

### 2. 配置authtoken
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## 🌐 启动公司访问

### 步骤1: 启动ERP系统
```bash
cd erp-system
npm run dev
```

### 步骤2: 启动ngrok (新终端窗口)
```bash
ngrok http 5173
```

### 步骤3: 获取公网地址
ngrok会显示类似：
```
Forwarding    https://abc123.ngrok.io -> http://localhost:5173
```

**这就是您的ERP系统公网地址！**

## 👥 分享给公司同事

**访问地址**: `https://abc123.ngrok.io`

**登录信息**:
- 用户名: `admin`
- 密码: `admin123`

## 🔒 安全建议

1. **立即更改admin密码**
2. **为员工创建独立账户**
3. **分配适当权限**

## 📱 移动端支持

系统支持手机访问，员工可以在手机上使用ERP系统！

---

**现在全公司都可以使用您的ERP系统了！** 🎉
