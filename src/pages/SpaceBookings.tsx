import { useState, useEffect } from 'react';
import { Plus, Eye, Check, X, FileText, UserPlus } from 'lucide-react';
import { SpaceBooking, Space, Customer, BillingType, BookingStatus } from '../types';
import {
  spaceBookingsService,
  spacesService,
  customersService,
  generateId
} from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { formatCurrency } from '../utils/format';
import { format, differenceInHours, differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SpaceBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<SpaceBooking[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SpaceBooking | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 快速添加客户
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // 预订表单
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [billingType, setBillingType] = useState<BillingType>(BillingType.HOURLY);
  const [duration, setDuration] = useState(1);
  const [deposit, setDeposit] = useState(0);
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [bookingsData, spacesData, customersData] = await Promise.all([
      spaceBookingsService.getAll(),
      spacesService.getAll(),
      customersService.getAll()
    ]);

    setBookings(bookingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setSpaces(spacesData.filter(s => s.status === 'available'));
    setCustomers(customersData);
  };

  const generateBookingNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const existingBookings = bookings.filter(b =>
      b.bookingNumber.startsWith(`BK${year}${month}`)
    );
    const nextNumber = existingBookings.length + 1;
    return `BK${year}${month}-${String(nextNumber).padStart(3, '0')}`;
  };

  const calculateEndTime = () => {
    if (!startDate || !startTime) return null;

    const start = parseISO(`${startDate}T${startTime}`);
    let end = new Date(start);

    switch (billingType) {
      case BillingType.HOURLY:
        end.setHours(end.getHours() + duration);
        break;
      case BillingType.DAILY:
        end.setDate(end.getDate() + duration);
        break;
      case BillingType.MONTHLY:
        end.setMonth(end.getMonth() + duration);
        break;
    }

    return end;
  };

  const calculateTotalAmount = () => {
    if (!selectedSpace) return 0;

    const space = spaces.find(s => s.id === selectedSpace);
    if (!space) return 0;

    switch (billingType) {
      case BillingType.HOURLY:
        return space.hourlyRate * duration;
      case BillingType.DAILY:
        return space.dailyRate * duration;
      case BillingType.MONTHLY:
        return space.monthlyRate * duration;
      default:
        return 0;
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert('请填写客户姓名和电话');
      return;
    }

    try {
      const newCustomer: Customer = {
        id: generateId(),
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        address: newCustomerAddress.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await customersService.add(newCustomer);
      setCustomers([...customers, newCustomer]);
      setSelectedCustomer(newCustomer.id);
      setShowAddCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      alert('客户添加成功！');
    } catch (error) {
      console.error('添加客户失败:', error);
      alert('添加客户失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!selectedSpace || !selectedCustomer || !startDate || !startTime) {
      alert('请填写所有必填信息');
      return;
    }

    const space = spaces.find(s => s.id === selectedSpace);
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!space || !customer) return;

    const endTime = calculateEndTime();
    if (!endTime) return;

    setLoading(true);
    try {
      const totalAmount = calculateTotalAmount();
      const startTimeDate = parseISO(`${startDate}T${startTime}`);

      const newBooking: SpaceBooking = {
        id: generateId(),
        bookingNumber: generateBookingNumber(),
        spaceId: space.id,
        spaceName: space.name,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        startTime: startTimeDate,
        endTime,
        billingType,
        duration,
        unitPrice: billingType === BillingType.HOURLY ? space.hourlyRate :
                   billingType === BillingType.DAILY ? space.dailyRate : space.monthlyRate,
        totalAmount,
        deposit,
        paidAmount: deposit, // 押金作为已付
        remainingAmount: totalAmount - deposit,
        status: 'confirmed',
        purpose: purpose || undefined,
        attendees: attendees || undefined,
        specialRequests: specialRequests || undefined,
        notes: notes || undefined,
        createdBy: user.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await spaceBookingsService.add(newBooking);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.CREATE,
        module: '空间预订',
        targetId: newBooking.id,
        targetName: newBooking.bookingNumber,
        description: `创建空间预订 ${newBooking.bookingNumber} - ${space.name}`,
      });

      alert(`预订成功！\n预订号：${newBooking.bookingNumber}\n总金额：${formatCurrency(totalAmount)}\n已付押金：${formatCurrency(deposit)}`);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('预订失败:', error);
      alert('预订失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSpace('');
    setSelectedCustomer('');
    setStartDate('');
    setStartTime('');
    setBillingType(BillingType.HOURLY);
    setDuration(1);
    setDeposit(0);
    setPurpose('');
    setAttendees(0);
    setSpecialRequests('');
    setNotes('');
  };

  const handleCreateInvoice = (booking: SpaceBooking) => {
    // 跳转到开单页面，并传递预订信息
    navigate('/invoices', {
      state: {
        fromBooking: true,
        booking: booking
      }
    });
  };

  const getStatusLabel = (status: BookingStatus) => {
    const labels: Record<BookingStatus, string> = {
      pending: '待确认',
      confirmed: '已确认',
      cancelled: '已取消',
      completed: '已完成',
    };
    return labels[status];
  };

  const getStatusColor = (status: BookingStatus) => {
    const colors: Record<BookingStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  const getBillingTypeLabel = (type: BillingType) => {
    const labels: Record<BillingType, string> = {
      [BillingType.HOURLY]: '按小时',
      [BillingType.DAILY]: '按天',
      [BillingType.MONTHLY]: '按月',
    };
    return labels[type];
  };

  const filteredBookings = filterStatus === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">空间预订</h1>
          <p className="text-gray-600 mt-1">管理空间租赁和预订</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>新建预订</span>
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">状态:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm"
          >
            <option value="all">全部</option>
            <option value="pending">待确认</option>
            <option value="confirmed">已确认</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <span className="text-sm text-gray-500">
            共 {filteredBookings.length} 条预订
          </span>
        </div>
      </div>

      {/* 预订列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预订号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">空间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">费用</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.bookingNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.spaceName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    {booking.customerName}
                    <p className="text-xs text-gray-500">{booking.customerPhone}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>
                    {format(new Date(booking.startTime), 'yyyy-MM-dd HH:mm')}
                    <p className="text-xs text-gray-400">至 {format(new Date(booking.endTime), 'MM-dd HH:mm')}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    {formatCurrency(booking.totalAmount)}
                    {booking.remainingAmount > 0 && (
                      <p className="text-xs text-red-600">欠 {formatCurrency(booking.remainingAmount)}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="查看详情"
                    >
                      <Eye size={18} />
                    </button>
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCreateInvoice(booking)}
                        className="text-green-600 hover:text-green-900"
                        title="开发票"
                      >
                        <FileText size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Plus size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无预订记录</p>
          </div>
        )}
      </div>

      {/* 新建预订模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">新建空间预订</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 空间选择 */}
              <div>
                <label className="label">选择空间 *</label>
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">请选择空间</option>
                  {spaces.map(space => (
                    <option key={space.id} value={space.id}>
                      {space.name} - {space.capacity}人 - 时租{formatCurrency(space.hourlyRate)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 客户选择 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">客户 *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <UserPlus size={16} />
                    <span>快速添加</span>
                  </button>
                </div>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">请选择客户</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* 快速添加客户 */}
              {showAddCustomer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-3">快速添加客户</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="input"
                        placeholder="客户姓名 *"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="input"
                        placeholder="联系电话 *"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        className="input"
                        placeholder="地址（可选）"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(false)}
                      className="btn-sm btn-secondary"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddCustomer}
                      className="btn-sm btn-primary"
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}

              {/* 时间和计费 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">开始日期 *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">开始时间 *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">计费方式 *</label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value as BillingType)}
                    className="input"
                    required
                  >
                    <option value={BillingType.HOURLY}>按小时</option>
                    <option value={BillingType.DAILY}>按天</option>
                    <option value={BillingType.MONTHLY}>按月</option>
                  </select>
                </div>
                <div>
                  <label className="label">时长 *</label>
                  <input
                    type="number"
                    value={duration || ''}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="input"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {billingType === BillingType.HOURLY && '小时数'}
                    {billingType === BillingType.DAILY && '天数'}
                    {billingType === BillingType.MONTHLY && '月数'}
                  </p>
                </div>
              </div>

              {/* 费用预览 */}
              {selectedSpace && duration > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">结束时间</p>
                      <p className="font-medium">
                        {calculateEndTime() ? format(calculateEndTime()!, 'yyyy-MM-dd HH:mm') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">租金总额</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(calculateTotalAmount())}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 押金 */}
              <div>
                <label className="label">押金</label>
                <input
                  type="number"
                  value={deposit || ''}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="input"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* 其他信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">使用目的</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="input"
                    placeholder="如：培训、会议、讲座"
                  />
                </div>
                <div>
                  <label className="label">预计人数</label>
                  <input
                    type="number"
                    value={attendees || ''}
                    onChange={(e) => setAttendees(Number(e.target.value))}
                    className="input"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="label">特殊要求</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="如：需要额外桌椅、需要茶水服务等"
                />
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={2}
                />
              </div>

              {/* 按钮 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '预订中...' : '确认预订'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 预订详情模态框 */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">预订详情</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">预订号</p>
                  <p className="font-medium">{selectedBooking.bookingNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">状态</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedBooking.status)}`}>
                    {getStatusLabel(selectedBooking.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">空间</p>
                  <p className="font-medium">{selectedBooking.spaceName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">客户</p>
                  <p className="font-medium">{selectedBooking.customerName}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">开始时间</p>
                  <p className="font-medium">{format(new Date(selectedBooking.startTime), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">结束时间</p>
                  <p className="font-medium">{format(new Date(selectedBooking.endTime), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">计费方式</p>
                  <p className="font-medium">{getBillingTypeLabel(selectedBooking.billingType)} × {selectedBooking.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">单价</p>
                  <p className="font-medium">{formatCurrency(selectedBooking.unitPrice)}</p>
                </div>
              </div>

              {selectedBooking.purpose && (
                <div>
                  <p className="text-sm text-gray-600">使用目的</p>
                  <p className="text-gray-900">{selectedBooking.purpose}</p>
                </div>
              )}

              {selectedBooking.attendees && (
                <div>
                  <p className="text-sm text-gray-600">预计人数</p>
                  <p className="font-medium">{selectedBooking.attendees}人</p>
                </div>
              )}

              {selectedBooking.specialRequests && (
                <div>
                  <p className="text-sm text-gray-600">特殊要求</p>
                  <p className="text-gray-900">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-gray-600">备注</p>
                  <p className="text-gray-900">{selectedBooking.notes}</p>
                </div>
              )}

              {/* 费用信息 */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">租金总额</span>
                  <span className="font-medium">{formatCurrency(selectedBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">押金</span>
                  <span className="font-medium text-blue-600">{formatCurrency(selectedBooking.deposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已付金额</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedBooking.paidAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">未付金额</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(selectedBooking.remainingAmount)}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between pt-4 border-t">
                <div>
                  {selectedBooking.status === 'confirmed' && selectedBooking.remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCreateInvoice(selectedBooking)}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <FileText size={18} />
                      <span>开发票收款</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedBooking(null);
                  }}
                  className="btn btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

