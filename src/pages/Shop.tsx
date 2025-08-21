import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingCart, Star, Heart } from 'lucide-react';
import { useShop } from '@/contexts/ShopContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
}

export default function Shop() {
  const { state, fetchProducts, setSelectedCategory, setSearchQuery, addToCart } = useShop();
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts(state.selectedCategory || undefined, state.searchQuery || undefined);
  }, [state.selectedCategory, state.searchQuery]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    setSearchQuery(query);
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      // Show success message (you can implement toast notification here)
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  const sortedProducts = [...state.products].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Product];
    let bValue: any = b[sortBy as keyof Product];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">硬件商店</h1>
              <p className="text-slate-300">发现最新的科技产品和硬件设备</p>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="search"
                  placeholder="搜索产品..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue={state.searchQuery}
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">筛选</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden text-slate-400 hover:text-white"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
              
              <AnimatePresence>
                {(showFilters || window.innerWidth >= 1024) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6"
                  >
                    {/* Categories */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">分类</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleCategoryFilter(null)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            !state.selectedCategory
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          全部
                        </button>
                        {state.categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => handleCategoryFilter(category)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              state.selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">排序</h4>
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setSortBy(field);
                          setSortOrder(order as 'asc' | 'desc');
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="name-asc">名称 A-Z</option>
                        <option value="name-desc">名称 Z-A</option>
                        <option value="price-asc">价格低到高</option>
                        <option value="price-desc">价格高到低</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {state.loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : state.error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{state.error}</p>
                <button
                  onClick={() => fetchProducts()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重试
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-slate-300">
                    找到 {sortedProducts.length} 个产品
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all duration-300 group"
                    >
                      <div className="relative">
                        <img
                          src={product.image_url || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`${product.name} hardware device product photo`)}&image_size=square_hd`}
                          alt={product.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.has(product.id) ? 'fill-red-500 text-red-500' : ''
                            }`}
                          />
                        </button>
                        {product.stock_quantity === 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold">缺货</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            <Link to={`/shop/product/${product.id}`}>
                              {product.name}
                            </Link>
                          </h3>
                          <div className="flex items-center text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm ml-1">4.5</span>
                          </div>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-yellow-400">
                              {product.price} LUM
                            </span>
                            <p className="text-xs text-slate-500">
                              库存: {product.stock_quantity}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => handleAddToCart(product.id)}
                            disabled={product.stock_quantity === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            加入购物车
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {sortedProducts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400 mb-4">没有找到匹配的产品</p>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      清除筛选
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}