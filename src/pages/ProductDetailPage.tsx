import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ShoppingCart, Plus, Minus, Share2, ChevronLeft, ChevronRight, X, Link, MessageCircle
} from 'lucide-react';
import { useStore, Size, getColorLabel, getAvailableSizes, getAvailableColors, getStock, getProductImages } from '../store/useStore';

interface Props { productId: string; }

export default function ProductDetailPage({ productId }: Props) {
  const { products, currentUser, toggleWishlist, addToCart, setActivePage, showNotification } = useStore();
  const product = products.find(p => p.id === productId);

  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😕</p>
        <p className="font-cairo text-gray-600">المنتج مش موجود</p>
        <button onClick={() => setActivePage('shop')} className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo hover:bg-pink-600">
          ارجع للمتجر
        </button>
      </div>
    );
  }

  const isWishlisted = currentUser?.wishlist?.includes(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;

  const availableColors = getAvailableColors(product);
  const availableSizes = getAvailableSizes(product, selectedColor || undefined);
  const currentStock = selectedSize && selectedColor ? getStock(product, selectedSize, selectedColor) : 0;
  const displayImages = getProductImages(product, selectedColor || undefined);

  const handleAddToCart = () => {
    if (!selectedSize) { showNotification('اختر المقاس أولاً', 'error'); return; }
    if (!selectedColor) { showNotification('اختر اللون أولاً', 'error'); return; }
    if (currentStock <= 0) { showNotification('المنتج نفد من المخزون', 'error'); return; }
    addToCart(product, selectedSize, selectedColor, quantity);
    showNotification(`تمت إضافة "${product.name}" للسلة ✓`);
    useStore.getState().setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 font-cairo mb-6">
          <button onClick={() => setActivePage('home')} className="hover:text-pink-500 transition-colors">الرئيسية</button>
          <ChevronLeft className="w-4 h-4" />
          <button onClick={() => setActivePage('shop')} className="hover:text-pink-500 transition-colors">المتجر</button>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images */}
          <div className="space-y-4">
            <motion.div
              key={imgIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative aspect-square bg-gray-100 rounded-3xl overflow-hidden"
            >
              <img src={displayImages[imgIndex] || displayImages[0] || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              {discount > 0 && (
                <span className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-xl font-cairo">
                  -{discount}%
                </span>
              )}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setImgIndex(i => Math.min(displayImages.length - 1, i + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </motion.div>
            {displayImages.length > 1 && (
              <div className="flex gap-3">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-pink-500' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <span className="text-sm text-pink-500 font-cairo font-medium">{product.category}</span>
              <h1 className="text-3xl font-black text-gray-900 font-cairo mt-1">{product.name}</h1>
              <div className="flex items-center gap-3 mt-3">
                {selectedSize && selectedColor ? (
                  <span className={`text-sm font-cairo font-medium ${currentStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {currentStock > 0 ? `✓ متاح (${currentStock} قطعة)` : '✗ نفد المخزون لهذا المقاس واللون'}
                  </span>
                ) : (
                  <span className="text-sm font-cairo font-medium text-gray-500">
                    اختر المقاس واللون لمعرفة التوفر
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-gray-900 font-cairo">{product.price.toLocaleString()} جنيه</span>
              {product.oldPrice && (
                <div>
                  <span className="text-xl text-gray-400 line-through font-cairo">{product.oldPrice.toLocaleString()}</span>
                  <span className="block text-sm text-red-500 font-cairo font-bold">وفرت {(product.oldPrice - product.price).toLocaleString()} جنيه</span>
                </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <p className={`text-sm font-semibold font-cairo mb-2 ${selectedColor ? 'text-gray-700' : 'text-orange-500'}`}>
                {selectedColor ? 'اللون:' : 'اختر اللون أولاً'}
              </p>
              <div className="flex gap-3 flex-wrap">
                {availableColors.map(c => (
                  <button
                    key={c}
                    onClick={() => { setSelectedColor(c); setImgIndex(0); }}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      selectedColor === c ? 'scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-full border-4 transition-all shadow-md ${
                      selectedColor === c ? 'border-pink-500 shadow-lg' : 'border-gray-200 hover:border-gray-400'
                    }`}
                      style={{ backgroundColor: c }}
                    />
                    <span className={`text-[11px] font-cairo font-bold transition-all ${
                      selectedColor === c ? 'text-pink-600' : 'text-gray-500'
                    }`}>
                      {getColorLabel(c, product)}
                    </span>
                  </button>
                ))}
                {availableColors.length === 0 && (
                  <span className="text-sm text-red-500 font-cairo">لا توجد ألوان متاحة</span>
                )}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className={`text-sm font-semibold font-cairo mb-2 ${selectedSize ? 'text-gray-700' : 'text-orange-500'}`}>
                {selectedSize ? 'المقاس:' : 'اختر المقاس أولاً'}
              </p>
              <div className="flex gap-2 flex-wrap">
                {selectedColor ? (
                  availableSizes.length > 0 ? availableSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold font-cairo border-2 transition-all ${
                        selectedSize === size
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      {size}
                    </button>
                  )) : <span className="text-sm text-red-500 font-cairo">لا توجد مقاسات متاحة لهذا اللون</span>
                ) : (
                  product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold font-cairo border-2 transition-all ${
                        selectedSize === size
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-gray-700 font-cairo mb-2">الكمية:</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold font-cairo w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(currentStock || 1, q + 1))}
                  className="w-10 h-10 border border-pink-200 bg-pink-50 rounded-xl flex items-center justify-center hover:bg-pink-100 transition-all text-pink-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {selectedSize && selectedColor && currentStock > 0 && (
                  <span className="text-xs text-gray-400 font-cairo">({currentStock} متاح)</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                disabled={currentStock === 0 || !selectedSize || !selectedColor}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold font-cairo text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                {currentStock === 0 ? 'نفد المخزون' : !selectedSize || !selectedColor ? 'اختر المقاس واللون' : 'أضف للسلة'}
              </motion.button>
              <button
                onClick={() => {
                  if (!currentUser) { showNotification('سجل دخولك أولاً', 'error'); return; }
                  toggleWishlist(product.id);
                  showNotification(isWishlisted ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة للمفضلة ❤️', isWishlisted ? 'info' : 'success');
                }}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                  isWishlisted ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
              <button onClick={() => setShowShareModal(true)} className="w-14 h-14 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6">
            <p className="text-gray-600 font-cairo leading-relaxed">{product.description}</p>
          </div>
        </div>

      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (() => {
          const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
          const shareText = `${product.name} - ${product.price.toLocaleString()} جنيه`;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)} className="fixed inset-0 bg-black/50 z-50" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-3xl z-50 shadow-2xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-gray-900 font-cairo">مشاركة المنتج</h3>
                  <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-cairo font-bold text-gray-900">واتساب</span>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      f
                    </div>
                    <span className="font-cairo font-bold text-gray-900">فيسبوك</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      𝕏
                    </div>
                    <span className="font-cairo font-bold text-gray-900">تويتر</span>
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      showNotification('تم نسخ الرابط ✓');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all w-full"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Link className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-cairo font-bold text-gray-900">{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
