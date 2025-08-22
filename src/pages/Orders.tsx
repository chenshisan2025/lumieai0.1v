import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, RefreshCw } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderDisplay {
  id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
  shipping_info: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    postalCode?: string;
    notes?: string;
  };
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_image?: string;
    quantity: number;
    price: number;
  }>;
  payment_method: string;
  transaction_hash?: string;
}

const statusConfig = {
  pending: { label: '待确认', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', icon: Clock },
  confirmed: { label: '已确认', color: 'text-blue-400', bgColor: 'bg-blue-400/20', icon: CheckCircle },
  shipped: { label: '已发货', color: 'text-purple-400', bgColor: 'bg-purple-400/20', icon: Truck },
  delivered: { label: '已送达', color: 'text-green-400', bgColor: 'bg-green-400/20', icon: Package },
  cancelled: { label: '已取消', color: 'text-red-400', bgColor: 'bg-red-400/20', icon: XCircle },
};

export default function Orders() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { state, fetchOrders, fetchOrderById, cancelOrder } = useOrder();
  const { orders, loading, error } = state;
  
  // Loading and error states are now managed by OrderContext
  const [selectedOrder, setSelectedOrder] = useState<OrderDisplay | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadOrders();
    
    // Check for success parameter
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadOrderDetail(id);
    }
  }, [id]);

  const loadOrders = async () => {
    try {
      await fetchOrders();
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    try {
      const order = await fetchOrderById(orderId);
      if (order) {
        // Convert Order to OrderDisplay format
        const orderDisplay: OrderDisplay = {
          ...order,
          status: order.status as 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
          shipping_info: {
            name: 'User Name', // Extract from shipping_address
            phone: 'Phone Number',
            address: order.shipping_address,
            city: '',
            postalCode: '',
            notes: ''
          },
          items: order.items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product.name,
            product_image: item.product.image_url,
            quantity: item.quantity,
            price: item.price
          })),
          payment_method: 'LUM',
          transaction_hash: ''
        };
        setSelectedOrder(orderDisplay);
      }
    } catch (error) {
      console.error('Failed to load order detail:', error);
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleBackToList = () => {
    navigate('/orders');
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Order Detail View
  if (id && selectedOrder) {
    const StatusIcon = statusConfig[selectedOrder.status].icon;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={handleBackToList}
                  className="text-slate-300 hover:text-white transition-colors mb-2"
                >
                  ← 返回订单列表
                </button>
                <h1 className="text-2xl font-bold text-white">订单详情</h1>
                <p className="text-slate-400">订单号: {selectedOrder.id.slice(0, 8)}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig[selectedOrder.status].bgColor}`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig[selectedOrder.status].color}`} />
                <span className={`font-medium ${statusConfig[selectedOrder.status].color}`}>
                  {statusConfig[selectedOrder.status].label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Success Message */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300">订单创建成功！我们将尽快为您处理。</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-6">订单商品</h2>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                      <img
                        src={item.product_image || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${item.product_name} hardware device`)}&image_size=square_hd`}
                        alt={item.product_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{item.product_name}</h3>
                        <p className="text-slate-400 text-sm">数量: {item.quantity}</p>
                        <p className="text-slate-400 text-sm">单价: {item.price} BNB</p>
                      </div>
                      <span className="text-yellow-400 font-bold">
                        {(item.price * item.quantity).toFixed(4)} BNB
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">配送信息</h2>
                <div className="space-y-2">
                  <p className="text-white">
                    <span className="text-slate-400">收货人:</span> {selectedOrder.shipping_info.name}
                  </p>
                  <p className="text-white">
                    <span className="text-slate-400">联系电话:</span> {selectedOrder.shipping_info.phone}
                  </p>
                  <p className="text-white">
                    <span className="text-slate-400">配送地址:</span> {selectedOrder.shipping_info.address}
                  </p>
                  {selectedOrder.shipping_info.city && (
                    <p className="text-white">
                      <span className="text-slate-400">城市:</span> {selectedOrder.shipping_info.city} {selectedOrder.shipping_info.postalCode}
                    </p>
                  )}
                  {selectedOrder.shipping_info.notes && (
                    <p className="text-white">
                      <span className="text-slate-400">备注:</span> {selectedOrder.shipping_info.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 sticky top-8">
                <h2 className="text-xl font-bold text-white mb-6">订单摘要</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-slate-300">
                    <span>订单时间</span>
                    <span>{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-slate-300">
                    <span>支付方式</span>
                    <span>BNB</span>
                  </div>
                  
                  {selectedOrder.transaction_hash && (
                    <div className="flex justify-between text-slate-300">
                      <span>交易哈希</span>
                      <span className="text-xs font-mono truncate max-w-24" title={selectedOrder.transaction_hash}>
                        {selectedOrder.transaction_hash.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-600 pt-4">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>总计</span>
                      <span className="text-yellow-400">{selectedOrder.total_amount} BNB</span>
                    </div>
                  </div>
                </div>

                {/* Order Status Timeline */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">订单状态</h3>
                  <div className="space-y-2">
                    {Object.entries(statusConfig).map(([status, config]) => {
                      const Icon = config.icon;
                      const isActive = selectedOrder.status === status;
                      const isPassed = ['pending', 'confirmed', 'shipped', 'delivered'].indexOf(selectedOrder.status) >= 
                                      ['pending', 'confirmed', 'shipped', 'delivered'].indexOf(status);
                      
                      return (
                        <div key={status} className={`flex items-center gap-3 p-2 rounded-lg ${
                          isActive ? config.bgColor : isPassed ? 'bg-slate-700/30' : 'bg-slate-800/30'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isActive || isPassed ? config.color : 'text-slate-500'
                          }`} />
                          <span className={`text-sm ${
                            isActive || isPassed ? 'text-white' : 'text-slate-500'
                          }`}>
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Orders List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">我的订单</h1>
            <button
              onClick={loadOrders}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300">订单创建成功！我们将尽快为您处理。</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待确认' },
              { key: 'confirmed', label: '已确认' },
              { key: 'shipped', label: '已发货' },
              { key: 'delivered', label: '已送达' },
              { key: 'cancelled', label: '已取消' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  statusFilter === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">暂无订单</h2>
            <p className="text-slate-400 mb-6">您还没有任何订单，去商店看看吧！</p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold"
            >
              开始购物
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusConfig[order.status].icon;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        订单 #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {new Date(order.created_at).toLocaleDateString()} • {order.items.length} 件商品
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig[order.status].bgColor} mb-2`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig[order.status].color}`} />
                        <span className={`text-sm font-medium ${statusConfig[order.status].color}`}>
                          {statusConfig[order.status].label}
                        </span>
                      </div>
                      <p className="text-yellow-400 font-bold text-lg">
                        {order.total_amount} BNB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {order.items.slice(0, 3).map((item, index) => (
                        <img
                          key={index}
                          src={item.product.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${item.product.name} hardware device`)}&image_size=square_hd`}
                        alt={item.product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                          <span className="text-slate-400 text-xs">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">查看详情</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}