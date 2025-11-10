// 邮件服务 - 使用EmailJS发送邮件
// 需要先注册EmailJS账号并获取服务ID和模板ID

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

interface BackupEmailData {
  to: string[];
  subject: string;
  backupData: string;
  backupFileName: string;
  backupSize: string;
  backupDate: string;
}

class EmailService {
  private config: EmailConfig | null = null;
  private isInitialized = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    // 从localStorage加载邮件配置
    const savedConfig = localStorage.getItem('emailConfig');
    if (savedConfig) {
      this.config = JSON.parse(savedConfig);
      this.isInitialized = true;
    }
  }

  public setConfig(config: EmailConfig) {
    this.config = config;
    this.isInitialized = true;
    localStorage.setItem('emailConfig', JSON.stringify(config));
  }

  public async sendBackupEmail(data: BackupEmailData): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('邮件服务未初始化，请先配置EmailJS');
      return false;
    }

    try {
      // 动态导入EmailJS
      const emailjs = await import('emailjs-com');
      
      // 为每个收件人发送邮件
      const promises = data.to.map(async (email) => {
        const templateParams = {
          to_email: email,
          subject: data.subject,
          backup_file_name: data.backupFileName,
          backup_size: data.backupSize,
          backup_date: data.backupDate,
          company_name: '半亩天光 Spark of Wisdom Centre',
          message: `您好，\n\n这是 ${data.backupDate} 的自动数据备份。\n\n备份文件：${data.backupFileName}\n文件大小：${data.backupSize}\n\n备份数据已作为附件发送。\n\n此邮件由系统自动发送，请勿回复。\n\n谢谢！`
        };

        return emailjs.default.send(
          this.config!.serviceId,
          this.config!.templateId,
          templateParams
        );
      });

      await Promise.all(promises);
      console.log('备份邮件发送成功');
      return true;
    } catch (error) {
      console.error('发送备份邮件失败:', error);
      return false;
    }
  }

  public async sendTestEmail(to: string): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('邮件服务未初始化');
      return false;
    }

    try {
      const emailjs = await import('emailjs-com');
      
      const templateParams = {
        to_email: to,
        subject: 'ERP系统邮件测试',
        message: '这是一封测试邮件，如果您收到此邮件，说明邮件配置正确。'
      };

      await emailjs.default.send(
        this.config.serviceId,
        this.config.templateId,
        templateParams
      );
      
      console.log('测试邮件发送成功');
      return true;
    } catch (error) {
      console.error('发送测试邮件失败:', error);
      return false;
    }
  }

  public isConfigured(): boolean {
    return this.isInitialized && this.config !== null;
  }

  public getConfig(): EmailConfig | null {
    return this.config;
  }
}

export const emailService = new EmailService();
