import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Product,
  Customer,
  Supplier,
  Activity,
  StockTransaction,
  PurchaseOrder,
  SalesOrder,
  FinanceRecord,
  Employee,
  Invoice,
  User,
  OperationLog,
  RefundOrder,
  AccountReceivable,
  AccountPayable,
  PaymentRecord,
  PaymentOutRecord,
  Space,
  ProductReservation,
  ExhibitionStock,
  SpaceBooking,
  CalendarEvent,
  Member,
  PointTransaction,
  MembershipTierConfig,
  MembershipTier,
  CustomerCommunication,
  CustomerFollowUp,
  CustomerTag,
  CustomerTagRelation,
  CustomerValueAnalysis
} from '../types';

// 数据库架构定义
interface ERPDatabase extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-category': string; 'by-sku': string };
  };
  customers: {
    key: string;
    value: Customer;
  };
  suppliers: {
    key: string;
    value: Supplier;
  };
  activities: {
    key: string;
    value: Activity;
    indexes: { 'by-type': string; 'by-status': string };
  };
  stockTransactions: {
    key: string;
    value: StockTransaction;
    indexes: { 'by-product': string; 'by-date': Date };
  };
  purchaseOrders: {
    key: string;
    value: PurchaseOrder;
    indexes: { 'by-supplier': string; 'by-status': string };
  };
  salesOrders: {
    key: string;
    value: SalesOrder;
    indexes: { 'by-customer': string; 'by-status': string };
  };
  financeRecords: {
    key: string;
    value: FinanceRecord;
    indexes: { 'by-type': string; 'by-date': Date };
  };
  employees: {
    key: string;
    value: Employee;
  };
  invoices: {
    key: string;
    value: Invoice;
    indexes: { 'by-customer': string; 'by-status': string; 'by-date': Date };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-username': string; 'by-role': string };
  };
  operationLogs: {
    key: string;
    value: OperationLog;
    indexes: { 'by-user': string; 'by-module': string; 'by-date': Date };
  };
  refundOrders: {
    key: string;
    value: RefundOrder;
    indexes: { 'by-invoice': string; 'by-customer': string; 'by-status': string; 'by-date': Date };
  };
  accountsReceivable: {
    key: string;
    value: AccountReceivable;
    indexes: { 'by-customer': string; 'by-status': string; 'by-dueDate': Date };
  };
  accountsPayable: {
    key: string;
    value: AccountPayable;
    indexes: { 'by-supplier': string; 'by-status': string; 'by-dueDate': Date };
  };
  paymentRecords: {
    key: string;
    value: PaymentRecord;
    indexes: { 'by-account': string; 'by-date': Date };
  };
  paymentOutRecords: {
    key: string;
    value: PaymentOutRecord;
    indexes: { 'by-account': string; 'by-date': Date };
  };
  spaces: {
    key: string;
    value: Space;
    indexes: { 'by-type': string; 'by-status': string };
  };
  spaceBookings: {
    key: string;
    value: SpaceBooking;
    indexes: { 'by-space': string; 'by-customer': string; 'by-status': string; 'by-date': Date };
  };
  calendarEvents: {
    key: string;
    value: CalendarEvent;
    indexes: { 'by-type': string; 'by-date': Date };
  };
  members: {
    key: string;
    value: Member;
    indexes: { 'by-customer': string; 'by-tier': string; 'by-status': string; 'by-number': string };
  };
  pointTransactions: {
    key: string;
    value: PointTransaction;
    indexes: { 'by-member': string; 'by-date': Date };
  };
  membershipTierConfigs: {
    key: string;
    value: MembershipTierConfig;
    indexes: { 'by-tier': string; 'by-active': boolean };
  };
  customerCommunications: {
    key: string;
    value: CustomerCommunication;
    indexes: { 'by-customer': string; 'by-type': string; 'by-date': Date };
  };
  customerFollowUps: {
    key: string;
    value: CustomerFollowUp;
    indexes: { 'by-customer': string; 'by-status': string; 'by-due-date': Date; 'by-assigned': string };
  };
  customerTags: {
    key: string;
    value: CustomerTag;
    indexes: { 'by-name': string };
  };
  customerTagRelations: {
    key: string;
    value: CustomerTagRelation;
    indexes: { 'by-customer': string; 'by-tag': string };
  };
  customerValueAnalyses: {
    key: string;
    value: CustomerValueAnalysis;
    indexes: { 'by-customer': string; 'by-segment': string; 'by-risk': string };
  };
  productReservations: {
    key: string;
    value: ProductReservation;
    indexes: { 'by-product': string; 'by-customer': string; 'by-status': string; 'by-date': Date };
  };
  exhibitionStock: {
    key: string;
    value: ExhibitionStock;
    indexes: { 'by-product': string; 'by-status': string; 'by-date': Date };
  };
}

