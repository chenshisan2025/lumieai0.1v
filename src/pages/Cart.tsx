import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useShop } from '@/contexts/ShopContext';

export default function Cart() {
  const navigate = useNavigate();
  const { state, updateCartItem, removeFromCart, clearCart, getCartTotal, getCartItemCount } = useShop();
  const { cart: cartItems } = state;

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(itemId);
    } else {
      await updateCartItem(itemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      navigate('/checkout');
    }
  };

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-white">购物车</h1>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="max-w-4xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-8 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
              <ShoppingBag className="w-16 h-16 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">购物车是空的</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              您还没有添加任何商品到购物车。去商店看看有什么好东西吧！
            </p>
            <button
              onClick={handleContinueShopping}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              开始购物
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">购物车</h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-300">
                {getCartItemCount()} 件商品
              </span>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  清空购物车
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                      <img
                        src={item.product.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${item.product.name} hardware device`)}&image_size=square_hd`}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-2">
                        {item.product.category}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-yellow-400 font-bold text-lg">
                          {item.product.price} LUM
                        </span>
                        <span className="text-slate-500 text-sm">
                          库存: {item.product.stock_quantity}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-white" />
                      </button>
                      <span className="w-12 text-center text-white font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock_quantity}
                        className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-0">
                      <p className="text-white font-bold text-lg">
                        {(item.product.price * item.quantity).toFixed(0)} LUM
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors mt-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
                  <span>商品数量</span>
                  <span>{getCartItemCount()} 件</span>
                </div>
                
                <div className="flex justify-between text-slate-300">
                  <span>商品总价</span>
                  <span>{getCartTotal()} LUM</span>
                </div>
                
                <div className="flex justify-between text-slate-300">
                  <span>配送费</span>
                  <span className="text-green-400">免费</span>
                </div>
                
                <div className="border-t border-slate-600 pt-4">
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>总计</span>
                    <span className="text-yellow-400">{getCartTotal()} LUM</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  前往结算
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleContinueShopping}
                  className="w-full px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors font-medium"
                >
                  继续购物
                </button>
              </div>

              {/* Security Info */}
              <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 text-center">
                  🔒 安全支付 • 使用 LUM 代币结算
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}