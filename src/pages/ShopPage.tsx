import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Grid, List, X, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getTotalStock } from '../store/useStore';
import ProductCard from '../components/ProductCard';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'الكل', label: 'الكل' },
  { value: 'رجالي', label: 'رجالي 👔' },
  { value: 'حريمي', label: 'حريمي 👗' },
  { value: 'أطفال', label: 'أطفال 🧒' },
  { value: 'رياضي', label: 'رياضي 🏋️' },
  { value: 'اكسسوارات', label: 'اكسسوارات 👜' },
  { value: 'عطور', label: 'عطور 🧴' },
  { value: 'مستحضرات تجميل', label: 'مستحضرات تجميل 💄' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ShopPage() {
  const { products, selectedCategory, setSelectedCategory, searchQuery } = useStore();
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [viewGrid, setViewGrid] = useState(true);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'الكل') list = list.filter(p => p.category === selectedCategory);
    if (searchQuery) list = list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    list = list.filter(p => getTotalStock(p) > 0 && p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (selectedSizes.length > 0) list = list.filter(p => p.sizes.some(s => selectedSizes.includes(s)));
    if (onSaleOnly) list = list.filter(p => p.oldPrice);
    if (newOnly) list = list.filter(p => p.newArrival);

    switch (sortBy) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'newest': list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      default: break;
    }
    return list;
  }, [products, selectedCategory, searchQuery, priceRange, selectedSizes, sortBy, onSaleOnly, newOnly]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const clearFilters = () => {
    setPriceRange([0, 2000]);
    setSelectedSizes([]);
    setSortBy('default');
    setOnSaleOnly(false);
    setNewOnly(false);
    setSelectedCategory('الكل');
  };

  const hasActiveFilters = selectedCategory !== 'الكل' || selectedSizes.length > 0 || priceRange[0] > 0 || priceRange[1] < 2000 || onSaleOnly || newOnly;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-gray-900 font-cairo">المتجر</h1>
              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full font-cairo">{filtered.length} منتج</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 pr-8 font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer"
                >
                  <option value="default">ترتيب افتراضي</option>
                  <option value="price-asc">السعر: من الأقل</option>
                  <option value="price-desc">السعر: من الأعلى</option>
                  <option value="rating">الأعلى تقييماً</option>
                  <option value="newest">الأحدث</option>
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-cairo border transition-all ${
                  showFilters ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                فلتر
                {hasActiveFilters && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
              </button>
              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewGrid(true)} className={`p-2 ${viewGrid ? 'bg-pink-500 text-white' : 'bg-white text-gray-500'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewGrid(false)} className={`p-2 ${!viewGrid ? 'bg-pink-500 text-white' : 'bg-white text-gray-500'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.filter(c => c.value === 'الكل' || products.some(p => p.category === c.value && getTotalStock(p) > 0)).map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-cairo transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="w-64 bg-white rounded-2xl border border-gray-100 p-5 space-y-6 sticky top-40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 font-cairo">خيارات الفلتر</h3>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-cairo flex items-center gap-1">
                        <X className="w-3 h-3" /> مسح الكل
                      </button>
                    )}
                  </div>

                  {/* Price Range */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 font-cairo mb-3">نطاق السعر</h4>
                    <div className="space-y-3">
                      <input
                        type="range"
                        min="0" max="2000"
                        value={priceRange[1]}
                        onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full accent-pink-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 font-cairo">
                        <span>{priceRange[0]} جنيه</span>
                        <span>{priceRange[1]} جنيه</span>
                      </div>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 font-cairo mb-3">المقاسات</h4>
                    <div className="flex flex-wrap gap-2">
                      {SIZES.map(size => (
                        <button
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-cairo border transition-all ${
                            selectedSizes.includes(size)
                              ? 'bg-pink-500 text-white border-pink-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 font-cairo mb-3">فلاتر سريعة</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onSaleOnly}
                          onChange={e => setOnSaleOnly(e.target.checked)}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <span className="text-sm font-cairo text-gray-600">عروض فقط 🏷️</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newOnly}
                          onChange={e => setNewOnly(e.target.checked)}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <span className="text-sm font-cairo text-gray-600">وصل حديثاً ✨</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🔍</p>
                <p className="text-xl font-bold text-gray-900 font-cairo mb-2">مفيش نتائج</p>
                <p className="text-gray-500 font-cairo mb-6">جرب تغير خيارات الفلتر أو البحث</p>
                <button onClick={clearFilters} className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo text-sm font-medium hover:bg-pink-600 transition-all">
                  مسح الفلاتر
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewGrid ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
