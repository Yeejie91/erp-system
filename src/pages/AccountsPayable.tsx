import { useState, useEffect } from 'react';
import { DollarSign, Eye, Plus, TrendingDown, AlertCircle, Calendar } from 'lucide-react';
import { AccountPayable, PaymentOutRecord, AccountStatus } from '../types';
import {
  accountsPayableService,
  paymentOutRecordsService,
  suppliersService,
  generateId
} from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { formatCurrency } from '../utils/format';
import { format, differenceInDays } from 'date-fns';

export default function AccountsPayable() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentOutRecord[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 付款表单
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [accountsData, paymentsData] = await Promise.all([
      accountsPayableService.getAll(),
      paymentOutRecordsService.getAll()
    ]);

    // 更新账款状态
    const updatedAccounts = accountsData.map(account => {
      const updated = { ...account };
      const today = new Date();
      const dueDate = new Date(account.dueDate);

      if (updated.remainingAmount === 0) {
        updated.status = 'paid';
      } else if (updated.remainingAmount < updated.totalAmount) {
        updated.status = 'partial';
      } else if (dueDate < today) {
        updated.status = 'overdue';
      } else {
        updated.status = 'pending';
      }

      return updated;
    });

    setAccounts(updatedAccounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setPaymentRecords(paymentsData);
  };

  const handleOpenPayment = (account: AccountPayable) => {
    setSelectedAccount(account);
    setPaymentAmount(account.remainingAmount.toString());
    setPaymentMethod('bank_transfer');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentReference('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedAccount || !user) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的付款金额');
      return;
    }

    if (amount > selectedAccount.remainingAmount) {
      alert(`付款金额不能超过未付金额 ${formatCurrency(selectedAccount.remainingAmount)}`);
      return;
    }

    setLoading(true);
    try {
      // 创建付款记录
      const newPayment: PaymentOutRecord = {
        id: generateId(),
        accountId: selectedAccount.id,
        amount,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
        operator: user.name,
        createdAt: new Date(),
      };

      await paymentOutRecordsService.add(newPayment);

      // 更新应付账款
      const updatedAccount: AccountPayable = {
        ...selectedAccount,
        paidAmount: selectedAccount.paidAmount + amount,
        remainingAmount: selectedAccount.remainingAmount - amount,
        status: selectedAccount.remainingAmount - amount === 0 ? 'paid' : 'partial',
        updatedAt: new Date(),
      };

      await accountsPayableService.update(updatedAccount);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.CREATE,
        module: '应付账款',
        targetId: newPayment.id,
        targetName: selectedAccount.supplierName,
        description: `付款 ${formatCurrency(amount)} - ${selectedAccount.relatedNumber}`,
      });

      alert(`付款成功！已付 ${formatCurrency(amount)}`);
      setShowPaymentModal(false);
      loadData();
    } catch (error) {
      console.error('付款失败:', error);
      alert('付款失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (account: AccountPayable) => {
    setSelectedAccount(account);
    setShowDetailModal(true);
  };

  const getStatusLabel = (status: AccountStatus) => {
    const labels: Record<AccountStatus, string> = {
      pending: '未付款',
      partial: '部分付款',
      paid: '已付清',
      overdue: '已逾期',
    };
    return labels[status];
  };

  const getStatusColor = (status: AccountStatus) => {
    const colors: Record<AccountStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const calculateOverdueDays = (dueDate: Date) => {
    const days = differenceInDays(new Date(), new Date(dueDate));
    return days > 0 ? days : 0;
  };

  const filteredAccounts = filterStatus === 'all'
    ? accounts
    : accounts.filter(a => a.status === filterStatus);

  // 统计数据
  const totalPayable = accounts.reduce((sum, a) => sum + a.remainingAmount, 0);
  const overdueAmount = accounts.filter(a => a.status === 'overdue').reduce((sum, a) => sum + a.remainingAmount, 0);
  const paidThisMonth = paymentRecords
    .filter(p => {
      const date = new Date(p.paymentDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const accountPayments = selectedAccount
    ? paymentRecords.filter(p => p.accountId === selectedAccount.id)
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">应付账款</h1>
          <p className="text-gray-600 mt-1">管理供应商欠款和付款记录</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">应付总额</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalPayable)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <DollarSign className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">逾期金额</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(overdueAmount)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">本月已付</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(paidThisMonth)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingDown className="text-green-600" size={24} />
            </div>
          </div>
        </div>
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
            <option value="pending">未付款</option>
            <option value="partial">部分付款</option>
            <option value="overdue">已逾期</option>
            <option value="paid">已付清</option>
          </select>
          <span className="text-sm text-gray-500">
            共 {filteredAccounts.length} 条应付账款
          </span>
        </div>
      </div>

      {/* 应付账款列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联单据</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">应付金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">已付金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">未付金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">到期日</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAccounts.map((account) => {
              const overdueDays = calculateOverdueDays(account.dueDate);
              return (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.relatedNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(account.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(account.paidAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(account.remainingAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {format(new Date(account.dueDate), 'yyyy-MM-dd')}
                      {account.status === 'overdue' && (
                        <p className="text-xs text-red-600 mt-1">
                          逾期 {overdueDays} 天
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(account.status)}`}>
                      {getStatusLabel(account.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewDetail(account)}
                        className="text-blue-600 hover:text-blue-900"
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                      {account.remainingAmount > 0 && (
                        <button
                          onClick={() => handleOpenPayment(account)}
                          className="text-orange-600 hover:text-orange-900"
                          title="付款"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAccounts.length === 0 && (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无应付账款</p>
          </div>
        )}
      </div>

      {/* 付款模态框 */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">付款</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">供应商</p>
                <p className="font-medium">{selectedAccount.supplierName}</p>
                <p className="text-sm text-gray-600 mt-2">单据编号</p>
                <p className="font-medium">{selectedAccount.relatedNumber}</p>
                <p className="text-sm text-gray-600 mt-2">未付金额</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(selectedAccount.remainingAmount)}
                </p>
              </div>

              <div>
                <label className="label">付款金额 *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input"
                  min="0"
                  max={selectedAccount.remainingAmount}
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="label">付款方式 *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                  required
                >
                  <option value="bank_transfer">银行转账</option>
                  <option value="cash">现金</option>
                  <option value="tng">T&G</option>
                  <option value="public_bank">Public Bank</option>
                  <option value="hong_leong">Hong Leong Bank</option>
                  <option value="cheque">支票</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="label">付款日期 *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {paymentMethod !== 'cash' && (
                <div>
                  <label className="label">参考号/交易号</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="input"
                    placeholder="输入交易参考号"
                  />
                </div>
              )}

              <div>
                <label className="label">备注</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="其他说明（可选）"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handlePayment}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '处理中...' : '确认付款'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">应付账款详情</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">供应商</p>
                  <p className="font-medium">{selectedAccount.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">关联单据</p>
                  <p className="font-medium">{selectedAccount.relatedNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">应付金额</p>
                  <p className="font-medium">{formatCurrency(selectedAccount.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">已付金额</p>
                  <p className="font-medium text-green-600">{formatCurrency(selectedAccount.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">未付金额</p>
                  <p className="font-medium text-red-600">{formatCurrency(selectedAccount.remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">到期日</p>
                  <p className="font-medium">{format(new Date(selectedAccount.dueDate), 'yyyy-MM-dd')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">状态</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedAccount.status)}`}>
                    {getStatusLabel(selectedAccount.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">创建时间</p>
                  <p className="font-medium">{format(new Date(selectedAccount.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                </div>
              </div>

              {selectedAccount.notes && (
                <div>
                  <p className="text-sm text-gray-600">备注</p>
                  <p className="text-gray-900">{selectedAccount.notes}</p>
                </div>
              )}

              {/* 付款记录 */}
              <div>
                <h3 className="text-lg font-semibold mb-2">付款记录</h3>
                {accountPayments.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">付款日期</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">付款金额</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">付款方式</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作人</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {accountPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(new Date(payment.paymentDate), 'yyyy-MM-dd')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{payment.paymentMethod}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{payment.operator}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-sm">暂无付款记录</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

