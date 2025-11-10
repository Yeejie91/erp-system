import { User, UserRole, Permission } from '../types';
import { usersService, generateId } from './db';

// 简单的密码哈希（生产环境应使用bcrypt等库）
function hashPassword(password: string): string {
  // 简单的哈希，实际应使用更安全的方式
  return btoa(password + 'salt-erp-2024');
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// 根据角色获取默认权限
export function getDefaultPermissions(role: UserRole): Permission {
  switch (role) {
    case UserRole.OWNER:
      // 老板：全部权限
      return {
        viewProducts: true,
        addProduct: true,
        editProduct: true,
        deleteProduct: true,
        viewInventory: true,
        adjustInventory: true,
        viewInvoices: true,
        createInvoice: true,
        cancelInvoice: true,
        deleteInvoice: true,
        viewRefunds: true,
        createRefund: true,
        approveRefund: true,
        completeRefund: true,
        viewReceivables: true,
        editReceivables: true,
        viewPayables: true,
        editPayables: true,
        viewFinance: true,
        editFinance: true,
        viewReports: true,
        viewCustomers: true,
        editCustomers: true,
        viewSuppliers: true,
        editSuppliers: true,
        manageUsers: true,
        viewLogs: true,
        exportData: true,
        importData: true,
      };
    
    case UserRole.MANAGER:
      // 经理：大部分权限，不能管理用户
      return {
        viewProducts: true,
        addProduct: true,
        editProduct: true,
        deleteProduct: true,
        viewInventory: true,
        adjustInventory: true,
        viewInvoices: true,
        createInvoice: true,
        cancelInvoice: true,
        deleteInvoice: false, // 不能永久删除
        viewRefunds: true,
        createRefund: true,
        approveRefund: true,
        completeRefund: true,
        viewReceivables: true,
        editReceivables: true,
        viewPayables: true,
        editPayables: true,
        viewFinance: true,
        editFinance: true,
        viewReports: true,
        viewCustomers: true,
        editCustomers: true,
        viewSuppliers: true,
        editSuppliers: true,
        manageUsers: false, // 不能管理用户
        viewLogs: true,
        exportData: true,
        importData: false,
      };
    
    case UserRole.CASHIER:
      // 收银员：开单、收款
      return {
        viewProducts: true,
        addProduct: false,
        editProduct: false,
        deleteProduct: false,
        viewInventory: true,
        adjustInventory: false,
        viewInvoices: true,
        createInvoice: true,
        cancelInvoice: false,
        deleteInvoice: false,
        viewRefunds: true,
        createRefund: true,
        approveRefund: false,
        completeRefund: false,
        viewReceivables: true,
        editReceivables: true, // 可以收款
        viewPayables: false,
        editPayables: false,
        viewFinance: false,
        editFinance: false,
        viewReports: false,
        viewCustomers: true,
        editCustomers: true, // 可以添加客户
        viewSuppliers: false,
        editSuppliers: false,
        manageUsers: false,
        viewLogs: false,
        exportData: false,
        importData: false,
      };
    
    case UserRole.WAREHOUSE:
      // 仓管员：库存管理
      return {
        viewProducts: true,
        addProduct: true,
        editProduct: true,
        deleteProduct: false,
        viewInventory: true,
        adjustInventory: true,
        viewInvoices: true,
        createInvoice: false,
        cancelInvoice: false,
        deleteInvoice: false,
        viewRefunds: true,
        createRefund: false,
        approveRefund: false,
        completeRefund: true, // 仓管负责实际入库
        viewReceivables: false,
        editReceivables: false,
        viewPayables: true,
        editPayables: true, // 可以管理供应商付款
        viewFinance: false,
        editFinance: false,
        viewReports: false,
        viewCustomers: true,
        editCustomers: false,
        viewSuppliers: true,
        editSuppliers: true,
        manageUsers: false,
        viewLogs: false,
        exportData: false,
        importData: false,
      };
    
    case UserRole.STAFF:
      // 普通员工：只能查看
      return {
        viewProducts: true,
        addProduct: false,
        editProduct: false,
        deleteProduct: false,
        viewInventory: true,
        adjustInventory: false,
        viewInvoices: true,
        createInvoice: false,
        cancelInvoice: false,
        deleteInvoice: false,
        viewRefunds: true,
        createRefund: false,
        approveRefund: false,
        completeRefund: false,
        viewReceivables: false,
        editReceivables: false,
        viewPayables: false,
        editPayables: false,
        viewFinance: false,
        editFinance: false,
        viewReports: false,
        viewCustomers: true,
        editCustomers: false,
        viewSuppliers: false,
        editSuppliers: false,
        manageUsers: false,
        viewLogs: false,
        exportData: false,
        importData: false,
      };
    
    default:
      // 默认：无权限
      return {
        viewProducts: false,
        addProduct: false,
        editProduct: false,
        deleteProduct: false,
        viewInventory: false,
        adjustInventory: false,
        viewInvoices: false,
        createInvoice: false,
        cancelInvoice: false,
        deleteInvoice: false,
        viewRefunds: false,
        createRefund: false,
        approveRefund: false,
        completeRefund: false,
        viewReceivables: false,
        editReceivables: false,
        viewPayables: false,
        editPayables: false,
        viewFinance: false,
        editFinance: false,
        viewReports: false,
        viewCustomers: false,
        editCustomers: false,
        viewSuppliers: false,
        editSuppliers: false,
        manageUsers: false,
        viewLogs: false,
        exportData: false,
        importData: false,
      };
  }
}

// 用户登录
export async function login(username: string, password: string): Promise<User | null> {
  try {
    const users = await usersService.getAll();
    const user = users.find(u => u.username === username && u.status === 'active');
    
    if (!user) {
      return null;
    }
    
    if (!verifyPassword(password, user.password)) {
      return null;
    }
    
    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await usersService.update(user);
    
    return user;
  } catch (error) {
    console.error('登录失败:', error);
    return null;
  }
}

// 创建用户
export async function createUser(userData: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
}): Promise<User> {
  const newUser: User = {
    id: generateId(),
    username: userData.username,
    password: hashPassword(userData.password),
    name: userData.name,
    role: userData.role,
    permissions: getDefaultPermissions(userData.role),
    phone: userData.phone,
    email: userData.email,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await usersService.add(newUser);
  return newUser;
}

// 修改密码
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    const user = await usersService.getById(userId);
    if (!user) {
      return false;
    }
    
    if (!verifyPassword(oldPassword, user.password)) {
      return false;
    }
    
    user.password = hashPassword(newPassword);
    user.updatedAt = new Date();
    await usersService.update(user);
    
    return true;
  } catch (error) {
    console.error('修改密码失败:', error);
    return false;
  }
}

