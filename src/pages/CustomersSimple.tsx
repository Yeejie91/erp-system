import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ShoppingBag, Award, Users, MessageSquare, Target, BarChart3 } from 'lucide-react';
import { Customer, MembershipTier, Member, MembershipTierConfig, Invoice, CustomerCommunication, CustomerFollowUp, CustomerValueAnalysis } from '../types';
import { customersService, membersService, membershipTierConfigsService, invoicesService, customerCommunicationsService, customerFollowUpsService, customerValueAnalysesService, generateId } from '../services/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

export default function CustomersSimple() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'customers' | 'communications' | 'followups' | 'analysis'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [communications, setCommunications] = useState<CustomerCommunication[]>([]);
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [valueAnalyses, setValueAnalyses] = useState<CustomerValueAnalysis[]>([]);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<CustomerCommunication | null>(null);
  const [communicationFormData, setCommunicationFormData] = useState({
    customerId: '',
    customerName: '',
    type: 'phone' as 'phone' | 'email' | 'meeting' | 'wechat' | 'other',
    subject: '',
    content: '',
    result: '',
    nextFollowUp: '',
  });
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<CustomerFollowUp | null>(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    customerId: '',
    customerName: '',
    title: '',
    description: '',
    type: 'call' as 'call' | 'email' | 'meeting' | 'visit' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
    assignedTo: 'system',
  });
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedAnalysisCustomer, setSelectedAnalysisCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    console.log('CustomersSimple 组件已加载');
    loadData();
  }, []);

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'champion': return 'bg-green-100 text-green-800';
      case 'loyal': return 'bg-blue-100 text-blue-800';
      case 'potential': return 'bg-yellow-100 text-yellow-800';
      case 'new': return 'bg-purple-100 text-purple-800';
      case 'at_risk': return 'bg-orange-100 text-orange-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'champion': return '冠军客户';
      case 'loyal': return '忠诚客户';
      case 'potential': return '潜力客户';
      case 'new': return '新客户';
      case 'at_risk': return '流失风险';
      case 'lost': return '流失客户';
      default: return '未知';
    }
  };

  const loadData = async () => {
    console.log('开始加载数据...');
    setLoading(true);
    try {
      const [customersData, membersData, tierConfigsData, invoicesData, commsData, followUpsData, analysesData] = await Promise.all([
        customersService.getAll(),
        membersService.getAll().catch(() => []),
        membershipTierConfigsService.getAll().catch(() => []),
        invoicesService.getAll().catch(() => []),
        customerCommunicationsService.getAll().catch(() => []),
        customerFollowUpsService.getAll().catch(() => []),
        customerValueAnalysesService.getAll().catch(() => [])
      ]);
      console.log('数据加载完成:', { 
        customers: customersData.length, 
        members: membersData.length, 
        tierConfigs: tierConfigsData.length,
        invoices: invoicesData.length,
        communications: commsData.length,
        followUps: followUpsData.length,
        analyses: analysesData.length
      });
      setCustomers(customersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMembers(membersData);
      setTierConfigs(tierConfigsData);
      setInvoices(invoicesData);
      setCommunications(commsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setFollowUps(followUpsData.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setValueAnalyses(analysesData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      console.log('数据加载完成');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交客户数据:', formData);

    const customerData: Customer = {
      id: editingCustomer?.id || generateId(),
      ...formData,
      createdAt: editingCustomer?.createdAt || new Date(),
    };

    try {
      if (editingCustomer) {
        await customersService.update(customerData);
        alert('客户更新成功！');
      } else {
        // 添加新客户
        await customersService.add(customerData);
        
        // 自动创建普通会员
        const memberData: Member = {
          id: generateId(),
          memberNumber: generateMemberNumber('regular'),
          customerId: customerData.id,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          tier: 'regular',
          points: 0,
          totalSpent: 0,
          status: 'active',
          joinDate: new Date(),
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await membersService.add(memberData);
        alert('客户添加成功！已自动注册为普通会员！');
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存客户失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (customer: Customer) => {
    console.log('编辑客户:', customer);
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return;
    try {
      await customersService.delete(id);
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
    });
  };

  const getCustomerMemberInfo = (customerId: string) => {
    const member = members.find(m => m.customerId === customerId && m.status === 'active');
    if (!member) return null;
    
    const tierConfig = tierConfigs.find(c => c.tier === member.tier);
    return { member, tierConfig };
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
    } else {
      setEditingMember(null);
    }
    
    setShowMemberModal(true);
  };

  // 沟通记录相关函数
  const handleAddCommunication = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingCommunication(null);
    setCommunicationFormData({
      customerId: customer.id,
      customerName: customer.name,
      type: 'phone',
      subject: '',
      content: '',
      result: '',
      nextFollowUp: '',
    });
    setShowCommunicationModal(true);
  };

  const handleCommunicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const communicationData: CustomerCommunication = {
      id: editingCommunication?.id || generateId(),
      customerId: communicationFormData.customerId,
      customerName: communicationFormData.customerName,
      type: communicationFormData.type,
      subject: communicationFormData.subject,
      content: communicationFormData.content,
      result: communicationFormData.result,
      nextFollowUp: communicationFormData.nextFollowUp ? new Date(communicationFormData.nextFollowUp) : undefined,
      operator: 'system',
      createdAt: editingCommunication?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingCommunication) {
        await customerCommunicationsService.update(communicationData);
        alert('沟通记录更新成功！');
      } else {
        await customerCommunicationsService.add(communicationData);
        alert('沟通记录添加成功！');
      }
      setShowCommunicationModal(false);
      setEditingCommunication(null);
      loadData();
    } catch (error) {
      console.error('保存沟通记录失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEditCommunication = (communication: CustomerCommunication) => {
    setEditingCommunication(communication);
    setCommunicationFormData({
      customerId: communication.customerId,
      customerName: communication.customerName,
      type: communication.type,
      subject: communication.subject,
      content: communication.content,
      result: communication.result,
      nextFollowUp: communication.nextFollowUp ? format(communication.nextFollowUp, 'yyyy-MM-dd') : '',
    });
    setShowCommunicationModal(true);
  };

  const handleDeleteCommunication = async (id: string) => {
    if (!confirm('确定要删除此沟通记录吗？')) return;
    try {
      await customerCommunicationsService.delete(id);
      loadData();
    } catch (error) {
      console.error('删除沟通记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 跟进管理相关函数
  const handleAddFollowUp = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingFollowUp(null);
    setFollowUpFormData({
      customerId: customer.id,
      customerName: customer.name,
      title: '',
      description: '',
      type: 'call',
      priority: 'medium',
      dueDate: '',
      assignedTo: 'system',
    });
    setShowFollowUpModal(true);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const followUpData: CustomerFollowUp = {
      id: editingFollowUp?.id || generateId(),
      customerId: followUpFormData.customerId,
      customerName: followUpFormData.customerName,
      title: followUpFormData.title,
      description: followUpFormData.description,
      type: followUpFormData.type,
      priority: followUpFormData.priority,
      status: 'pending',
      dueDate: new Date(followUpFormData.dueDate),
      assignedTo: followUpFormData.assignedTo,
      createdBy: 'system',
      createdAt: editingFollowUp?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingFollowUp) {
        await customerFollowUpsService.update(followUpData);
        alert('跟进任务更新成功！');
      } else {
        await customerFollowUpsService.add(followUpData);
        alert('跟进任务添加成功！');
      }
      setShowFollowUpModal(false);
      setEditingFollowUp(null);
      loadData();
    } catch (error) {
      console.error('保存跟进任务失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEditFollowUp = (followUp: CustomerFollowUp) => {
    setEditingFollowUp(followUp);
    setFollowUpFormData({
      customerId: followUp.customerId,
      customerName: followUp.customerName,
      title: followUp.title,
      description: followUp.description,
      type: followUp.type,
      priority: followUp.priority,
      dueDate: format(followUp.dueDate, 'yyyy-MM-dd'),
      assignedTo: followUp.assignedTo,
    });
    setShowFollowUpModal(true);
  };

  const handleDeleteFollowUp = async (id: string) => {
    if (!confirm('确定要删除此跟进任务吗？')) return;
    try {
      await customerFollowUpsService.delete(id);
      loadData();
    } catch (error) {
      console.error('删除跟进任务失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleCompleteFollowUp = async (followUp: CustomerFollowUp) => {
    const result = prompt('请输入完成结果：');
    if (result === null) return;
    
    try {
      const updatedFollowUp = {
        ...followUp,
        status: 'completed' as const,
        completedAt: new Date(),
        result: result,
        updatedAt: new Date(),
      };
      await customerFollowUpsService.update(updatedFollowUp);
      loadData();
    } catch (error) {
      console.error('完成跟进任务失败:', error);
      alert('操作失败，请重试');
    }
  };

  // 价值分析相关函数
  const calculateCustomerValue = (customer: Customer) => {
    const customerInvoices = invoices.filter(inv => 
      inv.customerId === customer.id && inv.status !== 'cancelled'
    );
    
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalOrders = customerInvoices.length;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    const firstPurchaseDate = customerInvoices.length > 0 
      ? new Date(Math.min(...customerInvoices.map(inv => new Date(inv.createdAt).getTime())))
      : new Date();
    const lastPurchaseDate = customerInvoices.length > 0 
      ? new Date(Math.max(...customerInvoices.map(inv => new Date(inv.createdAt).getTime())))
      : new Date();
    
    const daysSinceLastPurchase = Math.floor((new Date().getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const customerLifetimeDays = Math.floor((new Date().getTime() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const purchaseFrequency = customerLifetimeDays > 0 ? (totalOrders / customerLifetimeDays) * 30 : 0; // 次/月
    
    // RFM 评分 (1-5分)
    const recencyScore = daysSinceLastPurchase <= 30 ? 5 : daysSinceLastPurchase <= 90 ? 4 : daysSinceLastPurchase <= 180 ? 3 : daysSinceLastPurchase <= 365 ? 2 : 1;
    const frequencyScore = purchaseFrequency >= 2 ? 5 : purchaseFrequency >= 1 ? 4 : purchaseFrequency >= 0.5 ? 3 : purchaseFrequency >= 0.25 ? 2 : 1;
    const monetaryScore = totalSpent >= 10000 ? 5 : totalSpent >= 5000 ? 4 : totalSpent >= 2000 ? 3 : totalSpent >= 1000 ? 2 : 1;
    
    const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
    
    // 客户细分
    let customerSegment: 'champion' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'lost';
    if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
      customerSegment = 'champion';
    } else if (recencyScore >= 3 && frequencyScore >= 3 && monetaryScore >= 3) {
      customerSegment = 'loyal';
    } else if (recencyScore >= 3 && frequencyScore <= 2 && monetaryScore >= 3) {
      customerSegment = 'potential';
    } else if (recencyScore >= 4 && frequencyScore <= 2 && monetaryScore <= 2) {
      customerSegment = 'new';
    } else if (recencyScore <= 2 && frequencyScore >= 3 && monetaryScore >= 3) {
      customerSegment = 'at_risk';
    } else {
      customerSegment = 'lost';
    }
    
    const riskLevel = recencyScore <= 2 ? 'high' : recencyScore <= 3 ? 'medium' : 'low';
    
    let nextAction = '';
    switch (customerSegment) {
      case 'champion':
        nextAction = '保持关系，推荐新产品，邀请参与VIP活动';
        break;
      case 'loyal':
        nextAction = '定期沟通，提供个性化服务，考虑升级会员';
        break;
      case 'potential':
        nextAction = '增加沟通频次，了解需求，提供定制化方案';
        break;
      case 'new':
        nextAction = '欢迎新客户，介绍产品，建立信任关系';
        break;
      case 'at_risk':
        nextAction = '紧急联系，了解问题，提供优惠挽留';
        break;
      case 'lost':
        nextAction = '重新激活，发送优惠信息，了解流失原因';
        break;
    }
    
    return {
      customerId: customer.id,
      customerName: customer.name,
      totalSpent,
      totalOrders,
      averageOrderValue,
      lastPurchaseDate,
      firstPurchaseDate,
      customerLifetimeValue: totalSpent,
      purchaseFrequency,
      daysSinceLastPurchase,
      recencyScore,
      frequencyScore,
      monetaryScore,
      rfmScore,
      customerSegment,
      riskLevel,
      nextAction,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const handleAnalyzeCustomer = async (customer: Customer) => {
    setSelectedAnalysisCustomer(customer);
    
    try {
      const analysis = calculateCustomerValue(customer);
      
      // 保存或更新分析结果
      const existingAnalysis = valueAnalyses.find(a => a.customerId === customer.id);
      if (existingAnalysis) {
        await customerValueAnalysesService.update({ ...analysis, createdAt: existingAnalysis.createdAt });
      } else {
        await customerValueAnalysesService.add(analysis);
      }
      
      loadData();
      setShowAnalysisModal(true);
    } catch (error) {
      console.error('分析客户价值失败:', error);
      alert('分析失败，请重试');
    }
  };


  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  console.log('渲染状态:', { loading, customers: customers.length, filteredCustomers: filteredCustomers.length, activeTab });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载客户数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户关系管理</h1>
          <p className="text-gray-500 mt-1">一站式客户管理平台 - 客户信息、会员管理、沟通记录、跟进任务和价值分析</p>
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
              客户信息
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
              <h3 className="text-lg font-semibold">客户信息管理</h3>
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
                          onClick={() => handleAddCommunication(customer)}
                          className="text-green-600 hover:text-green-800"
                          title="添加沟通记录"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button
                          onClick={() => handleAddFollowUp(customer)}
                          className="text-orange-600 hover:text-orange-800"
                          title="添加跟进任务"
                        >
                          <Target size={18} />
                        </button>
                        <button
                          onClick={() => handleAnalyzeCustomer(customer)}
                          className="text-purple-600 hover:text-purple-800"
                          title="价值分析"
                        >
                          <BarChart3 size={18} />
                        </button>
                        <button
                          onClick={() => handleMemberManagement(customer)}
                          className="text-purple-600 hover:text-purple-800"
                          title="管理会员等级"
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
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>调试信息：</strong><br/>
                    总客户数: {customers.length}<br/>
                    筛选后客户数: {filteredCustomers.length}<br/>
                    搜索词: "{searchTerm}"<br/>
                    当前标签页: {activeTab}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 沟通记录标签页 */}
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">沟通记录管理</h3>
              <div className="text-sm text-gray-600">
                共 {communications.length} 条记录
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              记录与客户的电话、邮件、面谈等沟通内容
            </p>
          </div>
          
          {communications.length === 0 ? (
            <div className="card p-6">
              <div className="text-center py-12 text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
                <p>暂无沟通记录</p>
                <p className="text-sm mt-2">请先在客户信息中选择客户添加沟通记录</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
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
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{format(new Date(comm.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                        <button
                          onClick={() => handleEditCommunication(comm)}
                          className="text-blue-600 hover:text-blue-800"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCommunication(comm.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{comm.content}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">沟通结果：</span>
                      <span>{comm.result || '无'}</span>
                      {comm.nextFollowUp && (
                        <div className="mt-1">
                          <span className="font-medium">下次跟进：</span>
                          <span>{format(comm.nextFollowUp, 'yyyy-MM-dd')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 跟进管理标签页 */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">跟进任务管理</h3>
              <div className="text-sm text-gray-600">
                共 {followUps.length} 个任务，待处理 {followUps.filter(f => f.status === 'pending').length} 个
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              管理客户的电话、邮件、面谈等跟进任务
            </p>
          </div>
          
          {followUps.length === 0 ? (
            <div className="card p-6">
              <div className="text-center py-12 text-gray-500">
                <Target size={48} className="mx-auto mb-4 text-gray-400" />
                <p>暂无跟进任务</p>
                <p className="text-sm mt-2">请先在客户信息中选择客户添加跟进任务</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {followUps.map((followUp) => (
                <div key={followUp.id} className={`card hover:shadow-md transition-shadow ${
                  followUp.status === 'completed' ? 'opacity-75' : ''
                }`}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <Target className={`${followUp.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`} size={20} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{followUp.title}</h3>
                          <p className="text-sm text-gray-600">
                            {followUp.customerName} · {followUp.type === 'call' ? '电话' : followUp.type === 'email' ? '邮件' : followUp.type === 'meeting' ? '面谈' : followUp.type === 'visit' ? '拜访' : '其他'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          followUp.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          followUp.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          followUp.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {followUp.priority === 'urgent' ? '紧急' : followUp.priority === 'high' ? '高' : followUp.priority === 'medium' ? '中' : '低'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          followUp.status === 'completed' ? 'bg-green-100 text-green-800' :
                          followUp.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {followUp.status === 'completed' ? '已完成' : followUp.status === 'in_progress' ? '进行中' : '待处理'}
                        </span>
                        <span className="text-sm text-gray-500">{format(new Date(followUp.dueDate), 'yyyy-MM-dd')}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{followUp.description}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">负责人：</span>
                        <span>{followUp.assignedTo}</span>
                        {followUp.completedAt && (
                          <div className="mt-1">
                            <span className="font-medium">完成时间：</span>
                            <span>{format(new Date(followUp.completedAt), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        )}
                        {followUp.result && (
                          <div className="mt-1">
                            <span className="font-medium">完成结果：</span>
                            <span>{followUp.result}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {followUp.status === 'pending' && (
                          <button
                            onClick={() => handleCompleteFollowUp(followUp)}
                            className="text-green-600 hover:text-green-800"
                            title="标记完成"
                          >
                            <Target size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditFollowUp(followUp)}
                          className="text-blue-600 hover:text-blue-800"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 价值分析标签页 */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">客户价值分析</h3>
              <div className="text-sm text-gray-600">
                共 {valueAnalyses.length} 个客户分析
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              基于RFM模型分析客户价值，识别冠军客户、潜力客户等
            </p>
          </div>
          
          {valueAnalyses.length === 0 ? (
            <div className="card p-6">
              <div className="text-center py-12 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
                <p>暂无价值分析数据</p>
                <p className="text-sm mt-2">请先在客户信息中选择客户进行价值分析</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {valueAnalyses.map((analysis) => (
                <div key={analysis.customerId} className="card hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="text-blue-600" size={20} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{analysis.customerName}</h3>
                          <p className="text-sm text-gray-600">
                            RFM评分: {analysis.rfmScore} · 风险等级: {analysis.riskLevel === 'high' ? '高' : analysis.riskLevel === 'medium' ? '中' : '低'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-sm rounded-full font-medium ${getSegmentColor(analysis.customerSegment)}`}>
                          {getSegmentLabel(analysis.customerSegment)}
                        </span>
                        <span className="text-sm text-gray-500">{format(new Date(analysis.updatedAt), 'yyyy-MM-dd')}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">总消费金额</div>
                        <div className="text-lg font-semibold text-green-600">{formatCurrency(analysis.totalSpent)}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">订单数量</div>
                        <div className="text-lg font-semibold text-blue-600">{analysis.totalOrders} 笔</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">平均订单价值</div>
                        <div className="text-lg font-semibold text-purple-600">{formatCurrency(analysis.averageOrderValue)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">最近购买</div>
                        <div className="text-sm font-medium">{format(analysis.lastPurchaseDate, 'yyyy-MM-dd')}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">购买频次</div>
                        <div className="text-sm font-medium">{analysis.purchaseFrequency.toFixed(1)} 次/月</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">客户生命周期价值</div>
                        <div className="text-sm font-medium">{formatCurrency(analysis.customerLifetimeValue)}</div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-2">建议行动</div>
                      <div className="text-sm text-blue-800">{analysis.nextAction}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

                {/* 会员信息显示和编辑 */}
                {editingCustomer && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">会员信息</h3>
                    {(() => {
                      const customerMember = members.find(m => m.customerId === editingCustomer.id);
                      if (customerMember) {
                        return (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="label">会员等级</label>
                                <select
                                  value={customerMember.tier}
                                  onChange={async (e) => {
                                    try {
                                      const updatedMember = {
                                        ...customerMember,
                                        tier: e.target.value as MembershipTier,
                                        updatedAt: new Date()
                                      };
                                      await membersService.update(customerMember.id, updatedMember);
                                      setMembers(members.map(m => m.id === customerMember.id ? updatedMember : m));
                                      alert('会员等级更新成功！');
                                    } catch (error) {
                                      console.error('更新会员等级失败:', error);
                                      alert('更新失败，请重试');
                                    }
                                  }}
                                  className="input"
                                >
                                  <option value="regular">普通会员</option>
                                  <option value="vip">VIP会员</option>
                                  <option value="svip">SVIP会员</option>
                                  <option value="project">专案会员</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">积分</label>
                                <input
                                  type="number"
                                  value={customerMember.points}
                                  onChange={async (e) => {
                                    try {
                                      const updatedMember = {
                                        ...customerMember,
                                        points: parseInt(e.target.value) || 0,
                                        updatedAt: new Date()
                                      };
                                      await membersService.update(customerMember.id, updatedMember);
                                      setMembers(members.map(m => m.id === customerMember.id ? updatedMember : m));
                                    } catch (error) {
                                      console.error('更新积分失败:', error);
                                      alert('更新失败，请重试');
                                    }
                                  }}
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="label">累计消费</label>
                                <input
                                  type="number"
                                  value={customerMember.totalSpent}
                                  className="input"
                                  disabled
                                />
                              </div>
                              <div>
                                <label className="label">会员状态</label>
                                <select
                                  value={customerMember.status}
                                  onChange={async (e) => {
                                    try {
                                      const updatedMember = {
                                        ...customerMember,
                                        status: e.target.value as 'active' | 'inactive' | 'suspended',
                                        updatedAt: new Date()
                                      };
                                      await membersService.update(customerMember.id, updatedMember);
                                      setMembers(members.map(m => m.id === customerMember.id ? updatedMember : m));
                                      alert('会员状态更新成功！');
                                    } catch (error) {
                                      console.error('更新会员状态失败:', error);
                                      alert('更新失败，请重试');
                                    }
                                  }}
                                  className="input"
                                >
                                  <option value="active">正常</option>
                                  <option value="inactive">非活跃</option>
                                  <option value="suspended">暂停</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-600 mb-3">此客户还不是会员</p>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const newMember: Member = {
                                    id: generateId(),
                                    memberNumber: `M${Date.now()}`,
                                    customerId: editingCustomer.id,
                                    customerName: editingCustomer.name,
                                    customerPhone: editingCustomer.phone,
                                    tier: 'regular',
                                    points: 0,
                                    totalSpent: 0,
                                    status: 'active',
                                    joinDate: new Date(),
                                    createdBy: 'system',
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                  };
                                  await membersService.add(newMember);
                                  setMembers([...members, newMember]);
                                  alert('客户已成功注册为普通会员！');
                                } catch (error) {
                                  console.error('注册会员失败:', error);
                                  alert('注册失败，请重试');
                                }
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              注册为普通会员
                            </button>
                          </div>
                        );
                      }
                    })()}
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

      {/* 会员管理模态框 */}
      {showMemberModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                管理会员等级 - {selectedCustomer.name}
              </h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">会员信息</h3>
                  <div className="text-sm text-blue-800">
                    {editingMember ? (
                      <div>
                        <p>会员等级: {editingMember.tier}</p>
                        <p>会员编号: {editingMember.memberNumber}</p>
                        <p>积分: {editingMember.points}</p>
                        <p>总消费: {editingMember.totalSpent}</p>
                      </div>
                    ) : (
                      <div>
                        <p>会员等级: 普通会员</p>
                        <p>会员编号: 自动生成</p>
                        <p>积分: 0</p>
                        <p>总消费: 0</p>
                        <p className="text-orange-600 mt-2">⚠️ 会员信息加载中，请刷新页面</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">可用会员等级</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tierConfigs.filter(config => config.isActive).map(config => (
                      <div key={config.tier} className="text-sm text-green-800">
                        <span className="font-medium">{config.name}</span> - {config.discountRate}%折扣, {config.pointsRate}倍积分
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberModal(false);
                    setEditingMember(null);
                    setSelectedCustomer(null);
                  }}
                  className="btn btn-secondary"
                >
                  关闭
                </button>
                {editingMember && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('确定要删除此会员信息吗？')) {
                        // 这里可以添加删除会员的逻辑
                        alert('删除功能开发中...');
                      }
                    }}
                    className="btn btn-danger"
                  >
                    删除会员
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 沟通记录模态框 */}
      {showCommunicationModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingCommunication ? '编辑沟通记录' : '添加沟通记录'} - {selectedCustomer.name}
              </h2>
              
              <form onSubmit={handleCommunicationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">沟通类型 *</label>
                    <select
                      value={communicationFormData.type}
                      onChange={(e) => setCommunicationFormData({ ...communicationFormData, type: e.target.value as any })}
                      className="input"
                      required
                    >
                      <option value="phone">电话</option>
                      <option value="email">邮件</option>
                      <option value="meeting">面谈</option>
                      <option value="wechat">微信</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">下次跟进日期</label>
                    <input
                      type="date"
                      value={communicationFormData.nextFollowUp}
                      onChange={(e) => setCommunicationFormData({ ...communicationFormData, nextFollowUp: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">沟通主题 *</label>
                  <input
                    type="text"
                    value={communicationFormData.subject}
                    onChange={(e) => setCommunicationFormData({ ...communicationFormData, subject: e.target.value })}
                    className="input"
                    placeholder="请输入沟通主题"
                    required
                  />
                </div>

                <div>
                  <label className="label">沟通内容 *</label>
                  <textarea
                    value={communicationFormData.content}
                    onChange={(e) => setCommunicationFormData({ ...communicationFormData, content: e.target.value })}
                    className="input"
                    rows={4}
                    placeholder="请详细描述沟通内容"
                    required
                  />
                </div>

                <div>
                  <label className="label">沟通结果</label>
                  <textarea
                    value={communicationFormData.result}
                    onChange={(e) => setCommunicationFormData({ ...communicationFormData, result: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="请描述沟通结果或达成的共识"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommunicationModal(false);
                      setEditingCommunication(null);
                      setSelectedCustomer(null);
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCommunication ? '更新记录' : '添加记录'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 跟进任务模态框 */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingFollowUp ? '编辑跟进任务' : '添加跟进任务'}
                {editingFollowUp && ` - ${editingFollowUp.customerName}`}
                {!editingFollowUp && selectedCustomer && ` - ${selectedCustomer.name}`}
              </h2>
              
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">任务类型 *</label>
                    <select
                      value={followUpFormData.type}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, type: e.target.value as any })}
                      className="input"
                      required
                    >
                      <option value="call">电话</option>
                      <option value="email">邮件</option>
                      <option value="meeting">面谈</option>
                      <option value="visit">拜访</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">优先级 *</label>
                    <select
                      value={followUpFormData.priority}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, priority: e.target.value as any })}
                      className="input"
                      required
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">紧急</option>
                    </select>
                  </div>
                </div>

                {/* 客户选择（仅在添加新任务时显示） */}
                {!editingFollowUp && (
                  <div>
                    <label className="label">选择客户 *</label>
                    <select
                      value={followUpFormData.customerId}
                      onChange={(e) => {
                        const selectedCustomer = customers.find(c => c.id === e.target.value);
                        setFollowUpFormData({ 
                          ...followUpFormData, 
                          customerId: e.target.value,
                          customerName: selectedCustomer?.name || ''
                        });
                      }}
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
                )}

                <div>
                  <label className="label">任务标题 *</label>
                  <input
                    type="text"
                    value={followUpFormData.title}
                    onChange={(e) => setFollowUpFormData({ ...followUpFormData, title: e.target.value })}
                    className="input"
                    placeholder="请输入任务标题"
                    required
                  />
                </div>

                <div>
                  <label className="label">任务描述 *</label>
                  <textarea
                    value={followUpFormData.description}
                    onChange={(e) => setFollowUpFormData({ ...followUpFormData, description: e.target.value })}
                    className="input"
                    rows={4}
                    placeholder="请详细描述跟进任务内容"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">截止日期 *</label>
                    <input
                      type="date"
                      value={followUpFormData.dueDate}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, dueDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">负责人</label>
                    <input
                      type="text"
                      value={followUpFormData.assignedTo}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, assignedTo: e.target.value })}
                      className="input"
                      placeholder="请输入负责人"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFollowUpModal(false);
                      setEditingFollowUp(null);
                      setSelectedCustomer(null);
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingFollowUp ? '更新任务' : '添加任务'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 价值分析模态框 */}
      {showAnalysisModal && selectedAnalysisCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                客户价值分析 - {selectedAnalysisCustomer.name}
              </h2>
              
              {(() => {
                const analysis = valueAnalyses.find(a => a.customerId === selectedAnalysisCustomer.id);
                if (!analysis) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
                      <p>暂无分析数据</p>
                      <p className="text-sm mt-2">请先为这位客户生成价值分析</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* 客户基本信息 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">客户基本信息</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">客户名称：</span>
                          <span className="font-medium">{analysis.customerName}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">客户细分：</span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSegmentColor(analysis.customerSegment)}`}>
                            {getSegmentLabel(analysis.customerSegment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">RFM评分：</span>
                          <span className="font-medium">{analysis.rfmScore}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">风险等级：</span>
                          <span className={`font-medium ${
                            analysis.riskLevel === 'high' ? 'text-red-600' : 
                            analysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {analysis.riskLevel === 'high' ? '高' : analysis.riskLevel === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 消费统计 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600">总消费金额</div>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(analysis.totalSpent)}</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600">订单数量</div>
                        <div className="text-2xl font-bold text-blue-700">{analysis.totalOrders} 笔</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-purple-600">平均订单价值</div>
                        <div className="text-2xl font-bold text-purple-700">{formatCurrency(analysis.averageOrderValue)}</div>
                      </div>
                    </div>

                    {/* 行为分析 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">最近购买</div>
                        <div className="text-lg font-semibold">{format(analysis.lastPurchaseDate, 'yyyy-MM-dd')}</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">购买频次</div>
                        <div className="text-lg font-semibold">{analysis.purchaseFrequency.toFixed(1)} 次/月</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">客户生命周期价值</div>
                        <div className="text-lg font-semibold">{formatCurrency(analysis.customerLifetimeValue)}</div>
                      </div>
                    </div>

                    {/* RFM详细评分 */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">RFM详细评分</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">最近购买 (R)</div>
                          <div className="text-3xl font-bold text-blue-600">{analysis.recencyScore}</div>
                          <div className="text-xs text-gray-500">
                            {analysis.recencyScore >= 4 ? '近期活跃' : analysis.recencyScore >= 3 ? '中等活跃' : '长期未购买'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {analysis.daysSinceLastPurchase === 0 ? '今天注册' : `${analysis.daysSinceLastPurchase}天前购买`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">购买频次 (F)</div>
                          <div className="text-3xl font-bold text-green-600">{analysis.frequencyScore}</div>
                          <div className="text-xs text-gray-500">
                            {analysis.frequencyScore >= 4 ? '高频购买' : analysis.frequencyScore >= 3 ? '中频购买' : '低频购买'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {analysis.purchaseFrequency.toFixed(1)}次/月 ({analysis.totalOrders}笔订单)
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">购买金额 (M)</div>
                          <div className="text-3xl font-bold text-purple-600">{analysis.monetaryScore}</div>
                          <div className="text-xs text-gray-500">
                            {analysis.monetaryScore >= 4 ? '高价值客户' : analysis.monetaryScore >= 3 ? '中等价值' : '低价值客户'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            总消费{formatCurrency(analysis.totalSpent)}
                          </div>
                        </div>
                      </div>
                      
                      {/* RFM评分标准说明 */}
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">评分标准说明</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white p-2 rounded">
                            <div className="font-medium text-blue-600 mb-1">最近购买 (R)</div>
                            <div className="text-gray-600">
                              5分: ≤30天 | 4分: 31-90天<br/>
                              3分: 91-180天 | 2分: 181-365天<br/>
                              1分: &gt;365天
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <div className="font-medium text-green-600 mb-1">购买频次 (F)</div>
                            <div className="text-gray-600">
                              5分: ≥2次/月 | 4分: 1次/月<br/>
                              3分: 0.5次/月 | 2分: 0.25次/月<br/>
                              1分: &lt;0.25次/月
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <div className="font-medium text-purple-600 mb-1">购买金额 (M)</div>
                            <div className="text-gray-600">
                              5分: ≥RM 10,000 | 4分: RM 5,000-9,999<br/>
                              3分: RM 2,000-4,999 | 2分: RM 1,000-1,999<br/>
                              1分: &lt;RM 1,000
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 建议行动 */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">建议行动</h3>
                      <div className="text-gray-800">{analysis.nextAction}</div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          setShowAnalysisModal(false);
                          setSelectedAnalysisCustomer(null);
                        }}
                        className="btn btn-secondary"
                      >
                        关闭
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const analysis = calculateCustomerValue(selectedAnalysisCustomer);
                            const existingAnalysis = valueAnalyses.find(a => a.customerId === selectedAnalysisCustomer.id);
                            if (existingAnalysis) {
                              await customerValueAnalysesService.update({ ...analysis, createdAt: existingAnalysis.createdAt });
                            } else {
                              await customerValueAnalysesService.add(analysis);
                            }
                            await loadData();
                            alert('分析已更新！');
                          } catch (error) {
                            console.error('更新分析失败:', error);
                            alert('更新失败，请重试');
                          }
                        }}
                        className="btn btn-primary"
                      >
                        重新分析
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
