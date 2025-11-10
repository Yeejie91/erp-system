import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, Calendar, User, AlertCircle } from 'lucide-react';
import { ProductReservation, Product, Customer, Activity } from '../types';
import { productReservationsService, productsService, customersService, activitiesService, generateId } from '../services/db';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { format } from 'date-fns';

export default function ProductReservations() {
  const { formatCurrency, formatDate } = useSystemSettings();
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ProductReservation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reserved' | 'delivered' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    reservedDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDeliveryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    reservationType: 'customer' as const,
    relatedId: '',
    relatedName: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reservationsData, productsData, customersData, activitiesData] = await Promise.all([
        productReservationsService.getAll(),
        productsService.getAll(),
        customersService.getAll(),
        activitiesService.getAll()
      ]);
      
      setReservations(reservationsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setProducts(productsData);
      setCustomers(customersData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: 1,
      reservedDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      reservationType: 'customer',
      relatedId: '',
      relatedName: '',
      reason: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProduct = products.find(p => p.id === formData.productId);
    
    if (!selectedProduct) {
      alert('请选择有效的商品');
      return;
    }

    if (!formData.relatedId || !formData.relatedName) {
      alert('请选择预留关联对象');
      return;
    }

    // 检查库存是否足够
    if (selectedProduct.currentStock < formData.quantity) {
      alert(`库存不足！当前库存：${selectedProduct.currentStock}，需要：${formData.quantity}`);
      return;
    }

    const reservationData: ProductReservation = {
      id: editingReservation?.id || generateId(),
      productId: formData.productId,
      productName: selectedProduct.name,
      quantity: formData.quantity,
      reservedDate: new Date(formData.reservedDate),
      expectedDeliveryDate: new Date(formData.expectedDeliveryDate),
      status: 'reserved',
      reservationType: formData.reservationType,
      relatedId: formData.relatedId,
      relatedName: formData.relatedName,
      reason: formData.reason,
      notes: formData.notes,
      createdBy: 'system',
      createdAt: editingReservation?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingReservation) {
        await productReservationsService.update(reservationData);
        alert('预留记录更新成功！');
      } else {
        await productReservationsService.add(reservationData);
        
        // 减少库存
        const updatedProduct = {
          ...selectedProduct,
          currentStock: selectedProduct.currentStock - formData.quantity,
          updatedAt: new Date(),
        };
        await productsService.update(updatedProduct);
        
        alert('商品预留成功！库存已自动减少');
      }
      
      setIsModalOpen(false);
      setEditingReservation(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存预留记录失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (reservation: ProductReservation) => {
    setEditingReservation(reservation);
    setFormData({
      productId: reservation.productId,
      quantity: reservation.quantity,
      reservedDate: format(reservation.reservedDate, 'yyyy-MM-dd'),
      expectedDeliveryDate: format(reservation.expectedDeliveryDate, 'yyyy-MM-dd'),
      reservationType: reservation.reservationType,
      relatedId: reservation.relatedId,
      relatedName: reservation.relatedName,
      reason: reservation.reason || '',
      notes: reservation.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此预留记录吗？')) return;
    
    try {
      const reservation = reservations.find(r => r.id === id);
      if (reservation && reservation.status === 'reserved') {
        // 恢复库存
        const product = products.find(p => p.id === reservation.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            currentStock: product.currentStock + reservation.quantity,
            updatedAt: new Date(),
          };
          await productsService.update(updatedProduct);
        }
      }
      
      await productReservationsService.delete(id);
      alert('预留记录删除成功！库存已恢复');
      loadData();
    } catch (error) {
      console.error('删除预留记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleStatusChange = async (reservation: ProductReservation, newStatus: 'reserved' | 'delivered' | 'cancelled') => {
    try {
      const updatedReservation = {
        ...reservation,
        status: newStatus,
        updatedAt: new Date(),
      };
      
      await productReservationsService.update(updatedReservation);
      
      // 如果状态改为已交付或取消，恢复库存
      if ((newStatus === 'delivered' || newStatus === 'cancelled') && reservation.status === 'reserved') {
        const product = products.find(p => p.id === reservation.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            currentStock: product.currentStock + reservation.quantity,
            updatedAt: new Date(),
          };
          await productsService.update(updatedProduct);
        }
      }
      
      alert('状态更新成功！');
      loadData();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新失败，请重试');
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = reservation.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.relatedName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reserved':
        return '已预留';
      case 'delivered':
        return '已交付';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品预留管理</h1>
          <p className="text-gray-500 mt-1">管理客户商品预留和展览库存</p>
        </div>
        <button
          onClick={() => {
            setEditingReservation(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="mr-2" size={20} />
          新增预留
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="card mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索商品或关联对象..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input"
            >
              <option value="all">全部状态</option>
              <option value="reserved">已预留</option>
              <option value="delivered">已交付</option>
              <option value="cancelled">已取消</option>
            </select>
            <div className="text-sm text-gray-500 flex items-center">
              <AlertCircle className="mr-2" size={16} />
              共 {filteredReservations.length} 条记录
            </div>
          </div>
        </div>
      </div>

      {/* 预留记录列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>商品名称</th>
                <th>预留类型</th>
                <th>关联对象</th>
                <th>预留数量</th>
                <th>预留日期</th>
                <th>预计交付</th>
                <th>状态</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td className="font-medium">{reservation.productName}</td>
                  <td>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {reservation.reservationType === 'customer' ? '客户' :
                       reservation.reservationType === 'activity' ? '活动' :
                       reservation.reservationType === 'project' ? '项目' : '事件'}
                    </span>
                  </td>
                  <td>{reservation.relatedName}</td>
                  <td>{reservation.quantity}</td>
                  <td>{formatDate(reservation.reservedDate)}</td>
                  <td>{formatDate(reservation.expectedDeliveryDate)}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(reservation.status)}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
                  </td>
                  <td className="max-w-xs truncate">{reservation.notes || '-'}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(reservation)}
                        className="text-blue-600 hover:text-blue-800"
                        title="编辑"
                      >
                        <Edit size={16} />
                      </button>
                      {reservation.status === 'reserved' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(reservation, 'delivered')}
                            className="text-green-600 hover:text-green-800"
                            title="标记为已交付"
                          >
                            交付
                          </button>
                          <button
                            onClick={() => handleStatusChange(reservation, 'cancelled')}
                            className="text-red-600 hover:text-red-800"
                            title="取消预留"
                          >
                            取消
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="text-red-600 hover:text-red-800"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredReservations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="mx-auto mb-4 text-gray-400" size={48} />
              <p>暂无预留记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 预留表单模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingReservation ? '编辑预留记录' : '新增预留记录'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">商品 *</label>
                    <select
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">选择商品</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} (库存: {product.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">预留类型 *</label>
                    <select
                      value={formData.reservationType}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        setFormData({ 
                          ...formData, 
                          reservationType: newType,
                          relatedId: '',
                          relatedName: ''
                        });
                      }}
                      className="input"
                      required
                    >
                      <option value="customer">客户</option>
                      <option value="activity">活动</option>
                      <option value="project">项目</option>
                      <option value="event">事件</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">关联对象 *</label>
                    <select
                      value={formData.relatedId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        let selectedName = '';
                        
                        if (formData.reservationType === 'customer') {
                          const customer = customers.find(c => c.id === selectedId);
                          selectedName = customer?.name || '';
                        } else if (formData.reservationType === 'activity') {
                          const activity = activities.find(a => a.id === selectedId);
                          selectedName = activity?.name || '';
                        }
                        
                        setFormData({ 
                          ...formData, 
                          relatedId: selectedId,
                          relatedName: selectedName
                        });
                      }}
                      className="input"
                      required
                    >
                      <option value="">选择{formData.reservationType === 'customer' ? '客户' : 
                                            formData.reservationType === 'activity' ? '活动' :
                                            formData.reservationType === 'project' ? '项目' : '事件'}</option>
                      {formData.reservationType === 'customer' && customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                      {formData.reservationType === 'activity' && activities.map(activity => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">预留数量 *</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="input"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">预留日期 *</label>
                    <input
                      type="date"
                      value={formData.reservedDate}
                      onChange={(e) => setFormData({ ...formData, reservedDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">预计交付日期 *</label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="label">预留原因</label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="input"
                      placeholder="请输入预留原因..."
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="label">备注</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      rows={3}
                      placeholder="请输入备注信息..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingReservation(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingReservation ? '更新' : '创建'}
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
