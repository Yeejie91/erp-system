import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, User, Phone, Mail, MapPin, Calendar, MessageSquare, Target, TrendingUp } from 'lucide-react';
import { Customer, Member, MembershipTierConfig } from '../types';
import { customersService, membersService, membershipTierConfigsService, generateId } from '../services/db';
import { format } from 'date-fns';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'communications' | 'followups' | 'analysis'>('customers');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    membershipTier: '普通会员',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, membersData, tierConfigsData] = await Promise.all([
        customersService.getAll(),
        membersService.getAll(),
        membershipTierConfigsService.getAll(),
      ]);
      setCustomers(customersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMembers(membersData);
      setTierConfigs(tierConfigsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      membershipTier: '普通会员',
      notes: '',
    });
    setEditingCustomer(null);
  };

  const handleAddCustomer = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      membershipTier: customer.membershipTier || '普通会员',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customerData: Customer = {
      id: editingCustomer?.id || generateId(),
      name: formData.name,
      contact: formData.contact,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      membershipTier: formData.membershipTier,
      notes: formData.notes,
      createdAt: editingCustomer?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingCustomer) {
        await customersService.update(customerData);
        alert('客户信息更新成功！');
      } else {
        await customersService.add(customerData);
        
        // 自动创建会员记录
        const memberData: Member = {
          id: generateId(),
          customerId: customerData.id,
          customerName: customerData.name,
          tier: customerData.membershipTier,
          points: 0,
          totalSpent: 0,
          joinDate: new Date(),
          lastPurchaseDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await membersService.add(memberData);
        
        alert('客户添加成功，已自动注册为会员！');
      }
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存客户信息失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return;
    try {
      await customersService.delete(id);
      // 同时删除相关的会员记录
      const memberToDelete = members.find(m => m.customerId === id);
      if (memberToDelete) {
        await membersService.delete(memberToDelete.id);
      }
      loadData();
      alert('客户已删除');
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败，请重试');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getTierConfig = (tierName: string) => {
    return tierConfigs.find(config => config.tierName === tierName);
  };

  return (
    <div className="p-6">
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载客户数据...</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户关系管理</h1>
          <p className="text-gray-500 mt-1">管理客户信息、沟通记录、跟进任务和价值分析</p>
        </div>
        <button onClick={handleAddCustomer} className="btn btn-primary">
          <Plus size={20} className="mr-2" />
          添加客户
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User size={16} className="inline mr-2" />
          客户管理
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'communications'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          沟通记录
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'followups'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          跟进管理
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'analysis'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          价值分析
        </button>
      </div>

      {/* 客户管理标签页 */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="搜索客户..."
                  className="input pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              共 {filteredCustomers.length} 个客户
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客户信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    联系方式
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会员等级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const member = members.find(m => m.customerId === customer.id);
                  const tierConfig = getTierConfig(customer.membershipTier || '普通会员');
                  
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.contact}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone size={14} className="mr-2" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-2" />
                              {customer.email}
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin size={14} className="mr-2" />
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          style={{
                            backgroundColor: tierConfig?.color || '#E5E7EB',
                            color: '#374151'
                          }}
                        >
                          {customer.membershipTier || '普通会员'}
                        </span>
                        {member && (
                          <div className="text-xs text-gray-500 mt-1">
                            积分: {member.points} | 消费: RM{member.totalSpent.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(customer.createdAt), 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 其他标签页 - 简化版本 */}
      {activeTab === 'communications' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">沟通记录管理</h3>
          <p className="text-gray-600">此功能正在开发中...</p>
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">跟进管理</h3>
          <p className="text-gray-600">此功能正在开发中...</p>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">客户价值分析</h3>
          <p className="text-gray-600">此功能正在开发中...</p>
        </div>
      )}

      {/* 客户信息模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCustomer ? '编辑客户信息' : '添加新客户'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">客户名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">联系人</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">地址</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">会员等级</label>
                <select
                  value={formData.membershipTier}
                  onChange={(e) => setFormData({ ...formData, membershipTier: e.target.value })}
                  className="input"
                >
                  {tierConfigs.map(config => (
                    <option key={config.tierName} value={config.tierName}>
                      {config.tierName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}