const DB_NAME = 'ERPSystem';
const DB_VERSION = 10;

let dbInstance: IDBPDatabase<ERPDatabase> | null = null;

// 初始化数据库
export async function initDB(): Promise<IDBPDatabase<ERPDatabase>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<ERPDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建商品表
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'category');
        productStore.createIndex('by-sku', 'sku');
      }

      // 创建客户表
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }

      // 创建供应商表
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' });
      }

      // 创建活动表
      if (!db.objectStoreNames.contains('activities')) {
        const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
        activityStore.createIndex('by-type', 'type');
        activityStore.createIndex('by-status', 'status');
      }

      // 创建库存交易表
      if (!db.objectStoreNames.contains('stockTransactions')) {
        const stockStore = db.createObjectStore('stockTransactions', { keyPath: 'id' });
        stockStore.createIndex('by-product', 'productId');
        stockStore.createIndex('by-date', 'createdAt');
      }

      // 创建采购订单表
      if (!db.objectStoreNames.contains('purchaseOrders')) {
        const purchaseStore = db.createObjectStore('purchaseOrders', { keyPath: 'id' });
        purchaseStore.createIndex('by-supplier', 'supplierId');
        purchaseStore.createIndex('by-status', 'status');
      }

      // 创建销售订单表
      if (!db.objectStoreNames.contains('salesOrders')) {
        const salesStore = db.createObjectStore('salesOrders', { keyPath: 'id' });
        salesStore.createIndex('by-customer', 'customerId');
        salesStore.createIndex('by-status', 'status');
      }

      // 创建财务记录表
      if (!db.objectStoreNames.contains('financeRecords')) {
        const financeStore = db.createObjectStore('financeRecords', { keyPath: 'id' });
        financeStore.createIndex('by-type', 'type');
        financeStore.createIndex('by-date', 'date');
      }

      // 创建员工表
      if (!db.objectStoreNames.contains('employees')) {
        db.createObjectStore('employees', { keyPath: 'id' });
      }

      // 创建发票表
      if (!db.objectStoreNames.contains('invoices')) {
        const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' });
        invoiceStore.createIndex('by-customer', 'customerId');
        invoiceStore.createIndex('by-status', 'paymentStatus');
        invoiceStore.createIndex('by-date', 'createdAt');
      }

      // 创建用户表
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-username', 'username', { unique: true });
        userStore.createIndex('by-role', 'role');
      }

      // 创建操作日志表
      if (!db.objectStoreNames.contains('operationLogs')) {
        const logStore = db.createObjectStore('operationLogs', { keyPath: 'id' });
        logStore.createIndex('by-user', 'userId');
        logStore.createIndex('by-module', 'module');
        logStore.createIndex('by-date', 'createdAt');
      }

      // 创建退货单表
      if (!db.objectStoreNames.contains('refundOrders')) {
        const refundStore = db.createObjectStore('refundOrders', { keyPath: 'id' });
        refundStore.createIndex('by-invoice', 'invoiceId');
        refundStore.createIndex('by-customer', 'customerId');
        refundStore.createIndex('by-status', 'status');
        refundStore.createIndex('by-date', 'createdAt');
      }

      // 创建应收账款表
      if (!db.objectStoreNames.contains('accountsReceivable')) {
        const arStore = db.createObjectStore('accountsReceivable', { keyPath: 'id' });
        arStore.createIndex('by-customer', 'customerId');
        arStore.createIndex('by-status', 'status');
        arStore.createIndex('by-dueDate', 'dueDate');
      }

      // 创建应付账款表
      if (!db.objectStoreNames.contains('accountsPayable')) {
        const apStore = db.createObjectStore('accountsPayable', { keyPath: 'id' });
        apStore.createIndex('by-supplier', 'supplierId');
        apStore.createIndex('by-status', 'status');
        apStore.createIndex('by-dueDate', 'dueDate');
      }

      // 创建收款记录表
      if (!db.objectStoreNames.contains('paymentRecords')) {
        const prStore = db.createObjectStore('paymentRecords', { keyPath: 'id' });
        prStore.createIndex('by-account', 'accountId');
        prStore.createIndex('by-date', 'paymentDate');
      }

      // 创建付款记录表
      if (!db.objectStoreNames.contains('paymentOutRecords')) {
        const porStore = db.createObjectStore('paymentOutRecords', { keyPath: 'id' });
        porStore.createIndex('by-account', 'accountId');
        porStore.createIndex('by-date', 'paymentDate');
      }

      // 创建空间表
      if (!db.objectStoreNames.contains('spaces')) {
        const spaceStore = db.createObjectStore('spaces', { keyPath: 'id' });
        spaceStore.createIndex('by-type', 'type');
        spaceStore.createIndex('by-status', 'status');
      }

      // 创建空间预订表
      if (!db.objectStoreNames.contains('spaceBookings')) {
        const bookingStore = db.createObjectStore('spaceBookings', { keyPath: 'id' });
        bookingStore.createIndex('by-space', 'spaceId');
        bookingStore.createIndex('by-customer', 'customerId');
        bookingStore.createIndex('by-status', 'status');
        bookingStore.createIndex('by-date', 'startTime');
      }

      // 创建日历事件表
      if (!db.objectStoreNames.contains('calendarEvents')) {
        const eventStore = db.createObjectStore('calendarEvents', { keyPath: 'id' });
        eventStore.createIndex('by-type', 'type');
        eventStore.createIndex('by-date', 'date');
      }

      // 创建会员表
      if (!db.objectStoreNames.contains('members')) {
        const memberStore = db.createObjectStore('members', { keyPath: 'id' });
        memberStore.createIndex('by-customer', 'customerId');
        memberStore.createIndex('by-tier', 'tier');
        memberStore.createIndex('by-status', 'status');
        memberStore.createIndex('by-number', 'memberNumber', { unique: true });
      }

      // 创建积分交易表
      if (!db.objectStoreNames.contains('pointTransactions')) {
        const pointStore = db.createObjectStore('pointTransactions', { keyPath: 'id' });
        pointStore.createIndex('by-member', 'memberId');
        pointStore.createIndex('by-date', 'createdAt');
      }

      // 创建会员等级配置表
      if (!db.objectStoreNames.contains('membershipTierConfigs')) {
        const tierConfigStore = db.createObjectStore('membershipTierConfigs', { keyPath: 'id' });
        tierConfigStore.createIndex('by-tier', 'tier');
        tierConfigStore.createIndex('by-active', 'isActive');
      }

      // 创建CRM相关表
      if (!db.objectStoreNames.contains('customerCommunications')) {
        const commStore = db.createObjectStore('customerCommunications', { keyPath: 'id' });
        commStore.createIndex('by-customer', 'customerId');
        commStore.createIndex('by-type', 'type');
        commStore.createIndex('by-date', 'createdAt');
      }

      if (!db.objectStoreNames.contains('customerFollowUps')) {
        const followUpStore = db.createObjectStore('customerFollowUps', { keyPath: 'id' });
        followUpStore.createIndex('by-customer', 'customerId');
        followUpStore.createIndex('by-status', 'status');
        followUpStore.createIndex('by-due-date', 'dueDate');
        followUpStore.createIndex('by-assigned', 'assignedTo');
      }

      if (!db.objectStoreNames.contains('customerTags')) {
        const tagStore = db.createObjectStore('customerTags', { keyPath: 'id' });
        tagStore.createIndex('by-name', 'name');
      }

      if (!db.objectStoreNames.contains('customerTagRelations')) {
        const tagRelStore = db.createObjectStore('customerTagRelations', { keyPath: 'id' });
        tagRelStore.createIndex('by-customer', 'customerId');
        tagRelStore.createIndex('by-tag', 'tagId');
      }

      if (!db.objectStoreNames.contains('customerValueAnalyses')) {
        const analysisStore = db.createObjectStore('customerValueAnalyses', { keyPath: 'customerId' });
        analysisStore.createIndex('by-customer', 'customerId');
        analysisStore.createIndex('by-segment', 'customerSegment');
        analysisStore.createIndex('by-risk', 'riskLevel');
      }

      if (!db.objectStoreNames.contains('productReservations')) {
        const reservationStore = db.createObjectStore('productReservations', { keyPath: 'id' });
        reservationStore.createIndex('by-product', 'productId');
        reservationStore.createIndex('by-customer', 'customerId');
        reservationStore.createIndex('by-status', 'status');
        reservationStore.createIndex('by-date', 'reservedDate');
      }

      if (!db.objectStoreNames.contains('exhibitionStock')) {
        const exhibitionStore = db.createObjectStore('exhibitionStock', { keyPath: 'id' });
        exhibitionStore.createIndex('by-product', 'productId');
        exhibitionStore.createIndex('by-status', 'status');
        exhibitionStore.createIndex('by-date', 'exhibitionDate');
      }
    },
  });

  return dbInstance;
}

