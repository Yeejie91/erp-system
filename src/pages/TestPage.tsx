import { useState, useEffect } from 'react';

export default function TestPage() {
  const [status, setStatus] = useState('加载中...');

  useEffect(() => {
    const checkSystem = async () => {
      try {
        // 测试数据库连接
        const { initDB } = await import('../services/db');
        await initDB();
        setStatus('✅ 系统运行正常！');
      } catch (error) {
        console.error('系统检查失败:', error);
        setStatus('❌ 系统检查失败: ' + error.message);
      }
    };

    checkSystem();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统测试页面</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">系统状态检查</h2>
        <div className="space-y-4">
          <div>
            <strong>状态:</strong> {status}
          </div>
          <div>
            <strong>当前时间:</strong> {new Date().toLocaleString()}
          </div>
          <div>
            <strong>页面URL:</strong> {window.location.href}
          </div>
          <div>
            <strong>用户代理:</strong> {navigator.userAgent}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">测试结果说明</h3>
          <p className="text-blue-800 text-sm">
            如果看到"✅ 系统运行正常！"，说明您的ERP系统已经成功启动并可以正常使用。
            请访问 <a href="/" className="underline">仪表盘</a> 开始使用系统。
          </p>
        </div>
      </div>
    </div>
  );
}