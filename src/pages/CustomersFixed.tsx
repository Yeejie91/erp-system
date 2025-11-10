import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ShoppingBag, Eye, Calendar, Award, UserPlus, MessageSquare, Target, BarChart3 } from 'lucide-react';
import { Customer, Invoice, InvoiceItem, Product, Member, MembershipTierConfig, CustomerCommunication, CustomerFollowUp, CustomerValueAnalysis, MembershipTier } from '../types';
import { customersService, invoicesService, productsService, membersService, membershipTierConfigsService, customerCommunicationsService, customerFollowUpsService, customerValueAnalysesService, generateId } from '../services/db';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { formatCurrency } from '../utils/format';

export default function CustomersFixed() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'customers' | 'communications' | 'followups' | 'analysis'>('customers');
  const [communications, setCommunications] = useState<CustomerCommunication[]>([]);
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [valueAnalyses, setValueAnalyses] = useState<CustomerValueAnalysis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    membershipTier: 'regular' as MembershipTier,
  });

  const [memberFormData, setMemberFormData] = useState({
    tier: 'regular' as MembershipTier,
    points: 0,
    totalSpent: 0,
    status: 'active' as any,
    joinDate: '',
    expiryDate: '',
    birthday: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, invoicesData, productsData, membersData, tierConfigsData, commsData, followUpsData, analysesData] = await Promise.all([
        customersService.getAll(),
        invoicesService.getAll(),
        productsService.getAll(),
        membersService.getAll(),
        membershipTierConfigsService.getAll(),
        customerCommunicationsService.getAll().catch(() => []),
        customerFollowUpsService.getAll().catch(() => []),
        customerValueAnalysesService.getAll().catch(() => []),
      ]);
      
      setCustomers(customersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setInvoices(invoicesData);
      setProducts(productsData);
      setMembers(membersData);
      setTierConfigs(tierConfigsData);
      setCommunications(commsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setFollowUps(followUpsData.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setValueAnalyses(analysesData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerPurchaseHistory = (customerId: string) => {
    return invoices
      .filter(invoice => invoice.customerId === customerId && invoice.status === 'active')
      .flatMap(invoice => 
        invoice.items.map(item => ({
          ...item,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.createdAt,
          totalAmount: invoice.totalAmount,
        }))
      )
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  };

  const getRecentPurchases = (customerId: string, limit: number = 5) => {
    return getCustomerPurchaseHistory(customerId).slice(0, limit);
  };

  const getCustomerMemberInfo = (customerId: string) => {
    const member = members.find(m => m.customerId === customerId && m.status === 'active');
    if (!member) return null;
    
    const tierConfig = tierConfigs.find(c => c.tier === member.tier);
    return { member, tierConfig };
  };

  const getTierLabel = (tier: MembershipTier) => {
    const config = tierConfigs.find(c => c.tier === tier);
    return config ? config.name : '普通会员';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { membershipTier, ...customerFormData } = formData;
    const customerData: Customer = {
      id: editingCustomer?.id || generateId(),
      ...customerFormData,
      createdAt: editingCustomer?.createdAt || new Date(),
    };

    if (editingCustomer) {
      await customersService.update(customerData);
      alert('客户更新成功！');
    } else {
      await customersService.add(customerData);
      
      if (membershipTier !== 'regular') {
        const memberData: Member = {
          id: generateId(),
          memberNumber: generateMemberNumber(membershipTier),
          customerId: customerData.id,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          tier: membershipTier,
          points: 0,
          totalSpent: 0,
          status: 'active',
          joinDate: new Date(),
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await membersService.add(memberData);
        alert(`客户添加成功！已自动注册为${getTierLabel(membershipTier)}！`);
      } else {
        alert('客户添加成功！');
      }
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
    resetForm();
    loadData();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
      membershipTier: getCustomerMemberInfo(customer.id)?.member.tier || 'regular',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return;
    try {
      await customersService.delete(id);
      const memberToDelete = members.find(m => m.customerId === id);
      if (memberToDelete) {
        await membersService.delete(memberToDelete.id);
      }
      loadData();
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除客户失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      membershipTier: 'regular',
    });
  };

  const generateMemberNumber = (tier: MembershipTier) => {
    const prefix = tier === 'vip' ? 'VIP' : tier === 'svip' ? 'SVIP' : tier === 'project' ? 'PRO' : 'REG';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  };

  const handleMemberManagement = (customer: Customer) => {
    setSelectedCustomer(customer);
    const memberInfo = getCustomerMemberInfo(customer.id);
    
    if (memberInfo) {
      setEditingMember(memberInfo.member);
      setMemberFormData({
        tier: memberInfo.member.tier,
        points: memberInfo.member.points,
        totalSpent: memberInfo.member.totalSpent,
        status: memberInfo.member.status,
        joinDate: format(new Date(memberInfo.member.joinDate), 'yyyy-MM-dd'),
        expiryDate: memberInfo.member.expiryDate ? format(new Date(memberInfo.member.expiryDate), 'yyyy-MM-dd') : '',
        birthday: memberInfo.member.birthday ? format(new Date(memberInfo.member.birthday), 'yyyy-MM-dd') : '',
        notes: memberInfo.member.notes || '',
      });
    } else {
      setEditingMember(null);
      setMemberFormData({
        tier: 'regular',
        points: 0,
        totalSpent: 0,
        status: 'active',
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        expiryDate: '',
        birthday: '',
        notes: '',
      });
    }
    
    setShowMemberModal(true);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const memberData: Member = {
      id: editingMember?.id || generateId(),
      memberNumber: editingMember?.memberNumber || generateMemberNumber(memberFormData.tier),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      tier: memberFormData.tier,
      points: memberFormData.points,
      totalSpent: memberFormData.totalSpent,
      status: memberFormData.status,
      joinDate: new Date(memberFormData.joinDate),
      expiryDate: memberFormData.expiryDate ? new Date(memberFormData.expiryDate) : undefined,
      birthday: memberFormData.birthday ? new Date(memberFormData.birthday) : undefined,
      notes: memberFormData.notes,
      createdBy: editingMember?.createdBy || 'system',
      createdAt: editingMember?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingMember) {
      await membersService.update(memberData);
      alert('会员信息更新成功！');
    } else {
      await membersService.add(memberData);
      alert('会员注册成功！');
    }

    setShowMemberModal(false);
    setEditingMember(null);
    setSelectedCustomer(null);
    loadData();
  };

  const handleDeleteMember = async () => {
    if (!editingMember || !confirm('确定要删除此会员信息吗？')) return;
    
    try {
      await membersService.delete(editingMember.id);
      alert('会员信息删除成功！');
      setShowMemberModal(false);
      setEditingMember(null);
      setSelectedCustomer(null);
      loadData();
    } catch (error) {
      console.error('删除会员失败:', error);
      alert('删除会员失败，请重试');
    }
  };

  const handleViewPurchaseHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPurchaseHistory(true);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

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
        <button
          onClick={() => {
            setEditingCustomer(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加客户</span>
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline-block mr-2" size={16} />
              客户管理
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'communications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="inline-block mr-2" size={16} />
              沟通记录
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'followups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="inline-block mr-2" size={16} />
              跟进管理
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline-block mr-2" size={16} />
              价值分析
            </button>
          </nav>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`搜索${activeTab === 'customers' ? '客户' : activeTab === 'communications' ? '沟通记录' : activeTab === 'followups' ? '跟进任务' : '价值分析'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* 客户管理标签页 */}
      {activeTab === 'customers' && (
        <div>
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">客户管理</h3>
              <div className="text-sm text-gray-600">
                共 {customers.length} 个客户，筛选后 {filteredCustomers.length} 个
              </div>
            </div>
          </div>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>客户名称</th>
                  <th>联系人</th>
                  <th>电话</th>
                  <th>邮箱</th>
                  <th>地址</th>
                  <th>会员等级</th>
                  <th>创建时间</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="font-medium">{customer.name}</td>
                    <td>{customer.contact}</td>
                    <td>{customer.phone}</td>
                    <td className="text-sm">{customer.email || '-'}</td>
                    <td className="text-sm">{customer.address || '-'}</td>
                    <td>
                      {(() => {
                        const memberInfo = getCustomerMemberInfo(customer.id);
                        if (!memberInfo) {
                          return <span className="text-gray-400 text-sm">非会员</span>;
                        }
                        return (
                          <span 
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                            style={{ backgroundColor: memberInfo.tierConfig?.color || '#6B7280' }}
                          >
                            {memberInfo.tierConfig?.name || '未知'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-sm">{format(new Date(customer.createdAt), 'yyyy-MM-dd')}</td>
                    <td className="text-sm text-gray-500">{customer.notes || '-'}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewPurchaseHistory(customer)}
                          className="text-green-600 hover:text-green-800"
                          title="查看购买历史"
                        >
                          <ShoppingBag size={18} />
                        </button>
                        <button
                          onClick={() => handleMemberManagement(customer)}
                          className="text-purple-600 hover:text-purple-800"
                          title={getCustomerMemberInfo(customer.id) ? "管理会员等级" : "注册为会员"}
                        >
                          <Award size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-blue-600 hover:text-blue-800"
                          title="编辑"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? '没有找到匹配的客户' : '还没有添加客户'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 其他标签页内容 */}
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">沟通记录管理</h3>
              <button className="btn btn-primary btn-sm">
                <Plus size={16} />
                添加记录
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              记录与客户的电话、邮件、面谈等沟通内容
            </p>
          </div>
          
          {communications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
              <p>暂无沟通记录</p>
              <p className="text-sm mt-2">点击"添加记录"开始记录客户沟通</p>
            </div>
          ) : (
            communications.map((comm) => (
              <div key={comm.id} className="card hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="text-blue-600" size={20} />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{comm.subject}</h3>
                        <p className="text-sm text-gray-600">
                          {comm.customerName} · {comm.type === 'phone' ? '电话' : comm.type === 'email' ? '邮件' : comm.type === 'meeting' ? '面谈' : comm.type === 'wechat' ? '微信' : '其他'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{format(new Date(comm.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{comm.content}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">沟通结果：</span>
                    <span>{comm.result || '无'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingCustomer ? '编辑客户' : '添加客户'}
              </h2>
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
                  <label className="label">电话 *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    required
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
                  <label className="label">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                {!editingCustomer && (
                  <div>
                    <label className="label">会员等级</label>
                    <select
                      value={formData.membershipTier}
                      onChange={(e) => setFormData({ ...formData, membershipTier: e.target.value as MembershipTier })}
                      className="input"
                    >
                      <option value="regular">普通客户（非会员）</option>
                      {tierConfigs.filter(config => config.isActive).map(config => (
                        <option key={config.tier} value={config.tier}>
                          {config.name} ({config.discountRate}%折扣, {config.pointsRate}倍积分)
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      选择会员等级将自动为客户注册会员资格
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingCustomer(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCustomer ? '保存更改' : '添加客户'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 购买历史模态框 */}
      {showPurchaseHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedCustomer.name} 的购买历史
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">最近购买</h3>
                    {getRecentPurchases(selectedCustomer.id, 5).map((item, index) => (
                      <div key={index} className="text-sm text-blue-800">
                        {item.productName} × {item.quantity} - {formatCurrency(item.totalPrice)}
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">购买统计</h3>
                    <div className="text-sm text-green-800">
                      <p>总订单数: {invoices.filter(i => i.customerId === selectedCustomer.id).length}</p>
                      <p>总消费: {formatCurrency(invoices.filter(i => i.customerId === selectedCustomer.id).reduce((sum, i) => sum + i.totalAmount, 0))}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowPurchaseHistory(false);
                    setSelectedCustomer(null);
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

      {/* 会员管理模态框 */}
      {showMemberModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingMember ? '管理会员等级' : '注册为会员'} - {selectedCustomer.name}
              </h2>
              
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">会员等级 *</label>
                    <select
                      value={memberFormData.tier}
                      onChange={(e) => setMemberFormData({ ...memberFormData, tier: e.target.value })}
                      className="input"
                      required
                    >
                      {tierConfigs.filter(config => config.isActive).map(config => (
                        <option key={config.tier} value={config.tier}>
                          {config.name} ({config.discountRate}%折扣, {config.pointsRate}倍积分)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">积分</label>
                    <input
                      type="number"
                      value={memberFormData.points}
                      onChange={(e) => setMemberFormData({ ...memberFormData, points: parseInt(e.target.value) || 0 })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <div>
                    {editingMember && (
                      <button
                        type="button"
                        onClick={handleDeleteMember}
                        className="btn btn-danger mr-3"
                      >
                        删除会员
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberModal(false);
                        setEditingMember(null);
                        setSelectedCustomer(null);
                      }}
                      className="btn btn-secondary"
                    >
                      取消
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingMember ? '更新会员信息' : '注册为会员'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