// 获取数据库实例
export async function getDB(): Promise<IDBPDatabase<ERPDatabase>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// 通用CRUD操作
export class DBService<T extends { id: string }> {
  constructor(private storeName: keyof ERPDatabase) {}

  async getAll(): Promise<T[]> {
    const db = await getDB();
    return db.getAll(this.storeName as any) as Promise<T[]>;
  }

  async getById(id: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(this.storeName as any, id) as Promise<T | undefined>;
  }

  async add(item: T): Promise<string> {
    const db = await getDB();
    return db.add(this.storeName as any, item as any);
  }

  async update(item: T): Promise<string> {
    const db = await getDB();
    return db.put(this.storeName as any, item as any);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    return db.delete(this.storeName as any, id);
  }

  async getByIndex(indexName: string, value: any): Promise<T[]> {
    const db = await getDB();
    return db.getAllFromIndex(this.storeName as any, indexName, value) as Promise<T[]>;
  }
}

// 具体服务实例
export const productsService = new DBService<Product>('products');
export const customersService = new DBService<Customer>('customers');
export const suppliersService = new DBService<Supplier>('suppliers');
export const activitiesService = new DBService<Activity>('activities');
export const stockTransactionsService = new DBService<StockTransaction>('stockTransactions');
export const purchaseOrdersService = new DBService<PurchaseOrder>('purchaseOrders');
export const salesOrdersService = new DBService<SalesOrder>('salesOrders');
export const financeRecordsService = new DBService<FinanceRecord>('financeRecords');
export const employeesService = new DBService<Employee>('employees');
export const invoicesService = new DBService<Invoice>('invoices');
export const usersService = new DBService<User>('users');
export const operationLogsService = new DBService<OperationLog>('operationLogs');
export const refundOrdersService = new DBService<RefundOrder>('refundOrders');
export const accountsReceivableService = new DBService<AccountReceivable>('accountsReceivable');
export const accountsPayableService = new DBService<AccountPayable>('accountsPayable');
export const paymentRecordsService = new DBService<PaymentRecord>('paymentRecords');
export const paymentOutRecordsService = new DBService<PaymentOutRecord>('paymentOutRecords');
export const spacesService = new DBService<Space>('spaces');
export const spaceBookingsService = new DBService<SpaceBooking>('spaceBookings');
export const calendarEventsService = new DBService<CalendarEvent>('calendarEvents');
export const membersService = new DBService<Member>('members');
export const pointTransactionsService = new DBService<PointTransaction>('pointTransactions');
export const membershipTierConfigsService = new DBService<MembershipTierConfig>('membershipTierConfigs');

