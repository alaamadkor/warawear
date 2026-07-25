import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, Product, getColorLabel, getTotalStock } from '../store/useStore';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { currentUser, toggleWishlist, showNotification } = useStore();
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const isWishlisted = currentUser?.wishlist?.includes(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const totalStock = getTotalStock(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    useStore.getState().setActivePage(`product-${product.id}`);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) { showNotification('سجل دخولك أولاً', 'error'); return; }
    toggleWishlist(product.id);
    showNotification(isWishlisted ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة للمفضلة ❤️', isWishlisted ? 'info' : 'success');
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 group"
      onClick={() => useStore.getState().setActivePage(`product-${product.id}`)}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-100 aspect-[3/4]">
        <img
          src={product.images[imageIndex] || product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onClick={e => { e.stopPropagation(); useStore.getState().setActivePage(`product-${product.id}`); }}
        />
        {/* Image navigation */}
        {product.images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setImageIndex(prev => (prev - 1 + product.images.length) % product.images.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4 text-gray-800" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setImageIndex(prev => (prev + 1) % product.images.length); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-800" />
            </button>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1" dir="ltr">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setImageIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === imageIndex ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg font-cairo">
              -{discount}%
            </span>
          )}
          {product.newArrival && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg font-cairo">
              جديد
            </span>
          )}
          {totalStock < 5 && totalStock > 0 && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg font-cairo">
              آخر {totalStock}
            </span>
          )}
          {totalStock === 0 && (
            <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded-lg font-cairo">
              نفد
            </span>
          )}
        </div>
        {/* Actions overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          className="absolute top-3 left-3 flex flex-col gap-2"
        >
          <button
            onClick={handleWishlist}
            className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all ${
              isWishlisted ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); useStore.getState().setActivePage(`product-${product.id}`); }}
            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
          </button>
        </motion.div>
        {/* Add to Cart on Hover */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: hovered ? 0 : 20, opacity: hovered ? 1 : 0 }}
          onClick={handleAddToCart}
          disabled={totalStock === 0}
          className="absolute bottom-3 left-3 right-3 bg-gray-900 text-white py-2 rounded-xl text-xs font-bold font-cairo flex items-center justify-center gap-2 hover:bg-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          {totalStock === 0 ? 'نفد المخزون' : 'أضف للسلة'}
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-gray-400 font-cairo mb-1">{product.category}</p>
        <h3 className="font-semibold text-gray-900 text-sm font-cairo line-clamp-1">{product.name}</h3>
        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-black text-gray-900 font-cairo">{product.price.toLocaleString()} ج</span>
          {product.oldPrice && (
            <span className="text-xs text-gray-400 line-through font-cairo">{product.oldPrice.toLocaleString()}</span>
          )}
        </div>
        {/* Colors */}
        <div className="flex gap-2 mt-1">
          {product.colors.slice(0, 3).map(c => (
            <div key={c} className="flex flex-col items-center gap-0.5">
              <span
                className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                style={{ backgroundColor: c }}
              />
              <span className="text-[9px] text-gray-500 font-cairo font-medium leading-tight">{getColorLabel(c, product)}</span>
            </div>
          ))}
          {product.colors.length > 3 && (
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[9px] text-gray-500 font-bold">+</span>
              <span className="text-[9px] text-gray-400 font-cairo">{product.colors.length - 3}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
