import { useState } from 'react';
import { Download, X, Calendar, FileText, Users, Package, DollarSign, Activity } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { Invoice, Product, Customer, Activity as ActivityType, FinanceRecord } from '../types';
import { invoicesService, productsService, customersService, activitiesService, financeRecordsService } from '../services/db';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DataType = 'invoices' | 'products' | 'customers' | 'activities' | 'finance';
type TimeRange = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [dataType, setDataType] = useState<DataType>('invoices');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getDataIcon = (type: DataType) => {
    switch (type) {
      case 'invoices': return <FileText size={20} />;
      case 'products': return <Package size={20} />;
      case 'customers': return <Users size={20} />;
      case 'activities': return <Activity size={20} />;
      case 'finance': return <DollarSign size={20} />;
    }
  };

  const getDataLabel = (type: DataType) => {
    switch (type) {
      case 'invoices': return '发票数据';
      case 'products': return '商品数据';
      case 'customers': return '客户数据';
      case 'activities': return '活动数据';
      case 'finance': return '财务数据';
    }
  };

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'all': return '全部时间';
      case 'today': return '今天';
      case 'week': return '本周';
      case 'month': return '本月';
      case 'custom': return '自定义';
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return { start: startOfDay(weekStart), end: endOfDay(now) };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfDay(monthStart), end: endOfDay(now) };
      case 'custom':
        return {
          start: startDate ? startOfDay(new Date(startDate)) : null,
          end: endDate ? endOfDay(new Date(endDate)) : null
        };
      default:
        return { start: null, end: null };
    }
  };

  const filterDataByDate = (data: any[], dateField: string = 'createdAt') => {
    const { start, end } = getDateRange();
    if (!start || !end) return data;

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = '';

      switch (dataType) {
        case 'invoices':
          data = await invoicesService.getAll();
          data = filterDataByDate(data);
          data = data.map(inv => ({
            '发票号': inv.invoiceNumber,
            '日期': format(new Date(inv.createdAt), 'yyyy-MM-dd HH:mm'),
            '客户': inv.customerName,
            '商品数量': inv.items.length,
            '小计': inv.subtotal,
            '折扣': inv.discount,
            '邮费': inv.shippingFee,
            '其他费用': inv.otherFees,
            '总金额': inv.totalAmount,
            '已付金额': inv.paidAmount,
            '待付金额': inv.totalAmount - inv.paidAmount,
            '付款方式': inv.paymentMethod || '',
            '参考号': inv.paymentReference || '',
          }));
          filename = `发票数据_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'products':
          data = await productsService.getAll();
          data = data.map(prod => ({
            '商品名称': prod.name,
            'SKU': prod.sku,
            '分类': prod.category,
            '单位': prod.unit,
            '供应商': prod.supplier,
            '成本价': prod.costPrice,
            '售价': prod.sellingPrice,
            '当前库存': prod.currentStock,
            '最小库存': prod.minStock,
            '条码': prod.barcode || '',
            '创建时间': format(new Date(prod.createdAt), 'yyyy-MM-dd HH:mm'),
          }));
          filename = `商品数据_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'customers':
          data = await customersService.getAll();
          data = data.map(cust => ({
            '客户名称': cust.name,
            '联系人': cust.contact,
            '电话': cust.phone,
            '邮箱': cust.email,
            '地址': cust.address,
            '会员等级': cust.membershipTier || '普通会员',
            '创建时间': format(new Date(cust.createdAt), 'yyyy-MM-dd HH:mm'),
          }));
          filename = `客户数据_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'activities':
          data = await activitiesService.getAll();
          data = filterDataByDate(data);
          data = data.map(act => ({
            '活动名称': act.name,
            '开始日期': format(new Date(act.startDate), 'yyyy-MM-dd'),
            '结束日期': format(new Date(act.endDate), 'yyyy-MM-dd'),
            '地点': act.location,
            '状态': act.status,
            '预算': act.budget,
            '实际成本': act.actualCost,
            '收入': act.revenue,
            '利润': act.revenue - act.actualCost,
            '描述': act.description || '',
          }));
          filename = `活动数据_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'finance':
          data = await financeRecordsService.getAll();
          data = filterDataByDate(data);
          data = data.map(fin => ({
            '日期': format(new Date(fin.date), 'yyyy-MM-dd'),
            '类型': fin.type === 'INCOME' ? '收入' : '支出',
            '分类': fin.category,
            '金额': fin.amount,
            '描述': fin.description,
            '创建时间': format(new Date(fin.createdAt), 'yyyy-MM-dd HH:mm'),
          }));
          filename = `财务数据_${format(new Date(), 'yyyy-MM-dd')}`;
          break;
      }

      // 创建工作簿
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '数据');

      // 下载文件
      XLSX.writeFile(wb, `${filename}.xlsx`);

      alert(`数据导出成功！共导出 ${data.length} 条记录。`);
      onClose();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">导出数据</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* 数据类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">选择数据类型</label>
            <div className="space-y-2">
              {(['invoices', 'products', 'customers', 'activities', 'finance'] as DataType[]).map(type => (
                <label key={type} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value={type}
                    checked={dataType === type}
                    onChange={(e) => setDataType(e.target.value as DataType)}
                    className="text-blue-600"
                  />
                  <span className="flex items-center space-x-2">
                    {getDataIcon(type)}
                    <span>{getDataLabel(type)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 时间范围选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">时间范围</label>
            <div className="space-y-2">
              {(['all', 'today', 'week', 'month', 'custom'] as TimeRange[]).map(range => (
                <label key={range} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="timeRange"
                    value={range}
                    checked={timeRange === range}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="text-blue-600"
                  />
                  <Calendar size={16} />
                  <span>{getTimeRangeLabel(range)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 自定义日期范围 */}
          {timeRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={exportToExcel}
            className="btn btn-primary flex items-center space-x-2"
            disabled={loading}
          >
            <Download size={16} />
            <span>{loading ? '导出中...' : '导出Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}