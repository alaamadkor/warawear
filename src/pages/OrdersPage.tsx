import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, Truck, CheckCircle, XCircle, ShoppingBag, X, Search, Undo2, Heart, MessageCircle } from 'lucide-react';
import { useStore, Order, getColorLabel } from '../store/useStore';
import { ReactNode } from 'react';
import { loadAllOrdersFromFirestore } from '../lib/ordersService';

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; icon: ReactNode; bg: string }> = {
  pending: { label: 'في الانتظار', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: <Clock className="w-4 h-4 text-yellow-500" /> },
  processing: { label: 'جاري التجهيز', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Package className="w-4 h-4 text-blue-500" /> },
  shipped: { label: 'تم الشحن', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: <Truck className="w-4 h-4 text-purple-500" /> },
  delivered: { label: 'تم التسليم', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  cancelled: { label: 'ملغي', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-4 h-4 text-red-500" /> },
  returned: { label: 'طلب استرجاع', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <Undo2 className="w-4 h-4 text-orange-500" /> },
};

function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? `{${key}}`);
}

export default function OrdersPage() {
  const { orders, currentUser, setActivePage, siteSettings, cancelOrder, requestReturn, showNotification } = useStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [cancelledOrderId, setCancelledOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadAllOrdersFromFirestore().then((remote) => {
      if (remote.length > 0) useStore.setState({ orders: remote });
    });
  }, []);

  const myOrders = orders.filter(o =>
    currentUser
      ? o.userId === currentUser.id
      : searched && o.phone === phoneQuery
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-900 font-cairo">طلباتي</h1>
              <p className="text-gray-500 font-cairo text-sm mt-1">تتبع حالة طلباتك</p>
            </div>
            {myOrders.length > 0 && (
              <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-bold rounded-full font-cairo">
                {myOrders.length} طلب
              </span>
            )}
          </div>

          {!currentUser && !searched && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
              <div className="text-center mb-6">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-lg font-bold text-gray-900 font-cairo mb-1">ابحث عن طلباتك</p>
                <p className="text-sm text-gray-500 font-cairo">ادخل رقم الموبايل المسجل في الطلب</p>
              </div>
              <form onSubmit={e => { e.preventDefault(); setSearched(true); }} className="max-w-sm mx-auto">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneQuery}
                    onChange={e => { setPhoneQuery(e.target.value); setSearched(false); }}
                    placeholder="01XXXXXXXXX"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 text-center"
                    required
                  />
                  <button type="submit" className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo font-bold hover:bg-pink-600 transition-all">
                    بحث
                  </button>
                </div>
              </form>
            </div>
          )}

          {searched && !currentUser && myOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-900 font-cairo mb-2">مافيش طلبات بهذا الرقم</p>
              <p className="text-gray-400 font-cairo mb-6">تأكد من رقم الموبايل أو ابدأ التسوق</p>
              <button onClick={() => setActivePage('shop')} className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo font-bold hover:bg-pink-600 transition-all">
                تسوق الآن
              </button>
            </div>
          )}

          {currentUser && myOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-900 font-cairo mb-2">مفيش طلبات لحد دلوقتي</p>
              <p className="text-gray-400 font-cairo mb-6">ابدأ التسوق وهتلاقي طلباتك هنا</p>
              <button onClick={() => setActivePage('shop')} className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-cairo font-bold hover:bg-pink-600 transition-all">
                تسوق الآن
              </button>
            </div>
          )}

          {searched && !currentUser && siteSettings.orderTrackingMessage && (
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-5 mb-6 shadow-lg">
              <p className="text-sm font-cairo leading-relaxed">{siteSettings.orderTrackingMessage}</p>
            </div>
          )}

          {myOrders.length > 0 && (
            <div className="space-y-4">
              {myOrders.map((order, i) => {
                const status = STATUS_CONFIG[order.status];
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-400 font-cairo">رقم الطلب</p>
                          <p className="font-black text-gray-900 font-cairo text-sm">{order.id}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-100" />
                        <div>
                          <p className="text-xs text-gray-400 font-cairo">تاريخ الطلب</p>
                          <p className="font-semibold text-gray-700 font-cairo text-sm">{order.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-cairo font-bold ${status.bg} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </div>
                        <p className="font-black text-gray-900 font-cairo">{order.total.toLocaleString()} جنيه</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="p-4">
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {order.items.map(item => (
                          <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex-shrink-0 flex items-center gap-2 bg-gray-50 rounded-xl p-2 pr-3">
                            <img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 object-cover rounded-lg" />
                            <div>
                              <p className="text-xs font-semibold text-gray-900 font-cairo line-clamp-1 max-w-[100px]">{item.product.name}</p>
                              <p className="text-xs text-gray-400 font-cairo flex items-center gap-1">
                                {item.size} × {item.quantity}
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: item.color }} />
                                  <span className="text-[10px]">{getColorLabel(item.color, item.product)}</span>
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div className="flex gap-4 text-xs text-gray-500 font-cairo">
                          <span>📍 {order.address}</span>
                          <span>📞 {order.phone}</span>
                          <span>💳 {order.paymentMethod === 'cash' ? 'كاش عند الاستلام' : order.paymentMethod === 'instapay' ? 'InstaPay' : order.paymentMethod === 'vodafone' ? 'فودافون كاش' : order.paymentMethod}</span>
                        </div>
                        {/* Progress */}
                        <div className="flex items-center gap-1">
                          {(['pending', 'processing', 'shipped', 'delivered'] as const).map((s, idx) => (
                            <div
                              key={s}
                              className={`w-2 h-2 rounded-full ${
                                ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= idx
                                  ? 'bg-pink-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
      {selectedOrderId && (() => {
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return null;
        return (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderId(null)} className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl" style={{ maxHeight: '90vh' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900 font-cairo">تفاصيل الطلب {order.id}</h2>
                  <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 font-cairo mb-2">🚚 بيانات الشحن</h3>
                    <div className="text-sm font-cairo text-gray-600">
                      <span>📍 <span className="font-bold text-gray-900">{order.address}</span></span><br />
                      <span>📞 <span className="font-bold text-gray-900">{order.phone}</span></span><br />
                      <span>💳 <span className="font-bold text-gray-900">{order.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : order.paymentMethod === 'instapay' ? 'InstaPay' : order.paymentMethod === 'vodafone' ? 'فودافون كاش' : order.paymentMethod}</span></span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 font-cairo mb-3">🛒 المنتجات</h3>
                    <div className="space-y-3">
                      {order.items.map(item => (
                        <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                          <img src={item.product.images[0]} alt={item.product.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 font-cairo text-sm">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-cairo">مقاس: {item.size}</span>
                              <span className="flex items-center gap-1 text-xs text-gray-500 font-cairo">
                                اللون: <span className="w-4 h-4 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: item.color }} />
                              </span>
                              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-cairo">× {item.quantity}</span>
                            </div>
                            <p className="text-sm font-bold text-pink-600 font-cairo mt-1">{(item.product.price * item.quantity).toLocaleString()} جنيه</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {(order.subtotal !== undefined || order.couponCode || order.shipping !== undefined) && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm font-cairo text-gray-600">
                      {order.subtotal !== undefined && (
                        <div className="flex justify-between">
                          <span>المجموع الفرعي</span>
                          <span className="font-bold text-gray-900">{order.subtotal.toLocaleString()} ج</span>
                        </div>
                      )}
                      {order.couponCode && (
                        <div className="flex justify-between text-red-500">
                          <span>خصم الكوبون ({order.couponCode})</span>
                          <span className="font-bold">-{order.couponDiscount?.toLocaleString()} ج</span>
                        </div>
                      )}
                      {order.shipping !== undefined && (
                        <div className="flex justify-between">
                          <span>الشحن</span>
                          <span className={`font-bold ${order.shipping === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {order.shipping === 0 ? 'مجاني 🎉' : `${order.shipping} ج`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl p-4 text-center">
                    <p className="text-sm font-cairo opacity-80">الإجمالي</p>
                    <p className="text-2xl font-black font-cairo">{order.total.toLocaleString()} جنيه</p>
                  </div>
                  {(order.cancelReason || order.returnReason) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 font-cairo mb-1">
                        🗒 سبب {order.status === 'cancelled' ? 'الإلغاء' : 'الاسترجاع'}
                      </h3>
                      <p className="text-sm font-cairo text-gray-700">{order.cancelReason || order.returnReason}</p>
                      {order.statusUpdatedAt && (
                        <p className="text-xs text-gray-400 font-cairo mt-1">{new Date(order.statusUpdatedAt).toLocaleString('ar-EG')}</p>
                      )}
                    </div>
                  )}
                  {(order.status === 'pending' || order.status === 'processing') && (
                    <button
                      onClick={() => { setCancelTarget(order.id); setActionReason(''); }}
                      className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold font-cairo text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
                    >
                      <XCircle className="w-4 h-4" /> إلغاء الطلب
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => { setReturnTarget(order.id); setActionReason(''); }}
                      className="w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-bold font-cairo text-sm hover:bg-orange-100 transition-all flex items-center justify-center gap-2 border border-orange-100"
                    >
                      <Undo2 className="w-4 h-4" /> طلب استرجاع
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>

    {/* Cancel / Return confirmation modal */}
    <AnimatePresence>
      {(cancelTarget || returnTarget) && (() => {
        const isCancel = !!cancelTarget;
        return (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setCancelTarget(null); setReturnTarget(null); setActionReason(''); }} className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-3xl z-50 overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: isCancel ? '#fee2e2' : '#ffedd5' }}>
                  {isCancel ? <XCircle className="w-7 h-7 text-red-500" /> : <Undo2 className="w-7 h-7 text-orange-500" />}
                </div>
                <h2 className="text-xl font-black text-gray-900 font-cairo text-center mb-2">
                  {isCancel ? 'تأكيد إلغاء الطلب' : 'تأكيد طلب الاسترجاع'}
                </h2>
                <p className="text-sm text-gray-500 font-cairo text-center mb-4">
                  {isCancel
                    ? 'متأسفين إنك عايز تلغي طلبك. قولنا السبب لو تحب، وممكن نساعدك في أي حاجة.'
                    : 'قادر يساعدنا لو تحب تكتب سبب طلب الاسترجاع.'}
                </p>
                <textarea
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  rows={3}
                  placeholder="اكتب السبب (اختياري)..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none mb-3"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCancelTarget(null); setReturnTarget(null); setActionReason(''); }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={() => {
                      const reason = actionReason.trim() || 'بدون سبب';
                      if (cancelTarget) {
                        cancelOrder(cancelTarget, reason);
                        setCancelledOrderId(cancelTarget);
                        setCancelTarget(null);
                        setSelectedOrderId(null);
                        showNotification('تم إلغاء الطلب. إحنا آسفين 💔');
                      }
                      if (returnTarget) {
                        requestReturn(returnTarget, reason);
                        setReturnTarget(null);
                        setSelectedOrderId(null);
                        showNotification('تم إرسال طلب الاسترجاع بنجاح ✓');
                      }
                      setActionReason('');
                    }}
                    className="flex-1 py-3 text-white rounded-xl font-bold font-cairo text-sm transition-all"
                    style={{ backgroundColor: isCancel ? '#ef4444' : '#f97316' }}
                  >
                    {isCancel ? 'تأكيد الإلغاء' : 'تأكيد الاسترجاع'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>

    {/* Apology message after cancellation */}
    <AnimatePresence>
      {cancelledOrderId && (() => {
        const order = orders.find(o => o.id === cancelledOrderId);
        if (!order) return null;
        const apology = fillTemplate(
          siteSettings.cancelNotifyTemplate || '💔 إحنا آسفين يا {customerName} ❤️ لو منتجاتنا معجبتكيش، وعد مننا إحنا شغالين على تحسين الجودة.',
          { orderId: order.id, customerName: order.userName || 'صديقنا', total: order.total.toLocaleString() }
        );
        const waNumber = (siteSettings.whatsappNumber || '').replace(/^\+|^00/, '');
        const waLink = waNumber
          ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`أهلاً Style It 👋، أنا ${order.userName || ''} — طلبي #${order.id} اتعمل له إلغاء وكنت محتاج أساعدكم.`)}`
          : null;
        return (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCancelledOrderId(null)} className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl" style={{ maxHeight: '90vh' }}>
              <div className="p-8 text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: '#ffe4e6' }}
                >
                  <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-900 font-cairo mb-2">إحنا آسفين يا {order.userName || 'صديقنا'} 💔</h2>
                <p className="text-gray-600 font-cairo text-sm leading-relaxed whitespace-pre-line mb-2">{apology}</p>
                <p className="text-gray-400 font-cairo text-xs mb-6">طلبك #{order.id} اتلغى بنجاح.</p>
                <div className="flex flex-col gap-3">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-green-600 transition-all">
                      <MessageCircle className="w-4 h-4" /> كلمنا على واتساب
                    </a>
                  )}
                  <button onClick={() => setCancelledOrderId(null)} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all">
                    تمام، شكراً
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>
    </>
  );
}
