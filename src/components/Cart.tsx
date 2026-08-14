import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Tag, Check, X as XIcon } from 'lucide-react';
import { useStore, getColorLabel, getProductImages, getStock } from '../store/useStore';

export default function Cart() {
  const {
    cart, isCartOpen, setIsCartOpen, removeFromCart,
    updateCartQty, clearCart, setActivePage, siteSettings,
    appliedCoupon, applyCoupon, removeCoupon, showNotification
  } = useStore();
  const [couponInput, setCouponInput] = useState('');

  const subtotal = cart.reduce((a, i) => a + i.product.price * i.quantity, 0);
  const saleDiscount = cart.reduce(
    (a, i) => a + ((i.product.oldPrice || i.product.price) - i.product.price) * i.quantity, 0
  );
  const total = appliedCoupon ? subtotal - appliedCoupon.discount : subtotal;
  const shippingCost = siteSettings.shippingCost ?? 50;
  const freeShippingThreshold = siteSettings.freeShippingThreshold ?? 500;
  const shipping = total >= freeShippingThreshold ? 0 : shippingCost;
  const grandTotal = total + shipping;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-bold text-gray-900 font-cairo">سلة التسوق</h2>
                <span className="px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full font-cairo">
                  {cart.reduce((a, i) => a + i.quantity, 0)}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
                  <p className="text-gray-500 font-cairo text-lg">سلتك فاضية!</p>
                  <p className="text-gray-400 font-cairo text-sm mt-1">أضف منتجات للسلة وابدأ التسوق</p>
                  <button
                    onClick={() => { setActivePage('shop'); setIsCartOpen(false); }}
                    className="mt-6 px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo text-sm font-medium hover:bg-pink-600 transition-all"
                  >
                    تصفح المنتجات
                  </button>
                </div>
              ) : (
                <>
                  {cart.map((item, idx) => (
                    <motion.div
                      key={`${item.product.id}-${item.size}-${item.color}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <img
                        src={getProductImages(item.product, item.color)[0] || item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm font-cairo truncate">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-cairo">مقاس: {item.size}</span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[10px] text-gray-400 font-cairo">{getColorLabel(item.color, item.product)}</span>
                          </span>
                        </div>
                        <p className="text-pink-600 font-bold text-sm mt-1 font-cairo">
                          {(item.product.price * item.quantity).toLocaleString()} جنيه
                        </p>
                        {/* Qty Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) updateCartQty(item.product.id, item.size, item.color, item.quantity - 1);
                              else removeFromCart(item.product.id, item.size, item.color);
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold font-cairo">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const maxStock = getStock(item.product, item.size as string, item.color);
                              if (item.quantity < maxStock) updateCartQty(item.product.id, item.size, item.color, item.quantity + 1);
                            }}
                            disabled={item.quantity >= getStock(item.product, item.size as string, item.color)}
                            className="w-6 h-6 flex items-center justify-center bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 transition-all text-pink-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all self-start"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="w-full text-center text-sm text-red-400 hover:text-red-600 py-2 font-cairo transition-all"
                    >
                      مسح السلة كلها
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3 bg-gray-50">
                {/* Coupon */}
                <div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700 font-cairo">{appliedCoupon.code}</span>
                        <span className="text-xs text-green-500 font-cairo">-{appliedCoupon.discount.toLocaleString()} ج</span>
                      </div>
                      <button onClick={removeCoupon} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value)}
                        placeholder="كود الخصم"
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                      <button onClick={() => {
                        if (applyCoupon(couponInput)) {
                          showNotification('✅ تم تطبيق الكود بنجاح!');
                          setCouponInput('');
                        } else {
                          showNotification('❌ كود الخصم غير صالح', 'error');
                        }
                      }}
                        className="px-4 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-pink-600 transition-all">
                        تطبيق
                      </button>
                    </div>
                  )}
                </div>
                {saleDiscount > 0 && (
                  <div className="flex justify-between text-sm font-cairo text-green-600">
                    <span>وفرت</span>
                    <span className="font-bold">{saleDiscount.toLocaleString()} ج</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-sm font-cairo text-red-500">
                    <span>خصم الكوبون</span>
                    <span className="font-bold">-{appliedCoupon.discount.toLocaleString()} ج</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-cairo">
                  <span className="text-gray-600">الشحن</span>
                  <span className={`font-bold ${shipping === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {shipping === 0 ? 'مجاني 🎉' : `${shipping} جنيه`}
                  </span>
                </div>
                {shipping > 0 && freeShippingThreshold > 0 && (
                  <p className="text-xs text-gray-400 font-cairo bg-white rounded-lg px-3 py-2">
                    🚚 أضف {(freeShippingThreshold - total).toLocaleString()} جنيه للحصول على شحن مجاني
                  </p>
                )}
                {shipping === 0 && freeShippingThreshold > 0 && (
                  <p className="text-xs text-green-600 font-cairo bg-green-50 rounded-lg px-3 py-2">
                    🎉 حصلت على شحن مجاني للطلبات من {freeShippingThreshold.toLocaleString()} جنيه فأكثر
                  </p>
                )}
                <div className="flex justify-between font-cairo">
                  <span className="text-gray-600">الإجمالي</span>
                  <span className="font-bold text-gray-900 text-lg">{Math.max(0, grandTotal).toLocaleString()} ج</span>
                </div>
                <button
                  onClick={() => { setActivePage('checkout'); setIsCartOpen(false); }}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold font-cairo text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  إتمام الشراء
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
