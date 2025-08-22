import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, MapPin, Package, ArrowLeft, Wallet, CheckCircle, AlertCircle, Loader, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useShop } from '../contexts/ShopContext';
import { useOrder } from '../contexts/OrderContext';
import { useMembership } from '../contexts/MembershipContext';
import LUMPayment from '@/components/LUMPayment';

interface PaymentStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export default function Checkout() {
  const navigate = useNavigate();
  const { state, getCartTotal, clearCart } = useShop();
  const { cart: cartItems } = state;
  const { createOrder } = useOrder();
  const { state: membershipState, calculateDiscount } = useMembership();
  const { userMembership: membershipInfo } = membershipState;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BNB' | 'LUM'>('BNB');
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  });

  const subtotal = getCartTotal();
  const discount = calculateDiscount(subtotal);
  const finalTotal = subtotal - discount;

  const steps: PaymentStep[] = [
    { id: 'info', title: '配送信息', status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending' },
    { id: 'payment', title: '支付方式', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 'confirm', title: '确认订单', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
  ];

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  useEffect(() => {
    // Simulate wallet connection check
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      // Simulate wallet connection and balance check
      // In real implementation, this would connect to actual wallet
      setTimeout(() => {
        setWalletConnected(true);
        setWalletBalance(1000); // Mock balance
      }, 1000);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const connectWallet = async () => {
    setIsProcessing(true);
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      setWalletConnected(true);
      setWalletBalance(1000); // Mock balance
    } catch (error) {
      setError('钱包连接失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      setError('请填写完整的配送信息');
      return;
    }
    setError(null);
    setCurrentStep(1);
  };

  const handlePaymentSubmit = () => {
    if (!walletConnected) {
      setError('请先连接钱包');
      return;
    }
    if (walletBalance < finalTotal) {
      setError('钱包余额不足');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleOrderSubmit = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      setTransactionHash(mockTxHash);
      
      // Create order
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shipping_address: `${shippingInfo.name}, ${shippingInfo.phone}, ${shippingInfo.address}, ${shippingInfo.city} ${shippingInfo.postalCode}`,
        payment_method: 'BNB'
      };
      
      const order = await createOrder(orderData);
      
      // Clear cart
      await clearCart();
      
      // Navigate to success page
      navigate(`/orders/${order.id}?success=true`);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '订单创建失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回购物车
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step.status === 'completed' ? 'bg-green-500 border-green-500' :
                  step.status === 'active' ? 'bg-blue-500 border-blue-500' :
                  'bg-slate-700 border-slate-600'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-white font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className={`ml-3 font-medium ${
                  step.status === 'active' ? 'text-white' : 'text-slate-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    step.status === 'completed' ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300">{error}</span>
              </motion.div>
            )}

            {/* Step 1: Shipping Information */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
              >
                <h2 className="text-xl font-bold text-white mb-6">配送信息</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        收货人姓名 *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="请输入收货人姓名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        联系电话 *
                      </label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="请输入联系电话"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      详细地址 *
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="请输入详细地址"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        城市
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="请输入城市"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        邮政编码
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="请输入邮政编码"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      备注信息
                    </label>
                    <textarea
                      value={shippingInfo.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="请输入备注信息（可选）"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold"
                  >
                    下一步：选择支付方式
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
              >
                <h2 className="text-xl font-bold text-white mb-6">支付方式</h2>
                
                <div className="space-y-4">
                  {/* 支付方式选择 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => setSelectedPaymentMethod('BNB')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === 'BNB'
                          ? 'border-yellow-500 bg-yellow-500/20'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="w-6 h-6 text-yellow-400" />
                        <div className="text-left">
                          <div className="text-white font-semibold">BNB 支付</div>
                          <div className="text-slate-400 text-sm">使用 BNB 代币支付</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setSelectedPaymentMethod('LUM')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === 'LUM'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Coins className="w-6 h-6 text-purple-400" />
                        <div className="text-left">
                          <div className="text-white font-semibold">LUM 支付</div>
                          <div className="text-slate-400 text-sm">使用 LUM 代币支付</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* BNB 支付 */}
                  {selectedPaymentMethod === 'BNB' && (
                    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-3 mb-4">
                        <Wallet className="w-6 h-6 text-yellow-400" />
                        <span className="text-white font-semibold">BNB 代币支付</span>
                      </div>
                      
                      {!walletConnected ? (
                        <div className="text-center py-6">
                          <p className="text-slate-400 mb-4">请连接您的钱包以使用 BNB 代币支付</p>
                          <button
                            onClick={connectWallet}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                              <Wallet className="w-5 h-5" />
                            )}
                            {isProcessing ? '连接中...' : '连接钱包'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                            <span className="text-slate-300">钱包余额</span>
                            <span className="text-yellow-400 font-bold">{walletBalance} BNB</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                            <span className="text-slate-300">需要支付</span>
                            <span className="text-white font-bold">{finalTotal} BNB</span>
                          </div>
                          {walletBalance < finalTotal && (
                            <p className="text-red-400 text-sm">余额不足，请充值后再试</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LUM 支付 */}
                  {selectedPaymentMethod === 'LUM' && (
                    <LUMPayment
                      amount={finalTotal}
                      onPaymentSuccess={(txHash) => {
                        setTransactionHash(txHash);
                        setCurrentStep(2);
                      }}
                      onPaymentError={(error) => {
                        setError(error);
                      }}
                      disabled={isProcessing}
                    />
                  )}
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    onClick={handlePaymentSubmit}
                    disabled={!walletConnected || walletBalance < finalTotal}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                  >
                    下一步：确认订单
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Order Confirmation */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
              >
                <h2 className="text-xl font-bold text-white mb-6">确认订单</h2>
                
                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-white">订单商品</h3>
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                      <img
                        src={item.product.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${item.product.name} hardware device`)}&image_size=square_hd`}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{item.product.name}</h4>
                        <p className="text-slate-400 text-sm">数量: {item.quantity}</p>
                      </div>
                      <span className="text-yellow-400 font-bold">
                        {(item.product.price * item.quantity).toFixed(4)} BNB
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Shipping Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">配送信息</h3>
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-white">{shippingInfo.name} - {shippingInfo.phone}</p>
                    <p className="text-slate-300">{shippingInfo.address}</p>
                    {shippingInfo.city && <p className="text-slate-300">{shippingInfo.city} {shippingInfo.postalCode}</p>}
                    {shippingInfo.notes && <p className="text-slate-400 text-sm mt-2">备注: {shippingInfo.notes}</p>}
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    onClick={handleOrderSubmit}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-300 font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        确认支付
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 sticky top-8"
            >
              <h2 className="text-xl font-bold text-white mb-6">订单摘要</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-slate-300">
                  <span>商品总价</span>
                  <span>{subtotal} BNB</span>
                </div>
                
                {membershipInfo && discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>会员折扣 ({membershipInfo.level.name})</span>
                    <span>-{discount} BNB</span>
                  </div>
                )}
                
                <div className="flex justify-between text-slate-300">
                  <span>配送费</span>
                  <span className="text-green-400">免费</span>
                </div>
                
                <div className="border-t border-slate-600 pt-4">
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>总计</span>
                    <span className="text-yellow-400">{finalTotal} BNB</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-medium">BNB 代币支付</span>
                </div>
                <p className="text-xs text-slate-400">
                  🔒 安全支付 • 区块链保障
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}