import { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity as ActivityIcon,
  ShoppingCart,
  Database
} from 'lucide-react';
import CalendarView from '../components/CalendarView';
import {
  Product,
  Activity,
  FinanceRecord,
  StockTransaction
} from '../types';
import {
  productsService,
  activitiesService,
  financeRecordsService,
  stockTransactionsService
} from '../services/db';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useSystemSettings } from '../contexts/SystemSettingsContext';

export default function Dashboard() {
  const { formatCurrency } = useSystemSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [productsData, activitiesData, financeData, transactionsData] = await Promise.all([
        productsService.getAll(),
        activitiesService.getAll(),
        financeRecordsService.getAll(),
        stockTransactionsService.getAll(),
      ]);

      setProducts(productsData);
      setActivities(activitiesData);
      setFinanceRecords(financeData);
      setStockTransactions(transactionsData);
      setLoading(false);
    } catch (error) {
      console.error('加载数据失败:', error);
      setLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    const confirmed = confirm('是否加载示例数据？这将帮助您快速了解系统功能。\n\n如果系统已有数据，将会被清空。');
    if (!confirmed) return;

    try {
      const { generateDemoData } = await import('../utils/demoData');
      const success = await generateDemoData();
      if (success) {
        alert('示例数据加载成功！页面将刷新。');
        window.location.reload();
      }
    } catch (error) {
      console.error('加载示例数据失败:', error);
      alert('加载失败，请重试');
    }
  };

  // 计算统计数据
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  
  const activeActivities = activities.filter(a => a.status === 'ongoing');
  
  // 本月财务数据
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const monthlyRecords = financeRecords.filter(r => 
    isWithinInterval(new Date(r.date), { start: monthStart, end: monthEnd })
  );
  
  const monthlyIncome = monthlyRecords
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const monthlyExpense = monthlyRecords
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const monthlyProfit = monthlyIncome - monthlyExpense;

  // 最近的库存变动
  const recentTransactions = [...stockTransactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // 即将开始的活动
  const upcomingActivities = activities
    .filter(a => a.status === 'planned' || a.status === 'ongoing')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎使用ERP管理系统</p>
        </div>
        {totalProducts === 0 && (
          <button
            onClick={handleLoadDemoData}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Database size={20} />
            <span>加载示例数据</span>
          </button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">商品总数</p>
              <p className="text-2xl font-bold mt-1">{totalProducts}</p>
              <p className="text-xs text-gray-400 mt-1">库存价值: {formatCurrency(totalInventoryValue, 0)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">低库存预警</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{lowStockProducts.length}</p>
              <p className="text-xs text-gray-400 mt-1">需要补货的商品</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本月利润</p>
              <p className={`text-2xl font-bold mt-1 ${monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyProfit, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">收入: {formatCurrency(monthlyIncome, 0)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">进行中活动</p>
              <p className="text-2xl font-bold mt-1">{activeActivities.length}</p>
              <p className="text-xs text-gray-400 mt-1">总活动数: {activities.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 库存预警 */}
      {lowStockProducts.length > 0 && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900 mb-2">库存预警</h3>
              <div className="space-y-1">
                {lowStockProducts.slice(0, 5).map(p => (
                  <div key={p.id} className="text-sm text-yellow-700 flex justify-between">
                    <span>{p.name}</span>
                    <span>当前: {p.currentStock} {p.unit} (预警值: {p.minStock})</span>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <div className="text-sm text-yellow-600 mt-1">
                    还有 {lowStockProducts.length - 5} 个商品库存不足
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近库存变动 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <ShoppingCart size={20} className="mr-2" />
            最近库存变动
          </h2>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((trans) => (
                <div key={trans.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    {trans.type === 'IN' ? (
                      <TrendingUp className="text-green-600" size={16} />
                    ) : (
                      <TrendingDown className="text-red-600" size={16} />
                    )}
                    <div>
                      <p className="text-sm font-medium">{trans.productName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(trans.createdAt), 'MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      trans.type === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trans.type === 'IN' ? '+' : '-'}{trans.quantity}
                    </p>
                    <p className="text-xs text-gray-500">库存: {trans.afterStock}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">暂无库存变动</div>
            )}
          </div>
        </div>

        {/* 活动日程 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <ActivityIcon size={20} className="mr-2" />
            活动日程
          </h2>
          <div className="space-y-3">
            {upcomingActivities.length > 0 ? (
              upcomingActivities.map((activity) => (
                <div key={activity.id} className="py-2 border-b last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(activity.startDate), 'yyyy-MM-dd')} ~ {format(new Date(activity.endDate), 'MM-dd')}
                      </p>
                    </div>
                    <span className={`badge ${
                      activity.status === 'ongoing' ? 'badge-green' : 'badge-blue'
                    }`}>
                      {activity.status === 'ongoing' ? '进行中' : '筹备中'}
                    </span>
                  </div>
                  {activity.location && (
                    <p className="text-xs text-gray-500 mt-1">📍 {activity.location}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">暂无活动安排</div>
            )}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/products"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Package className="text-primary-600 mb-2" size={24} />
            <span className="text-sm font-medium">添加商品</span>
          </a>
          <a
            href="/purchases"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <TrendingUp className="text-green-600 mb-2" size={24} />
            <span className="text-sm font-medium">进货登记</span>
          </a>
          <a
            href="/sales"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <TrendingDown className="text-red-600 mb-2" size={24} />
            <span className="text-sm font-medium">出货登记</span>
          </a>
          <a
            href="/activities"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Calendar className="text-purple-600 mb-2" size={24} />
            <span className="text-sm font-medium">创建活动</span>
          </a>
        </div>
      </div>

      {/* 业务日历 */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📅 业务日历</h2>
        <CalendarView />
      </div>
    </div>
  );
}

