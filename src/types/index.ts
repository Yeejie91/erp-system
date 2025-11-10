// 基础类型定义
export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  supplier: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  otherFees: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  status: 'active' | 'cancelled';
  cancelledBy?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export enum PaymentMethod {
  CASH = 'cash',
  TNG = 'tng',
  PUBLIC_BANK = 'public_bank',
  HONG_LEONG = 'hong_leong',
  CHEQUE = 'cheque',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string;
  operator: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  type: 'workshop' | 'seminar' | 'exhibition' | 'meeting' | 'other';
  location: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  actualCost: number;
  revenue: number;
  profit: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum FinanceType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum FinanceCategory {
  SALES = 'sales',
  PURCHASE = 'purchase',
  RENT = 'rent',
  UTILITIES = 'utilities',
  SALARY = 'salary',
  MARKETING = 'marketing',
  MAINTENANCE = 'maintenance',
  OTHER = 'other'
}

export interface FinanceRecord {
  id: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;
  description: string;
  date: Date;
  reference?: string;
  createdAt: Date;
}

// 用户权限相关
export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAREHOUSE = 'warehouse',
  STAFF = 'staff'
}

export interface Permission {
  module: string;
  actions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum LogAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  CANCEL = 'cancel',
  LOGIN = 'login',
  LOGOUT = 'logout'
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: LogAction;
  module: string;
  target: string;
  details?: string;
  timestamp: Date;
}

// 退货管理
export interface RefundOrder {
  id: string;
  refundNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  items: RefundItem[];
  totalAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// 账款管理
export interface AccountReceivable {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountPayable {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  accountReceivableId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentDate: Date;
  operator: string;
  notes?: string;
  createdAt: Date;
}

export interface PaymentOutRecord {
  id: string;
  accountPayableId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentDate: Date;
  operator: string;
  notes?: string;
  createdAt: Date;
}

// 空间租赁管理
export enum SpaceType {
  CLASSROOM = 'classroom',
  READING_AREA = 'reading_area',
  MEETING_ROOM = 'meeting_room',
  EXHIBITION = 'exhibition',
  OTHER = 'other'
}

export enum BillingType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly'
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  area: number;
  facilities: string[];
  hourlyRate: number;
  dailyRate: number;
  monthlyRate: number;
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpaceBooking {
  id: string;
  spaceId: string;
  spaceName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  billingType: BillingType;
  totalHours?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 日历管理
export enum CalendarEventType {
  HOLIDAY = 'holiday',
  STORE_CLOSURE = 'store_closure',
  SPECIAL_EVENT = 'special_event',
  REMINDER = 'reminder'
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: Date;
  description?: string;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 会员管理
export enum MembershipTier {
  REGULAR = 'regular',
  VIP = 'vip',
  SVIP = 'svip',
  PROJECT = 'project'
}

export interface Member {
  id: string;
  memberNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  tier: MembershipTier;
  points: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipTierConfig {
  id: string;
  tier: MembershipTier;
  name: string;
  discountRate: number;
  pointsRate: number;
  minSpending: number;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointTransaction {
  id: string;
  memberId: string;
  memberNumber: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  description: string;
  reference?: string;
  createdAt: Date;
}

// 商品预留类型
export interface ProductReservation {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  quantity: number;
  reservedDate: Date;
  expectedDeliveryDate: Date;
  status: 'reserved' | 'delivered' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 展览库存类型
export interface ExhibitionStock {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  exhibitionName: string;
  exhibitionDate: Date;
  location: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// CRM相关类型
export interface CustomerCommunication {
  id: string;
  customerId: string;
  customerName: string;
  type: 'phone' | 'email' | 'meeting' | 'wechat' | 'other';
  subject: string;
  content: string;
  result: string;
  nextFollowUp?: Date;
  operator: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  type: 'call' | 'email' | 'meeting' | 'visit' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: Date;
  completedAt?: Date;
  result?: string;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
}

export interface CustomerTagRelation {
  id: string;
  customerId: string;
  tagId: string;
  createdAt: Date;
}

export interface CustomerValueAnalysis {
  customerId: string;
  customerName: string;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  lastPurchaseDate: Date;
  firstPurchaseDate: Date;
  customerLifetimeValue: number;
  purchaseFrequency: number; // 购买频次（次/月）
  recencyScore: number; // 最近购买评分（1-5）
  frequencyScore: number; // 购买频次评分（1-5）
  monetaryScore: number; // 消费金额评分（1-5）
  rfmScore: string; // RFM综合评分
  customerSegment: 'champion' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'lost';
  riskLevel: 'low' | 'medium' | 'high';
  nextAction: string;
  createdAt: Date;
  updatedAt: Date;
}

// 商品预留类型 - 支持多种预留场景
export interface ProductReservation {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  reservedDate: Date;
  expectedDeliveryDate: Date;
  status: 'reserved' | 'delivered' | 'cancelled';
  
  // 预留类型和关联信息
  reservationType: 'activity' | 'customer' | 'project' | 'event';
  relatedId: string; // 关联的活动ID、客户ID或项目ID
  relatedName: string; // 关联的活动名称、客户名称或项目名称
  
  // 预留原因和备注
  reason: string; // 预留原因
  notes?: string; // 备注
  
  // 操作信息
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 展览库存类型 - 为活动和展览预留库存
export interface ExhibitionStock {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  
  // 展览/活动信息
  eventType: 'exhibition' | 'promotion' | 'workshop' | 'seminar' | 'other';
  eventName: string; // 活动名称
  eventDate: Date; // 活动日期
  location: string; // 活动地点
  
  // 状态管理
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  
  // 备注和说明
  notes?: string;
  
  // 操作信息
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}