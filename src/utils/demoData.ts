import {
  Product,
  Customer,
  Supplier,
  Activity,
  FinanceRecord,
  FinanceType,
  FinanceCategory,
  StockTransaction,
} from '../types';
import {
  productsService,
  customersService,
  suppliersService,
  activitiesService,
  financeRecordsService,
  stockTransactionsService,
  generateId
} from '../services/db';

// 生成示例数据
export async function generateDemoData() {
  // 检查是否已有数据
  const existingProducts = await productsService.getAll();
  if (existingProducts.length > 0) {
    const confirmed = confirm('系统已有数据，是否清空并重新生成示例数据？');
    if (!confirmed) return false;
  }

  try {
    // 1. 创建示例商品
    const products: Product[] = [
      {
        id: generateId(),
        name: '办公桌',
        sku: 'DESK-001',
        category: '办公家具',
        unit: '张',
        minStock: 5,
        currentStock: 20,
        costPrice: 800,
        sellingPrice: 1200,
        description: '标准办公桌，尺寸120x60cm',
        supplier: '家具供应商A',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: '办公椅',
        sku: 'CHAIR-001',
        category: '办公家具',
        unit: '把',
        minStock: 10,
        currentStock: 35,
        costPrice: 300,
        sellingPrice: 500,
        description: '人体工学办公椅',
        supplier: '家具供应商A',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: 'A4打印纸',
        sku: 'PAPER-A4',
        category: '办公用品',
        unit: '箱',
        minStock: 3,
        currentStock: 8,
        costPrice: 120,
        sellingPrice: 180,
        description: '500张/包，5包/箱',
        supplier: '文具供应商B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: '笔记本电脑',
        sku: 'LAPTOP-001',
        category: '电子设备',
        unit: '台',
        minStock: 2,
        currentStock: 5,
        costPrice: 5000,
        sellingPrice: 6500,
        description: 'i5处理器，16G内存，512G SSD',
        supplier: '电子产品供应商',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: '投影仪',
        sku: 'PROJ-001',
        category: '电子设备',
        unit: '台',
        minStock: 1,
        currentStock: 3,
        costPrice: 2000,
        sellingPrice: 3000,
        description: '高清投影仪，3000流明',
        supplier: '电子产品供应商',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const product of products) {
      await productsService.add(product);
    }

    // 2. 创建示例客户
    const customers: Customer[] = [
      {
        id: generateId(),
        name: '阳光科技有限公司',
        contact: '张经理',
        phone: '138-0000-1111',
        email: 'zhang@sunshine-tech.com',
        address: '北京市朝阳区科技园1号',
        notes: '长期合作客户，每月采购办公用品',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        name: '创新教育集团',
        contact: '李主任',
        phone: '139-0000-2222',
        email: 'li@innovation-edu.com',
        address: '上海市浦东新区教育路88号',
        notes: '主要采购教学设备',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        name: '星河设计工作室',
        contact: '王总',
        phone: '137-0000-3333',
        email: 'wang@starriver.com',
        address: '广州市天河区创意园5栋',
        createdAt: new Date(),
      },
    ];

    for (const customer of customers) {
      await customersService.add(customer);
    }

    // 3. 创建示例供应商
    const suppliers: Supplier[] = [
      {
        id: generateId(),
        name: '家具供应商A',
        contact: '赵经理',
        phone: '136-0000-4444',
        email: 'zhao@furniture-a.com',
        address: '广东省佛山市顺德区家具城',
        products: [],
        notes: '主要供应办公家具，账期30天',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        name: '文具供应商B',
        contact: '孙经理',
        phone: '135-0000-5555',
        email: 'sun@stationery-b.com',
        address: '浙江省义乌市商贸城',
        products: [],
        notes: '文具批发，满1000元包邮',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        name: '电子产品供应商',
        contact: '周经理',
        phone: '134-0000-6666',
        address: '深圳市南山区科技园',
        products: [],
        createdAt: new Date(),
      },
    ];

    for (const supplier of suppliers) {
      await suppliersService.add(supplier);
    }

    // 4. 创建示例活动
    const activities: Activity[] = [
      {
        id: generateId(),
        name: '新品发布会',
        type: 'exhibition',
        status: 'completed',
        startDate: new Date(2024, 9, 15),
        endDate: new Date(2024, 9, 15),
        budget: 50000,
        actualCost: 48000,
        revenue: 80000,
        description: '秋季新品发布活动，展示最新办公产品',
        location: '国际会展中心3号馆',
        materials: [
          {
            productId: products[3].id,
            productName: products[3].name,
            quantity: 2,
            allocatedDate: new Date(2024, 9, 10),
            returned: true,
            returnedDate: new Date(2024, 9, 16),
          },
          {
            productId: products[4].id,
            productName: products[4].name,
            quantity: 1,
            allocatedDate: new Date(2024, 9, 10),
            returned: true,
            returnedDate: new Date(2024, 9, 16),
          },
        ],
        createdAt: new Date(2024, 9, 1),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: '办公技能工作坊',
        type: 'workshop',
        status: 'ongoing',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        budget: 15000,
        actualCost: 12000,
        revenue: 20000,
        description: '为企业员工提供办公软件培训',
        location: '公司培训室',
        materials: [
          {
            productId: products[2].id,
            productName: products[2].name,
            quantity: 2,
            allocatedDate: new Date(),
            returned: false,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: '年终促销活动',
        type: 'other',
        status: 'planned',
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
        budget: 30000,
        actualCost: 0,
        revenue: 0,
        description: '年终大促，全场8折',
        location: '线上线下同步',
        materials: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const activity of activities) {
      await activitiesService.add(activity);
    }

    // 5. 创建示例财务记录
    const financeRecords: FinanceRecord[] = [
      {
        id: generateId(),
        type: FinanceType.INCOME,
        category: FinanceCategory.SALES,
        amount: 80000,
        description: '新品发布会销售收入',
        date: new Date(2024, 9, 15),
        operator: '张三',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        type: FinanceType.EXPENSE,
        category: FinanceCategory.ACTIVITY,
        amount: 48000,
        description: '新品发布会活动支出',
        date: new Date(2024, 9, 15),
        operator: '张三',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        type: FinanceType.INCOME,
        category: FinanceCategory.SALES,
        amount: 20000,
        description: '工作坊培训收入',
        date: new Date(),
        operator: '李四',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        type: FinanceType.EXPENSE,
        category: FinanceCategory.RENT,
        amount: 10000,
        description: '本月办公室租金',
        date: new Date(),
        operator: '王五',
        createdAt: new Date(),
      },
      {
        id: generateId(),
        type: FinanceType.EXPENSE,
        category: FinanceCategory.UTILITIES,
        amount: 1500,
        description: '本月水电费',
        date: new Date(),
        operator: '王五',
        createdAt: new Date(),
      },
    ];

    for (const record of financeRecords) {
      await financeRecordsService.add(record);
    }

    // 6. 创建示例库存交易记录
    const stockTransactions: StockTransaction[] = [
      {
        id: generateId(),
        productId: products[0].id,
        productName: products[0].name,
        type: 'IN',
        quantity: 20,
        beforeStock: 0,
        afterStock: 20,
        notes: '初始库存',
        operator: '张三',
        createdAt: new Date(2024, 9, 1),
      },
      {
        id: generateId(),
        productId: products[1].id,
        productName: products[1].name,
        type: 'IN',
        quantity: 50,
        beforeStock: 0,
        afterStock: 50,
        notes: '初始库存',
        operator: '张三',
        createdAt: new Date(2024, 9, 1),
      },
      {
        id: generateId(),
        productId: products[1].id,
        productName: products[1].name,
        type: 'OUT',
        quantity: 15,
        beforeStock: 50,
        afterStock: 35,
        notes: '销售给阳光科技',
        operator: '李四',
        createdAt: new Date(2024, 9, 10),
      },
    ];

    for (const transaction of stockTransactions) {
      await stockTransactionsService.add(transaction);
    }

    return true;
  } catch (error) {
    console.error('生成示例数据失败:', error);
    return false;
  }
}

