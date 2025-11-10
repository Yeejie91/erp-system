import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Calendar,
  Users,
  Building2,
  Menu,
  X,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  BarChart3,
  User,
  LogOut,
  Settings,
  Shield,
  ScrollText,
  RotateCcw,
  Receipt,
  CreditCard,
  MapPin,
  CalendarCheck,
  CalendarDays,
  Award,
  MessageSquare,
  Target,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import ExportModal from './ExportModal';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../services/auth';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  name: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navStructure: (NavItem | NavGroup)[] = [
  { name: '仪表盘', path: '/', icon: <LayoutDashboard size={20} /> },
      {
        name: '商品库存',
        icon: <Package size={20} />,
        items: [
          { name: '商品管理', path: '/products', icon: <Package size={18} /> },
          { name: '库存管理', path: '/inventory', icon: <Warehouse size={18} /> },
          { name: '商品预留', path: '/product-reservations', icon: <Calendar size={18} /> },
          { name: '展览库存', path: '/exhibition-stock', icon: <Calendar size={18} /> },
        ],
      },
  {
    name: '交易管理',
    icon: <ShoppingCart size={20} />,
    items: [
      { name: '进货管理', path: '/purchases', icon: <TrendingUp size={18} /> },
      { name: '出货管理', path: '/sales', icon: <TrendingDown size={18} /> },
      { name: '开单管理', path: '/invoices', icon: <FileText size={18} /> },
      { name: '退货管理', path: '/refunds', icon: <RotateCcw size={18} /> },
    ],
  },
  {
    name: '业务管理',
    icon: <Calendar size={20} />,
    items: [
      { name: '活动管理', path: '/activities', icon: <Calendar size={18} /> },
      { name: '空间管理', path: '/spaces', icon: <MapPin size={18} /> },
      { name: '空间预订', path: '/space-bookings', icon: <CalendarCheck size={18} /> },
      { name: '财务管理', path: '/finance', icon: <DollarSign size={18} /> },
      { name: '销售报表', path: '/reports', icon: <BarChart3 size={18} /> },
      { name: '应收账款', path: '/accounts-receivable', icon: <Receipt size={18} /> },
      { name: '应付账款', path: '/accounts-payable', icon: <CreditCard size={18} /> },
    ],
  },
      {
        name: '客户管理',
        icon: <Users size={20} />,
        items: [
          { name: '客户关系管理', path: '/customers', icon: <Users size={18} /> },
          { name: '会员管理', path: '/members', icon: <Award size={18} /> },
          { name: '会员等级配置', path: '/membership-tier-config', icon: <Settings size={18} /> },
          { name: '供应商管理', path: '/suppliers', icon: <Building2 size={18} /> },
        ],
      },
  {
    name: '系统管理',
    icon: <Settings size={20} />,
    items: [
      { name: '系统设置', path: '/system-settings', icon: <Settings size={18} /> },
      { name: '设置演示', path: '/system-settings-demo', icon: <BarChart3 size={18} /> },
      { name: '数据备份', path: '/data-backup', icon: <Upload size={18} /> },
      { name: '用户管理', path: '/users', icon: <Shield size={18} /> },
      { name: '操作日志', path: '/logs', icon: <ScrollText size={18} /> },
      { name: '日历管理', path: '/calendar-management', icon: <CalendarDays size={18} /> },
    ],
  },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'items' in item;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['商品库存', '交易管理', '业务管理', '基础数据', '系统管理']);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const { importData } = await import('../services/db');
        await importData(text);
        alert('数据导入成功！页面将刷新。');
        window.location.reload();
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-xl font-bold text-primary-600">企业ERP系统</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} />
              <span className="hidden sm:inline">导出Excel</span>
            </button>
            <button
              onClick={handleImport}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">导入数据</span>
            </button>
            
            {/* 用户信息菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <User size={16} />
                <span className="hidden md:inline">{user?.username}</span>
                <ChevronDown size={14} />
              </button>
              
              {/* 下拉菜单 */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                      <p className="text-xs text-gray-500 mt-1">{user && getRoleLabel(user.role)}</p>
                      <p className="text-xs text-gray-400 mt-1">@{user?.username}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      <span>退出登录</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* 侧边栏 */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200
            transform transition-transform duration-200 ease-in-out mt-16 lg:mt-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1">
            {navStructure.map((item, index) => {
              if (isNavGroup(item)) {
                const isExpanded = expandedGroups.includes(item.name);
                const hasActiveChild = item.items.some(child => child.path === location.pathname);
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                        ${hasActiveChild ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.items.map((child) => {
                          const isActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm
                                ${
                                  isActive
                                    ? 'bg-primary-100 text-primary-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }
                              `}
                            >
                              {child.icon}
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                      ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              }
            })}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 p-6 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden mt-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 导出模态框 */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
}

