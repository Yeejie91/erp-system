import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, DollarSign, Package, X, Archive, AlertCircle } from 'lucide-react';
import { Activity, Product, ActivityMaterial, Space, ProductReservation } from '../types';
import { activitiesService, productsService, spacesService, productReservationsService, generateId } from '../services/db';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/format';

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedActivityForReservation, setSelectedActivityForReservation] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    status: 'planned',
    startDate: '',
    endDate: '',
    budget: 0,
    actualCost: 0,
    revenue: 0,
    description: '',
    location: '',
  });

  const [materials, setMaterials] = useState<ActivityMaterial[]>([]);
  
  const [reservationFormData, setReservationFormData] = useState({
    productId: '',
    quantity: 1,
    expectedDeliveryDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
    notes: '',
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const activitiesData = await activitiesService.getAll();
    const productsData = await productsService.getAll();
    const spacesData = await spacesService.getAll();
    const reservationsData = await productReservationsService.getAll();
    setActivities(activitiesData.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setProducts(productsData);
    setSpaces(spacesData.filter(s => s.status === 'available').sort((a, b) => a.name.localeCompare(b.name)));
    setReservations(reservationsData);
  };

  const addMaterial = () => {
    if (!selectedProduct || materialQuantity <= 0) {
      alert('请选择商品并输入有效数量');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    setMaterials([
      ...materials,
      {
        productId: product.id,
        productName: product.name,
        quantity: materialQuantity,
        allocatedDate: new Date(),
        returned: false,
      },
    ]);

    setSelectedProduct('');
    setMaterialQuantity(0);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const activityData: Activity = {
      id: editingActivity?.id || generateId(),
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      materials,
      createdAt: editingActivity?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingActivity) {
      await activitiesService.update(activityData);
    } else {
      await activitiesService.add(activityData);
    }

    setIsModalOpen(false);
    setEditingActivity(null);
    resetForm();
    loadData();
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      type: activity.type,
      status: activity.status,
      startDate: format(new Date(activity.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(activity.endDate), 'yyyy-MM-dd'),
      budget: activity.budget,
      actualCost: activity.actualCost,
      revenue: activity.revenue,
      description: activity.description || '',
      location: activity.location || '',
    });
    setMaterials(activity.materials || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个活动吗？')) {
      await activitiesService.delete(id);
      loadData();
    }
  };

  // 商品预留相关函数
  const handleOpenReservationModal = (activity: Activity) => {
    setSelectedActivityForReservation(activity);
    setShowReservationModal(true);
    // 重置表单
    setReservationFormData({
      productId: '',
      quantity: 1,
      expectedDeliveryDate: format(new Date(), 'yyyy-MM-dd'),
      reason: `为活动"${activity.name}"预留商品`,
      notes: '',
    });
  };

  const handleCloseReservationModal = () => {
    setShowReservationModal(false);
    setSelectedActivityForReservation(null);
    setReservationFormData({
      productId: '',
      quantity: 1,
      expectedDeliveryDate: format(new Date(), 'yyyy-MM-dd'),
      reason: '',
      notes: '',
    });
  };

  const handleCreateReservation = async () => {
    if (!selectedActivityForReservation || !reservationFormData.productId || reservationFormData.quantity <= 0) {
      alert('请填写完整的预留信息');
      return;
    }

    try {
      const selectedProduct = products.find(p => p.id === reservationFormData.productId);
      if (!selectedProduct) {
        alert('未找到选中的商品');
        return;
      }

      const reservation: ProductReservation = {
        id: generateId(),
        productId: reservationFormData.productId,
        productName: selectedProduct.name,
        quantity: reservationFormData.quantity,
        reservedDate: new Date(),
        expectedDeliveryDate: new Date(reservationFormData.expectedDeliveryDate),
        status: 'reserved',
        reservationType: 'activity',
        relatedId: selectedActivityForReservation.id,
        relatedName: selectedActivityForReservation.name,
        reason: reservationFormData.reason,
        notes: reservationFormData.notes,
        createdBy: 'current_user', // 这里应该从认证上下文获取
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await productReservationsService.add(reservation);
      await loadData();
      handleCloseReservationModal();
      alert('商品预留创建成功！');
    } catch (error) {
      console.error('创建预留失败:', error);
      alert('创建预留失败，请重试');
    }
  };

  const getActivityReservations = (activityId: string) => {
    return reservations.filter(r => r.relatedId === activityId && r.reservationType === 'activity');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'other',
      status: 'planned',
      startDate: '',
      endDate: '',
      budget: 0,
      actualCost: 0,
      revenue: 0,
      description: '',
      location: '',
    });
    setMaterials([]);
  };

  const getActivityTypeLabel = (type: string) => {
    const labels = {
      'workshop': '工作坊',
      'seminar': '研讨会',
      'exhibition': '展会',
      'meeting': '会议',
      'other': '其他',
    };
    return labels[type] || type;
  };

  const getActivityStatusLabel = (status: string) => {
    const labels = {
      'planned': '筹备中',
      'ongoing': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
    };
    return labels[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      'planned': 'badge-blue',
      'ongoing': 'badge-green',
      'completed': 'badge-gray',
      'cancelled': 'badge-red',
    };
    return classes[status] || 'badge-gray';
  };

  const filteredActivities = activities.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活动管理</h1>
          <p className="text-gray-500 mt-1">管理促销、工作坊、展会等各类活动</p>
        </div>
        <button
          onClick={() => {
            setEditingActivity(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>创建活动</span>
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">活动类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">全部类型</option>
              <option value="workshop">工作坊</option>
              <option value="seminar">研讨会</option>
              <option value="exhibition">展会</option>
              <option value="meeting">会议</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="label">活动状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">全部状态</option>
              <option value="planned">筹备中</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => {
          const profit = activity.revenue - activity.actualCost;
          return (
            <div key={activity.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{activity.name}</h3>
                  <div className="flex space-x-2 mt-1">
                    <span className="badge badge-blue">{getActivityTypeLabel(activity.type)}</span>
                    <span className={`badge ${getStatusBadgeClass(activity.status)}`}>
                      {getActivityStatusLabel(activity.status)}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(activity)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="编辑活动"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenReservationModal(activity)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="预留商品"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(activity.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="删除活动"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar size={16} className="mr-2" />
                  <span>
                    {format(new Date(activity.startDate), 'yyyy-MM-dd')} ~ {' '}
                    {format(new Date(activity.endDate), 'yyyy-MM-dd')}
                  </span>
                </div>

                {activity.location && (
                  <div className="text-gray-600">
                    📍 {activity.location}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-gray-600">
                    <span>预算:</span>
                    <span className="font-medium">{formatCurrency(activity.budget)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>实际成本:</span>
                    <span className="font-medium">{formatCurrency(activity.actualCost)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>收入:</span>
                    <span className="font-medium">{formatCurrency(activity.revenue)}</span>
                  </div>
                  <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                    <span>利润:</span>
                    <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(profit)}
                    </span>
                  </div>
                </div>

                {activity.materials && activity.materials.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Package size={16} className="mr-2" />
                      <span>物料 ({activity.materials.length})</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {activity.materials.slice(0, 3).map((m, i) => (
                        <div key={i}>• {m.productName} × {m.quantity}</div>
                      ))}
                      {activity.materials.length > 3 && (
                        <div>+ {activity.materials.length - 3} 更多...</div>
                      )}
                    </div>
                  </div>
                )}

                {getActivityReservations(activity.id).length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Archive size={16} className="mr-2" />
                      <span>预留商品 ({getActivityReservations(activity.id).length})</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {getActivityReservations(activity.id).slice(0, 3).map((r, i) => (
                        <div key={i} className="flex justify-between">
                          <span>• {r.productName} × {r.quantity}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${
                            r.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                            r.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {r.status === 'reserved' ? '预留中' : r.status === 'delivered' ? '已交付' : '已取消'}
                          </span>
                        </div>
                      ))}
                      {getActivityReservations(activity.id).length > 3 && (
                        <div>+ {getActivityReservations(activity.id).length - 3} 更多...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          还没有创建活动
        </div>
      )}

      {/* 创建/编辑活动模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingActivity ? '编辑活动' : '创建活动'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">活动名称 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">活动类型 *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input"
                    >
                      <option value="workshop">工作坊</option>
                      <option value="seminar">研讨会</option>
                      <option value="exhibition">展会</option>
                      <option value="meeting">会议</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">活动状态 *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input"
                    >
                      <option value="planned">筹备中</option>
                      <option value="ongoing">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">开始日期 *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">结束日期 *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">活动地点</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
                  >
                    <option value="">请选择地点</option>
                    <optgroup label="可用空间">
                      {spaces.map(space => (
                        <option key={space.id} value={space.name}>
                          {space.name} ({space.capacity}人)
                        </option>
                      ))}
                    </optgroup>
                    <option value="其他">其他地点（手动输入）</option>
                  </select>
                  {formData.location === '其他' && (
                    <input
                      type="text"
                      placeholder="输入地点名称"
                      className="input mt-2"
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">预算 (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">实际成本 (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actualCost}
                      onChange={(e) => setFormData({ ...formData, actualCost: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">收入 (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.revenue}
                      onChange={(e) => setFormData({ ...formData, revenue: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">活动描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                {/* 物料管理 */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">活动物料</h3>
                  <div className="border rounded-lg p-3 bg-gray-50 mb-3">
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="input col-span-1"
                      >
                        <option value="">选择商品</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="数量"
                        value={materialQuantity || ''}
                        onChange={(e) => setMaterialQuantity(Number(e.target.value))}
                        className="input"
                        min="1"
                      />
                      <button
                        type="button"
                        onClick={addMaterial}
                        className="btn btn-secondary"
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  {materials.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">商品</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">数量</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((material, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2 text-sm">{material.productName}</td>
                              <td className="px-3 py-2 text-sm">{material.quantity}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeMaterial(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingActivity(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingActivity ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 商品预留模态框 */}
      {showReservationModal && selectedActivityForReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                为活动预留商品 - {selectedActivityForReservation.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="label">选择商品 *</label>
                  <select
                    required
                    value={reservationFormData.productId}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, productId: e.target.value })}
                    className="input"
                  >
                    <option value="">请选择商品</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (库存: {product.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">预留数量 *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={reservationFormData.quantity}
                      onChange={(e) => setReservationFormData({ ...reservationFormData, quantity: parseInt(e.target.value) || 1 })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">期望交付日期 *</label>
                    <input
                      type="date"
                      required
                      value={reservationFormData.expectedDeliveryDate}
                      onChange={(e) => setReservationFormData({ ...reservationFormData, expectedDeliveryDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">预留原因</label>
                  <input
                    type="text"
                    value={reservationFormData.reason}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, reason: e.target.value })}
                    className="input"
                    placeholder="请输入预留原因"
                  />
                </div>

                <div>
                  <label className="label">备注</label>
                  <textarea
                    value={reservationFormData.notes}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, notes: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="请输入备注信息"
                  />
                </div>

                {/* 显示选中商品的库存信息 */}
                {reservationFormData.productId && (() => {
                  const selectedProduct = products.find(p => p.id === reservationFormData.productId);
                  if (!selectedProduct) return null;
                  
                  const isInsufficientStock = selectedProduct.stockQuantity < reservationFormData.quantity;
                  
                  return (
                    <div className={`p-3 rounded-lg ${isInsufficientStock ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                      <div className="flex items-center">
                        <AlertCircle size={16} className={`mr-2 ${isInsufficientStock ? 'text-red-600' : 'text-green-600'}`} />
                        <span className={`text-sm ${isInsufficientStock ? 'text-red-800' : 'text-green-800'}`}>
                          {isInsufficientStock 
                            ? `库存不足！当前库存: ${selectedProduct.stockQuantity}，需要: ${reservationFormData.quantity}`
                            : `库存充足！当前库存: ${selectedProduct.stockQuantity}，需要: ${reservationFormData.quantity}`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  type="button"
                  onClick={handleCloseReservationModal}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateReservation}
                  className="btn btn-primary"
                  disabled={!reservationFormData.productId || reservationFormData.quantity <= 0}
                >
                  创建预留
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

