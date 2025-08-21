import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, Minus, Plus, Shield, Truck, RotateCcw } from 'lucide-react';
import { useShop } from '@/contexts/ShopContext';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useShop();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
      fetchReviews(id);
      fetchRecommendedProducts(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      
      const data = await response.json();
      setProduct(data.product);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchRecommendedProducts = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/recommended`);
      if (!response.ok) throw new Error('Failed to fetch recommended products');
      
      const data = await response.json();
      setRecommendedProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch recommended products:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addToCart(product.id, quantity);
      // Show success message
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 0)) {
      setQuantity(newQuantity);
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '产品未找到'}</p>
          <button
            onClick={() => navigate('/shop')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回商店
          </button>
        </div>
      </div>
    );
  }

  const productImages = [
    product.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${product.name} hardware device product photo`)}&image_size=square_hd`,
    `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${product.name} hardware device side view`)}&image_size=square_hd`,
    `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${product.name} hardware device back view`)}&image_size=square_hd`,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回商店
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700"
            >
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            <div className="flex gap-2">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? 'border-blue-500' : 'border-slate-600'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <span>{product.category}</span>
                <span>•</span>
                <span>SKU: {product.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                  <span className="text-slate-300 ml-2">
                    {averageRating.toFixed(1)} ({reviews.length} 评价)
                  </span>
                </div>
              </div>
              
              <p className="text-slate-300 leading-relaxed">{product.description}</p>
            </div>

            {/* Price and Stock */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-3xl font-bold text-yellow-400">
                    {product.price} LUM
                  </span>
                  <p className="text-slate-400 text-sm mt-1">
                    库存: {product.stock_quantity} 件
                  </p>
                </div>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-3 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-slate-300">数量:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="w-12 text-center text-white font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock_quantity}
                    className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 font-semibold"
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock_quantity === 0 ? '缺货' : '加入购物车'}
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">质量保证</p>
              </div>
              <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <Truck className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">免费配送</p>
              </div>
              <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <RotateCcw className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">30天退换</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white mb-6">用户评价</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.slice(0, 4).map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white">{review.user_name}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-300 mb-2">{review.comment}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white mb-6">推荐产品</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProducts.map((recProduct) => (
                <motion.div
                  key={recProduct.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate(`/shop/product/${recProduct.id}`)}
                >
                  <img
                    src={recProduct.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${recProduct.name} hardware device`)}&image_size=square_hd`}
                    alt={recProduct.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {recProduct.name}
                    </h3>
                    <p className="text-yellow-400 font-bold">{recProduct.price} LUM</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}