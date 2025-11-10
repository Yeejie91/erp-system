import { useState, useEffect } from 'react';

export default function CustomersDebug() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('CustomersDebug 组件已加载');
    
    // 模拟加载
    setTimeout(() => {
      console.log('模拟加载完成');
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载客户数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌ 错误</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        <strong>✅ 调试成功！</strong> CustomersDebug 组件正在正常工作
      </div>
      
      <h1 className="text-3xl font-bold mb-6 text-gray-800">客户管理 - 调试版</h1>
      
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">调试信息</h2>
        <div className="space-y-2 text-sm">
          <p><strong>组件状态：</strong> 已加载</p>
          <p><strong>加载状态：</strong> {loading ? '加载中' : '已完成'}</p>
          <p><strong>错误状态：</strong> {error || '无错误'}</p>
          <p><strong>时间戳：</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <h2 className="text-xl font-bold mb-4">测试内容</h2>
        <p className="text-gray-600 mb-4">
          如果您能看到这个页面，说明 React 组件渲染是正常的。
          问题可能在于数据加载、权限检查或其他逻辑。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">测试 1</h3>
            <p className="text-blue-800 text-sm">组件渲染正常</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">测试 2</h3>
            <p className="text-green-800 text-sm">样式加载正常</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">测试 3</h3>
            <p className="text-purple-800 text-sm">路由工作正常</p>
          </div>
        </div>
      </div>
    </div>
  );
}
