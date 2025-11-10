import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, FileText, DollarSign, Users, Award, BarChart3, Archive, Package } from 'lucide-react';
import { Invoice, Customer, Member, MembershipTierConfig, ProductReservation, ExhibitionStock, Product } from '../types';
import { invoicesService, customersService, membersService, membershipTierConfigsService, productReservationsService, exhibitionStockService, productsService } from '../services/db';
import { 
  format, 
  startOfDay, 
  endOfDay,
  startOfWeek, 
  endOfWeek,
  startOfMonth, 
  endOfMonth,
  isWithinInterval,
  subDays,
  subWeeks,
  subMonths
} from 'date-fns';
import { formatCurrency } from '../utils/format';

type TimeRange = 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [exhibitionStock, setExhibitionStock] = useState<ExhibitionStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'sales' | 'customers' | 'members' | 'reservations'>('sales');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invoicesData, customersData, membersData, tierConfigsData, reservationsData, exhibitionStockData, productsData] = await Promise.all([
      invoicesService.getAll(),
      customersService.getAll(),
      membersService.getAll(),
      membershipTierConfigsService.getAll(),
      productReservationsService.getAll(),
      exhibitionStockService.getAll(),
      productsService.getAll()
    ]);
    setInvoices(invoicesData);
    setCustomers(customersData);
    setMembers(membersData);
    setTierConfigs(tierConfigsData);
    setReservations(reservationsData);
    setExhibitionStock(exhibitionStockData);
    setProducts(productsData);
  };

  // 获取时间范围
  const getDateRange = () => {
    const date = new Date(selectedDate);
    switch (timeRange) {
      case 'daily':
        return {
          start: startOfDay(date),
          end: endOfDay(date),
        };
      case 'weekly':
        return {
          start: startOfWeek(date),
          end: endOfWeek(date),
        };
      case 'monthly':
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
        };
    }
  };

  // 获取过去7个周期
  const getPastPeriods = () => {
    const periods = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      let periodStart: Date;
      let periodEnd: Date;
      let label: string;
      
      if (timeRange === 'daily') {
        periodStart = startOfDay(subDays(now, i));
        periodEnd = endOfDay(subDays(now, i));
        label = format(periodStart, 'MM-dd');
      } else if (timeRange === 'weekly') {
        periodStart = startOfWeek(subWeeks(now, i));
        periodEnd = endOfWeek(subWeeks(now, i));
        label = format(periodStart, 'MM-dd');
      } else {
        periodStart = startOfMonth(subMonths(now, i));
        periodEnd = endOfMonth(subMonths(now, i));
        label = format(periodStart, 'yyyy-MM');
      }
      
      periods.push({ label, start: periodStart, end: periodEnd });
    }
    
    return periods.map(period => {
      const periodInvoices = invoices.filter(invoice => 
        isWithinInterval(new Date(invoice.createdAt), {
          start: period.start,
          end: period.end,
        })
      );
      
      const sales = periodInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const received = periodInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
      
      return {
        ...period,
        sales,
        received,
        invoices: periodInvoices.length,
      };
    });
  };

  const getTimeRangeLabel = () => {
    const date = new Date(selectedDate);
    switch (timeRange) {
      case 'daily':
        return format(date, 'yyyy年MM月dd日');
      case 'weekly':
        return format(date, 'yyyy年MM月第W周');
      case 'monthly':
        return format(date, 'yyyy年MM月');
    }
  };

  const { start, end } = getDateRange();
  const periodInvoices = invoices.filter(invoice => 
    isWithinInterval(new Date(invoice.createdAt), { start, end })
  );

  const totalSales = periodInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalReceived = periodInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const totalInvoices = periodInvoices.length;
  const paidInvoices = periodInvoices.filter(invoice => invoice.paidAmount >= invoice.totalAmount).length;
  const partialInvoices = periodInvoices.filter(invoice => invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount).length;
  const unpaidInvoices = periodInvoices.filter(invoice => invoice.paidAmount === 0).length;

  const pastPeriods = getPastPeriods();

  // 预留数据统计
  const getReservationStats = () => {
    const { start, end } = getDateRange();
    
    // 筛选时间范围内的预留记录
    const periodReservations = reservations.filter(reservation =>
      isWithinInterval(new Date(reservation.createdAt), { start, end })
    );
    
    // 筛选时间范围内的展览库存记录
    const periodExhibitions = exhibitionStock.filter(exhibition =>
      isWithinInterval(new Date(exhibition.createdAt), { start, end })
    );

    // 预留统计
    const totalReservations = periodReservations.length;
    const activeReservations = periodReservations.filter(r => r.status === 'reserved').length;
    const deliveredReservations = periodReservations.filter(r => r.status === 'delivered').length;
    const cancelledReservations = periodReservations.filter(r => r.status === 'cancelled').length;
    
    // 按预留类型统计
    const reservationByType = periodReservations.reduce((acc, r) => {
      acc[r.reservationType] = (acc[r.reservationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 展览库存统计
    const totalExhibitions = periodExhibitions.length;
    const activeExhibitions = periodExhibitions.filter(e => e.status === 'active').length;
    const completedExhibitions = periodExhibitions.filter(e => e.status === 'completed').length;
    const cancelledExhibitions = periodExhibitions.filter(e => e.status === 'cancelled').length;

    // 按事件类型统计
    const exhibitionByType = periodExhibitions.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 最受欢迎的商品（预留数量最多）
    const productReservationCount = periodReservations.reduce((acc, r) => {
      acc[r.productId] = (acc[r.productId] || 0) + r.quantity;
      return acc;
    }, {} as Record<string, number>);

    const topReservedProducts = Object.entries(productReservationCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        return {
          productName: product?.name || '未知商品',
          quantity
        };
      });

    return {
      totalReservations,
      activeReservations,
      deliveredReservations,
      cancelledReservations,
      reservationByType,
      totalExhibitions,
      activeExhibitions,
      completedExhibitions,
      cancelledExhibitions,
      exhibitionByType,
      topReservedProducts
    };
  };

  const reservationStats = getReservationStats();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析报表</h1>
          <p className="text-gray-500 mt-1">查看销售、客户和会员数据分析</p>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="inline-block mr-2" size={16} />
              销售报表
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline-block mr-2" size={16} />
              客户分析
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Award className="inline-block mr-2" size={16} />
              会员分析
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reservations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Archive className="inline-block mr-2" size={16} />
              预留分析
            </button>
          </nav>
        </div>
      </div>

      {/* 销售报表标签页 */}
      {activeTab === 'sales' && (
        <div>
          {/* 时间范围选择 */}
          <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">时间范围</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('daily')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  timeRange === 'daily'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                每日
              </button>
              <button
                onClick={() => setTimeRange('weekly')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  timeRange === 'weekly'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                每周
              </button>
              <button
                onClick={() => setTimeRange('monthly')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  timeRange === 'monthly'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                每月
              </button>
            </div>
          </div>
          <div>
            <label className="label">选择日期</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总销售额</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalSales, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">
                平均: {formatCurrency(totalInvoices > 0 ? totalSales / totalInvoices : 0, 0)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已收金额</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{formatCurrency(totalReceived, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">
                收款率: {totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">发票数量</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">{totalInvoices}</p>
              <p className="text-xs text-gray-500 mt-1">
                已付: {paidInvoices} | 部分: {partialInvoices} | 未付: {unpaidInvoices}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待收金额</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalSales - totalReceived, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">
                占比: {totalSales > 0 ? (((totalSales - totalReceived) / totalSales) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Calendar className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">
          销售趋势 - 过去7{timeRange === 'daily' ? '天' : timeRange === 'weekly' ? '周' : '月'}
        </h2>
        
        <div className="space-y-4">
          {pastPeriods.map((data, index) => {
            const maxSales = Math.max(...pastPeriods.map(p => p.sales));
            const percentage = maxSales > 0 ? (data.sales / maxSales) * 100 : 0;
            const receivedPercentage = data.sales > 0 ? (data.received / data.sales) * 100 : 0;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{data.label}</span>
                  <div className="text-right text-sm">
                    <span className="text-green-600 font-semibold">{formatCurrency(data.sales, 0)}</span>
                    {data.sales > 0 && (
                      <span>已收 {formatCurrency(data.received, 0)}</span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-gray-200 h-6 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-600 h-6 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    >
                      <div
                        className="bg-green-600 h-6 rounded-full"
                        style={{ width: `${receivedPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 发票明细列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          发票明细 - {getTimeRangeLabel()}
        </h2>
        
        {periodInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>发票号</th>
                  <th>时间</th>
                  <th>客户</th>
                  <th>总金额</th>
                  <th>已收</th>
                  <th>待收</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {periodInvoices.map((invoice) => {
                  const remaining = invoice.totalAmount - invoice.paidAmount;
                  const statusColors = {
                    paid: 'bg-green-100 text-green-800',
                    partial: 'bg-yellow-100 text-yellow-800',
                    unpaid: 'bg-red-100 text-red-800'
                  };
                  const statusLabels = {
                    paid: '已付清',
                    partial: '部分付款',
                    unpaid: '未付款'
                  };
                  const paymentStatus = remaining === 0 ? 'paid' : invoice.paidAmount > 0 ? 'partial' : 'unpaid';
                  
                  return (
                    <tr key={invoice.id}>
                      <td className="font-mono text-sm">{invoice.invoiceNumber}</td>
                      <td className="text-sm">
                        {format(new Date(invoice.createdAt), 'MM-dd HH:mm')}
                      </td>
                      <td className="font-medium">{invoice.customerName}</td>
                      <td className="font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="text-green-600">{formatCurrency(invoice.paidAmount)}</td>
                      <td className={remaining > 0 ? 'text-red-600' : 'text-gray-500'}>
                        {formatCurrency(remaining)}
                      </td>
                      <td>
                        <span className={`badge ${statusColors[paymentStatus]}`}>
                          {statusLabels[paymentStatus]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 汇总 */}
            <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">总发票数:</span>
                  <span className="ml-2 font-semibold">{totalInvoices}</span>
                </div>
                <div>
                  <span className="text-gray-500">总销售额:</span>
                  <span className="ml-2 font-semibold text-green-600">{formatCurrency(totalSales)}</span>
                </div>
                <div>
                  <span className="text-gray-500">已收金额:</span>
                  <span className="ml-2 font-semibold text-blue-600">{formatCurrency(totalReceived)}</span>
                </div>
                <div>
                  <span className="text-gray-500">待收金额:</span>
                  <span className="ml-2 font-semibold text-red-600">{formatCurrency(totalSales - totalReceived)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p>{getTimeRangeLabel()} 期间没有发票记录</p>
          </div>
        )}
      </div>

      {/* 付款状态分布 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">已付清</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{paidInvoices} 张发票</span>
              <span className="text-sm font-semibold">{formatCurrency(paidInvoices * (totalSales / totalInvoices || 0))}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">部分付款</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{partialInvoices} 张发票</span>
              <span className="text-sm font-semibold">{formatCurrency(partialInvoices * (totalSales / totalInvoices || 0))}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${totalInvoices > 0 ? (partialInvoices / totalInvoices) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {totalInvoices > 0 ? ((partialInvoices / totalInvoices) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">未付款</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{unpaidInvoices} 张发票</span>
              <span className="text-sm font-semibold">{formatCurrency(unpaidInvoices * (totalSales / totalInvoices || 0))}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${totalInvoices > 0 ? (unpaidInvoices / totalInvoices) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {totalInvoices > 0 ? ((unpaidInvoices / totalInvoices) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* 客户分析标签页 */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总客户数</p>
                  <p className="text-3xl font-bold mt-1">{customers.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">活跃会员</p>
                  <p className="text-3xl font-bold mt-1">{members.filter(m => m.status === 'active').length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Award className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">有购买记录</p>
                  <p className="text-3xl font-bold mt-1">
                    {customers.filter(c => 
                      invoices.some(inv => inv.customerId === c.id && inv.status !== 'cancelled')
                    ).length}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">平均消费</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(
                      customers.length > 0 ? 
                        customers.reduce((sum, c) => {
                          const customerInvoices = invoices.filter(inv => 
                            inv.customerId === c.id && inv.status !== 'cancelled'
                          );
                          return sum + customerInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
                        }, 0) / customers.length : 0
                    )}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <DollarSign className="text-orange-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">客户消费排行</h3>
            <div className="space-y-3">
              {customers
                .map(customer => {
                  const customerInvoices = invoices.filter(inv => 
                    inv.customerId === customer.id && inv.status !== 'cancelled'
                  );
                  const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                  return { customer, totalSpent, invoiceCount: customerInvoices.length };
                })
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 10)
                .map((item, index) => (
                  <div key={item.customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.customer.name}</p>
                        <p className="text-sm text-gray-500">{item.customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(item.totalSpent)}</p>
                      <p className="text-sm text-gray-500">{item.invoiceCount} 笔订单</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 会员分析标签页 */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总会员数</p>
                  <p className="text-3xl font-bold mt-1">{members.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Award className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">活跃会员</p>
                  <p className="text-3xl font-bold mt-1">{members.filter(m => m.status === 'active').length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Users className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总积分</p>
                  <p className="text-3xl font-bold mt-1">{members.reduce((sum, m) => sum + m.points, 0)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">会员消费</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(members.reduce((sum, m) => sum + m.totalSpent, 0))}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <DollarSign className="text-orange-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">会员等级分布</h3>
              <div className="space-y-3">
                {tierConfigs.map(config => {
                  const count = members.filter(m => m.tier === config.tier).length;
                  const percentage = members.length > 0 ? (count / members.length * 100).toFixed(1) : '0';
                  return (
                    <div key={config.tier} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="font-medium">{config.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{count} 人</span>
                        <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">积分排行</h3>
              <div className="space-y-3">
                {members
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 10)
                  .map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{member.customerName}</p>
                          <p className="text-xs text-gray-500">{member.memberNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-600">{member.points} 分</p>
                        <p className="text-xs text-gray-500">{formatCurrency(member.totalSpent)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 预留分析标签页 */}
      {activeTab === 'reservations' && (
        <div className="space-y-6">
          {/* 时间选择器 */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Calendar size={20} className="text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="input"
              >
                <option value="daily">日报</option>
                <option value="weekly">周报</option>
                <option value="monthly">月报</option>
              </select>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>

          {/* 预留概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总预留数量</p>
                  <p className="text-3xl font-bold mt-1">{reservationStats.totalReservations}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Archive className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">活跃预留</p>
                  <p className="text-3xl font-bold mt-1 text-yellow-600">{reservationStats.activeReservations}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Package className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已交付</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">{reservationStats.deliveredReservations}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">展览库存</p>
                  <p className="text-3xl font-bold mt-1 text-purple-600">{reservationStats.totalExhibitions}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="text-purple-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* 预留类型分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">预留类型分布</h3>
              <div className="space-y-3">
                {Object.entries(reservationStats.reservationByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {type === 'customer' ? '客户预留' :
                       type === 'activity' ? '活动预留' :
                       type === 'project' ? '项目预留' : '事件预留'}
                    </span>
                    <span className="text-sm text-gray-600">{count} 笔</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">展览类型分布</h3>
              <div className="space-y-3">
                {Object.entries(reservationStats.exhibitionByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {type === 'exhibition' ? '展览' :
                       type === 'promotion' ? '促销' :
                       type === 'workshop' ? '工作坊' :
                       type === 'seminar' ? '研讨会' : '其他'}
                    </span>
                    <span className="text-sm text-gray-600">{count} 场</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 最受欢迎商品预留 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">最受欢迎商品预留</h3>
            <div className="space-y-3">
              {reservationStats.topReservedProducts.length > 0 ? (
                reservationStats.topReservedProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{product.productName}</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">
                      {product.quantity} 件预留
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Archive size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>暂无预留数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}