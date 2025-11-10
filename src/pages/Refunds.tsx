import { useState, useEffect } from 'react';
import { RotateCcw, Eye, Check, X, Package } from 'lucide-react';
import { RefundOrder, Invoice, RefundItem, RefundStatus } from '../types';
import { refundOrdersService, invoicesService, productsService, stockTransactionsService, generateId } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

export default function Refunds() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 退货表单
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [refundsData, invoicesData] = await Promise.all([
      refundOrdersService.getAll(),
      invoicesService.getAll()
    ]);
    
    setRefunds(refundsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    // 只显示有效的、已付款的发票
    setInvoices(invoicesData.filter(inv => inv.status === 'active' && inv.paidAmount > 0));
  };

  const generateRefundNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const existingRefunds = refunds.filter(r => 
      r.refundNumber.startsWith(`RF${year}${month}`)
    );
    const nextNumber = existingRefunds.length + 1;
    return `RF${year}${month}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // 初始化退货商品列表
    const items: RefundItem[] = invoice.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: 0, // 默认0，用户手动输入
      unitPrice: item.unitPrice,
      amount: 0,
      restockQuantity: 0,
    }));
    setRefundItems(items);
    setShowCreateModal(true);
  };

  const updateRefundItem = (index: number, field: 'quantity' | 'restockQuantity', value: number) => {
    const updated = [...refundItems];
    const item = updated[index];
    
    if (field === 'quantity') {
      // 退货数量不能超过原购买数量
      const maxQty = selectedInvoice!.items[index].quantity;
      item.quantity = Math.min(Math.max(0, value), maxQty);
      // 默认重新入库数量等于退货数量
      item.restockQuantity = item.quantity;
    } else {
      // 入库数量不能超过退货数量
      item.restockQuantity = Math.min(Math.max(0, value), item.quantity);
    }
    
    item.amount = item.quantity * item.unitPrice;
    setRefundItems(updated);
  };

  const handleCreateRefund = async () => {
    if (!selectedInvoice || !user) return;

    const validItems = refundItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      alert('请至少选择一个商品进行退货');
      return;
    }

    if (!reason.trim()) {
      alert('请填写退货原因');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
      
      const newRefund: RefundOrder = {
        id: generateId(),
        refundNumber: generateRefundNumber(),
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerId: selectedInvoice.customerId,
        customerName: selectedInvoice.customerName,
        items: validItems,
        totalAmount,
        refundAmount: totalAmount,
        status: 'pending',
        reason,
        notes,
        createdBy: user.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await refundOrdersService.add(newRefund);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.CREATE,
        module: '退货管理',
        targetId: newRefund.id,
        targetName: newRefund.refundNumber,
        description: `创建退货单 ${newRefund.refundNumber}（发票：${selectedInvoice.invoiceNumber}）`,
      });

      alert('退货单创建成功！');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (refund: RefundOrder) => {
    if (!user) return;

    if (!confirm(`确定批准退货单 ${refund.refundNumber} 吗？`)) {
      return;
    }

    setLoading(true);
    try {
      const updated: RefundOrder = {
        ...refund,
        status: 'approved',
        approvedBy: user.name,
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      await refundOrdersService.update(updated);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.UPDATE,
        module: '退货管理',
        targetId: refund.id,
        targetName: refund.refundNumber,
        description: `批准退货单 ${refund.refundNumber}`,
      });

      alert('退货单已批准！');
      loadData();
    } catch (error) {
      console.error('批准失败:', error);
      alert('批准失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (refund: RefundOrder) => {
    if (!user) return;

    const rejectReason = prompt('请输入拒绝原因:');
    if (!rejectReason) return;

    setLoading(true);
    try {
      const updated: RefundOrder = {
        ...refund,
        status: 'rejected',
        notes: `${refund.notes || ''}\n拒绝原因: ${rejectReason}`,
        updatedAt: new Date(),
      };

      await refundOrdersService.update(updated);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.UPDATE,
        module: '退货管理',
        targetId: refund.id,
        targetName: refund.refundNumber,
        description: `拒绝退货单 ${refund.refundNumber}: ${rejectReason}`,
      });

      alert('退货单已拒绝！');
      loadData();
    } catch (error) {
      console.error('拒绝失败:', error);
      alert('拒绝失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (refund: RefundOrder) => {
    if (!user) return;

    if (!confirm(`确定完成退货单 ${refund.refundNumber} 吗？\n\n将执行以下操作：\n- 恢复库存\n- 记录退款`)) {
      return;
    }

    setLoading(true);
    try {
      // 1. 恢复库存
      for (const item of refund.items) {
        if (item.restockQuantity > 0) {
          const product = await productsService.getById(item.productId);
          if (product) {
            const beforeStock = product.currentStock;
            const afterStock = beforeStock + item.restockQuantity;
            
            // 更新商品库存
            await productsService.update({
              ...product,
              currentStock: afterStock,
              updatedAt: new Date(),
            });

            // 记录库存变动
            await stockTransactionsService.add({
              id: generateId(),
              productId: item.productId,
              productName: item.productName,
              type: 'IN',
              quantity: item.restockQuantity,
              beforeStock,
              afterStock,
              relatedId: refund.id,
              relatedType: 'order',
              notes: `退货入库 - ${refund.refundNumber}`,
              operator: user.name,
              createdAt: new Date(),
            });
          }
        }
      }

      // 2. 更新退货单状态
      const updated: RefundOrder = {
        ...refund,
        status: 'completed',
        updatedAt: new Date(),
      };
      await refundOrdersService.update(updated);

      // 3. 更新发票的已付金额（减少）
      const invoice = await invoicesService.getById(refund.invoiceId);
      if (invoice) {
        const updatedInvoice = {
          ...invoice,
          paidAmount: Math.max(0, invoice.paidAmount - refund.refundAmount),
          updatedAt: new Date(),
        };
        await invoicesService.update(updatedInvoice);
      }

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.UPDATE,
        module: '退货管理',
        targetId: refund.id,
        targetName: refund.refundNumber,
        description: `完成退货单 ${refund.refundNumber}，恢复库存，退款 ${formatCurrency(refund.refundAmount)}`,
      });

      alert('退货单已完成！库存已恢复，退款已记录。');
      loadData();
    } catch (error) {
      console.error('完成失败:', error);
      alert('完成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setRefundItems([]);
    setReason('');
    setNotes('');
  };

  const getStatusLabel = (status: RefundStatus) => {
    const labels: Record<RefundStatus, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      completed: '已完成',
    };
    return labels[status];
  };

  const getStatusColor = (status: RefundStatus) => {
    const colors: Record<RefundStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  const filteredRefunds = filterStatus === 'all' 
    ? refunds 
    : refunds.filter(r => r.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">退货管理</h1>
          <p className="text-gray-600 mt-1">处理客户退货和退款</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <RotateCcw size={20} />
          <span>创建退货单</span>
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
            <option value="pending">待审批</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="completed">已完成</option>
          </select>
          <span className="text-sm text-gray-500">
            共 {filteredRefunds.length} 条退货单
          </span>
        </div>
      </div>

      {/* 退货单列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">退货单号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联发票</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">退款金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRefunds.map((refund) => (
              <tr key={refund.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {refund.refundNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {refund.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {refund.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(refund.refundAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                    {getStatusLabel(refund.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(refund.createdAt), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRefund(refund);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="查看详情"
                    >
                      <Eye size={18} />
                    </button>
                    {refund.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(refund)}
                          className="text-green-600 hover:text-green-900"
                          title="批准"
                          disabled={loading}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(refund)}
                          className="text-red-600 hover:text-red-900"
                          title="拒绝"
                          disabled={loading}
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                    {refund.status === 'approved' && (
                      <button
                        onClick={() => handleComplete(refund)}
                        className="text-primary-600 hover:text-primary-900"
                        title="完成退货"
                        disabled={loading}
                      >
                        <Package size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRefunds.length === 0 && (
          <div className="text-center py-12">
            <RotateCcw size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无退货记录</p>
          </div>
        )}
      </div>

      {/* 创建退货单模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">创建退货单</h2>

            {!selectedInvoice ? (
              // 步骤1: 选择发票
              <div>
                <p className="text-gray-600 mb-4">请选择要退货的发票：</p>
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => handleSelectInvoice(invoice)}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{invoice.customerName}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.items.length} 件商品 | 总额: {formatCurrency(invoice.totalAmount)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(invoice.createdAt), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              // 步骤2: 填写退货信息
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">发票号: <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span></p>
                  <p className="text-sm text-gray-600">客户: <span className="font-medium text-gray-900">{selectedInvoice.customerName}</span></p>
                </div>

                {/* 退货商品列表 */}
                <div>
                  <label className="label">选择退货商品</label>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">原购买数量</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">退货数量</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">入库数量</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">单价</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">退款金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {refundItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {selectedInvoice.items[index].quantity}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={selectedInvoice.items[index].quantity}
                              value={item.quantity}
                              onChange={(e) => updateRefundItem(index, 'quantity', Number(e.target.value))}
                              className="input w-20"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.restockQuantity}
                              onChange={(e) => updateRefundItem(index, 'restockQuantity', Number(e.target.value))}
                              className="input w-20"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 提示：入库数量可以少于退货数量（如商品损坏无法入库）
                  </p>
                </div>

                {/* 退货原因 */}
                <div>
                  <label className="label">退货原因 *</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="请输入退货原因"
                    required
                  />
                </div>

                {/* 备注 */}
                <div>
                  <label className="label">备注</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="其他说明（可选）"
                  />
                </div>

                {/* 退款总额 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900">
                    退款总额: {formatCurrency(refundItems.reduce((sum, item) => sum + item.amount, 0))}
                  </p>
                </div>

                {/* 按钮 */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateRefund}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? '创建中...' : '创建退货单'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 退货单详情模态框 */}
      {showDetailModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">退货单详情</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">退货单号</p>
                  <p className="font-medium">{selectedRefund.refundNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">状态</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRefund.status)}`}>
                    {getStatusLabel(selectedRefund.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">关联发票</p>
                  <p className="font-medium">{selectedRefund.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">客户</p>
                  <p className="font-medium">{selectedRefund.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">创建人</p>
                  <p className="font-medium">{selectedRefund.createdBy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">创建时间</p>
                  <p className="font-medium">{format(new Date(selectedRefund.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                {selectedRefund.approvedBy && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">审批人</p>
                      <p className="font-medium">{selectedRefund.approvedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">审批时间</p>
                      <p className="font-medium">
                        {selectedRefund.approvedAt && format(new Date(selectedRefund.approvedAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* 退货商品 */}
              <div>
                <p className="text-sm text-gray-600 mb-2">退货商品</p>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">退货数量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">入库数量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">单价</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">退款金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedRefund.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.restockQuantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 退货原因 */}
              <div>
                <p className="text-sm text-gray-600">退货原因</p>
                <p className="text-gray-900">{selectedRefund.reason}</p>
              </div>

              {/* 备注 */}
              {selectedRefund.notes && (
                <div>
                  <p className="text-sm text-gray-600">备注</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedRefund.notes}</p>
                </div>
              )}

              {/* 退款总额 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">
                  退款总额: {formatCurrency(selectedRefund.refundAmount)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRefund(null);
                }}
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

