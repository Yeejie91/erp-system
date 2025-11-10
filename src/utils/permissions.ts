import { UserRole } from '../types';

// 权限配置
export const PERMISSIONS = {
  // 销售管理
  SALES: {
    VIEW: 'sales:view',
    CREATE: 'sales:create',
    UPDATE: 'sales:update',
    DELETE: 'sales:delete',
    CANCEL: 'sales:cancel',
    PRINT: 'sales:print'
  },
  
  // 库存管理
  INVENTORY: {
    VIEW: 'inventory:view',
    CREATE: 'inventory:create',
    UPDATE: 'inventory:update',
    DELETE: 'inventory:delete',
    ADJUST: 'inventory:adjust'
  },
  
  // 商品管理
  PRODUCTS: {
    VIEW: 'products:view',
    CREATE: 'products:create',
    UPDATE: 'products:update',
    DELETE: 'products:delete'
  },
  
  // 客户管理
  CUSTOMERS: {
    VIEW: 'customers:view',
    CREATE: 'customers:create',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
    ANALYZE: 'customers:analyze'
  },
  
  // 供应商管理
  SUPPLIERS: {
    VIEW: 'suppliers:view',
    CREATE: 'suppliers:create',
    UPDATE: 'suppliers:update',
    DELETE: 'suppliers:delete'
  },
  
  // 采购管理
  PURCHASES: {
    VIEW: 'purchases:view',
    CREATE: 'purchases:create',
    UPDATE: 'purchases:update',
    DELETE: 'purchases:delete'
  },
  
  // 财务管理
  FINANCE: {
    VIEW: 'finance:view',
    CREATE: 'finance:create',
    UPDATE: 'finance:update',
    DELETE: 'finance:delete'
  },
  
  // 报表管理
  REPORTS: {
    VIEW: 'reports:view',
    EXPORT: 'reports:export'
  },
  
  // 用户管理
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete'
  },
  
  // 系统设置
  SETTINGS: {
    VIEW: 'settings:view',
    UPDATE: 'settings:update'
  },
  
  // 活动管理
  ACTIVITIES: {
    VIEW: 'activities:view',
    CREATE: 'activities:create',
    UPDATE: 'activities:update',
    DELETE: 'activities:delete',
    RESERVE: 'activities:reserve'
  },
  
  // 空间管理
  SPACES: {
    VIEW: 'spaces:view',
    CREATE: 'spaces:create',
    UPDATE: 'spaces:update',
    DELETE: 'spaces:delete',
    BOOK: 'spaces:book'
  },
  
  // 商品预留
  RESERVATIONS: {
    VIEW: 'reservations:view',
    CREATE: 'reservations:create',
    UPDATE: 'reservations:update',
    DELETE: 'reservations:delete'
  },
  
  // 展览库存
  EXHIBITION_STOCK: {
    VIEW: 'exhibition:view',
    CREATE: 'exhibition:create',
    UPDATE: 'exhibition:update',
    DELETE: 'exhibition:delete'
  }
};

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.OWNER]: [
    // 所有者拥有所有权限
    ...Object.values(PERMISSIONS.SALES),
    ...Object.values(PERMISSIONS.INVENTORY),
    ...Object.values(PERMISSIONS.PRODUCTS),
    ...Object.values(PERMISSIONS.CUSTOMERS),
    ...Object.values(PERMISSIONS.SUPPLIERS),
    ...Object.values(PERMISSIONS.PURCHASES),
    ...Object.values(PERMISSIONS.FINANCE),
    ...Object.values(PERMISSIONS.REPORTS),
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.SETTINGS),
    ...Object.values(PERMISSIONS.ACTIVITIES),
    ...Object.values(PERMISSIONS.SPACES),
    ...Object.values(PERMISSIONS.RESERVATIONS),
    ...Object.values(PERMISSIONS.EXHIBITION_STOCK)
  ],
  
  [UserRole.MANAGER]: [
    // 经理权限 - 除用户管理外的所有权限
    ...Object.values(PERMISSIONS.SALES),
    ...Object.values(PERMISSIONS.INVENTORY),
    ...Object.values(PERMISSIONS.PRODUCTS),
    ...Object.values(PERMISSIONS.CUSTOMERS),
    ...Object.values(PERMISSIONS.SUPPLIERS),
    ...Object.values(PERMISSIONS.PURCHASES),
    ...Object.values(PERMISSIONS.FINANCE),
    ...Object.values(PERMISSIONS.REPORTS),
    ...Object.values(PERMISSIONS.ACTIVITIES),
    ...Object.values(PERMISSIONS.SPACES),
    ...Object.values(PERMISSIONS.RESERVATIONS),
    ...Object.values(PERMISSIONS.EXHIBITION_STOCK),
    PERMISSIONS.SETTINGS.VIEW
  ],
  
  [UserRole.CASHIER]: [
    // 收银员权限 - 销售和客户相关
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.SALES.CREATE,
    PERMISSIONS.SALES.UPDATE,
    PERMISSIONS.SALES.PRINT,
    PERMISSIONS.CUSTOMERS.VIEW,
    PERMISSIONS.CUSTOMERS.CREATE,
    PERMISSIONS.CUSTOMERS.UPDATE,
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.REPORTS.VIEW
  ],
  
  [UserRole.WAREHOUSE]: [
    // 仓库管理员权限 - 库存和商品相关
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.INVENTORY.CREATE,
    PERMISSIONS.INVENTORY.UPDATE,
    PERMISSIONS.INVENTORY.ADJUST,
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.PRODUCTS.CREATE,
    PERMISSIONS.PRODUCTS.UPDATE,
    PERMISSIONS.PURCHASES.VIEW,
    PERMISSIONS.PURCHASES.CREATE,
    PERMISSIONS.PURCHASES.UPDATE,
    PERMISSIONS.SUPPLIERS.VIEW,
    PERMISSIONS.SUPPLIERS.CREATE,
    PERMISSIONS.SUPPLIERS.UPDATE,
    PERMISSIONS.RESERVATIONS.VIEW,
    PERMISSIONS.RESERVATIONS.CREATE,
    PERMISSIONS.RESERVATIONS.UPDATE,
    PERMISSIONS.EXHIBITION_STOCK.VIEW,
    PERMISSIONS.EXHIBITION_STOCK.CREATE,
    PERMISSIONS.EXHIBITION_STOCK.UPDATE,
    PERMISSIONS.REPORTS.VIEW
  ],
  
  [UserRole.STAFF]: [
    // 普通员工权限 - 基础查看权限
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.CUSTOMERS.VIEW,
    PERMISSIONS.CUSTOMERS.CREATE,
    PERMISSIONS.CUSTOMERS.UPDATE,
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.ACTIVITIES.VIEW,
    PERMISSIONS.SPACES.VIEW,
    PERMISSIONS.REPORTS.VIEW
  ]
};

// 权限检查函数
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

// 权限检查Hook
export function usePermissions(userRole: UserRole) {
  return {
    hasPermission: (permission: string) => hasPermission(userRole, permission),
    canView: (module: string) => hasPermission(userRole, `${module}:view`),
    canCreate: (module: string) => hasPermission(userRole, `${module}:create`),
    canUpdate: (module: string) => hasPermission(userRole, `${module}:update`),
    canDelete: (module: string) => hasPermission(userRole, `${module}:delete`),
  };
}

// 角色标签
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: '所有者',
  [UserRole.MANAGER]: '经理',
  [UserRole.CASHIER]: '收银员',
  [UserRole.WAREHOUSE]: '仓库管理员',
  [UserRole.STAFF]: '员工'
};

// 角色颜色
export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'bg-red-100 text-red-800',
  [UserRole.MANAGER]: 'bg-blue-100 text-blue-800',
  [UserRole.CASHIER]: 'bg-green-100 text-green-800',
  [UserRole.WAREHOUSE]: 'bg-yellow-100 text-yellow-800',
  [UserRole.STAFF]: 'bg-gray-100 text-gray-800'
};
