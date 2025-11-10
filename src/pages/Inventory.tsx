import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Search, History, Tag, Archive } from 'lucide-react';
import { Product, StockTransaction, ProductReservation, ExhibitionStock } from '../types';
import { productsService, stockTransactionsService, productReservationsService, exhibitionStockService } from '../services/db';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/format';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [exhibitionStock, setExhibitionStock] = useState<ExhibitionStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedForPriceTag, setSelectedForPriceTag] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsData, transactionsData, reservationsData, exhibitionStockData] = await Promise.all([
      productsService.getAll(),
      stockTransactionsService.getAll(),
      productReservationsService.getAll(),
      exhibitionStockService.getAll()
    ]);
    setProducts(productsData);
    setTransactions(transactionsData.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setReservations(reservationsData);
    setExhibitionStock(exhibitionStockData);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 计算商品的预留数量
  const getReservedQuantity = (productId: string) => {
    const activeReservations = reservations.filter(r => 
      r.productId === productId && r.status === 'reserved'
    );
    return activeReservations.reduce((sum, r) => sum + r.quantity, 0);
  };

  // 计算商品的展览库存数量
  const getExhibitionQuantity = (productId: string) => {
    const activeExhibitions = exhibitionStock.filter(e => 
      e.productId === productId && e.status !== 'completed' && e.status !== 'cancelled'
    );
    return activeExhibitions.reduce((sum, e) => sum + e.quantity, 0);
  };

  // 计算可用库存（实际库存 - 预留数量 - 展览库存）
  const getAvailableStock = (product: Product) => {
    const reserved = getReservedQuantity(product.id);
    const exhibition = getExhibitionQuantity(product.id);
    return product.currentStock - reserved - exhibition;
  };

  const lowStockProducts = products.filter(p => getAvailableStock(p) <= p.minStock);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  const totalProducts = products.length;

  const productTransactions = selectedProduct
    ? transactions.filter(t => t.productId === selectedProduct.id)
    : transactions.slice(0, 50);

  // 获取商品的预留记录
  const productReservations = selectedProduct
    ? reservations.filter(r => r.productId === selectedProduct.id)
    : reservations.slice(0, 50);

  // 获取商品的展览库存记录
  const productExhibitions = selectedProduct
    ? exhibitionStock.filter(e => e.productId === selectedProduct.id)
    : exhibitionStock.slice(0, 50);

  // 合并所有记录并按时间排序
  const getAllRecords = () => {
    const allRecords = [
      ...productTransactions.map(t => ({
        id: `transaction-${t.id}`,
        type: 'transaction',
        time: new Date(t.createdAt),
        productName: t.productName,
        recordType: getTransactionTypeLabel(t.type),
        quantity: t.quantity,
        beforeStock: t.beforeStock,
        afterStock: t.afterStock,
        related: t.relatedType || '-',
        operator: t.operator,
        notes: t.notes || '-',
        status: t.type === 'IN' ? 'green' : 'red'
      })),
      ...productReservations.map(r => ({
        id: `reservation-${r.id}`,
        type: 'reservation',
        time: new Date(r.createdAt),
        productName: r.productName,
        recordType: '商品预留',
        quantity: r.quantity,
        beforeStock: '-',
        afterStock: '-',
        related: r.relatedName,
        operator: r.createdBy,
        notes: r.reason || r.notes || '-',
        status: r.status === 'reserved' ? 'yellow' : r.status === 'delivered' ? 'green' : 'red'
      })),
      ...productExhibitions.map(e => ({
        id: `exhibition-${e.id}`,
        type: 'exhibition',
        time: new Date(e.createdAt),
        productName: e.productName,
        recordType: '展览库存',
        quantity: e.quantity,
        beforeStock: '-',
        afterStock: '-',
        related: e.eventName,
        operator: e.createdBy,
        notes: e.notes || '-',
        status: e.status === 'active' ? 'blue' : e.status === 'completed' ? 'green' : 'gray'
      }))
    ];

    return allRecords.sort((a, b) => b.time.getTime() - a.time.getTime());
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      'IN': '入库',
      'OUT': '出库',
      'ADJUSTMENT': '调整',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors = {
      'IN': 'text-green-600',
      'OUT': 'text-red-600',
      'ADJUSTMENT': 'text-blue-600',
    };
    return colors[type] || 'text-gray-600';
  };

  const getRecordTypeColor = (recordType: string) => {
    switch (recordType) {
      case '入库':
        return 'text-green-600';
      case '出库':
        return 'text-red-600';
      case '调整':
        return 'text-blue-600';
      case '商品预留':
        return 'text-yellow-600';
      case '展览库存':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'red':
        return 'bg-red-100 text-red-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      case 'gray':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleProductSelection = (product: Product) => {
    const isSelected = selectedForPriceTag.some(p => p.id === product.id);
    if (isSelected) {
      setSelectedForPriceTag(selectedForPriceTag.filter(p => p.id !== product.id));
    } else {
      setSelectedForPriceTag([...selectedForPriceTag, product]);
    }
  };

  const printPriceTags = () => {
    if (selectedForPriceTag.length === 0) {
      alert('请先选择要打印标签的商品');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>价格标签</title>
        <style>
          @media print {
            @page { 
              size: 60mm 40mm;
              margin: 0;
            }
            body { margin: 0; }
            .page-break { page-break-after: always; }
          }
          
          body {
            font-family: 'Arial', 'Microsoft YaHei', sans-serif;
            margin: 0;
            padding: 0;
          }
          
          .price-tag {
            width: 60mm;
            height: 40mm;
            border: 2px solid #333;
            padding: 3mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-bottom: 5mm;
            page-break-after: always;
          }
          
          .tag-header {
            border-bottom: 2px solid #333;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          
          .product-name {
            font-size: 14px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: 1mm;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .category {
            font-size: 10px;
            color: #666;
          }
          
          .tag-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .barcode {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            text-align: center;
            letter-spacing: 1px;
            margin: 2mm 0;
            padding: 1mm;
            background: #f5f5f5;
          }
          
          .year-info {
            font-size: 9px;
            color: #666;
            text-align: center;
          }
          
          .tag-footer {
            border-top: 2px solid #333;
            padding-top: 2mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .price {
            font-size: 18px;
            font-weight: bold;
            color: #d32f2f;
          }
          
          .currency {
            font-size: 12px;
            margin-right: 1mm;
          }
          
          .sku {
            font-size: 8px;
            color: #999;
          }
        </style>
      </head>
      <body>
        ${selectedForPriceTag.map(product => {
          const year = new Date(product.createdAt).getFullYear();
          return `
            <div class="price-tag">
              <div class="tag-header">
                <div class="product-name">${product.name}</div>
                <div class="category">${product.category}</div>
              </div>
              
              <div class="tag-body">
                ${product.barcode ? `
                  <div class="barcode">${product.barcode}</div>
                ` : ''}
                <div class="year-info">入库年份: ${year}</div>
              </div>
              
              <div class="tag-footer">
                <div class="sku">SKU: ${product.sku}</div>
                <div class="price">
                  <span class="currency">RM</span>${product.sellingPrice.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          `;
        }).join('')}

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>
        <p className="text-gray-500 mt-1">实时查看和管理库存状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">商品总数</p>
              <p className="text-2xl font-bold mt-1">{totalProducts}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">库存总值</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalInventoryValue)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">低库存商品</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{lowStockProducts.length}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 库存预警 */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">库存预警</h3>
              <div className="mt-2 space-y-1">
                {lowStockProducts.map(p => (
                  <p key={p.id} className="text-sm text-yellow-700">
                    {p.name} - 可用库存: {getAvailableStock(p)} {p.unit} (预警值: {p.minStock})
                    {getReservedQuantity(p.id) > 0 && (
                      <span className="text-yellow-600 ml-2">[预留: {getReservedQuantity(p.id)}]</span>
                    )}
                    {getExhibitionQuantity(p.id) > 0 && (
                      <span className="text-blue-600 ml-2">[展览: {getExhibitionQuantity(p.id)}]</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和操作栏 */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索商品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-secondary flex items-center justify-center space-x-2"
          >
            <History size={20} />
            <span>{showHistory ? '隐藏历史' : '查看历史'}</span>
          </button>
        </div>
      </div>

      {/* 价格标签打印栏 */}
      {!showHistory && selectedForPriceTag.length > 0 && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Tag className="text-blue-600" size={20} />
              <div>
                <p className="font-medium text-blue-900">已选择 {selectedForPriceTag.length} 个商品</p>
                <p className="text-sm text-blue-700">
                  {selectedForPriceTag.map(p => p.name).join('、')}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedForPriceTag([])}
                className="btn btn-secondary"
              >
                取消选择
              </button>
              <button
                onClick={printPriceTags}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Tag size={20} />
                <span>打印价格标签</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!showHistory ? (
        /* 库存列表 */
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForPriceTag(filteredProducts);
                      } else {
                        setSelectedForPriceTag([]);
                      }
                    }}
                    checked={selectedForPriceTag.length === filteredProducts.length && filteredProducts.length > 0}
                    className="w-4 h-4"
                  />
                </th>
                <th>SKU</th>
                <th>商品名称</th>
                <th>分类</th>
                <th>单位</th>
                <th>当前库存</th>
                <th>预留数量</th>
                <th>可用库存</th>
                <th>预警值</th>
                <th>库存状态</th>
                <th>库存价值</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stockValue = product.currentStock * product.costPrice;
                const availableStock = getAvailableStock(product);
                const isLowStock = availableStock <= product.minStock;
                const stockPercentage = (availableStock / Math.max(product.minStock * 2, 1)) * 100;

                const isSelected = selectedForPriceTag.some(p => p.id === product.id);
                
                return (
                  <tr key={product.id} className={isSelected ? 'bg-blue-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="font-mono text-xs">{product.sku}</td>
                    <td className="font-medium">{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.unit}</td>
                    <td className={isLowStock ? 'text-red-600 font-semibold' : 'font-semibold'}>
                      {product.currentStock}
                    </td>
                    <td>
                      <div className="flex flex-col space-y-1">
                        {getReservedQuantity(product.id) > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                            预留: {getReservedQuantity(product.id)}
                          </span>
                        )}
                        {getExhibitionQuantity(product.id) > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                            展览: {getExhibitionQuantity(product.id)}
                          </span>
                        )}
                        {getReservedQuantity(product.id) === 0 && getExhibitionQuantity(product.id) === 0 && (
                          <span className="text-xs text-gray-400">无预留</span>
                        )}
                      </div>
                    </td>
                    <td className={`font-semibold ${
                      getAvailableStock(product) <= product.minStock ? 'text-red-600' : 
                      getAvailableStock(product) <= product.minStock * 1.5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {getAvailableStock(product)}
                    </td>
                    <td>{product.minStock}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              isLowStock ? 'bg-red-500' : stockPercentage > 75 ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs ${isLowStock ? 'text-red-600' : ''}`}>
                          {isLowStock ? '低库存' : '正常'}
                        </span>
                      </div>
                    </td>
                    <td>{formatCurrency(stockValue)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowHistory(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看记录
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? '没有找到匹配的商品' : '还没有添加商品'}
            </div>
          )}
        </div>
      ) : (
        /* 库存历史记录 */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {selectedProduct ? `${selectedProduct.name} 的库存记录` : '最近库存记录'}
            </h2>
            {selectedProduct && (
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                查看全部
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>商品</th>
                  <th>类型</th>
                  <th>数量</th>
                  <th>变动前</th>
                  <th>变动后</th>
                  <th>关联</th>
                  <th>操作人</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {getAllRecords().map((record) => (
                  <tr key={record.id}>
                    <td className="text-sm">
                      {format(record.time, 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="font-medium">{record.productName}</td>
                    <td>
                      <span className={`font-medium ${getRecordTypeColor(record.recordType)}`}>
                        {record.recordType}
                      </span>
                      {record.type !== 'transaction' && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(record.status)}`}>
                          {record.type === 'reservation' ? 
                            (record.status === 'yellow' ? '预留中' : record.status === 'green' ? '已交付' : '已取消') :
                            (record.status === 'blue' ? '进行中' : record.status === 'green' ? '已完成' : '已取消')
                          }
                        </span>
                      )}
                    </td>
                    <td className={record.type === 'transaction' ? 
                      (record.status === 'green' ? 'text-green-600' : 'text-red-600') : 
                      'text-blue-600'
                    }>
                      {record.type === 'transaction' ? 
                        (record.status === 'green' ? '+' : '-') + Math.abs(record.quantity) :
                        record.quantity
                      }
                    </td>
                    <td>{record.beforeStock}</td>
                    <td className="font-semibold">{record.afterStock}</td>
                    <td className="text-sm text-gray-500">
                      {record.related}
                    </td>
                    <td>{record.operator}</td>
                    <td className="text-sm text-gray-500">{record.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {getAllRecords().length === 0 && (
              <div className="text-center py-12 text-gray-500">
                暂无库存记录
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