// 初始化默认管理员账户
export async function initDefaultAdmin(): Promise<void> {
  try {
    const users = await usersService.getAll();
    
    // 如果已有用户，不再创建
    if (users.length > 0) {
      return;
    }
    
    // 创建默认管理员账户
    const adminUser: User = {
      id: generateId(),
      username: 'admin',
      password: hashPassword('admin123'), // 默认密码
      name: '系统管理员',
      role: UserRole.OWNER,
      permissions: getDefaultPermissions(UserRole.OWNER),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await usersService.add(adminUser);
    console.log('已创建默认管理员账户: admin / admin123');
  } catch (error) {
    console.error('初始化管理员账户失败:', error);
  }
}

// 获取角色显示名称
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    [UserRole.OWNER]: '老板',
    [UserRole.MANAGER]: '经理',
    [UserRole.CASHIER]: '收银员',
    [UserRole.WAREHOUSE]: '仓管员',
    [UserRole.STAFF]: '普通员工',
  };
  return labels[role] || role;
}

// 重置密码（管理员功能）
export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const user = await usersService.getById(userId);
    if (!user) {
      return false;
    }
    
    user.password = hashPassword(newPassword);
    user.updatedAt = new Date();
    await usersService.update(user);
    
    return true;
  } catch (error) {
    console.error('重置密码失败:', error);
    return false;
  }
}