// CRM相关服务
export const customerCommunicationsService = new DBService<CustomerCommunication>('customerCommunications');
export const customerFollowUpsService = new DBService<CustomerFollowUp>('customerFollowUps');
export const customerTagsService = new DBService<CustomerTag>('customerTags');
export const customerTagRelationsService = new DBService<CustomerTagRelation>('customerTagRelations');
export const customerValueAnalysesService = new DBService<CustomerValueAnalysis>('customerValueAnalyses');
export const productReservationsService = new DBService<ProductReservation>('productReservations');
export const exhibitionStockService = new DBService<ExhibitionStock>('exhibitionStock');

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 初始化默认会员等级配置
export async function initDefaultMembershipTierConfigs(): Promise<void> {
  try {
    const existingConfigs = await membershipTierConfigsService.getAll();
    if (existingConfigs.length > 0) return; // 已有配置，不重复创建

    const defaultConfigs: MembershipTierConfig[] = [
      {
        id: generateId(),
        tier: MembershipTier.REGULAR,
        name: '普通会员',
        discountRate: 0,
        pointsRate: 1,
        minSpent: 0,
        color: '#6B7280',
        description: '普通会员，无折扣',
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        tier: MembershipTier.VIP,
        name: 'VIP会员',
        discountRate: 5,
        pointsRate: 1.2,
        minSpent: 1000,
        color: '#3B82F6',
        description: 'VIP会员，享受5%折扣',
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        tier: MembershipTier.SVIP,
        name: 'SVIP会员',
        discountRate: 10,
        pointsRate: 1.5,
        minSpent: 5000,
        color: '#8B5CF6',
        description: 'SVIP会员，享受10%折扣',
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        tier: MembershipTier.PROJECT,
        name: '专案会员',
        discountRate: 15,
        pointsRate: 2,
        minSpent: 10000,
        color: '#F59E0B',
        description: '专案会员，享受15%折扣',
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const config of defaultConfigs) {
      await membershipTierConfigsService.add(config);
    }
  } catch (error) {
    console.error('初始化默认会员等级配置失败:', error);
  }
}

// 导出数据（备份）
export async function exportData(): Promise<string> {
  const db = await getDB();
  
  const data = {
    products: await db.getAll('products'),
    customers: await db.getAll('customers'),
    suppliers: await db.getAll('suppliers'),
    activities: await db.getAll('activities'),
    stockTransactions: await db.getAll('stockTransactions'),
    purchaseOrders: await db.getAll('purchaseOrders'),
    salesOrders: await db.getAll('salesOrders'),
    financeRecords: await db.getAll('financeRecords'),
    employees: await db.getAll('employees'),
    invoices: await db.getAll('invoices'),
    users: await db.getAll('users'),
    operationLogs: await db.getAll('operationLogs'),
    refundOrders: await db.getAll('refundOrders'),
    accountsReceivable: await db.getAll('accountsReceivable'),
    accountsPayable: await db.getAll('accountsPayable'),
    paymentRecords: await db.getAll('paymentRecords'),
    paymentOutRecords: await db.getAll('paymentOutRecords'),
    spaces: await db.getAll('spaces'),
    spaceBookings: await db.getAll('spaceBookings'),
    calendarEvents: await db.getAll('calendarEvents'),
    members: await db.getAll('members'),
    pointTransactions: await db.getAll('pointTransactions'),
    membershipTierConfigs: await db.getAll('membershipTierConfigs'),
    customerCommunications: await db.getAll('customerCommunications'),
    customerFollowUps: await db.getAll('customerFollowUps'),
    customerTags: await db.getAll('customerTags'),
    customerTagRelations: await db.getAll('customerTagRelations'),
    customerValueAnalyses: await db.getAll('customerValueAnalyses'),
    productReservations: await db.getAll('productReservations'),
    exhibitionStock: await db.getAll('exhibitionStock'),
    exportDate: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

// 导入数据（恢复备份）
export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await getDB();

  // 清空现有数据
  const tx = db.transaction(
    ['products', 'customers', 'suppliers', 'activities', 'stockTransactions', 
     'purchaseOrders', 'salesOrders', 'financeRecords', 'employees', 'invoices',
     'users', 'operationLogs', 'refundOrders', 'accountsReceivable', 'accountsPayable',
     'paymentRecords', 'paymentOutRecords', 'spaces', 'spaceBookings', 'calendarEvents',
     'members', 'pointTransactions', 'membershipTierConfigs', 'customerCommunications',
     'customerFollowUps', 'customerTags', 'customerTagRelations', 'customerValueAnalyses',
     'productReservations', 'exhibitionStock'],
    'readwrite'
  );

  await tx.objectStore('products').clear();
  await tx.objectStore('customers').clear();
  await tx.objectStore('suppliers').clear();
  await tx.objectStore('activities').clear();
  await tx.objectStore('stockTransactions').clear();
  await tx.objectStore('purchaseOrders').clear();
  await tx.objectStore('salesOrders').clear();
  await tx.objectStore('financeRecords').clear();
  await tx.objectStore('employees').clear();
  await tx.objectStore('invoices').clear();
  await tx.objectStore('users').clear();
  await tx.objectStore('operationLogs').clear();
  await tx.objectStore('refundOrders').clear();
  await tx.objectStore('accountsReceivable').clear();
  await tx.objectStore('accountsPayable').clear();
  await tx.objectStore('paymentRecords').clear();
  await tx.objectStore('paymentOutRecords').clear();
  await tx.objectStore('spaces').clear();
  await tx.objectStore('spaceBookings').clear();
  await tx.objectStore('calendarEvents').clear();
  await tx.objectStore('members').clear();
  await tx.objectStore('pointTransactions').clear();
  await tx.objectStore('membershipTierConfigs').clear();
  await tx.objectStore('customerCommunications').clear();
  await tx.objectStore('customerFollowUps').clear();
  await tx.objectStore('customerTags').clear();
  await tx.objectStore('customerTagRelations').clear();
  await tx.objectStore('customerValueAnalyses').clear();
  await tx.objectStore('productReservations').clear();
  await tx.objectStore('exhibitionStock').clear();

  // 导入新数据
  for (const product of data.products || []) {
    await db.add('products', product);
  }
  for (const customer of data.customers || []) {
    await db.add('customers', customer);
  }
  for (const supplier of data.suppliers || []) {
    await db.add('suppliers', supplier);
  }
  for (const activity of data.activities || []) {
    await db.add('activities', activity);
  }
  for (const transaction of data.stockTransactions || []) {
    await db.add('stockTransactions', transaction);
  }
  for (const order of data.purchaseOrders || []) {
    await db.add('purchaseOrders', order);
  }
  for (const order of data.salesOrders || []) {
    await db.add('salesOrders', order);
  }
  for (const record of data.financeRecords || []) {
    await db.add('financeRecords', record);
  }
  for (const employee of data.employees || []) {
    await db.add('employees', employee);
  }
  for (const invoice of data.invoices || []) {
    await db.add('invoices', invoice);
  }
  for (const user of data.users || []) {
    await db.add('users', user);
  }
  for (const log of data.operationLogs || []) {
    await db.add('operationLogs', log);
  }
  for (const refund of data.refundOrders || []) {
    await db.add('refundOrders', refund);
  }
  for (const receivable of data.accountsReceivable || []) {
    await db.add('accountsReceivable', receivable);
  }
  for (const payable of data.accountsPayable || []) {
    await db.add('accountsPayable', payable);
  }
  for (const payment of data.paymentRecords || []) {
    await db.add('paymentRecords', payment);
  }
  for (const paymentOut of data.paymentOutRecords || []) {
    await db.add('paymentOutRecords', paymentOut);
  }
  for (const space of data.spaces || []) {
    await db.add('spaces', space);
  }
  for (const booking of data.spaceBookings || []) {
    await db.add('spaceBookings', booking);
  }
  for (const event of data.calendarEvents || []) {
    await db.add('calendarEvents', event);
  }
  for (const member of data.members || []) {
    await db.add('members', member);
  }
  for (const point of data.pointTransactions || []) {
    await db.add('pointTransactions', point);
  }
  for (const config of data.membershipTierConfigs || []) {
    await db.add('membershipTierConfigs', config);
  }
  for (const comm of data.customerCommunications || []) {
    await db.add('customerCommunications', comm);
  }
  for (const followUp of data.customerFollowUps || []) {
    await db.add('customerFollowUps', followUp);
  }
  for (const tag of data.customerTags || []) {
    await db.add('customerTags', tag);
  }
  for (const tagRel of data.customerTagRelations || []) {
    await db.add('customerTagRelations', tagRel);
  }
  for (const analysis of data.customerValueAnalyses || []) {
    await db.add('customerValueAnalyses', analysis);
  }
  for (const reservation of data.productReservations || []) {
    await db.add('productReservations', reservation);
  }
  for (const exhibition of data.exhibitionStock || []) {
    await db.add('exhibitionStock', exhibition);
  }
}

