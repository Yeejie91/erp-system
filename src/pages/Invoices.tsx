import { useState, useEffect } from 'react';
import { Plus, Printer, Eye, DollarSign, Check, X, UserPlus, PackagePlus, Trash2, XCircle, Award, ShoppingBag, Calendar } from 'lucide-react';
import { Invoice, InvoiceItem, Customer, Product, StockTransaction, PaymentMethod, AccountReceivable, SpaceBooking, Member, PointTransaction, MembershipTier, MembershipTierConfig } from '../types';
import { invoicesService, customersService, productsService, stockTransactionsService, accountsReceivableService, spaceBookingsService, membersService, pointTransactionsService, membershipTierConfigsService, generateId } from '../services/db';
import { format, addDays } from 'date-fns';
import { formatCurrency } from '../utils/format';
import { useLocation } from 'react-router-dom';

export default function Invoices() {
  const location = useLocation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState(false); // 是否显示已作废的发票
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false); // 显示购买历史
  const [showPurchaseAlert, setShowPurchaseAlert] = useState(false); // 显示购买提醒
  const [purchaseAlertData, setPurchaseAlertData] = useState<{
    productName: string;
    lastPurchaseDate: Date;
    lastQuantity: number;
    lastAmount: number;
    totalPurchases: number;
  } | null>(null);
  
  // 快速添加
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // 表单数据
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState(''); // 自定义发票号
  const [useCustomNumber, setUseCustomNumber] = useState(false); // 是否使用自定义号码
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0); // 整单折扣金额
  const [shippingFee, setShippingFee] = useState(0); // 邮费
  const [otherFees, setOtherFees] = useState(0); // 其他费用
  const [taxRate, setTaxRate] = useState(6); // 税率
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  
  // 付款和打印选项
  const [payNow, setPayNow] = useState(false); // 是否现在付款
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(''); // 付款金额
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash'); // 付款方式
  const [paymentReference, setPaymentReference] = useState(''); // 付款参考号
  const [printAfterSubmit, setPrintAfterSubmit] = useState(true); // 是否提交后打印

  // 添加商品行
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [customPrice, setCustomPrice] = useState<number | null>(null); // 自定义价格

  // 快速添加客户表单
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
  });

  // 快速添加商品表单
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    sellingPrice: 0,
    initialStock: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // 处理从空间预订跳转过来的情况
  useEffect(() => {
    const state = location.state as { fromBooking?: boolean; booking?: SpaceBooking } | null;
    if (state?.fromBooking && state?.booking) {
      const booking = state.booking;
      
      // 自动填充客户
      setSelectedCustomer(booking.customerId);
      
      // 自动添加空间租赁项目
      const spaceRentalItem: InvoiceItem = {
        productId: 'space-rental-' + booking.id,
        productName: `空间租赁 - ${booking.spaceName}`,
        quantity: 1,
        unitPrice: booking.remainingAmount, // 使用未付金额
        discount: 0,
        amount: booking.remainingAmount,
      };
      
      setItems([spaceRentalItem]);
      setNotes(`空间预订号：${booking.bookingNumber}\n使用时间：${format(new Date(booking.startTime), 'yyyy-MM-dd HH:mm')} 至 ${format(new Date(booking.endTime), 'MM-dd HH:mm')}`);
      
      // 打开模态框
      setIsModalOpen(true);
      
      // 清除location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadData = async () => {
    const [invoicesData, customersData, productsData, membersData, tierConfigsData] = await Promise.all([
      invoicesService.getAll(),
      customersService.getAll(),
      productsService.getAll(),
      membersService.getAll(),
      membershipTierConfigsService.getAll(),
    ]);
    setInvoices(invoicesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCustomers(customersData);
    setProducts(productsData);
    setMembers(membersData);
    setTierConfigs(tierConfigsData);
  };

  // 当选择客户时，检查是否是会员
  useEffect(() => {
    if (selectedCustomer) {
      const member = members.find(m => m.customerId === selectedCustomer && m.status === 'active');
      setCurrentMember(member || null);
    } else {
      setCurrentMember(null);
    }
  }, [selectedCustomer, members]);

  // 获取客户购买历史
  const getCustomerPurchaseHistory = (customerId: string) => {
    const customerInvoices = invoices
      .filter(invoice => invoice.customerId === customerId && invoice.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const purchaseItems: { productId: string; productName: string; totalQuantity: number; lastPurchaseDate: Date; totalSpent: number }[] = [];

    customerInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const existingItem = purchaseItems.find(p => p.productId === item.productId);
        if (existingItem) {
          existingItem.totalQuantity += item.quantity;
          existingItem.totalSpent += item.amount;
          if (new Date(invoice.createdAt) > existingItem.lastPurchaseDate) {
            existingItem.lastPurchaseDate = new Date(invoice.createdAt);
          }
        } else {
          purchaseItems.push({
            productId: item.productId,
            productName: item.productName,
            totalQuantity: item.quantity,
            lastPurchaseDate: new Date(invoice.createdAt),
            totalSpent: item.amount,
          });
        }
      });
    });

    return purchaseItems.sort((a, b) => b.lastPurchaseDate.getTime() - a.lastPurchaseDate.getTime());
  };

  // 获取客户最近购买的商品
  const getRecentPurchases = (customerId: string, limit: number = 5) => {
    const customerInvoices = invoices
      .filter(invoice => invoice.customerId === customerId && invoice.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return customerInvoices.flatMap(invoice => 
      invoice.items.map(item => ({
        ...item,
        invoiceNumber: invoice.invoiceNumber,
        purchaseDate: new Date(invoice.createdAt),
      }))
    );
  };

  // 检查客户是否购买过某个商品
  const checkCustomerProductHistory = (customerId: string, productId: string) => {
    if (!customerId || !productId) return null;

    const customerInvoices = invoices
      .filter(invoice => invoice.customerId === customerId && invoice.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const productPurchases: {
      productName: string;
      lastPurchaseDate: Date;
      lastQuantity: number;
      lastAmount: number;
      totalPurchases: number;
    }[] = [];

    customerInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (item.productId === productId) {
          const existing = productPurchases.find(p => p.productName === item.productName);
          if (existing) {
            existing.totalPurchases++;
          } else {
            productPurchases.push({
              productName: item.productName,
              lastPurchaseDate: new Date(invoice.createdAt),
              lastQuantity: item.quantity,
              lastAmount: item.amount,
              totalPurchases: 1,
            });
          }
        }
      });
    });

    return productPurchases.length > 0 ? productPurchases[0] : null;
  };

  // 快速添加客户
  const handleQuickAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert('请填写客户名称和电话');
      return;
    }

    const customer: Customer = {
      id: generateId(),
      ...newCustomer,
      createdAt: new Date(),
    };

    await customersService.add(customer);
    await loadData();
    setSelectedCustomer(customer.id);
    setShowAddCustomer(false);
    setNewCustomer({ name: '', contact: '', phone: '', email: '', address: '' });
    alert('客户添加成功！');
  };

  // 快速添加商品
  const handleQuickAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('请填写商品名称和SKU');
      return;
    }

    try {
      const product: Product = {
        id: generateId(),
        name: newProduct.name,
        sku: newProduct.sku,
        sellingPrice: newProduct.sellingPrice,
        category: '其他',
        unit: '件',
        minStock: 0,
        currentStock: newProduct.initialStock,
        costPrice: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await productsService.add(product);

      // 如果设置了初始库存，创建入库记录
      if (newProduct.initialStock > 0) {
        const transaction: StockTransaction = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          type: 'IN',
          quantity: newProduct.initialStock,
          beforeStock: 0,
          afterStock: newProduct.initialStock,
          relatedType: 'adjustment',
          notes: '新增商品初始库存',
          operator: createdBy.trim() || '系统',
          createdAt: new Date(),
        };
        await stockTransactionsService.add(transaction);
      }

      await loadData();
      setShowAddProduct(false);
      setNewProduct({ name: '', sku: '', sellingPrice: 0, initialStock: 0 });
      alert('商品添加成功！' + (newProduct.initialStock > 0 ? `初始库存：${newProduct.initialStock}` : ''));
    } catch (error) {
      console.error('添加商品失败:', error);
      alert('添加商品失败，请重试');
    }
  };

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) {
      alert('请选择商品并输入有效数量');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // 检查客户是否购买过此商品
    if (selectedCustomer) {
      const purchaseHistory = checkCustomerProductHistory(selectedCustomer, selectedProduct);
      if (purchaseHistory) {
        setPurchaseAlertData(purchaseHistory);
        setShowPurchaseAlert(true);
        return; // 先显示提醒，用户确认后再添加
      }
    }

    // 检查库存
    if (product.currentStock < quantity) {
      const confirmAdd = confirm(
        `库存不足警告！\n` +
        `商品：${product.name}\n` +
        `当前库存：${product.currentStock}\n` +
        `需要数量：${quantity}\n\n` +
        `是否仍要添加到清单？`
      );
      if (!confirmAdd) return;
    }

    const unitPrice = customPrice !== null ? customPrice : product.sellingPrice;
    const discountAmount = (unitPrice * quantity * itemDiscount) / 100;
    const amount = unitPrice * quantity - discountAmount;

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        discount: itemDiscount,
        amount,
      },
    ]);

    setSelectedProduct('');
    setQuantity(1);
    setItemDiscount(0);
    setCustomPrice(null);
  };

  // 确认添加商品（从购买提醒）
  const confirmAddItem = () => {
    if (!selectedProduct || quantity <= 0) {
      alert('请选择商品并输入有效数量');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // 检查库存
    if (product.currentStock < quantity) {
      const confirmAdd = confirm(
        `库存不足警告！\n` +
        `商品：${product.name}\n` +
        `当前库存：${product.currentStock}\n` +
        `需要数量：${quantity}\n\n` +
        `是否仍要添加到清单？`
      );
      if (!confirmAdd) return;
    }

    const unitPrice = customPrice !== null ? customPrice : product.sellingPrice;
    const discountAmount = (unitPrice * quantity * itemDiscount) / 100;
    const amount = unitPrice * quantity - discountAmount;

    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      discount: itemDiscount,
      amount,
    };

    setItems([...items, newItem]);
    setSelectedProduct('');
    setQuantity(1);
    setItemDiscount(0);
    setCustomPrice(null);
    setShowPurchaseAlert(false);
    setPurchaseAlertData(null);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getMemberDiscount = (tier: MembershipTier): number => {
    const config = tierConfigs.find(c => c.tier === tier && c.isActive);
    return config ? config.discountRate : 0;
  };

  const getMemberPointsRate = (tier: MembershipTier): number => {
    const config = tierConfigs.find(c => c.tier === tier && c.isActive);
    return config ? config.pointsRate : 1;
  };

  const getMemberTierConfig = (tier: MembershipTier): MembershipTierConfig | null => {
    return tierConfigs.find(c => c.tier === tier && c.isActive) || null;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    
    // 会员折扣
    const memberDiscountRate = currentMember ? getMemberDiscount(currentMember.tier) : 0;
    const memberDiscountAmount = (subtotal * memberDiscountRate) / 100;
    
    const afterDiscount = subtotal - discount - memberDiscountAmount;
    const withFees = afterDiscount + shippingFee + otherFees;
    const taxAmount = (withFees * taxRate) / 100;
    const totalAmount = withFees + taxAmount;
    
    return { subtotal, memberDiscountAmount, afterDiscount, taxAmount, totalAmount };
  };

  const generateInvoiceNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `INV${year}${month}-`;
    
    // 获取当月所有有效发票（排除已作废的）
    const allInvoices = await invoicesService.getAll();
    const monthInvoices = allInvoices.filter(inv => 
      inv.invoiceNumber.startsWith(prefix) && inv.status !== 'cancelled'
    );
    
    // 找出最大编号
    let maxNumber = 0;
    monthInvoices.forEach(inv => {
      const match = inv.invoiceNumber.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    // 生成新编号
    const newNumber = String(maxNumber + 1).padStart(3, '0');
    return `${prefix}${newNumber}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert('请选择客户');
      return;
    }

    if (items.length === 0) {
      alert('请至少添加一个商品');
      return;
    }

    if (!createdBy.trim()) {
      alert('请输入开单人');
      return;
    }

    // 检查库存是否充足
    const stockCheckResults: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        if (product.currentStock < item.quantity) {
          stockCheckResults.push(
            `${product.name}: 库存不足！当前库存 ${product.currentStock}，需要 ${item.quantity}`
          );
        }
      }
    }

    if (stockCheckResults.length > 0) {
      const confirmMsg = `以下商品库存不足：\n${stockCheckResults.join('\n')}\n\n是否仍要继续开单？\n（注意：库存将变为负数）`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const { subtotal, taxAmount, totalAmount } = calculateTotals();

    try {
      // 获取发票号码
      const invoiceNumber = useCustomNumber && customInvoiceNumber.trim() 
        ? customInvoiceNumber.trim() 
        : await generateInvoiceNumber();

      // 创建发票
      const invoice: Invoice = {
        id: generateId(),
        invoiceNumber,
        status: 'active',
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        items,
        subtotal,
        discount,
        shippingFee,
        otherFees,
        taxRate,
        taxAmount,
        totalAmount,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        paymentMethod: payNow ? paymentMethod : undefined,
        paymentReference: payNow && paymentReference ? paymentReference : undefined,
        notes,
        createdBy: createdBy.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await invoicesService.add(invoice);

      // 扣减库存并创建出库记录
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const beforeStock = product.currentStock;
        const afterStock = beforeStock - item.quantity;

        // 创建库存交易记录
        const transaction: StockTransaction = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          type: 'OUT',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          relatedId: invoice.id,
          relatedType: 'order',
          notes: `销售出库 - 发票号: ${invoice.invoiceNumber}`,
          operator: createdBy.trim(),
          createdAt: new Date(),
        };

        await stockTransactionsService.add(transaction);

        // 更新商品库存
        const updatedProduct = {
          ...product,
          currentStock: afterStock,
          updatedAt: new Date(),
        };
        await productsService.update(updatedProduct);
      }

      // 处理付款
      if (payNow && paymentAmount) {
        const amount = typeof paymentAmount === 'number' ? paymentAmount : parseFloat(paymentAmount);
        
        if (!isNaN(amount) && amount > 0) {
          const paidAmount = Math.min(amount, invoice.totalAmount);
          const paymentStatus = paidAmount >= invoice.totalAmount ? 'paid' : 'partial';

            const updatedInvoice = {
              ...invoice,
              paidAmount,
              paymentStatus,
              paymentMethod,
              paymentReference: paymentReference || undefined,
              updatedAt: new Date(),
            };

            await invoicesService.update(updatedInvoice);
            
            // 更新本地invoice对象用于打印
            invoice.paidAmount = paidAmount;
            invoice.paymentStatus = paymentStatus;
            invoice.paymentMethod = paymentMethod;
            invoice.paymentReference = paymentReference || undefined;
        }
      }

      // 自动创建应收账款（如果有未付金额）
      const finalPaidAmount = invoice.paidAmount || 0;
      const remainingAmount = invoice.totalAmount - finalPaidAmount;
      
      if (remainingAmount > 0) {
        const accountReceivable: AccountReceivable = {
          id: generateId(),
          customerId: customer.id,
          customerName: customer.name,
          relatedId: invoice.id,
          relatedType: 'invoice',
          relatedNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          paidAmount: finalPaidAmount,
          remainingAmount: remainingAmount,
          status: 'pending',
          dueDate: addDays(new Date(), 30), // 默认30天账期
          notes: `发票 ${invoice.invoiceNumber} 的应收账款`,
          createdBy: createdBy.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await accountsReceivableService.add(accountReceivable);
      }

      // 如果是从空间预订来的，更新预订的付款状态
      if (notes.includes('空间预订号：')) {
        const bookingMatch = notes.match(/空间预订号：(BK\d+-\d+)/);
        if (bookingMatch) {
          const bookingNumber = bookingMatch[1];
          const allBookings = await spaceBookingsService.getAll();
          const booking = allBookings.find(b => b.bookingNumber === bookingNumber);
          
          if (booking) {
            const updatedBooking = {
              ...booking,
              paidAmount: booking.paidAmount + finalPaidAmount,
              remainingAmount: Math.max(0, booking.remainingAmount - finalPaidAmount),
              status: (booking.remainingAmount - finalPaidAmount <= 0 ? 'completed' : 'confirmed') as BookingStatus,
              updatedAt: new Date(),
            };
            await spaceBookingsService.update(updatedBooking);
          }
        }
      }

      // 如果客户是会员，自动增加积分和更新累计消费
      if (currentMember && finalPaidAmount > 0) {
        const pointsRate = getMemberPointsRate(currentMember.tier);
        const earnedPoints = Math.floor(finalPaidAmount * pointsRate);
        
        // 创建积分记录
        const pointTransaction: PointTransaction = {
          id: generateId(),
          memberId: currentMember.id,
          memberNumber: currentMember.memberNumber,
          type: 'earn',
          points: earnedPoints,
          beforePoints: currentMember.points,
          afterPoints: currentMember.points + earnedPoints,
          relatedId: invoice.id,
          relatedType: 'invoice',
          description: `购物获得积分 - ${invoice.invoiceNumber}`,
          operator: createdBy.trim(),
          createdAt: new Date(),
        };
        
        await pointTransactionsService.add(pointTransaction);
        
        // 更新会员积分和累计消费
        const updatedMember: Member = {
          ...currentMember,
          points: currentMember.points + earnedPoints,
          totalSpent: currentMember.totalSpent + finalPaidAmount,
          updatedAt: new Date(),
        };
        
        await membersService.update(updatedMember);
      }

      // 关闭创建模态框
      setIsModalOpen(false);
      resetForm();

      // 提示成功
      let successMsg = remainingAmount > 0 
        ? `发票创建成功！\n发票号：${invoice.invoiceNumber}\n\n已付：${formatCurrency(finalPaidAmount)}\n未付：${formatCurrency(remainingAmount)}\n已自动创建应收账款`
        : `发票创建成功！\n发票号：${invoice.invoiceNumber}\n\n全款已付`;
      
      // 如果是会员，添加积分信息
      if (currentMember && finalPaidAmount > 0) {
        const earnedPoints = Math.floor(finalPaidAmount * getMemberPointsRate(currentMember.tier));
        successMsg += `\n\n🎁 会员积分 +${earnedPoints}分`;
      }
      
      alert(successMsg);

      // 是否打印
      if (printAfterSubmit) {
        setTimeout(() => {
          handlePrint(invoice);
        }, 100);
      }

      // 刷新数据
      loadData();
    } catch (error) {
      console.error('创建发票失败:', error);
      alert('创建发票失败，请重试');
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setCustomInvoiceNumber('');
    setUseCustomNumber(false);
    setItems([]);
    setDiscount(0);
    setShippingFee(0);
    setOtherFees(0);
    setTaxRate(6);
    setNotes('');
    setCreatedBy('');
    setSelectedProduct('');
    setQuantity(1);
    setItemDiscount(0);
    setCustomPrice(null);
    setPayNow(false);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentReference('');
    setPrintAfterSubmit(true);
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    if (!method) return '-';
    const labels: Record<PaymentMethod, string> = {
      cash: '现金 Cash',
      tng: 'Touch \'n Go',
      public_bank: 'Public Bank',
      hong_leong: 'Hong Leong Bank',
      bank_transfer: '银行转账 Bank Transfer',
      cheque: '支票 Cheque',
      other: '其他 Other',
    };
    return labels[method];
  };

  const handleCancel = async (invoice: Invoice) => {
    if (invoice.status === 'cancelled') {
      alert('此发票已经作废');
      return;
    }

    const reason = prompt(
      `确定要作废这张发票吗？\n\n` +
      `发票号：${invoice.invoiceNumber}\n` +
      `客户：${invoice.customerName}\n` +
      `金额：${formatCurrency(invoice.totalAmount)}\n\n` +
      `作废后：\n` +
      `• 发票号码 ${invoice.invoiceNumber} 可重新使用\n` +
      `• 记录会保留，标记为"已作废"\n` +
      `• 库存将自动恢复\n\n` +
      `请输入作废原因（可选）：`
    );
    
    if (reason === null) return; // 用户取消

    try {
      // 1. 恢复库存 - 为每个商品创建入库记录
      for (const item of invoice.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          // 创建入库交易记录
          const stockTransaction: StockTransaction = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            type: 'IN',
            quantity: item.quantity,
            reason: `发票作废恢复库存 - ${invoice.invoiceNumber}`,
            operator: prompt('请输入操作人姓名：') || '未知',
            createdAt: new Date(),
          };

          await stockTransactionsService.add(stockTransaction);

          // 更新商品库存
          const updatedProduct: Product = {
            ...product,
            currentStock: product.currentStock + item.quantity,
            updatedAt: new Date(),
          };

          await productsService.update(updatedProduct);
        }
      }

      // 2. 更新发票状态
      const cancelledInvoice: Invoice = {
        ...invoice,
        status: 'cancelled',
        cancelledBy: prompt('请输入操作人姓名：') || '未知',
        cancelledAt: new Date(),
        cancelReason: reason || '无',
        updatedAt: new Date(),
      };

      await invoicesService.update(cancelledInvoice);
      
      alert(`发票已作废！\n发票号 ${invoice.invoiceNumber} 现在可以重新使用\n库存已自动恢复`);
      setViewInvoice(null);
      loadData();
    } catch (error) {
      console.error('作废发票失败:', error);
      alert('作废发票失败，请重试');
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    const confirmMsg = `确定要永久删除这张发票吗？\n\n` +
      `发票号：${invoice.invoiceNumber}\n` +
      `客户：${invoice.customerName}\n` +
      `金额：${formatCurrency(invoice.totalAmount)}\n\n` +
      `⚠️ 警告：\n` +
      `• 发票记录将被永久删除\n` +
      `• 库存将自动恢复\n` +
      `• 此操作不可恢复\n\n` +
      `建议：如只是要作废发票，请使用"作废"功能而非删除`;
    
    if (!confirm(confirmMsg)) return;

    try {
      // 1. 恢复库存 - 为每个商品创建入库记录
      for (const item of invoice.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          // 创建入库交易记录
          const stockTransaction: StockTransaction = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            type: 'IN',
            quantity: item.quantity,
            reason: `发票删除恢复库存 - ${invoice.invoiceNumber}`,
            operator: prompt('请输入操作人姓名：') || '未知',
            createdAt: new Date(),
          };

          await stockTransactionsService.add(stockTransaction);

          // 更新商品库存
          const updatedProduct: Product = {
            ...product,
            currentStock: product.currentStock + item.quantity,
            updatedAt: new Date(),
          };

          await productsService.update(updatedProduct);
        }
      }

      // 2. 删除发票
      await invoicesService.delete(invoice.id);
      
      alert('发票已永久删除\n库存已自动恢复');
      setViewInvoice(null);
      loadData();
    } catch (error) {
      console.error('删除发票失败:', error);
      alert('删除发票失败，请重试');
    }
  };

  const handlePayment = async (invoice: Invoice) => {
    const amountStr = prompt(`请输入付款金额\n应付总额: ${formatCurrency(invoice.totalAmount)}\n已付: ${formatCurrency(invoice.paidAmount)}\n待付: ${formatCurrency(invoice.totalAmount - invoice.paidAmount)}`);
    
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    const newPaidAmount = invoice.paidAmount + amount;
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
    
    if (newPaidAmount >= invoice.totalAmount) {
      paymentStatus = 'paid';
    } else if (newPaidAmount <= 0) {
      paymentStatus = 'unpaid';
    }

    const updatedInvoice = {
      ...invoice,
      paidAmount: Math.min(newPaidAmount, invoice.totalAmount),
      paymentStatus,
      updatedAt: new Date(),
    };

    await invoicesService.update(updatedInvoice);
    loadData();
  };

  const handlePrint = (invoice: Invoice) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>收据 ${invoice.invoiceNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; }
          }
          
          body { 
            font-family: 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif; 
            padding: 15px;
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
          }
          
          .receipt-container {
            border: 1px solid #ddd;
            background: white;
          }
          
          .header { 
            text-align: center; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          
          .company-english {
            font-size: 15px;
            margin-bottom: 10px;
            opacity: 0.95;
            font-weight: 300;
          }
          
          .company-details {
            font-size: 11px;
            opacity: 0.85;
            margin-bottom: 4px;
          }
          
          .company-website {
            font-size: 12px;
            margin-top: 6px;
            opacity: 0.9;
            font-weight: 500;
          }
          
          .receipt-title {
            font-size: 16px;
            font-weight: 600;
            margin-top: 15px;
            padding: 8px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            display: inline-block;
            letter-spacing: 2px;
          }
          
          .content {
            padding: 20px;
          }

          .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
          }
          
          .meta-item {
            line-height: 1.6;
          }
          
          .meta-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            display: block;
          }
          
          .meta-value {
            font-size: 14px;
            color: #333;
            font-weight: 600;
            display: block;
          }
          
          .customer-info {
            margin-bottom: 20px;
            padding: 12px 15px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          
          .customer-info .info-title {
            font-size: 12px;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          
          .customer-info .info-row {
            font-size: 13px;
            color: #333;
            margin: 4px 0;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 13px;
          }
          
          th { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            border: none;
          }
          
          td { 
            border-bottom: 1px solid #e9ecef;
            padding: 10px 8px;
            font-size: 13px;
          }
          
          tbody tr:hover {
            background-color: #f8f9fa;
          }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .totals-section { 
            margin-top: 20px;
            float: right; 
            width: 320px;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .totals-section .row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 15px;
            font-size: 13px;
            border-bottom: 1px solid #e9ecef;
          }
          
          .totals-section .row:last-child {
            border-bottom: none;
          }
          
          .totals-section .total { 
            font-weight: 700; 
            font-size: 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 15px;
            margin: 0;
          }
          
          .payment-status {
            clear: both;
            margin-top: 15px;
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #28a745;
            font-size: 11px;
          }
          
          .payment-status.unpaid {
            border-left-color: #dc3545;
          }
          
          .payment-status.partial {
            border-left-color: #ffc107;
          }
          
          .payment-status .row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            line-height: 1.5;
          }
          
          .payment-status .row strong {
            font-weight: 600;
          }
          
          .footer {
            clear: both;
            margin-top: 25px;
          }
          
          .notes {
            margin-top: 15px;
            padding: 10px 12px;
            background: #fff9e6;
            border-left: 3px solid #ffc107;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
          }
          
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- 公司抬头 -->
          <div class="header">
            <div class="company-name">半亩天光</div>
            <div class="company-english">Spark of Wisdom Centre</div>
            <div class="company-details">(201803256732 JM0874028-H)</div>
            <div class="company-website">www.mywisdomstore.com</div>
            <div class="receipt-title">销售收据 · SALES RECEIPT</div>
          </div>

          <div class="content">
            <!-- 发票信息 -->
            <div class="invoice-meta">
              <div class="meta-item">
                <span class="meta-label">Invoice No.</span>
                <span class="meta-value">${invoice.invoiceNumber}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date & Time</span>
                <span class="meta-value">${format(new Date(invoice.createdAt), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            </div>
            
            <!-- 客户信息 -->
            <div class="customer-info">
              <div class="info-title">Customer 客户</div>
              <div class="info-row"><strong>${invoice.customerName}</strong></div>
              ${invoice.customerPhone ? `<div class="info-row">Tel: ${invoice.customerPhone}</div>` : ''}
              ${invoice.customerAddress ? `<div class="info-row">${invoice.customerAddress}</div>` : ''}
            </div>

            <!-- 商品明细 -->
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Item 商品</th>
                  <th class="text-right" style="width: 90px;">Price 单价</th>
                  <th class="text-center" style="width: 60px;">Qty 数量</th>
                  <th class="text-right" style="width: 60px;">Disc. 折扣</th>
                  <th class="text-right" style="width: 110px;">Amount 金额</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td><strong>${item.productName}</strong></td>
                    <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${item.discount > 0 ? item.discount + '%' : '-'}</td>
                    <td class="text-right"><strong>${formatCurrency(item.amount)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- 金额汇总 -->
            <div class="totals-section">
              <div class="row">
                <span>Subtotal 小计</span>
                <strong>${formatCurrency(invoice.subtotal)}</strong>
              </div>
              ${invoice.discount > 0 ? `
                <div class="row">
                  <span>Discount 折扣</span>
                  <strong style="color: #dc3545;">-${formatCurrency(invoice.discount)}</strong>
                </div>
              ` : ''}
              ${invoice.shippingFee > 0 ? `
                <div class="row">
                  <span>Shipping 邮费</span>
                  <strong>${formatCurrency(invoice.shippingFee)}</strong>
                </div>
              ` : ''}
              ${invoice.otherFees > 0 ? `
                <div class="row">
                  <span>Other Fees 其他</span>
                  <strong>${formatCurrency(invoice.otherFees)}</strong>
                </div>
              ` : ''}
              <div class="row">
                <span>Tax 税费 (${invoice.taxRate}%)</span>
                <strong>${formatCurrency(invoice.taxAmount)}</strong>
              </div>
              <div class="total">
                <span>TOTAL 总计</span>
                <strong>${formatCurrency(invoice.totalAmount)}</strong>
              </div>
            </div>

            <!-- 付款信息 -->
            <div class="payment-status ${invoice.paymentStatus}" style="clear: both;">
              <div class="row">
                <span>Status 付款状态:</span>
                <strong>${invoice.paymentStatus === 'paid' ? '✓ PAID 已付清' : invoice.paymentStatus === 'partial' ? 'PARTIAL 部分付款' : 'UNPAID 未付款'}</strong>
              </div>
              ${invoice.paidAmount > 0 ? `
                <div class="row">
                  <span>Paid 已付:</span>
                  <strong style="color: #28a745;">${formatCurrency(invoice.paidAmount)}</strong>
                </div>
              ` : ''}
              ${invoice.paymentMethod ? `
                <div class="row">
                  <span>Method 方式:</span>
                  <strong>${getPaymentMethodLabel(invoice.paymentMethod)}</strong>
                </div>
              ` : ''}
              ${invoice.paymentReference ? `
                <div class="row">
                  <span>Reference 参考:</span>
                  <strong style="font-family: monospace; font-size: 10px;">${invoice.paymentReference}</strong>
                </div>
              ` : ''}
              ${invoice.totalAmount - invoice.paidAmount > 0 ? `
                <div class="row">
                  <span>Outstanding 待付:</span>
                  <strong style="color: #dc3545;">${formatCurrency(invoice.totalAmount - invoice.paidAmount)}</strong>
                </div>
              ` : ''}
            </div>

            ${invoice.notes ? `
              <div class="notes">
                <strong>Notes 备注:</strong> ${invoice.notes}
              </div>
            ` : ''}

            <!-- 页脚 -->
            <div class="footer">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 15px;">
                <div><strong>Prepared by 开单人:</strong> ${invoice.createdBy}</div>
                <div>Printed 打印: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
              </div>
              
              <div style="text-align: center; padding: 12px; background: #f8f9fa; border-radius: 4px;">
                <p style="font-size: 13px; color: #667eea; font-weight: 600; margin: 0;">
                  感谢惠顾 · Thank You For Your Business
                </p>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const { subtotal, afterDiscount, taxAmount, totalAmount } = calculateTotals();

  const filteredInvoices = invoices.filter(inv => {
    // 根据显示设置过滤已作废的发票
    if (!showCancelled && inv.status === 'cancelled') return false;
    
    // 根据付款状态过滤
    if (filterStatus === 'all') return true;
    return inv.paymentStatus === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      unpaid: 'badge-red',
      partial: 'badge-yellow',
      paid: 'badge-green',
    };
    const labels = {
      unpaid: '未付款',
      partial: '部分付款',
      paid: '已付款',
    };
    return { badge: badges[status as keyof typeof badges], label: labels[status as keyof typeof labels] };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">开单管理</h1>
          <p className="text-gray-500 mt-1">创建和管理销售发票</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>新建发票</span>
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-4">
            <label className="label mb-0">付款状态:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="all">全部</option>
              <option value="unpaid">未付款</option>
              <option value="partial">部分付款</option>
              <option value="paid">已付款</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showCancelled"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-4 h-4 mr-2"
            />
            <label htmlFor="showCancelled" className="text-sm text-gray-700">
              显示已作废的发票
            </label>
          </div>
        </div>
      </div>

      {/* 发票列表 */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>发票号</th>
              <th>日期</th>
              <th>客户</th>
              <th>商品数</th>
              <th>金额</th>
              <th>已付</th>
              <th>付款方式</th>
              <th>状态</th>
              <th>开单人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const { badge, label } = getStatusBadge(invoice.paymentStatus);
              const remaining = invoice.totalAmount - invoice.paidAmount;
              const isCancelled = invoice.status === 'cancelled';
              
              return (
                <tr key={invoice.id} className={isCancelled ? 'opacity-60 bg-gray-50' : ''}>
                  <td className="font-mono text-sm">
                    {invoice.invoiceNumber}
                    {isCancelled && <span className="ml-2 badge badge-gray text-xs">已作废</span>}
                  </td>
                  <td className="text-sm">{format(new Date(invoice.createdAt), 'yyyy-MM-dd')}</td>
                  <td className={`font-medium ${isCancelled ? 'line-through' : ''}`}>{invoice.customerName}</td>
                  <td>{invoice.items.length}</td>
                  <td className={`font-semibold ${isCancelled ? 'line-through' : ''}`}>{formatCurrency(invoice.totalAmount)}</td>
                  <td className={`text-green-600 ${isCancelled ? 'line-through' : ''}`}>{formatCurrency(invoice.paidAmount)}</td>
                  <td className="text-sm text-blue-600">
                    {invoice.paymentMethod ? getPaymentMethodLabel(invoice.paymentMethod) : '-'}
                  </td>
                  <td>
                    {isCancelled ? (
                      <span className="badge badge-gray">已作废</span>
                    ) : (
                      <span className={`badge ${badge}`}>{label}</span>
                    )}
                  </td>
                  <td>{invoice.createdBy}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-800"
                        title="查看"
                      >
                        <Eye size={18} />
                      </button>
                      {!isCancelled && (
                        <>
                          <button
                            onClick={() => handlePrint(invoice)}
                            className="text-gray-600 hover:text-gray-800"
                            title="打印"
                          >
                            <Printer size={18} />
                          </button>
                          {invoice.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handlePayment(invoice)}
                              className="text-green-600 hover:text-green-800"
                              title="记录付款"
                            >
                              <DollarSign size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(invoice)}
                            className="text-orange-600 hover:text-orange-800"
                            title="作废"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(invoice)}
                        className="text-red-600 hover:text-red-800"
                        title="永久删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            还没有发票记录
          </div>
        )}
      </div>

      {/* 创建发票模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full my-8">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">新建发票</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 发票号码 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">发票编号</label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={useCustomNumber}
                        onChange={(e) => setUseCustomNumber(e.target.checked)}
                        className="w-4 h-4 mr-2"
                      />
                      自定义编号
                    </label>
                  </div>
                  {useCustomNumber ? (
                    <input
                      type="text"
                      value={customInvoiceNumber}
                      onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                      className="input"
                      placeholder="输入发票编号，例如：INV-2024-001"
                      required
                    />
                  ) : (
                    <div className="input bg-gray-50 text-gray-500">
                      INV{format(new Date(), 'yyyyMM')}-XXX (系统自动生成)
                    </div>
                  )}
                </div>

                {/* 客户选择 */}
                <div>
                  <label className="label">选择客户 *</label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">请选择客户</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(true)}
                      className="btn btn-secondary flex items-center space-x-1 whitespace-nowrap"
                    >
                      <UserPlus size={18} />
                      <span>新增客户</span>
                    </button>
                  </div>
                  {currentMember && (() => {
                    const tierConfig = getMemberTierConfig(currentMember.tier);
                    return (
                      <div className="mt-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Award className="text-yellow-600" size={18} />
                            <span className="text-sm font-semibold text-gray-900">
                              {currentMember.memberNumber}
                            </span>
                            <span 
                              className="px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                              style={{ backgroundColor: tierConfig?.color || '#6B7280' }}
                            >
                              {tierConfig?.name || '普通会员'}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">会员折扣</p>
                            <p className="text-sm font-bold text-green-600">
                              {getMemberDiscount(currentMember.tier)}% OFF
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-gray-600">当前积分: <span className="font-semibold text-blue-600">{currentMember.points}</span></span>
                          <span className="text-gray-600">累计消费: <span className="font-semibold">{formatCurrency(currentMember.totalSpent)}</span></span>
                        </div>
                        {tierConfig && (
                          <div className="mt-1 text-xs text-gray-500">
                            积分倍率: {tierConfig.pointsRate}x
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 添加商品 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">添加商品</h3>
                    <div className="flex space-x-2">
                      {selectedCustomer && (
                        <button
                          type="button"
                          onClick={() => setShowPurchaseHistory(true)}
                          className="btn btn-info btn-sm flex items-center space-x-1"
                        >
                          <ShoppingBag size={16} />
                          <span>购买历史</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddProduct(true)}
                        className="btn btn-secondary btn-sm flex items-center space-x-1"
                      >
                        <PackagePlus size={16} />
                        <span>新增商品</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* 商品选择行 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3">
                        <select
                          value={selectedProduct}
                          onChange={(e) => {
                            setSelectedProduct(e.target.value);
                            setCustomPrice(null); // 重置自定义价格
                          }}
                          className="input"
                        >
                          <option value="">选择商品</option>
                          {products.map((product) => (
                            <option 
                              key={product.id} 
                              value={product.id}
                              style={product.currentStock <= product.minStock ? { color: 'red', fontWeight: 'bold' } : {}}
                            >
                              {product.name} - {formatCurrency(product.sellingPrice)} (库存: {product.currentStock}{product.currentStock <= product.minStock ? ' ⚠️' : ''})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* 价格、数量、折扣行 */}
                    {selectedProduct && (
                      <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded border">
                        <div>
                          <label className="label mb-1 text-xs">单价 (RM)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={customPrice !== null ? customPrice : (products.find(p => p.id === selectedProduct)?.sellingPrice || 0)}
                            onChange={(e) => setCustomPrice(Number(e.target.value))}
                            className="input"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="label mb-1 text-xs">数量</label>
                          <input
                            type="number"
                            placeholder="数量"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="input"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="label mb-1 text-xs">折扣 (%)</label>
                          <input
                            type="number"
                            placeholder="折扣 %"
                            value={itemDiscount}
                            onChange={(e) => setItemDiscount(Number(e.target.value))}
                            className="input"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <label className="label mb-1 text-xs">金额预览</label>
                          <div className="input bg-gray-100 text-right font-bold text-primary-600">
                            {formatCurrency(
                              (() => {
                                const price = customPrice !== null ? customPrice : (products.find(p => p.id === selectedProduct)?.sellingPrice || 0);
                                const discountAmount = (price * quantity * itemDiscount) / 100;
                                return price * quantity - discountAmount;
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 添加按钮 */}
                    {selectedProduct && (
                      <div>
                        <button
                          type="button"
                          onClick={addItem}
                          className="btn btn-primary w-full"
                        >
                          <Plus size={18} className="inline mr-2" />
                          添加到清单
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 商品明细表 */}
                {items.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">商品明细</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">商品</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">单价</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">数量</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">折扣</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">金额</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">{item.discount}%</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* 合计 */}
                      <div className="bg-gray-50 px-4 py-3 border-t">
                        <div className="flex justify-end">
                          <div className="w-96 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>小计:</span>
                              <span className="font-semibold">{formatCurrency(subtotal)}</span>
                            </div>
                            
                            {/* 会员折扣 */}
                            {(() => {
                              const { memberDiscountAmount } = calculateTotals();
                              return currentMember && memberDiscountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span className="flex items-center space-x-1">
                                    <Award size={14} />
                                    <span>会员折扣 ({getMemberDiscount(currentMember.tier)}%):</span>
                                  </span>
                                  <span className="font-semibold">-{formatCurrency(memberDiscountAmount)}</span>
                                </div>
                              );
                            })()}
                            
                            {/* 整单折扣 */}
                            <div className="flex justify-between text-sm items-center">
                              <span>整单折扣:</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={discount}
                                  onChange={(e) => setDiscount(Number(e.target.value))}
                                  className="input w-32 text-sm py-1"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            
                            {discount > 0 && (
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>折扣后:</span>
                                <span className="font-semibold">{formatCurrency(afterDiscount)}</span>
                              </div>
                            )}
                            
                            {/* 邮费 */}
                            <div className="flex justify-between text-sm items-center">
                              <span>邮费/运费:</span>
                              <input
                                type="number"
                                value={shippingFee}
                                onChange={(e) => setShippingFee(Number(e.target.value))}
                                className="input w-32 text-sm py-1"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </div>
                            
                            {/* 其他费用 */}
                            <div className="flex justify-between text-sm items-center">
                              <span>其他费用:</span>
                              <input
                                type="number"
                                value={otherFees}
                                onChange={(e) => setOtherFees(Number(e.target.value))}
                                className="input w-32 text-sm py-1"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>税费 ({taxRate}%):</span>
                              <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                              <span>总计:</span>
                              <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 其他信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">税率 (%)</label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="input"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="label">开单人 *</label>
                    <input
                      type="text"
                      required
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                      className="input"
                      placeholder="输入开单人姓名"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">备注</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="选填"
                  />
                </div>

                {/* 付款选项 */}
                <div className="border-t pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium mb-3 flex items-center">
                      <DollarSign size={20} className="mr-2 text-blue-600" />
                      付款选项
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="payNow"
                          checked={payNow}
                          onChange={(e) => {
                            setPayNow(e.target.checked);
                            if (e.target.checked) {
                              setPaymentAmount(totalAmount); // 默认全额
                            } else {
                              setPaymentAmount('');
                            }
                          }}
                          className="w-4 h-4 text-primary-600"
                        />
                        <label htmlFor="payNow" className="ml-2 text-sm font-medium text-gray-700">
                          客户现在付款
                        </label>
                      </div>

                      {payNow && (
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center space-x-4">
                            <button
                              type="button"
                              onClick={() => setPaymentAmount(totalAmount)}
                              className={`px-3 py-1.5 rounded text-sm ${
                                paymentAmount === totalAmount
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              全额付款 {formatCurrency(totalAmount)}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentAmount(totalAmount / 2)}
                              className="px-3 py-1.5 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              付一半 {formatCurrency(totalAmount / 2)}
                            </button>
                          </div>
                          
                          <div>
                            <label className="label mb-1 text-xs">或输入自定义金额</label>
                            <input
                              type="number"
                              step="0.01"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              className="input"
                              min="0"
                              max={totalAmount}
                              placeholder="输入付款金额"
                            />
                          </div>

                          {/* 付款方式 */}
                          <div>
                            <label className="label mb-1 text-xs">付款方式 *</label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              className="input"
                              required={payNow}
                            >
                              <option value="cash">💵 现金 Cash</option>
                              <option value="tng">📱 Touch 'n Go (TNG)</option>
                              <option value="public_bank">🏦 Public Bank</option>
                              <option value="hong_leong">🏦 Hong Leong Bank</option>
                              <option value="bank_transfer">🏦 银行转账 Bank Transfer</option>
                              <option value="cheque">📄 支票 Cheque</option>
                              <option value="other">💳 其他 Other</option>
                            </select>
                          </div>

                          {/* 付款参考号（非现金时显示） */}
                          {paymentMethod !== 'cash' && (
                            <div>
                              <label className="label mb-1 text-xs">
                                {paymentMethod === 'cheque' ? '支票号码' : 
                                 paymentMethod === 'tng' ? '交易参考号' : 
                                 '交易/参考号'}
                              </label>
                              <input
                                type="text"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                className="input"
                                placeholder={
                                  paymentMethod === 'cheque' ? '输入支票号码' :
                                  paymentMethod === 'tng' ? '输入TNG交易号' :
                                  '输入交易参考号（可选）'
                                }
                              />
                            </div>
                          )}
                          
                          {paymentAmount && typeof paymentAmount === 'number' && (
                            <div className="text-sm space-y-1 bg-white p-3 rounded border">
                              <div className="flex justify-between">
                                <span className="text-gray-600">总金额:</span>
                                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">付款金额:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(paymentAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">付款方式:</span>
                                <span className="font-semibold text-blue-600">{getPaymentMethodLabel(paymentMethod)}</span>
                              </div>
                              {paymentReference && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">参考号:</span>
                                  <span className="font-mono">{paymentReference}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="text-gray-600">剩余待付:</span>
                                <span className={`font-semibold ${totalAmount - paymentAmount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {formatCurrency(totalAmount - paymentAmount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 打印选项 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="printAfterSubmit"
                      checked={printAfterSubmit}
                      onChange={(e) => setPrintAfterSubmit(e.target.checked)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <label htmlFor="printAfterSubmit" className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                      <Printer size={18} className="mr-1" />
                      提交后立即打印发票
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    勾选后，创建发票成功会自动弹出打印预览
                  </p>
                </div>

                {/* 按钮 */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center space-x-2"
                    disabled={items.length === 0}
                  >
                    <Check size={20} />
                    <span>创建发票</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 快速添加客户模态框 */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">快速添加客户</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">客户名称 *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">联系人</label>
                  <input
                    type="text"
                    value={newCustomer.contact}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">电话 *</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">邮箱</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">地址</label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomer(false);
                    setNewCustomer({ name: '', contact: '', phone: '', email: '', address: '' });
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddCustomer}
                  className="btn btn-primary"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快速添加商品模态框 */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">快速添加商品</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">商品名称 *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="input"
                    placeholder="例如：苹果手机"
                  />
                </div>
                <div>
                  <label className="label">SKU编号 *</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="input"
                    placeholder="例如：PHONE-001"
                  />
                </div>
                <div>
                  <label className="label">销售价 (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: Number(e.target.value) })}
                    className="input"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">初始库存 (可选)</label>
                  <input
                    type="number"
                    value={newProduct.initialStock}
                    onChange={(e) => setNewProduct({ ...newProduct, initialStock: Number(e.target.value) })}
                    className="input"
                    min="0"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 设置初始库存后可立即用于开单，否则需要先进货
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">
                    <strong>提示：</strong>快速添加的商品会使用默认设置（分类：其他，单位：件）。
                    如需完善详细信息，可稍后在"商品管理"中编辑。
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setNewProduct({ name: '', sku: '', sellingPrice: 0, initialStock: 0 });
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddProduct}
                  className="btn btn-primary"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 查看发票详情模态框 (省略，与之前类似) */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">发票详情</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-gray-500">#{viewInvoice.invoiceNumber}</p>
                    {viewInvoice.status === 'cancelled' && (
                      <span className="badge badge-red">已作废</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewInvoice(null)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              {/* 作废信息提示 */}
              {viewInvoice.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="text-red-600 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-red-900">此发票已作废</p>
                      <div className="text-sm text-red-700 mt-2 space-y-1">
                        <p>作废时间: {format(new Date(viewInvoice.cancelledAt!), 'yyyy-MM-dd HH:mm')}</p>
                        <p>作废操作人: {viewInvoice.cancelledBy}</p>
                        {viewInvoice.cancelReason && <p>作废原因: {viewInvoice.cancelReason}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">客户</p>
                    <p className="font-medium">{viewInvoice.customerName}</p>
                    <p className="text-sm">{viewInvoice.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">日期</p>
                    <p className="font-medium">{format(new Date(viewInvoice.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">商品明细</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>商品</th>
                        <th className="text-right">单价</th>
                        <th className="text-right">数量</th>
                        <th className="text-right">折扣</th>
                        <th className="text-right">金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{item.discount}%</td>
                          <td className="text-right font-semibold">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>小计:</span>
                      <span className="font-semibold">{formatCurrency(viewInvoice.subtotal)}</span>
                    </div>
                    {viewInvoice.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>折扣:</span>
                        <span className="font-semibold">-{formatCurrency(viewInvoice.discount)}</span>
                      </div>
                    )}
                    {viewInvoice.shippingFee > 0 && (
                      <div className="flex justify-between">
                        <span>邮费:</span>
                        <span className="font-semibold">{formatCurrency(viewInvoice.shippingFee)}</span>
                      </div>
                    )}
                    {viewInvoice.otherFees > 0 && (
                      <div className="flex justify-between">
                        <span>其他费用:</span>
                        <span className="font-semibold">{formatCurrency(viewInvoice.otherFees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>税费 ({viewInvoice.taxRate}%):</span>
                      <span className="font-semibold">{formatCurrency(viewInvoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>总计:</span>
                      <span className="text-primary-600">{formatCurrency(viewInvoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>已付:</span>
                      <span className="text-green-600 font-semibold">{formatCurrency(viewInvoice.paidAmount)}</span>
                    </div>
                    {viewInvoice.paymentMethod && (
                      <div className="flex justify-between">
                        <span>付款方式:</span>
                        <span className="font-semibold text-blue-600">{getPaymentMethodLabel(viewInvoice.paymentMethod)}</span>
                      </div>
                    )}
                    {viewInvoice.paymentReference && (
                      <div className="flex justify-between text-sm">
                        <span>参考号:</span>
                        <span className="font-mono text-gray-600">{viewInvoice.paymentReference}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>待付:</span>
                      <span className={`font-semibold ${viewInvoice.totalAmount - viewInvoice.paidAmount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatCurrency(viewInvoice.totalAmount - viewInvoice.paidAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {viewInvoice.notes && (
                  <div>
                    <p className="text-sm text-gray-500">备注</p>
                    <p>{viewInvoice.notes}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    {viewInvoice.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancel(viewInvoice)}
                        className="btn btn-secondary flex items-center space-x-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <XCircle size={20} />
                        <span>作废发票</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const currentInvoice = viewInvoice;
                        setViewInvoice(null);
                        handleDelete(currentInvoice);
                      }}
                      className="btn btn-danger flex items-center space-x-2"
                    >
                      <Trash2 size={20} />
                      <span>永久删除</span>
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    {viewInvoice.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => handlePrint(viewInvoice)}
                          className="btn btn-secondary flex items-center space-x-2"
                        >
                          <Printer size={20} />
                          <span>打印</span>
                        </button>
                        {viewInvoice.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => {
                              setViewInvoice(null);
                              handlePayment(viewInvoice);
                            }}
                            className="btn btn-success flex items-center space-x-2"
                          >
                            <DollarSign size={20} />
                            <span>记录付款</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
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
                {customers.find(c => c.id === selectedCustomer)?.name} 的购买历史
              </h2>

              {/* 客户信息摘要 */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">客户姓名</p>
                    <p className="font-semibold">{customers.find(c => c.id === selectedCustomer)?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">联系电话</p>
                    <p className="font-semibold">{customers.find(c => c.id === selectedCustomer)?.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">购买次数</p>
                    <p className="font-semibold text-blue-600">
                      {invoices.filter(inv => inv.customerId === selectedCustomer && inv.status !== 'cancelled').length} 次
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">总消费</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(
                        invoices
                          .filter(inv => inv.customerId === selectedCustomer && inv.status !== 'cancelled')
                          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 购买商品汇总 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">购买商品汇总</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名称</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">总数量</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">总金额</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后购买</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getCustomerPurchaseHistory(selectedCustomer).map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName}</td>
                          <td className="px-4 py-3 text-sm text-right text-blue-600 font-semibold">{item.totalQuantity}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{formatCurrency(item.totalSpent)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{format(item.lastPurchaseDate, 'yyyy-MM-dd')}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                // 自动选择该商品
                                setSelectedProduct(item.productId);
                                setShowPurchaseHistory(false);
                              }}
                              className="btn btn-sm btn-primary"
                            >
                              选择此商品
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getCustomerPurchaseHistory(selectedCustomer).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingBag size={48} className="mx-auto mb-3 text-gray-400" />
                      <p>暂无购买记录</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 最近购买记录 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">最近购买记录</h3>
                <div className="space-y-3">
                  {getRecentPurchases(selectedCustomer, 10).map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{item.productName}</span>
                            <span className="text-sm text-gray-500">× {item.quantity}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{format(item.purchaseDate, 'yyyy-MM-dd HH:mm')}</span>
                            </span>
                            <span>发票号: {item.invoiceNumber}</span>
                            <span className="text-green-600 font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProduct(item.productId);
                            setShowPurchaseHistory(false);
                          }}
                          className="btn btn-sm btn-outline"
                        >
                          选择
                        </button>
                      </div>
                    </div>
                  ))}
                  {getRecentPurchases(selectedCustomer, 10).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingBag size={48} className="mx-auto mb-3 text-gray-400" />
                      <p>暂无购买记录</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowPurchaseHistory(false)}
                  className="btn btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 购买提醒模态框 */}
      {showPurchaseAlert && purchaseAlertData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <ShoppingBag className="text-blue-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">购买提醒</h2>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      该客户之前购买过此商品
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      系统检测到客户之前购买过此商品，请确认是否继续添加。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">购买历史信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">商品名称</p>
                      <p className="font-medium">{purchaseAlertData.productName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">购买次数</p>
                      <p className="font-medium text-blue-600">{purchaseAlertData.totalPurchases} 次</p>
                    </div>
                    <div>
                      <p className="text-gray-600">上次购买时间</p>
                      <p className="font-medium">{format(purchaseAlertData.lastPurchaseDate, 'yyyy-MM-dd HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">上次购买数量</p>
                      <p className="font-medium">{purchaseAlertData.lastQuantity} 件</p>
                    </div>
                    <div>
                      <p className="text-gray-600">上次购买金额</p>
                      <p className="font-medium text-green-600">{formatCurrency(purchaseAlertData.lastAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">当前添加信息</h4>
                  <div className="text-sm text-blue-800">
                    <p>商品：{products.find(p => p.id === selectedProduct)?.name}</p>
                    <p>数量：{quantity} 件</p>
                    <p>单价：{formatCurrency(customPrice !== null ? customPrice : (products.find(p => p.id === selectedProduct)?.sellingPrice || 0))}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPurchaseAlert(false);
                    setPurchaseAlertData(null);
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={confirmAddItem}
                  className="btn btn-primary"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

