import { useSystemSettings } from '../contexts/SystemSettingsContext';

export default function SystemSettingsDemo() {
  const { 
    settings, 
    getCompanyInfo, 
    getBusinessSettings, 
    getNotificationSettings,
    formatCurrency, 
    formatDate,
    checkLowStockAlert 
  } = useSystemSettings();

  const companyInfo = getCompanyInfo();
  const businessSettings = getBusinessSettings();
  const notificationSettings = getNotificationSettings();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置效果演示</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 公司信息演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">公司信息</h3>
            <div className="space-y-2">
              <p><strong>公司名称:</strong> {companyInfo.name}</p>
              <p><strong>注册号码:</strong> {companyInfo.registrationNumber}</p>
              <p><strong>网站:</strong> {companyInfo.website}</p>
              <p><strong>电话:</strong> {companyInfo.phone || '未设置'}</p>
              <p><strong>邮箱:</strong> {companyInfo.email || '未设置'}</p>
              <p><strong>地址:</strong> {companyInfo.address || '未设置'}</p>
            </div>
          </div>
        </div>

        {/* 业务设置演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">业务设置</h3>
            <div className="space-y-2">
              <p><strong>货币单位:</strong> {businessSettings.currency}</p>
              <p><strong>时区:</strong> {businessSettings.timezone}</p>
              <p><strong>日期格式:</strong> {businessSettings.dateFormat}</p>
              <p><strong>税率:</strong> {businessSettings.taxRate}%</p>
              <p><strong>默认支付方式:</strong> {businessSettings.defaultPaymentMethod}</p>
            </div>
          </div>
        </div>

        {/* 货币格式化演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">货币格式化演示</h3>
            <div className="space-y-2">
              <p>1000 → {formatCurrency(1000)}</p>
              <p>1234.56 → {formatCurrency(1234.56)}</p>
              <p>999999.99 → {formatCurrency(999999.99)}</p>
              <p>0.5 → {formatCurrency(0.5)}</p>
            </div>
          </div>
        </div>

        {/* 日期格式化演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">日期格式化演示</h3>
            <div className="space-y-2">
              <p>今天 → {formatDate(new Date())}</p>
              <p>昨天 → {formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))}</p>
              <p>一周前 → {formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))}</p>
            </div>
          </div>
        </div>

        {/* 通知设置演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">通知设置状态</h3>
            <div className="space-y-2">
              <p><strong>邮件通知:</strong> {notificationSettings.emailEnabled ? '✅ 已启用' : '❌ 已禁用'}</p>
              <p><strong>短信通知:</strong> {notificationSettings.smsEnabled ? '✅ 已启用' : '❌ 已禁用'}</p>
              <p><strong>库存不足提醒:</strong> {notificationSettings.lowStockAlert ? '✅ 已启用' : '❌ 已禁用'}</p>
              <p><strong>付款提醒:</strong> {notificationSettings.paymentReminder ? '✅ 已启用' : '❌ 已禁用'}</p>
              <p><strong>发票到期提醒:</strong> {notificationSettings.invoiceDueAlert ? '✅ 已启用' : '❌ 已禁用'}</p>
            </div>
          </div>
        </div>

        {/* 库存提醒演示 */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">库存提醒演示</h3>
            <div className="space-y-2">
              <p>当前库存: 5, 最低库存: 10</p>
              <p>提醒状态: {checkLowStockAlert(5, 10) ? '⚠️ 需要提醒' : '✅ 库存充足'}</p>
              <p>当前库存: 15, 最低库存: 10</p>
              <p>提醒状态: {checkLowStockAlert(15, 10) ? '⚠️ 需要提醒' : '✅ 库存充足'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">说明</h4>
        <p className="text-sm text-blue-800">
          这个页面展示了系统设置的实际效果。当您在"系统设置"页面中修改设置并保存后，
          这些设置会立即在整个系统中生效，包括货币格式化、日期格式化、通知提醒等功能。
        </p>
      </div>
    </div>
  );
}
