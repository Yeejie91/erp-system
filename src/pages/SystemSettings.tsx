import { useState, useEffect } from 'react';
import { Save, Building2, Mail, Phone, Globe, Shield, Database, Bell, CreditCard } from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';

interface SystemSettings {
  company: {
    name: string;
    registrationNumber: string;
    website: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
  };
  business: {
    currency: string;
    timezone: string;
    dateFormat: string;
    taxRate: number;
    defaultPaymentMethod: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    lowStockAlert: boolean;
    paymentReminder: boolean;
    invoiceDueAlert: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    cloudBackup: boolean;
  };
  security: {
    sessionTimeout: number;
    requirePasswordChange: boolean;
    passwordMinLength: number;
    twoFactorAuth: boolean;
  };
}

export default function SystemSettings() {
  const { settings, updateSettings } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [activeTab, setActiveTab] = useState<'company' | 'business' | 'notifications' | 'backup' | 'security'>('company');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 更新全局设置
      updateSettings(localSettings);
      alert('设置保存成功！');
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const applySystemSettings = (newSettings: SystemSettings) => {
    // 应用货币设置
    if (newSettings.business.currency !== 'RM') {
      // 这里可以更新全局货币设置
      console.log('货币设置已更新为:', newSettings.business.currency);
    }

    // 应用时区设置
    if (newSettings.business.timezone) {
      // 这里可以更新全局时区设置
      console.log('时区设置已更新为:', newSettings.business.timezone);
    }

    // 应用通知设置
    if (newSettings.notifications.lowStockAlert) {
      // 启用库存不足提醒
      console.log('库存不足提醒已启用');
    }

    // 应用备份设置
    if (newSettings.backup.autoBackup) {
      // 启用自动备份
      console.log('自动备份已启用，频率:', newSettings.backup.backupFrequency);
      scheduleAutoBackup(newSettings.backup.backupFrequency);
    }

    // 应用安全设置
    if (newSettings.security.sessionTimeout) {
      // 更新会话超时时间
      console.log('会话超时已设置为:', newSettings.security.sessionTimeout, '分钟');
    }
  };

  const scheduleAutoBackup = (frequency: 'daily' | 'weekly' | 'monthly') => {
    // 清除现有的自动备份定时器
    const existingTimer = localStorage.getItem('autoBackupTimer');
    if (existingTimer) {
      clearInterval(parseInt(existingTimer));
    }

    // 计算下次备份时间
    const now = new Date();
    let nextBackup: Date;

    switch (frequency) {
      case 'daily':
        nextBackup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextBackup = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextBackup = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // 设置定时器
    const timer = setInterval(() => {
      createAutoBackup();
    }, nextBackup.getTime() - now.getTime());

    localStorage.setItem('autoBackupTimer', timer.toString());
    console.log('自动备份已安排，下次备份时间:', nextBackup);
  };

  const createAutoBackup = async () => {
    try {
      const { exportData } = await import('../services/db');
      const data = await exportData();
      
      // 创建备份记录
      const backupRecord = {
        id: `auto_backup_${Date.now()}`,
        name: `自动备份_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`,
        size: new Blob([data]).size,
        createdAt: new Date().toISOString(),
        type: 'auto',
        status: 'success'
      };

      // 保存备份记录
      const existingBackups = JSON.parse(localStorage.getItem('backupRecords') || '[]');
      const updatedBackups = [backupRecord, ...existingBackups];
      localStorage.setItem('backupRecords', JSON.stringify(updatedBackups));

      console.log('自动备份创建成功');
    } catch (error) {
      console.error('自动备份失败:', error);
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(localSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'system-settings.json';
    link.click();
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setLocalSettings(importedSettings);
          alert('设置导入成功！点击保存以应用设置。');
        } catch (error) {
          alert('导入失败，文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-500 mt-1">管理系统配置、公司信息和业务参数</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportSettings}
            className="btn btn-secondary"
          >
            导出设置
          </button>
          <button
            onClick={handleImportSettings}
            className="btn btn-secondary"
          >
            导入设置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="inline-block mr-2" size={16} />
              公司信息
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'business'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CreditCard className="inline-block mr-2" size={16} />
              业务设置
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="inline-block mr-2" size={16} />
              通知设置
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="inline-block mr-2" size={16} />
              备份设置
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="inline-block mr-2" size={16} />
              安全设置
            </button>
          </nav>
        </div>
      </div>

      {/* 公司信息标签页 */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">公司基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">公司名称 *</label>
                  <input
                    type="text"
                    value={localSettings.company.name}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, name: e.target.value }
                    })}
                    className="input"
                    placeholder="请输入公司名称"
                  />
                </div>
                <div>
                  <label className="label">注册号码</label>
                  <input
                    type="text"
                    value={localSettings.company.registrationNumber}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, registrationNumber: e.target.value }
                    })}
                    className="input"
                    placeholder="请输入注册号码"
                  />
                </div>
                <div>
                  <label className="label">网站地址</label>
                  <input
                    type="url"
                    value={localSettings.company.website}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, website: e.target.value }
                    })}
                    className="input"
                    placeholder="请输入网站地址"
                  />
                </div>
                <div>
                  <label className="label">联系电话</label>
                  <input
                    type="tel"
                    value={localSettings.company.phone}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, phone: e.target.value }
                    })}
                    className="input"
                    placeholder="请输入联系电话"
                  />
                </div>
                <div>
                  <label className="label">邮箱地址</label>
                  <input
                    type="email"
                    value={localSettings.company.email}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, email: e.target.value }
                    })}
                    className="input"
                    placeholder="请输入邮箱地址"
                  />
                </div>
                <div>
                  <label className="label">公司地址</label>
                  <textarea
                    value={localSettings.company.address}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      company: { ...localSettings.company, address: e.target.value }
                    })}
                    className="input"
                    rows={3}
                    placeholder="请输入公司地址"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 业务设置标签页 */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">业务参数设置</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">货币单位</label>
                  <select
                    value={localSettings.business.currency}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      business: { ...localSettings.business, currency: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="RM">马来西亚林吉特 (RM)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="CNY">人民币 (¥)</option>
                    <option value="SGD">新加坡元 (SGD)</option>
                  </select>
                </div>
                <div>
                  <label className="label">时区</label>
                  <select
                    value={localSettings.business.timezone}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      business: { ...localSettings.business, timezone: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="Asia/Kuala_Lumpur">马来西亚时间 (GMT+8)</option>
                    <option value="Asia/Shanghai">中国时间 (GMT+8)</option>
                    <option value="Asia/Singapore">新加坡时间 (GMT+8)</option>
                    <option value="UTC">协调世界时 (UTC)</option>
                  </select>
                </div>
                <div>
                  <label className="label">日期格式</label>
                  <select
                    value={localSettings.business.dateFormat}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      business: { ...localSettings.business, dateFormat: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="YYYY-MM-DD">2024-01-01</option>
                    <option value="DD/MM/YYYY">01/01/2024</option>
                    <option value="MM/DD/YYYY">01/01/2024</option>
                    <option value="DD-MM-YYYY">01-01-2024</option>
                  </select>
                </div>
                <div>
                  <label className="label">税率 (%)</label>
                  <input
                    type="number"
                    value={localSettings.business.taxRate}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      business: { ...localSettings.business, taxRate: parseFloat(e.target.value) || 0 }
                    })}
                    className="input"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">默认支付方式</label>
                  <select
                    value={localSettings.business.defaultPaymentMethod}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      business: { ...localSettings.business, defaultPaymentMethod: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="cash">现金</option>
                    <option value="tng">T&G</option>
                    <option value="public_bank">Public Bank</option>
                    <option value="hong_leong">Hong Leong Bank</option>
                    <option value="cheque">支票</option>
                    <option value="bank_transfer">银行转账</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 通知设置标签页 */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">通知设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">邮件通知</h4>
                    <p className="text-sm text-gray-500">启用邮件通知功能</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.notifications.emailEnabled}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, emailEnabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">短信通知</h4>
                    <p className="text-sm text-gray-500">启用短信通知功能</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.notifications.smsEnabled}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, smsEnabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">库存不足提醒</h4>
                    <p className="text-sm text-gray-500">当商品库存不足时发送提醒</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.notifications.lowStockAlert}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, lowStockAlert: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">付款提醒</h4>
                    <p className="text-sm text-gray-500">发送付款到期提醒</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.notifications.paymentReminder}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, paymentReminder: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">发票到期提醒</h4>
                    <p className="text-sm text-gray-500">发送发票到期提醒</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.notifications.invoiceDueAlert}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, invoiceDueAlert: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 备份设置标签页 */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">数据备份设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">自动备份</h4>
                    <p className="text-sm text-gray-500">启用自动数据备份功能</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.backup.autoBackup}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        backup: { ...localSettings.backup, autoBackup: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">备份频率</label>
                    <select
                      value={settings.backup.backupFrequency}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        backup: { ...localSettings.backup, backupFrequency: e.target.value as any }
                      })}
                      className="input"
                    >
                      <option value="daily">每日</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">保留天数</label>
                    <input
                      type="number"
                      value={settings.backup.retentionDays}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        backup: { ...localSettings.backup, retentionDays: parseInt(e.target.value) || 30 }
                      })}
                      className="input"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">云备份</h4>
                    <p className="text-sm text-gray-500">将备份数据同步到云端</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.backup.cloudBackup}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        backup: { ...localSettings.backup, cloudBackup: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 安全设置标签页 */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">安全设置</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">会话超时 (分钟)</label>
                    <input
                      type="number"
                      value={localSettings.security.sessionTimeout}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, sessionTimeout: parseInt(e.target.value) || 30 }
                      })}
                      className="input"
                      min="5"
                      max="480"
                    />
                  </div>
                  <div>
                    <label className="label">密码最小长度</label>
                    <input
                      type="number"
                      value={localSettings.security.passwordMinLength}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, passwordMinLength: parseInt(e.target.value) || 8 }
                      })}
                      className="input"
                      min="6"
                      max="32"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">强制密码更改</h4>
                    <p className="text-sm text-gray-500">要求用户定期更改密码</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.security.requirePasswordChange}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, requirePasswordChange: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">双因子认证</h4>
                    <p className="text-sm text-gray-500">启用双因子认证增强安全性</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.security.twoFactorAuth}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, twoFactorAuth: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
