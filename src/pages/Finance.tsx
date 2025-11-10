import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { FinanceRecord } from '../types';
import { financeRecordsService, generateId } from '../services/db';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../utils/format';

export default function Finance() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'sales',
    amount: 0,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    operator: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await financeRecordsService.getAll();
    setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recordData: FinanceRecord = {
      id: generateId(),
      ...formData,
      date: new Date(formData.date),
      createdAt: new Date(),
    };

    await financeRecordsService.add(recordData);
    setIsModalOpen(false);
    resetForm();
    loadRecords();
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'sales',
      amount: 0,
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      operator: '',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'sales': '销售收入',
      'purchase': '采购支出',
      'activity': '活动相关',
      'salary': '工资',
      'rent': '租金',
      'utilities': '水电费',
      'other': '其他',
    };
    return labels[category] || category;
  };

  // 筛选记录
  const filteredRecords = records.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    
    const recordDate = new Date(r.date);
    const [year, month] = filterMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
  });

  // 统计数据
  const monthIncome = filteredRecords
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const monthExpense = filteredRecords
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const monthProfit = monthIncome - monthExpense;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">财务管理</h1>
          <p className="text-gray-500 mt-1">管理收支记录和财务报表</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加记录</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本月收入</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(monthIncome)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本月支出</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(monthExpense)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本月利润</p>
              <p className={`text-2xl font-bold mt-1 ${monthProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(monthProfit)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">全部</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
          </div>
          <div>
            <label className="label">月份</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* 财务记录列表 */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>分类</th>
              <th>金额</th>
              <th>描述</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="text-sm">{format(new Date(record.date), 'yyyy-MM-dd')}</td>
                <td>
                  <span className={`badge ${record.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                    {record.type === 'income' ? '收入' : '支出'}
                  </span>
                </td>
                <td>{getCategoryLabel(record.category)}</td>
                <td className={`font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount).replace('RM', '')}
                </td>
                <td className="text-sm">{record.description}</td>
                <td>{record.operator}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            该月份暂无财务记录
          </div>
        )}
      </div>

      {/* 添加记录模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">添加财务记录</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">类型 *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input"
                    >
                      <option value="income">收入</option>
                      <option value="expense">支出</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">分类 *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                    >
                      <option value="sales">销售收入</option>
                      <option value="purchase">采购支出</option>
                      <option value="activity">活动相关</option>
                      <option value="salary">工资</option>
                      <option value="rent">租金</option>
                      <option value="utilities">水电费</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">金额 (RM) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">日期 *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">操作人 *</label>
                  <input
                    type="text"
                    required
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">描述 *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    添加
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

