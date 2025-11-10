import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    emailBackup: boolean;
    emailRecipients: string[];
    backupTime: string; // HH:MM format
  };
  security: {
    sessionTimeout: number;
    requirePasswordChange: boolean;
    passwordMinLength: number;
    twoFactorAuth: boolean;
  };
}

const defaultSettings: SystemSettings = {
  company: {
    name: '半亩天光 Spark of Wisdom Centre',
    registrationNumber: '201803256732 JM0874028-H',
    website: 'www.mywisdomstore.com',
    address: '',
    phone: '',
    email: '',
    logo: '',
  },
  business: {
    currency: 'RM',
    timezone: 'Asia/Kuala_Lumpur',
    dateFormat: 'YYYY-MM-DD',
    taxRate: 6,
    defaultPaymentMethod: 'cash',
  },
  notifications: {
    emailEnabled: false,
    smsEnabled: false,
    lowStockAlert: true,
    paymentReminder: true,
    invoiceDueAlert: true,
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    cloudBackup: false,
    emailBackup: true,
    emailRecipients: ['sparkofwisdom824@gmail.com', 'skytan91@gmail.com'],
    backupTime: '00:00',
  },
  security: {
    sessionTimeout: 30,
    requirePasswordChange: false,
    passwordMinLength: 8,
    twoFactorAuth: false,
  },
};

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => void;
  getCompanyInfo: () => SystemSettings['company'];
  getBusinessSettings: () => SystemSettings['business'];
  getNotificationSettings: () => SystemSettings['notifications'];
  getBackupSettings: () => SystemSettings['backup'];
  getSecuritySettings: () => SystemSettings['security'];
  formatCurrency: (amount: number, decimals?: number) => string;
  formatDate: (date: Date) => string;
  checkLowStockAlert: (currentStock: number, minStock: number) => boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};

interface SystemSettingsProviderProps {
  children: ReactNode;
}

export const SystemSettingsProvider: React.FC<SystemSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('systemSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('加载系统设置失败:', error);
      }
    }
  };

  const updateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
    
    // 应用设置
    applySettings(newSettings);
  };

  const applySettings = (newSettings: SystemSettings) => {
    // 应用货币设置
    if (newSettings.business.currency !== settings.business.currency) {
      console.log('货币设置已更新为:', newSettings.business.currency);
    }

    // 应用时区设置
    if (newSettings.business.timezone !== settings.business.timezone) {
      console.log('时区设置已更新为:', newSettings.business.timezone);
    }

    // 应用通知设置
    if (newSettings.notifications.lowStockAlert !== settings.notifications.lowStockAlert) {
      console.log('库存不足提醒已', newSettings.notifications.lowStockAlert ? '启用' : '禁用');
    }

    // 应用备份设置
    if (newSettings.backup.autoBackup !== settings.backup.autoBackup || 
        newSettings.backup.backupFrequency !== settings.backup.backupFrequency) {
      if (newSettings.backup.autoBackup) {
        console.log('自动备份已启用，频率:', newSettings.backup.backupFrequency);
        scheduleAutoBackup(newSettings.backup.backupFrequency);
      } else {
        console.log('自动备份已禁用');
        clearAutoBackup();
      }
    }

    // 应用安全设置
    if (newSettings.security.sessionTimeout !== settings.security.sessionTimeout) {
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

  const clearAutoBackup = () => {
    const existingTimer = localStorage.getItem('autoBackupTimer');
    if (existingTimer) {
      clearInterval(parseInt(existingTimer));
      localStorage.removeItem('autoBackupTimer');
    }
  };

  const createAutoBackup = async () => {
    try {
      const { exportData } = await import('../services/db');
      const { emailService } = await import('../services/emailService');
      const data = await exportData();
      
      const now = new Date();
      const backupFileName = `erp_backup_${now.toISOString().slice(0, 19).replace('T', '_')}.json`;
      const backupSize = new Blob([data]).size;
      
      // 创建备份记录
      const backupRecord = {
        id: `auto_backup_${Date.now()}`,
        name: `自动备份_${now.toISOString().slice(0, 19).replace('T', '_')}`,
        size: backupSize,
        createdAt: now.toISOString(),
        type: 'auto',
        status: 'success'
      };

      // 保存备份记录
      const existingBackups = JSON.parse(localStorage.getItem('backupRecords') || '[]');
      const updatedBackups = [backupRecord, ...existingBackups];
      localStorage.setItem('backupRecords', JSON.stringify(updatedBackups));

      // 发送邮件备份
      if (settings.backup.emailBackup && settings.backup.emailRecipients.length > 0) {
        const emailData = {
          to: settings.backup.emailRecipients,
          subject: `ERP系统自动备份 - ${now.toLocaleDateString('zh-CN')}`,
          backupData: data,
          backupFileName: backupFileName,
          backupSize: formatFileSize(backupSize),
          backupDate: now.toLocaleString('zh-CN')
        };

        const emailSent = await emailService.sendBackupEmail(emailData);
        if (emailSent) {
          console.log('备份邮件发送成功');
        } else {
          console.log('备份邮件发送失败，但备份已创建');
        }
      }

      console.log('自动备份创建成功');
    } catch (error) {
      console.error('自动备份失败:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompanyInfo = () => settings.company;
  const getBusinessSettings = () => settings.business;
  const getNotificationSettings = () => settings.notifications;
  const getBackupSettings = () => settings.backup;
  const getSecuritySettings = () => settings.security;

  const formatCurrency = (amount: number, decimals: number = 2): string => {
    const currency = settings.business.currency;
    const formattedAmount = amount.toLocaleString('en-MY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${currency}${formattedAmount}`;
  };

  const formatDate = (date: Date): string => {
    const format = settings.business.dateFormat;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  };

  const checkLowStockAlert = (currentStock: number, minStock: number): boolean => {
    return settings.notifications.lowStockAlert && currentStock <= minStock;
  };

  const value: SystemSettingsContextType = {
    settings,
    updateSettings,
    getCompanyInfo,
    getBusinessSettings,
    getNotificationSettings,
    getBackupSettings,
    getSecuritySettings,
    formatCurrency,
    formatDate,
    checkLowStockAlert,
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};
