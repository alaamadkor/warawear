import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Plus,
  Edit2, Trash2, Search, Check, X, AlertTriangle, Tag,
  BarChart2, DollarSign, ShoppingCart, UserCheck, TrendingUp, Settings, Smartphone,
  Bell, Image as ImageIcon, ArrowUp, ArrowDown, RefreshCw, Save, Download, Edit3
} from 'lucide-react';
import { useStore, Product, Order, COLOR_NAMES, getTotalStock } from '../store/useStore';
import { saveCustomersToFirestore } from '../lib/ordersService';


type Section = 'dashboard' | 'products' | 'orders' | 'users' | 'analytics' | 'gallery' | 'settings';

const CATEGORIES = ['رجالي', 'حريمي', 'أطفال', 'رياضي', 'اكسسوارات', 'عطور', 'مستحضرات تجميل'] as const;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const AGE_SIZES = Array.from({ length: 14 }, (_, i) => `${i + 1} سنة`);

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'في الانتظار',
  processing: 'جاري التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};
const STATUS_COLORS: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const emptyProduct = {
  name: '',
  price: 0,
  cost: undefined as number | undefined,
  oldPrice: undefined as number | undefined,
  category: 'رجالي' as typeof CATEGORIES[number],
  sizes: [] as string[],
  colors: ['#000000'],
  colorLabels: {} as Record<string, string>,
  description: '',
  stock: {} as Record<string, number>,
  colorImages: {} as Record<string, string[]>,
  featured: false,
  newArrival: false,
  images: ['https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=600'],
};

export default function AdminPage() {
  const { adminSection, setAdminSection, setActivePage, products, orders, users, customers, addProduct, updateProduct, deleteProduct, updateOrderStatus, showNotification, currentUser, siteSettings, updateSiteSettings, unreadOrderIds, markOrdersRead, saveAllToFirestore, deleteCustomer, deleteOrder } = useStore();
  const [productForm, setProductForm] = useState({ ...emptyProduct });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<Order['status'] | 'all'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [statModal, setStatModal] = useState<{type: string; title: string} | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<{name: string; orders: string[]; phone?: string; email?: string; address?: string; city?: string; createdAt: string} | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<{phone: string; name: string; email: string; address: string; city: string} | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });

  const hasUnsavedRef = useRef(false);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const markUnsaved = () => { hasUnsavedRef.current = true; };

  const [stagedSettings, setStagedSettings] = useState(siteSettings);
  useEffect(() => {
    if (!hasUnsavedRef.current) setStagedSettings(siteSettings);
  }, [siteSettings]);
  const updateStagedSettings = (settings: Partial<typeof siteSettings>) => {
    markUnsaved();
    setStagedSettings(prev => ({...prev, ...settings}));
  };

  const handleUpdateSettings = (settings: Partial<typeof siteSettings>) => {
    markUnsaved();
    updateSiteSettings(settings);
  };

  const handleAddProduct = (product: Product) => { markUnsaved(); addProduct(product); };
  const handleUpdateProduct = (product: Product) => { markUnsaved(); updateProduct(product); };
  const handleDeleteProduct = (id: string) => { markUnsaved(); deleteProduct(id); };

  const handleSaveAll = async () => {
    updateSiteSettings(stagedSettings);
    await saveAllToFirestore();
    showNotification('تم حفظ التغييرات ونشرها على جميع الأجهزة ✓', 'success');
    hasUnsavedRef.current = false;
  };
  const analyticsFilteredOrders = useMemo(() => {
    if (analyticsPeriod === 'all') return orders;
    const now = new Date();
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      if (analyticsPeriod === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
        return d >= start && d <= end;
      }
      if (analyticsPeriod === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (analyticsPeriod === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [orders, analyticsPeriod]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <p className="text-xl font-bold font-cairo text-gray-900">غير مصرح لك</p>
        <p className="text-gray-500 font-cairo">هذه الصفحة للمديرين فقط</p>
      </div>
    );
  }

  // Stats
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((a, o) => a + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const lowStock = products.filter(p => { const t = getTotalStock(p); return t < 5 && t > 0; }).length;
  const totalCustomers = users.filter(u => u.role === 'customer').length + customers.length;

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.price || productForm.sizes.length === 0) {
      showNotification('من فضلك اكمل البيانات المطلوبة', 'error');
      return;
    }
    if (editingProductId) {
      handleUpdateProduct({
        ...productForm,
        id: editingProductId,
        rating: products.find(p => p.id === editingProductId)?.rating || 0,
        reviews: products.find(p => p.id === editingProductId)?.reviews || [],
        createdAt: products.find(p => p.id === editingProductId)?.createdAt || new Date().toISOString().split('T')[0],
      } as Product);
      showNotification('تم تحديث المنتج بنجاح ✓');
    } else {
      handleAddProduct({
        ...productForm,
        id: `prod-${Date.now()}`,
        rating: 0,
        reviews: [],
        createdAt: new Date().toISOString().split('T')[0],
      } as Product);
      showNotification('تم إضافة المنتج بنجاح ✓');
    }
    setShowProductModal(false);
    setEditingProductId(null);
    setProductForm({ ...emptyProduct });
  };

  const handleEditProduct = (p: Product) => {
    setProductForm({
      name: p.name,
      price: p.price,
      cost: p.cost,
      oldPrice: p.oldPrice,
      category: p.category as typeof CATEGORIES[number],
      sizes: p.sizes,
      colors: p.colors,
      colorLabels: p.colorLabels || {},
      description: p.description,
      stock: { ...p.stock },
      colorImages: { ...(p.colorImages || {}) },
      featured: p.featured,
      newArrival: p.newArrival,
      images: p.images,
    });
    setEditingProductId(p.id);
    setShowProductModal(true);
    setNewColor('');
    setNewColorName('');
  };

  const navItems: { key: Section; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { key: 'products', label: 'المنتجات', icon: Package },
    { key: 'orders', label: 'الطلبات', icon: ShoppingBag },
    { key: 'users', label: 'العملاء', icon: Users },
    { key: 'analytics', label: 'التحليلات', icon: BarChart2 },
    { key: 'gallery', label: 'معرض الصور', icon: ImageIcon },
    { key: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const filteredOrders = orders.filter(o => orderFilter === 'all' || (orderFilter === 'archive' ? (o.status === 'delivered' || o.status === 'cancelled') : o.status === orderFilter))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xl font-black font-cairo cursor-pointer tracking-wide" onClick={() => setActivePage('shop')}>
                <span style={{ color: siteSettings.primaryColor }}>Style</span>
                <span style={{ color: siteSettings.secondaryColor }}> It</span>
              </p>
              <p className="text-xs text-gray-400 font-cairo">لوحة التحكم</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'orders' && unreadOrderIds.length > 0) {
                  markOrdersRead(unreadOrderIds);
                }
                setAdminSection(item.key);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-cairo font-medium transition-all ${
                adminSection === item.key
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.key === 'orders' && pendingOrders > 0 && (
                <span className="mr-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders}</span>
              )}
            </button>
          ))}
        </nav>
        {/* Notification Bell */}
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              if (unreadOrderIds.length > 0) {
                setAdminSection('orders');
                markOrdersRead(unreadOrderIds);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-cairo font-medium transition-all text-gray-400 hover:bg-gray-800 hover:text-white relative"
          >
            <Bell className="w-5 h-5" />
            إشعارات جديدة
            {unreadOrderIds.length > 0 && (
              <span className="mr-auto bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{unreadOrderIds.length}</span>
            )}
          </button>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-sm font-bold">
              {currentUser.name[0]}
            </div>
            <div>
              <p className="text-sm font-bold font-cairo">{currentUser.name}</p>
              <p className="text-xs text-gray-400 font-cairo">مدير النظام</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 flex border-t border-gray-800 z-40">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => {
              if (item.key === 'orders' && unreadOrderIds.length > 0) {
                markOrdersRead(unreadOrderIds);
              }
              setAdminSection(item.key);
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-cairo transition-all relative ${
              adminSection === item.key ? 'text-pink-400' : 'text-gray-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
            {item.key === 'orders' && unreadOrderIds.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadOrderIds.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {/* Dashboard */}
        {adminSection === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 font-cairo">لوحة التحكم 👋</h1>
              <p className="text-gray-500 font-cairo text-sm">مرحباً {currentUser.name}، إليك ملخص المتجر</p>
            </div>

            {/* New Orders Alert */}
            {unreadOrderIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 animate-bounce" />
                    <div>
                      <p className="font-black font-cairo text-lg">طلبات جديدة! 🎉</p>
                      <p className="text-white/80 font-cairo text-sm">لديك {unreadOrderIds.length} طلب {unreadOrderIds.length === 1 ? 'جديد' : 'جديدة'} في انتظار المراجعة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAdminSection('orders');
                      markOrdersRead(unreadOrderIds);
                    }}
                    className="bg-white text-pink-600 px-5 py-2 rounded-xl font-bold font-cairo text-sm hover:shadow-lg transition-all"
                  >
                    عرض الطلبات
                  </button>
                </div>
              </motion.div>
            )}
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { type: 'revenue', title: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ج`, icon: <DollarSign className="w-6 h-6" />, color: 'from-green-400 to-emerald-600', sub: `من ${orders.filter(o => o.status === 'delivered').length} طلب` },
                { type: 'pending', title: 'طلبات معلقة', value: pendingOrders, icon: <ShoppingCart className="w-6 h-6" />, color: 'from-yellow-400 to-orange-500', sub: 'تحتاج مراجعة' },
                { type: 'products', title: 'إجمالي المنتجات', value: products.length, icon: <Package className="w-6 h-6" />, color: 'from-blue-400 to-blue-600', sub: `${lowStock} منتج مخزون منخفض` },
                { type: 'customers', title: 'إجمالي العملاء', value: totalCustomers, icon: <UserCheck className="w-6 h-6" />, color: 'from-pink-400 to-purple-600', sub: 'عميل مسجل' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setStatModal({ type: stat.type, title: stat.title })}
                  className={`bg-gradient-to-br ${stat.color} text-white p-5 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-white/20 p-2 rounded-xl">{stat.icon}</div>
                  </div>
                  <p className="text-2xl font-black font-cairo">{stat.value}</p>
                  <p className="text-sm font-bold font-cairo mt-1">{stat.title}</p>
                  <p className="text-xs text-white/70 font-cairo mt-0.5">{stat.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 font-cairo">آخر الطلبات</h2>
                <button onClick={() => setAdminSection('orders')} className="text-sm text-pink-500 font-cairo hover:text-pink-600">عرض الكل</button>
              </div>
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-sm text-gray-900 font-cairo">{order.id}</p>
                      <p className="text-xs text-gray-400 font-cairo">{order.userName} • {order.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-cairo font-bold ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                      <p className="font-bold text-sm font-cairo">{order.total.toLocaleString()} ج</p>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-center text-gray-400 font-cairo py-6">لا توجد طلبات بعد</p>}
              </div>
            </div>

            {/* Low Stock Warning */}
            {lowStock > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h2 className="font-black text-orange-800 font-cairo">منتجات مخزونها منخفض</h2>
                </div>
                <div className="space-y-2">
                  {products.filter(p => { const t = getTotalStock(p); return t < 5 && t > 0; }).map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <p className="text-sm font-cairo text-orange-700">{p.name}</p>
                      <span className="text-xs font-bold text-orange-600 font-cairo bg-orange-100 px-2 py-0.5 rounded-full">
                        {getTotalStock(p)} قطعة متبقية
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products */}
        {adminSection === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-black text-gray-900 font-cairo">إدارة المنتجات</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setProductForm({ ...emptyProduct }); setEditingProductId(null); setShowProductModal(true); setNewColor(''); setNewColorName(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-200"
                >
                  <Plus className="w-4 h-4" />
                  إضافة منتج
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف جميع المنتجات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
                      useStore.setState({ products: [], productsUpdatedAt: Date.now() });
                      useStore.getState().saveAllToFirestore();
                      showNotification('تم حذف جميع المنتجات ✓');
                      hasUnsavedRef.current = false;
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الكل
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
              />
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['المنتج', 'الفئة', 'السعر', 'المخزون', 'الحالة', 'إجراءات'].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-bold text-gray-500 font-cairo">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                            <p className="font-semibold text-sm text-gray-900 font-cairo line-clamp-1 max-w-[150px]">{p.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs font-cairo text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{p.category}</span></td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm font-cairo">{p.price.toLocaleString()} ج</p>
                          {p.oldPrice && <p className="text-xs text-gray-400 line-through font-cairo">{p.oldPrice.toLocaleString()}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold font-cairo px-2 py-1 rounded-full ${
                            getTotalStock(p) === 0 ? 'bg-red-100 text-red-700' : getTotalStock(p) < 5 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {getTotalStock(p) === 0 ? 'نفد' : `${getTotalStock(p)} قطعة`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.featured && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-cairo">مميز</span>}
                            {p.newArrival && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-cairo">جديد</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditProduct(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (window.confirm('هتحذف المنتج ده؟')) { handleDeleteProduct(p.id); showNotification('تم حذف المنتج', 'info'); } }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <p className="text-center text-gray-400 font-cairo py-10">لا توجد منتجات</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {adminSection === 'orders' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-black text-gray-900 font-cairo">إدارة الطلبات</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold font-cairo text-sm hover:bg-green-100 transition-all">
                  <Plus className="w-4 h-4" /> إضافة طلب
                </button>
                <button onClick={() => {
                  try {
                    const stored = JSON.parse(localStorage.getItem('wara-wear-storage') || '{}');
                    const newOrders = stored?.state?.orders;
                    const newUnread = stored?.state?.unreadOrderIds;
                    if (newOrders) useStore.setState({ orders: newOrders });
                    if (newUnread) useStore.setState({ unreadOrderIds: newUnread });
                    showNotification('تم تحديث الطلبات ✓');
                  } catch { showNotification('خطأ في التحديث', 'error'); }
                }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all">
                  <RefreshCw className="w-4 h-4" /> تحديث
                </button>
              </div>
            </div>
            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'archive'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setOrderFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-cairo font-medium transition-all ${
                    orderFilter === s ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
                  }`}
                >
                  {s === 'all' ? 'الكل' : s === 'archive' ? 'الأرشيف' : STATUS_LABELS[s]}
                  <span className="mr-1 text-xs opacity-70">
                    ({s === 'all' ? orders.length : s === 'archive' ? orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length : orders.filter(o => o.status === s).length})
                  </span>
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="ابحث باسم المنتج أو رقم التليفون أو رقم الطلب..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div className="space-y-4">
              {[...filteredOrders].filter(o =>
                !orderSearch || o.id.includes(orderSearch) || o.phone.includes(orderSearch) || o.userName.includes(orderSearch) || o.items.some(i => i.product.name.includes(orderSearch))
              ).sort((a, b) => {
                const aPending = a.status === 'pending' || a.status === 'processing' || a.status === 'confirmed';
                const bPending = b.status === 'pending' || b.status === 'processing' || b.status === 'confirmed';
                if (aPending && !bPending) return -1;
                if (!aPending && bPending) return 1;
                return b.createdAt.localeCompare(a.createdAt);
              }).map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelectedOrderId(order.id); if (unreadOrderIds.includes(order.id)) markOrdersRead([order.id]); }}>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <p className="font-black text-gray-900 font-cairo">{order.id}</p>
                      <p className="text-sm text-gray-400 font-cairo">{order.userName} • {order.userEmail} • {order.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={order.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { updateOrderStatus(order.id, e.target.value as Order['status']); showNotification('تم تحديث حالة الطلب ✓'); }}
                        className={`text-sm px-3 py-1.5 rounded-full border font-cairo font-bold cursor-pointer ${STATUS_COLORS[order.status]}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      {siteSettings.whatsappNotificationNumber && (() => {
                        const itemsList = order.items.map(i => `• ${i.product.name} (${i.size} × ${i.quantity}) - ${(i.product.price * i.quantity).toLocaleString()} ج`).join('\n');
                        const paymentLabel = order.paymentMethod === 'cash' ? '💰 كاش عند الاستلام' : order.paymentMethod === 'instapay' ? '💜 InstaPay' : order.paymentMethod === 'vodafone' ? '🔴 فودافون كاش' : order.paymentMethod;
                        const msg = `🛍 *طلب جديد #${order.id}*\n━━━━━━━━━━━━━━━\n👤 *العميل:* ${order.userName}\n📞 *التليفون:* ${order.phone}\n📍 *العنوان:* ${order.address}\n📧 *الإيميل:* ${order.userEmail || '—'}\n💳 *الدفع:* ${paymentLabel}\n💰 *الإجمالي:* ${order.total.toLocaleString()} ج\n━━━━━━━━━━━━━━━\n*المنتجات:*\n${itemsList}\n━━━━━━━━━━━━━━━\n✅ شكراً لطلبك من Style It!`;
                        return (
                          <a href={`https://wa.me/${siteSettings.whatsappNotificationNumber.replace(/^\+|^00/, '')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all" title="أرسل عبر واتساب">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                        );
                      })()}
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm(`حذف الطلب ${order.id}؟`)) { deleteOrder(order.id); showNotification('تم حذف الطلب', 'info'); } }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <p className="font-black text-lg font-cairo">{order.total.toLocaleString()} ج</p>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {order.items.map(item => (
                      <div key={`${item.product.id}-${item.size}`} className="flex-shrink-0 flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                        <img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 object-cover rounded-lg" />
                        <div>
                          <p className="text-xs font-semibold font-cairo text-gray-900 line-clamp-1 max-w-[100px]">{item.product.name}</p>
                          <p className="text-xs text-gray-400 font-cairo flex items-center gap-1">
                            {item.size} × {item.quantity}
                            <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: item.color }} />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4 text-xs text-gray-500 font-cairo flex-wrap">
                    <span>📍 {order.address}</span>
                    <span>📞 {order.phone}</span>
                    <span>💳 {order.paymentMethod === 'cash' ? 'كاش عند الاستلام' : order.paymentMethod === 'instapay' ? 'InstaPay' : order.paymentMethod === 'vodafone' ? 'فودافون كاش' : order.paymentMethod}</span>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <p className="text-center text-gray-400 font-cairo py-10 bg-white rounded-2xl">لا توجد طلبات</p>}
            </div>
          </div>
        )}

        {/* Users */}
        {adminSection === 'users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-black text-gray-900 font-cairo">إدارة العملاء</h1>
              <button
                onClick={() => {
                  const allCustomers = [
                    ...users.filter(u => u.role === 'customer').map(u => ({
                      name: u.name,
                      phone: '',
                      email: u.email,
                      address: '',
                      city: '',
                      ordersCount: orders.filter(o => o.userId === u.id).length,
                      totalSpent: orders.filter(o => o.userId === u.id && o.status === 'delivered').reduce((a, o) => a + o.total, 0),
                      createdAt: u.createdAt,
                    })),
                    ...customers.map(c => ({
                      name: c.name,
                      phone: c.phone,
                      email: c.email || '',
                      address: c.address,
                      city: c.city,
                      ordersCount: c.orders.length,
                      totalSpent: orders.filter(o => c.orders.includes(o.id) && o.status === 'delivered').reduce((a, o) => a + o.total, 0),
                      createdAt: c.createdAt,
                    })),
                  ];
                  const esc = (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                  const headers = ['الاسم', 'رقم الموبايل', 'البريد الإلكتروني', 'العنوان', 'المدينة', 'عدد الطلبات', 'إجمالي المشتريات', 'تاريخ التسجيل'];
                  const rows = allCustomers.map(c => [
                    c.name, c.phone, c.email, c.address, c.city,
                    c.ordersCount.toString(), c.totalSpent.toString(), c.createdAt,
                  ]);
                  const html = '\uFEFF<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta charset="UTF-8"></head><body>' +
                    '<table border="1" style="font-family:Tahoma;font-size:12px;border-collapse:collapse" dir="rtl">' +
                    '<tr style="background:#f97316;color:#fff">' + headers.map(h => '<th style="padding:8px">' + esc(h) + '</th>').join('') + '</tr>' +
                    rows.map(r => '<tr>' + r.map(v => '<td style="padding:6px">' + esc(v) + '</td>').join('') + '</tr>').join('') +
                    '</table></body></html>';
                  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `worka-customers-${new Date().toISOString().split('T')[0]}.xls`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                  showNotification('تم تصدير بيانات العملاء ✓');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-green-600 transition-all shadow-lg shadow-green-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                تصدير Excel
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="ابحث باسم العميل أو رقم التليفون..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['الاسم', 'رقم الموبايل', 'البريد', 'العنوان', 'المدينة', 'الطلبات', 'المشتريات', 'تاريخ التسجيل', 'إجراءات'].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-bold text-gray-500 font-cairo whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'customer').filter(u => !customerSearch || u.name.includes(customerSearch) || u.email.includes(customerSearch)).map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewingCustomer({ name: u.name, orders: orders.filter(o => o.userId === u.id).map(o => o.id), email: u.email, createdAt: u.createdAt })}>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-xs">{u.name[0]}</div><span className="text-sm font-semibold text-gray-900 font-cairo">{u.name}</span></div></td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">—</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">—</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">—</td>
                        <td className="px-4 py-3"><span className="text-xs font-bold font-cairo bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{orders.filter(o => o.userId === u.id).length}</span></td>
                        <td className="px-4 py-3 text-sm font-bold font-cairo text-green-600">{orders.filter(o => o.userId === u.id && o.status === 'delivered').reduce((a, o) => a + o.total, 0).toLocaleString()} ج</td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-cairo">{u.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingCustomer(null); const d = { phone: '', name: u.name, email: u.email, address: '', city: '' }; setEditingCustomer(d); setEditForm(d); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (window.confirm(`حذف العميل ${u.name}؟`)) { useStore.setState(s => ({ users: s.users.filter(x => x.id !== u.id) })); showNotification('تم حذف العميل', 'info'); } }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {[...customers].filter(c => !customerSearch || c.name.includes(customerSearch) || c.phone.includes(customerSearch)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c, i) => (
                      <tr key={`guest-${i}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewingCustomer({ name: c.name, orders: c.orders, phone: c.phone, email: c.email, address: c.address, city: c.city, createdAt: c.createdAt })}>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-black text-xs">{c.name[0]}</div><span className="text-sm font-semibold text-gray-900 font-cairo">{c.name}</span></div></td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-700 font-cairo" dir="ltr">{c.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">{c.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">{c.address || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-cairo">{c.city || '—'}</td>
                        <td className="px-4 py-3"><span className="text-xs font-bold font-cairo bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c.orders.length}</span></td>
                        <td className="px-4 py-3 text-sm font-bold font-cairo text-green-600">{orders.filter(o => c.orders.includes(o.id) && o.status === 'delivered').reduce((a, o) => a + o.total, 0).toLocaleString()} ج</td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-cairo">{c.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingCustomer(null); const d = { phone: c.phone, name: c.name, email: c.email || '', address: c.address || '', city: c.city || '' }; setEditingCustomer(d); setEditForm(d); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (window.confirm(`حذف العميل ${c.name}؟`)) { deleteCustomer(c.phone); showNotification('تم حذف العميل', 'info'); } }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.role === 'customer').length === 0 && customers.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-gray-400 font-cairo py-10">لا يوجد عملاء حتى الآن</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-50 text-xs text-gray-400 font-cairo text-center">
                إجمالي العملاء: {users.filter(u => u.role === 'customer').length + customers.length}
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {adminSection === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-black text-gray-900 font-cairo">التحليلات والإحصائيات</h1>
              <button
                onClick={() => {
                  const reportRows = products
                    .map(p => {
                      const unitsSold = orders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + i.quantity, 0);
                      const revenue = orders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + i.product.price * i.quantity, 0);
                      const cost = orders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + (i.product.cost ?? i.product.price * 0.6) * i.quantity, 0);
                      const profit = revenue - cost;
                      const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
                      return [
                        p.name,
                        p.category,
                        unitsSold.toString(),
                        Math.round(revenue).toString(),
                        Math.round(cost).toString(),
                        Math.round(profit).toString(),
                        margin + '%',
                      ];
                    });
                  const esc = (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                  const headers = ['المنتج', 'الفئة', 'الوحدات المباعة', 'الإيرادات', 'التكاليف', 'صافي الربح', 'نسبة الربح'];
                  const html = '\uFEFF<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta charset="UTF-8"></head><body>' +
                    '<table border="1" style="font-family:Tahoma;font-size:12px;border-collapse:collapse" dir="rtl">' +
                    '<tr style="background:#f97316;color:#fff">' + headers.map(h => '<th style="padding:8px">' + esc(h) + '</th>').join('') + '</tr>' +
                    reportRows.map(r => '<tr>' + r.map(v => '<td style="padding:6px">' + esc(v) + '</td>').join('') + '</tr>').join('') +
                    '</table></body></html>';
                  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `worka-analytics-${new Date().toISOString().split('T')[0]}.xls`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                  showNotification('تم تصدير التحليلات ✓');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-green-600 transition-all shadow-lg shadow-green-200"
              >
                <Download className="w-4 h-4" />
                تصدير Excel
              </button>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'الكل' },
                { key: 'week', label: 'هذا الأسبوع' },
                { key: 'month', label: 'هذا الشهر' },
                { key: 'year', label: 'هذا العام' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setAnalyticsPeriod(p.key as typeof analyticsPeriod)}
                  className={`px-4 py-1.5 rounded-full text-sm font-cairo font-medium transition-all ${
                    analyticsPeriod === p.key ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {(() => {
              const filteredOrders = analyticsFilteredOrders;
              const delivered = filteredOrders.filter(o => o.status === 'delivered');
              const revenue = delivered.reduce((a, o) => a + o.total, 0);
              const cost = delivered.flatMap(o => o.items)
                .reduce((a, i) => a + (i.product.cost ?? i.product.price * 0.6) * i.quantity, 0);
              const profit = revenue - cost;
              return (<>            {/* Profit Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'analytics-revenue', title: 'إجمالي الإيرادات', value: `${revenue.toLocaleString()} ج`, color: 'from-green-400 to-emerald-600', icon: <DollarSign className="w-5 h-5" /> },
                { type: 'analytics-cost', title: 'إجمالي التكاليف', value: `${Math.round(cost).toLocaleString()} ج`, color: 'from-orange-400 to-red-500', icon: <ShoppingCart className="w-5 h-5" /> },
                { type: 'analytics-profit', title: 'صافي الربح', value: `${Math.round(profit).toLocaleString()} ج`, color: 'from-blue-400 to-blue-600', icon: <BarChart2 className="w-5 h-5" /> },
                { type: 'analytics-margin', title: 'هامش الربح', value: revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : '0%', color: 'from-purple-400 to-purple-600', icon: <TrendingUp className="w-5 h-5" /> },
              ].map((s, i) => (
                <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  onClick={() => setStatModal({ type: s.type, title: s.title })}
                  className={`bg-gradient-to-br ${s.color} text-white p-5 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform`}>
                  <div className="bg-white/20 p-2 rounded-xl inline-flex mb-2">{s.icon}</div>
                  <p className="text-2xl font-black font-cairo">{s.value}</p>
                  <p className="text-sm font-bold font-cairo mt-1">{s.title}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Sales by Category */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-pink-500" /> المبيعات حسب الفئة
                </h2>
                {([...CATEGORIES] as const).map(cat => {
                  const catOrders = filteredOrders.flatMap(o => o.items.filter(i => i.product.category === cat));
                  const catRevenue = catOrders.reduce((a, i) => a + i.product.price * i.quantity, 0);
                  const maxRevenue = Math.max(...([...CATEGORIES] as const).map(c =>
                    filteredOrders.flatMap(o => o.items.filter(i => i.product.category === c)).reduce((a, i) => a + i.product.price * i.quantity, 0)
                  ), 1);
                  return (
                    <div key={cat} className="mb-3">
                      <div className="flex justify-between text-sm font-cairo mb-1">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-bold">{catRevenue.toLocaleString()} ج</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(catRevenue / maxRevenue) * 100}%` }}
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Status Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-500" /> توزيع حالات الطلبات
                </h2>
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                  const count = filteredOrders.filter(o => o.status === status).length;
                  const pct = filteredOrders.length > 0 ? (count / filteredOrders.length) * 100 : 0;
                  return (
                    <div key={status} className="mb-3">
                      <div className="flex justify-between text-sm font-cairo mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-bold">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 md:col-span-2">
                <h2 className="font-black text-gray-900 font-cairo mb-4">🏆 الأكثر مبيعاً</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-right text-xs text-gray-400 font-cairo border-b border-gray-100">
                        <th className="pb-2">المنتج</th>
                        <th className="pb-2">الفئة</th>
                        <th className="pb-2">الوحدات المباعة</th>
                        <th className="pb-2">الإيرادات</th>
                        <th className="pb-2">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .map(p => ({
                          ...p,
                          unitsSold: filteredOrders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + i.quantity, 0),
                          revenue: filteredOrders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + i.product.price * i.quantity, 0),
                          totalCost: filteredOrders.flatMap(o => o.items).filter(i => i.product.id === p.id).reduce((a, i) => a + (i.product.cost ?? i.product.price * 0.6) * i.quantity, 0),
                        }))
                        .sort((a, b) => b.unitsSold - a.unitsSold)
                        .slice(0, 5)
                        .map((p, i) => (
                          <tr key={p.id} className="border-b border-gray-50 text-sm font-cairo">
                            <td className="py-3 flex items-center gap-2">
                              <span className="w-6 h-6 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                              <img src={p.images[0]} alt={p.name} className="w-8 h-8 object-cover rounded-lg" />
                              <span className="text-gray-900 font-medium">{p.name}</span>
                            </td>
                            <td className="py-3 text-gray-500">{p.category}</td>
                            <td className="py-3 font-bold">{p.unitsSold}</td>
                            <td className="py-3 font-bold text-green-600">{p.revenue.toLocaleString()} ج</td>
                            <td className={`py-3 font-bold ${p.revenue - p.totalCost > 0 ? 'text-green-600' : 'text-red-500'}`}>{(p.revenue - p.totalCost).toLocaleString()} ج</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>);
          })()}
        </div>
      )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-black text-gray-900 font-cairo mb-4">إضافة طلب جديد</h2>
              <p className="text-sm text-gray-500 font-cairo mb-3">الصق بيانات الطلب (JSON) الذي نسخته من العميل:</p>
              <textarea value={importData} onChange={e => setImportData(e.target.value)} rows={8}
                className="w-full border border-gray-200 rounded-xl p-3 font-cairo text-sm text-gray-700 resize-none focus:outline-none focus:border-pink-300" placeholder='{"userName":"...","items":[...],"total":...,"phone":"...","address":"..."}' />
              <div className="flex gap-3 mt-4">
                <button onClick={() => {
                  try {
                    const data = JSON.parse(importData);
                    const id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                    const order = {
                      id,
                      userId: data.userId || '',
                      userName: data.userName || '',
                      userEmail: data.userEmail || '',
                      items: data.items || [],
                      total: data.total || 0,
                      status: data.status || 'pending',
                      address: data.address || '',
                      phone: data.phone || '',
                      paymentMethod: data.paymentMethod || 'cash',
                      createdAt: new Date().toISOString(),
                    };
                    useStore.setState(s => ({ orders: [...s.orders, order], unreadOrderIds: [...s.unreadOrderIds, id] }));
                    setShowImportModal(false);
                    setImportData('');
                    showNotification('تم إضافة الطلب ✓');
                  } catch { showNotification('بيانات غير صالحة', 'error'); }
                }} className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-pink-600 transition-all">
                  إضافة الطلب
                </button>
                <button onClick={() => { setShowImportModal(false); setImportData(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        {adminSection === 'gallery' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-black text-gray-900 font-cairo">معرض الصور</h1>
              <button
                onClick={() => handleUpdateSettings({ heroImages: [...siteSettings.heroImages, ''] })}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-200"
              >
                <Plus className="w-4 h-4" />
                إضافة صورة
              </button>
            </div>

            {/* Hero Images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" /> صور الهيرو (الرئيسية)
              </h2>
              <p className="text-sm text-gray-500 font-cairo mb-4">هذه الصور تظهر في القسم الرئيسي (الهيرو) في الصفحة الرئيسية. يمكنك ترتيبها وإدارة عناوين URL الخاصة بها.</p>
              <div className="space-y-3">
                {siteSettings.heroImages.length === 0 && (
                  <p className="text-center text-gray-400 font-cairo py-6">لا توجد صور. أضف صوراً جديدة باستخدام الزر أعلاه.</p>
                )}
                {siteSettings.heroImages.map((img, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const imgs = [...siteSettings.heroImages];
                          if (idx > 0) { [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]]; }
                          handleUpdateSettings({ heroImages: imgs });
                        }}
                        disabled={idx === 0}
                        className={`p-1 rounded-lg transition-all ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const imgs = [...siteSettings.heroImages];
                          if (idx < imgs.length - 1) { [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]]; }
                          handleUpdateSettings({ heroImages: imgs });
                        }}
                        disabled={idx === siteSettings.heroImages.length - 1}
                        className={`p-1 rounded-lg transition-all ${idx === siteSettings.heroImages.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).classList.add('hidden'); }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        value={img}
                        onChange={e => {
                          const imgs = [...siteSettings.heroImages];
                          imgs[idx] = e.target.value;
                          handleUpdateSettings({ heroImages: imgs });
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                        dir="ltr"
                      />
                    </div>
                    {siteSettings.heroImages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleUpdateSettings({ heroImages: siteSettings.heroImages.filter((_, i) => i !== idx) })}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Logo URL */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" /> شعار الموقع
              </h2>
              <div>
                <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رابط الشعار</label>
                <input value={stagedSettings.logoUrl || ''} onChange={e => updateStagedSettings({ logoUrl: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" dir="ltr" placeholder="https://example.com/logo.png" />
                <p className="text-xs text-gray-400 font-cairo mt-1">ضع رابط صورة عشان تغير الشعار. لو سيبه فاضي، هيستخدم الشعار الافتراضي.</p>
              </div>
            </div>

            {/* All Product Images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-500" /> صور المنتجات
              </h2>
              <p className="text-sm text-gray-500 font-cairo mb-4">جميع الصور المستخدمة في المنتجات. يمكنك إدارتها من قسم المنتجات.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {products.flatMap(p => p.images.map(img => ({ img, productName: p.name, productId: p.id }))).map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="group relative">
                    <img
                      src={item.img}
                      alt={item.productName}
                      className="w-full aspect-square object-cover rounded-xl border border-gray-200"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-cairo text-center px-1 leading-tight">{item.productName}</span>
                    </div>
                  </div>
                ))}
              </div>
              {products.flatMap(p => p.images).length === 0 && (
                <p className="text-center text-gray-400 font-cairo py-6">لا توجد صور منتجات</p>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {adminSection === 'settings' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-gray-900 font-cairo">إعدادات الموقع</h1>

            {/* Admin Credentials */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> بيانات المدير
              </h2>
              {(() => {
                const admin = useStore.getState().users.find(u => u.role === 'admin');
                if (!admin) return null;
                return (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص الشارة (يظهر فوق العنوان)</label>
                  <input value={stagedSettings.heroBadge} onChange={e => updateStagedSettings({ heroBadge: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">صورة المدير (رابط)</label>
                      <input defaultValue={admin.avatar || ''} onBlur={e => {
                        const v = e.target.value.trim();
                        useStore.getState().updateUser({ ...admin, avatar: v || undefined });
                        showNotification('تم تحديث الصورة ✓');
                      }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" placeholder="https://example.com/avatar.jpg" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">البريد الإلكتروني</label>
                      <input defaultValue={admin.email} onBlur={e => {
                        const v = e.target.value.trim();
                        if (v && v !== admin.email) {
                          useStore.getState().updateUser({ ...admin, email: v });
                          showNotification('تم تحديث البريد ✓');
                        }
                      }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">كلمة المرور الجديدة</label>
                      <input type="password" placeholder="اكتب كلمة سر جديدة (6 أحرف)" onBlur={e => {
                        const val = e.target.value.trim();
                        if (val.length < 6) return;
                        const a = useStore.getState().users.find(u => u.role === 'admin');
                        if (a) {
                          useStore.getState().updateUser({ ...a, password: val });
                          showNotification('تم تغيير كلمة المرور ✓');
                        }
                        e.target.value = '';
                      }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-gray-400 font-cairo mt-3">البيانات الافتراضية: admin@admin.com / 123456</p>
            </div>

            {/* Hero Content */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> محتوى الهيرو
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص الشارة (يظهر فوق العنوان)</label>
                  <input value={stagedSettings.heroBadge} onChange={e => updateStagedSettings({ heroBadge: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">العنوان الرئيسي</label>
                  <input value={stagedSettings.heroTitle} onChange={e => updateStagedSettings({ heroTitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">النص الفرعي</label>
                  <input value={stagedSettings.heroSubtitle} onChange={e => updateStagedSettings({ heroSubtitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص الزر الأول</label>
                  <input value={stagedSettings.heroBtnText} onChange={e => updateStagedSettings({ heroBtnText: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص الزر الثاني</label>
                  <input value={stagedSettings.heroBtn2Text} onChange={e => updateStagedSettings({ heroBtn2Text: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
              </div>
              {/* Hero Images */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 font-cairo">صور الهيرو</label>
                  <button type="button" onClick={() => setAdminSection('gallery')}
                    className="text-xs text-pink-500 font-cairo hover:text-pink-600 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> إدارة متقدمة
                  </button>
                </div>
                {stagedSettings.heroImages.length === 0 ? (
                  <p className="text-sm text-gray-400 font-cairo mb-2">لا توجد صور</p>
                ) : (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {stagedSettings.heroImages.filter(Boolean).slice(0, 4).map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        <button type="button" onClick={() => updateStagedSettings({ heroImages: stagedSettings.heroImages.filter((_, i) => i !== idx) })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {stagedSettings.heroImages.filter(Boolean).length > 4 && (
                      <span className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-cairo">+{stagedSettings.heroImages.filter(Boolean).length - 4}</span>
                    )}
                  </div>
                )}
                <button type="button" onClick={() => updateStagedSettings({ heroImages: [...stagedSettings.heroImages, ''] })}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all">
                  <Plus className="w-4 h-4" /> إضافة صورة
                </button>
              </div>
            </div>

            {/* Footer Content */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> معلومات التذييل
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">اسم المتجر</label>
                  <input value={stagedSettings.footerBrand} onChange={e => updateStagedSettings({ footerBrand: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رقم الهاتف</label>
                  <input value={stagedSettings.footerPhone} onChange={e => updateStagedSettings({ footerPhone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">البريد الإلكتروني</label>
                  <input value={stagedSettings.footerEmail} onChange={e => updateStagedSettings({ footerEmail: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">العنوان</label>
                  <input value={stagedSettings.footerAddress} onChange={e => updateStagedSettings({ footerAddress: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نبذة عن المتجر</label>
                  <textarea value={stagedSettings.footerAbout || ''} onChange={e => updateStagedSettings({ footerAbout: e.target.value })} rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">مميزات الموقع</label>
                  {stagedSettings.features.map((f, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={f.title} onChange={e => {
                        const features = [...stagedSettings.features];
                        features[i] = { ...features[i], title: e.target.value };
                        updateStagedSettings({ features });
                      }} placeholder="العنوان" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                      <input value={f.desc} onChange={e => {
                        const features = [...stagedSettings.features];
                        features[i] = { ...features[i], desc: e.target.value };
                        updateStagedSettings({ features });
                      }} placeholder="الوصف" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                      <span className="text-2xl">{f.emoji}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Quick Links */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">روابط سريعة</label>
                {(stagedSettings.footerQuickLinks || []).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={link.label} onChange={e => {
                      const links = [...(stagedSettings.footerQuickLinks || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      updateStagedSettings({ footerQuickLinks: links });
                    }} placeholder="العنوان" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    <select value={link.page} onChange={e => {
                      const links = [...(stagedSettings.footerQuickLinks || [])];
                      links[i] = { ...links[i], page: e.target.value };
                      updateStagedSettings({ footerQuickLinks: links });
                    }} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300">
                      <option value="home">الرئيسية</option>
                      <option value="shop">المتجر</option>
                      <option value="orders">طلباتي</option>
                      <option value="contact">تواصل معنا</option>
                    </select>
                    {(stagedSettings.footerQuickLinks || []).length > 1 && (
                      <button onClick={() => updateStagedSettings({ footerQuickLinks: (stagedSettings.footerQuickLinks || []).filter((_, j) => j !== i) })}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => updateStagedSettings({ footerQuickLinks: [...(stagedSettings.footerQuickLinks || []), { label: '', page: 'home' }] })}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all mt-2">
                  <Plus className="w-4 h-4" /> إضافة رابط
                </button>
              </div>
              {/* Service Links */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">روابط خدمة العملاء</label>
                {(stagedSettings.footerServiceLinks || []).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={link.label} onChange={e => {
                      const links = [...(stagedSettings.footerServiceLinks || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      updateStagedSettings({ footerServiceLinks: links });
                    }} placeholder="العنوان" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    <select value={link.page} onChange={e => {
                      const links = [...(stagedSettings.footerServiceLinks || [])];
                      links[i] = { ...links[i], page: e.target.value };
                      updateStagedSettings({ footerServiceLinks: links });
                    }} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300">
                      <option value="home">الرئيسية</option>
                      <option value="shop">المتجر</option>
                      <option value="orders">طلباتي</option>
                      <option value="contact">تواصل معنا</option>
                    </select>
                    {(stagedSettings.footerServiceLinks || []).length > 1 && (
                      <button onClick={() => updateStagedSettings({ footerServiceLinks: (stagedSettings.footerServiceLinks || []).filter((_, j) => j !== i) })}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => updateStagedSettings({ footerServiceLinks: [...(stagedSettings.footerServiceLinks || []), { label: '', page: 'contact' }] })}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all mt-2">
                  <Plus className="w-4 h-4" /> إضافة رابط
                </button>
              </div>
              {/* Social Links */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">روابط السوشيال ميديا</label>
                {(stagedSettings.footerSocial || []).map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={s.icon} onChange={e => {
                      const social = [...(stagedSettings.footerSocial || [])];
                      social[i] = { ...social[i], icon: e.target.value };
                      updateStagedSettings({ footerSocial: social });
                    }} placeholder="📘" className="w-16 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 text-center" />
                    <input value={s.url} onChange={e => {
                      const social = [...(stagedSettings.footerSocial || [])];
                      social[i] = { ...social[i], url: e.target.value };
                      updateStagedSettings({ footerSocial: social });
                    }} placeholder="https://..." className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    {(stagedSettings.footerSocial || []).length > 1 && (
                      <button onClick={() => updateStagedSettings({ footerSocial: (stagedSettings.footerSocial || []).filter((_, j) => j !== i) })}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => updateStagedSettings({ footerSocial: [...(stagedSettings.footerSocial || []), { icon: '🌐', url: '' }] })}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all mt-2">
                  <Plus className="w-4 h-4" /> إضافة حساب
                </button>
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> الألوان الرئيسية
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">اللون الأساسي</label>
                  <div className="flex gap-2">
                    <input type="color" value={stagedSettings.primaryColor} onChange={e => updateStagedSettings({ primaryColor: e.target.value })}
                      className="w-10 h-10 p-0.5 border border-gray-200 rounded-lg cursor-pointer" />
                    <input value={stagedSettings.primaryColor} onChange={e => updateStagedSettings({ primaryColor: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">اللون الثانوي</label>
                  <div className="flex gap-2">
                    <input type="color" value={stagedSettings.secondaryColor} onChange={e => updateStagedSettings({ secondaryColor: e.target.value })}
                      className="w-10 h-10 p-0.5 border border-gray-200 rounded-lg cursor-pointer" />
                    <input value={stagedSettings.secondaryColor} onChange={e => updateStagedSettings({ secondaryColor: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Banner */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> بانر التخفيضات
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">النص الصغير (البadge)</label>
                  <input value={stagedSettings.saleBannerBadge || ''} onChange={e => updateStagedSettings({ saleBannerBadge: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">العنوان</label>
                  <input value={stagedSettings.saleBannerTitle || ''} onChange={e => updateStagedSettings({ saleBannerTitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">النص الفرعي (استخدم &#123;coupon&#125; مكان الكود)</label>
                  <input value={stagedSettings.saleBannerSubtitle || ''} onChange={e => updateStagedSettings({ saleBannerSubtitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">كود الخصم</label>
                  <input value={stagedSettings.saleBannerCoupon || ''} onChange={e => updateStagedSettings({ saleBannerCoupon: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص الزر</label>
                  <input value={stagedSettings.saleBannerBtnText || ''} onChange={e => updateStagedSettings({ saleBannerBtnText: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الأيقونة (إيموجي)</label>
                  <input value={stagedSettings.saleBannerIcon || '🏷️'} onChange={e => updateStagedSettings({ saleBannerIcon: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">لون البانر (البداية)</label>
                  <div className="flex gap-2">
                    <input type="color" value={stagedSettings.saleBannerColor || '#f97316'} onChange={e => updateStagedSettings({ saleBannerColor: e.target.value })}
                      className="w-10 h-10 p-0.5 border border-gray-200 rounded-lg cursor-pointer" />
                    <input value={stagedSettings.saleBannerColor || '#f97316'} onChange={e => updateStagedSettings({ saleBannerColor: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">لون البانر (النهاية)</label>
                  <div className="flex gap-2">
                    <input type="color" value={stagedSettings.saleBannerColor2 || '#ec4899'} onChange={e => updateStagedSettings({ saleBannerColor2: e.target.value })}
                      className="w-10 h-10 p-0.5 border border-gray-200 rounded-lg cursor-pointer" />
                    <input value={stagedSettings.saleBannerColor2 || '#ec4899'} onChange={e => updateStagedSettings({ saleBannerColor2: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Accounts */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-pink-500" /> حسابات الدفع الإلكتروني
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الاسم الظاهر لـ InstaPay</label>
                  <input value={stagedSettings.instapayName || ''} onChange={e => updateStagedSettings({ instapayName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="rtl" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">الاسم اللي هيظهر للعميل عند الدفع بـ InstaPay</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">حساب InstaPay</label>
                  <input value={stagedSettings.instapayAccount || ''} onChange={e => updateStagedSettings({ instapayAccount: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">الإيميل أو رقم الموبايل المرتبط بـ InstaPay</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الاسم الظاهر لفودافون كاش</label>
                  <input value={stagedSettings.vodafoneName || ''} onChange={e => updateStagedSettings({ vodafoneName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="rtl" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">الاسم اللي هيظهر للعميل عند الدفع بـ فودافون كاش</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رقم فودافون كاش</label>
                  <input value={stagedSettings.vodafoneAccount || ''} onChange={e => updateStagedSettings({ vodafoneAccount: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">رقم الموبايل الخاص بـ فودافون كاش</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رقم واتساب للمدفوعات</label>
                  <input value={stagedSettings.whatsappNumber || ''} onChange={e => updateStagedSettings({ whatsappNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">رقم واتساب اللي هيبعت عليه العميل إثبات الدفع</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رقم واتساب لإشعارات الطلبات</label>
                  <input value={stagedSettings.whatsappNotificationNumber || ''} onChange={e => updateStagedSettings({ whatsappNotificationNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">رقم واتساب اللي هيتساله تفاصيل الطلبات الجديدة</p>
                </div>
              </div>
            </div>

            {/* واتساب بزنس API */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-green-500" /> واتساب بزنس API — إعدادات الإشعارات التلقائية
              </h2>
              <p className="text-sm text-gray-500 font-cairo mb-3">استخدم واتساب بزنس API عشان الموقع يبعت الإشعارات تلقائياً (بدون ما تفتح واتساب). هتحتاج تعمل واتساب بزنس أكونت من business.facebook.com. لو مش متاح، سيبه فاضي وهيشتغل عادي.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">توكن واتساب بزنس</label>
                    <input value={stagedSettings.whatsappBusinessToken || ''} onChange={e => updateStagedSettings({ whatsappBusinessToken: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" dir="ltr" placeholder="EAAx..." />
                    <p className="text-xs text-gray-400 font-cairo mt-1">Permanent Access Token من فيسبوك ديفيلوبرز</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">معرف رقم الهاتف</label>
                    <input value={stagedSettings.whatsappPhoneNumberId || ''} onChange={e => updateStagedSettings({ whatsappPhoneNumberId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" placeholder="123456789" />
                    <p className="text-xs text-gray-400 font-cairo mt-1">Phone Number ID من واتساب بزنس API</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص رسالة الإشعار للمسؤول</label>
                  <textarea value={stagedSettings.adminNotifyTemplate || ''} onChange={e => updateStagedSettings({ adminNotifyTemplate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" rows={6} dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">المتغيرات: <span className="font-mono text-blue-500">{'{orderId}'}, {'{customerName}'}, {'{customerPhone}'}, {'{customerAddress}'}, {'{paymentMethod}'}, {'{total}'}, {'{items}'}</span></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">نص رسالة التأكيد للعميل</label>
                  <textarea value={stagedSettings.customerNotifyTemplate || ''} onChange={e => updateStagedSettings({ customerNotifyTemplate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" rows={6} dir="ltr" />
                  <p className="text-xs text-gray-400 font-cairo mt-1">المتغيرات: <span className="font-mono text-blue-500">{'{orderId}'}, {'{customerName}'}, {'{total}'}, {'{paymentMethod}'}, {'{items}'}</span></p>
                </div>
              </div>
            </div>

            {/* Order Tracking Message */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-500" /> رسالة تتبع الطلب
              </h2>
              <p className="text-sm text-gray-500 font-cairo mb-3">هذه الرسالة تظهر للعميل عند تتبع طلبه برقم الموبايل</p>
              <textarea
                value={stagedSettings.orderTrackingMessage || ''}
                onChange={e => updateStagedSettings({ orderTrackingMessage: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
              />
            </div>

            {/* Coupons */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-500" /> أكواد الخصم
              </h2>
              <div className="space-y-3">
                {(stagedSettings.coupons || []).map((c, i) => (
                  <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-xl p-3">
                    <input value={c.code} onChange={e => {
                      const cp = [...(stagedSettings.coupons || [])];
                      cp[i] = { ...cp[i], code: e.target.value };
                      updateStagedSettings({ coupons: cp });
                    }} placeholder="الكود" className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                    <select value={c.type} onChange={e => {
                      const cp = [...(stagedSettings.coupons || [])];
                      cp[i] = { ...cp[i], type: e.target.value as 'percentage' | 'fixed' };
                      updateStagedSettings({ coupons: cp });
                    }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300">
                      <option value="percentage">نسبة %</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </select>
                    <input type="number" value={c.value} onChange={e => {
                      const cp = [...(stagedSettings.coupons || [])];
                      cp[i] = { ...cp[i], value: Number(e.target.value) };
                      updateStagedSettings({ coupons: cp });
                    }} placeholder="القيمة" className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    <span className="text-xs text-gray-400 font-cairo">{c.type === 'percentage' ? '%' : 'ج'}</span>
                    <button onClick={() => updateStagedSettings({ coupons: (stagedSettings.coupons || []).filter((_, j) => j !== i) })}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => updateStagedSettings({ coupons: [...(stagedSettings.coupons || []), { code: '', type: 'percentage' as const, value: 0 }] })}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all">
                  <Plus className="w-4 h-4" /> إضافة كود خصم
                </button>
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-black text-gray-900 font-cairo mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> إظهار / إخفاء الأقسام
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'showFeatures', label: 'مميزات الموقع' },
                  { key: 'showCategories', label: 'فئات المنتجات' },
                  { key: 'showFeatured', label: 'المنتجات المميزة' },
                  { key: 'showNewArrivals', label: 'وصل حديثاً' },
                  { key: 'showSaleBanner', label: 'بانر التخفيضات' },
                  { key: 'showHeroWatermark', label: 'شعار مائي في الهيرو' },
                  { key: 'showSaleWatermark', label: 'شعار مائي في البانر' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={siteSettings[item.key as keyof typeof siteSettings] as boolean}
                      onChange={e => updateStagedSettings({ [item.key]: e.target.checked })}
                      className="w-5 h-5 accent-pink-500" />
                    <span className="text-sm font-cairo text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center">
              <button
            onClick={handleSaveAll}
                className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl text-lg font-bold font-cairo shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Save className="w-6 h-6" />
                حفظ التغييرات
              </button>
            </div>
          </div>
        )}
      </main>
      <AnimatePresence>
        {statModal && (() => {
          const modalType = statModal.type;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setStatModal(null)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
                style={{ maxHeight: '90vh' }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 font-cairo">{statModal.title}</h2>
                    <button onClick={() => setStatModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {modalType === 'revenue' && (() => {
                    const delivered = orders.filter(o => o.status === 'delivered');
                    const byProduct = new Map<string, {qty: number; rev: number}>();
                    delivered.flatMap(o => o.items).forEach(i => {
                      const pid = i.product.id;
                      const cur = byProduct.get(pid) || {qty: 0, rev: 0};
                      cur.qty += i.quantity;
                      cur.rev += i.product.price * i.quantity;
                      byProduct.set(pid, cur);
                    });
                    const topProducts = [...byProduct.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 10);
                    const prodMap = new Map(products.map(p => [p.id, p]));
                    return (
                      <div className="space-y-3 font-cairo">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-500">إجمالي الإيرادات</p>
                          <p className="text-3xl font-black text-green-600">{delivered.reduce((a, o) => a + o.total, 0).toLocaleString()} ج</p>
                          <p className="text-xs text-gray-400 mt-1">من {delivered.length} طلب مكتمل</p>
                        </div>
                        <p className="font-bold text-gray-700 mt-4 mb-2">أكثر 10 منتجات تحقيقاً للإيرادات:</p>
                        {topProducts.map(([pid, data], i) => {
                          const p = prodMap.get(pid);
                          return (
                            <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                                <div>
                                  <p className="text-sm font-bold">{p?.name || 'منتج محذوف'}</p>
                                  <p className="text-xs text-gray-400">تم بيع {data.qty} وحدة</p>
                                </div>
                              </div>
                              <p className="font-bold text-green-600">{data.rev.toLocaleString()} ج</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {modalType === 'pending' && (() => {
                    const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
                    return (
                      <div className="space-y-3 font-cairo">
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-500">طلبات معلقة</p>
                          <p className="text-3xl font-black text-orange-600">{pending.length}</p>
                          <p className="text-xs text-gray-400 mt-1">في انتظار المراجعة أو التأكيد</p>
                        </div>
                        {pending.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد طلبات معلقة</p>}
                        {pending.slice(0, 20).map(o => (
                          <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div>
                              <p className="text-sm font-bold">{o.userName}</p>
                              <p className="text-xs text-gray-400">{o.total.toLocaleString()} ج • {new Date(o.createdAt).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {STATUS_LABELS[o.status]}
                            </span>
                          </div>
                        ))}
                        {pending.length > 20 && <p className="text-xs text-gray-400 text-center">و{pending.length - 20} طلبات أخرى...</p>}
                      </div>
                    );
                  })()}
                  {modalType === 'products' && (() => {
                    const catCount = new Map<string, number>();
                    products.forEach(p => { catCount.set(p.category, (catCount.get(p.category) || 0) + 1); });
                    const lowStockItems = products.filter(p => { const t = getTotalStock(p); return t > 0 && t <= 5; });
                    return (
                      <div className="space-y-3 font-cairo">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-500">إجمالي المنتجات</p>
                          <p className="text-3xl font-black text-blue-600">{products.length}</p>
                        </div>
                        <p className="font-bold text-gray-700 mb-2">التوزيع حسب الفئة:</p>
                        {[...catCount.entries()].map(([cat, cnt]) => (
                          <div key={cat} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <span className="text-sm font-bold">{cat}</span>
                            <span className="text-sm font-bold text-blue-600">{cnt} منتج</span>
                          </div>
                        ))}
                        {lowStockItems.length > 0 && (
                          <>
                            <p className="font-bold text-red-600 mt-4 mb-2">منتجات المخزون المنخفض (≤ 5):</p>
                            {lowStockItems.map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                                <span className="text-sm font-bold">{p.name}</span>
                                <span className="text-sm font-bold text-red-600">متبقي {getTotalStock(p)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}
                  {modalType === 'customers' && (() => {
                    const registered = users.filter(u => u.type === 'user');
                    const guest = customers.filter(c => !users.some(u => u.phone === c.phone));
                    return (
                      <div className="space-y-3 font-cairo">
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-500">إجمالي العملاء</p>
                          <p className="text-3xl font-black text-purple-600">{totalCustomers}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-pink-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">مسجل</p>
                            <p className="text-2xl font-black text-pink-600">{registered.length}</p>
                          </div>
                          <div className="bg-gray-100 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">زوار</p>
                            <p className="text-2xl font-black text-gray-600">{guest.length}</p>
                          </div>
                        </div>
                        <p className="font-bold text-gray-700 mt-2 mb-2">آخر العملاء:</p>
                        {[...customers].reverse().slice(0, 10).map(c => (
                          <div key={c.phone} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div>
                              <p className="text-sm font-bold">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.phone}</p>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {modalType.startsWith('analytics-') && (() => {
                    const filteredOrders = analyticsFilteredOrders;
                    const delivered = filteredOrders.filter(o => o.status === 'delivered');
                    const revenueVal = delivered.reduce((a, o) => a + o.total, 0);
                    const costVal = delivered.flatMap(o => o.items)
                      .reduce((a, i) => a + (i.product.cost ?? i.product.price * 0.6) * i.quantity, 0);
                    const profitVal = revenueVal - costVal;
                    if (modalType === 'analytics-revenue') {
                      const byProduct = new Map<string, {qty: number; rev: number}>();
                      delivered.flatMap(o => o.items).forEach(i => {
                        const pid = i.product.id;
                        const cur = byProduct.get(pid) || {qty: 0, rev: 0};
                        cur.qty += i.quantity;
                        cur.rev += i.product.price * i.quantity;
                        byProduct.set(pid, cur);
                      });
                      const top = [...byProduct.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 10);
                      const pm = new Map(products.map(p => [p.id, p]));
                      return (
                        <div className="space-y-3 font-cairo">
                          <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">إجمالي الإيرادات</p>
                            <p className="text-3xl font-black text-green-600">{revenueVal.toLocaleString()} ج</p>
                          </div>
                          <p className="font-bold text-gray-700 mb-2">حسب المنتج:</p>
                          {top.length === 0 && <p className="text-gray-400 text-center py-4">لا توجد مبيعات في هذه الفترة</p>}
                          {top.map(([pid, d], i) => {
                            const p = pm.get(pid);
                            return (
                              <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                                  <p className="text-sm font-bold">{p?.name || 'منتج محذوف'} <span className="text-xs text-gray-400">({d.qty} وحدة)</span></p>
                                </div>
                                <p className="font-bold text-green-600">{d.rev.toLocaleString()} ج</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    if (modalType === 'analytics-cost') {
                      const byProduct = new Map<string, {qty: number; cost: number}>();
                      delivered.flatMap(o => o.items).forEach(i => {
                        const pid = i.product.id;
                        const cur = byProduct.get(pid) || {qty: 0, cost: 0};
                        cur.qty += i.quantity;
                        cur.cost += (i.product.cost ?? i.product.price * 0.6) * i.quantity;
                        byProduct.set(pid, cur);
                      });
                      const top = [...byProduct.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 10);
                      const pm = new Map(products.map(p => [p.id, p]));
                      return (
                        <div className="space-y-3 font-cairo">
                          <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">إجمالي التكاليف</p>
                            <p className="text-3xl font-black text-orange-600">{Math.round(costVal).toLocaleString()} ج</p>
                          </div>
                          <p className="font-bold text-gray-700 mb-2">أكثر المنتجات تكلفة:</p>
                          {top.length === 0 && <p className="text-gray-400 text-center py-4">لا توجد بيانات</p>}
                          {top.map(([pid, d], i) => {
                            const p = pm.get(pid);
                            return (
                              <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                                  <p className="text-sm font-bold">{p?.name || 'منتج محذوف'} <span className="text-xs text-gray-400">({d.qty} وحدة)</span></p>
                                </div>
                                <p className="font-bold text-orange-600">{Math.round(d.cost).toLocaleString()} ج</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    if (modalType === 'analytics-profit') {
                      const byProduct = new Map<string, {qty: number; profit: number; rev: number}>();
                      delivered.flatMap(o => o.items).forEach(i => {
                        const pid = i.product.id;
                        const cur = byProduct.get(pid) || {qty: 0, profit: 0, rev: 0};
                        cur.qty += i.quantity;
                        const cost = i.product.cost ?? i.product.price * 0.6;
                        cur.profit += (i.product.price - cost) * i.quantity;
                        cur.rev += i.product.price * i.quantity;
                        byProduct.set(pid, cur);
                      });
                      const top = [...byProduct.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 10);
                      const pm = new Map(products.map(p => [p.id, p]));
                      return (
                        <div className="space-y-3 font-cairo">
                          <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">صافي الربح</p>
                            <p className="text-3xl font-black text-blue-600">{Math.round(profitVal).toLocaleString()} ج</p>
                          </div>
                          <p className="font-bold text-gray-700 mb-2">أكثر المنتجات ربحاً:</p>
                          {top.length === 0 && <p className="text-gray-400 text-center py-4">لا توجد بيانات</p>}
                          {top.map(([pid, d], i) => {
                            const p = pm.get(pid);
                            return (
                              <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                                  <p className="text-sm font-bold">{p?.name || 'منتج محذوف'}</p>
                                </div>
                                <p className="font-bold text-blue-600">{Math.round(d.profit).toLocaleString()} ج <span className="text-xs text-gray-400">({revenueVal > 0 ? ((d.profit / d.rev) * 100).toFixed(1) : 0}%)</span></p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    if (modalType === 'analytics-margin') {
                      const byProduct = new Map<string, {qty: number; profit: number; rev: number}>();
                      delivered.flatMap(o => o.items).forEach(i => {
                        const pid = i.product.id;
                        const cur = byProduct.get(pid) || {qty: 0, profit: 0, rev: 0};
                        cur.qty += i.quantity;
                        const cost = i.product.cost ?? i.product.price * 0.6;
                        cur.profit += (i.product.price - cost) * i.quantity;
                        cur.rev += i.product.price * i.quantity;
                        byProduct.set(pid, cur);
                      });
                      const sorted = [...byProduct.entries()].sort((a, b) => {
                        const mA = a[1].rev > 0 ? (a[1].profit / a[1].rev) * 100 : 0;
                        const mB = b[1].rev > 0 ? (b[1].profit / b[1].rev) * 100 : 0;
                        return mB - mA;
                      }).slice(0, 10);
                      const pm = new Map(products.map(p => [p.id, p]));
                      const avgMargin = revenueVal > 0 ? (profitVal / revenueVal) * 100 : 0;
                      return (
                        <div className="space-y-3 font-cairo">
                          <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-500">متوسط هامش الربح</p>
                            <p className="text-3xl font-black text-purple-600">{avgMargin.toFixed(1)}%</p>
                          </div>
                          <p className="font-bold text-gray-700 mb-2">المنتجات حسب هامش الربح:</p>
                          {sorted.length === 0 && <p className="text-gray-400 text-center py-4">لا توجد بيانات</p>}
                          {sorted.map(([pid, d], i) => {
                            const p = pm.get(pid);
                            const margin = d.rev > 0 ? ((d.profit / d.rev) * 100).toFixed(1) : '0';
                            return (
                              <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                                  <p className="text-sm font-bold">{p?.name || 'منتج محذوف'}</p>
                                </div>
                                <p className="font-bold text-purple-600">{margin}% <span className="text-xs text-gray-400">| {Math.round(d.profit).toLocaleString()} ج</span></p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
      <AnimatePresence>
        {showProductModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProductModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
              style={{ maxHeight: '90vh' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900 font-cairo">
                    {editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                  </h2>
                  <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">اسم المنتج *</label>
                      <input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" placeholder="اكتب اسم المنتج" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">سعر الشراء (التكلفة)</label>
                      <input type="number" value={productForm.cost || ''} onChange={e => setProductForm(f => ({ ...f, cost: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">سعر البيع (جنيه) *</label>
                      <input type="number" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">السعر القديم (اختياري)</label>
                      <input type="number" value={productForm.oldPrice || ''} onChange={e => setProductForm(f => ({ ...f, oldPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الفئة *</label>
                      <select value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value as any }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">المقاسات *</label>
                    <div className="flex gap-2 flex-wrap">
                      {SIZES.map(size => (
                        <button key={size} type="button"
                          onClick={() => setProductForm(f => {
                            const removing = f.sizes.includes(size);
                            const newSizes = removing ? f.sizes.filter(s => s !== size) : [...f.sizes, size];
                            const newStock = { ...f.stock };
                            if (removing) {
                              for (const c of f.colors) { delete newStock[`${size}|${c}`]; }
                            }
                            return { ...f, sizes: newSizes, stock: newStock };
                          })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo border-2 transition-all ${
                            productForm.sizes.includes(size) ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">مقاسات بالأعمار (أطفال)</label>
                    <div className="flex gap-2 flex-wrap">
                      {AGE_SIZES.map(age => (
                        <button key={age} type="button"
                          onClick={() => setProductForm(f => {
                            const removing = f.sizes.includes(age);
                            const newSizes = removing ? f.sizes.filter(s => s !== age) : [...f.sizes, age];
                            const newStock = { ...f.stock };
                            if (removing) {
                              for (const c of f.colors) { delete newStock[`${age}|${c}`]; }
                            }
                            return { ...f, sizes: newSizes, stock: newStock };
                          })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo border-2 transition-all ${
                            productForm.sizes.includes(age) ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>
                  {productForm.sizes.length > 0 && productForm.colors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">المخزون لكل مقاس ولون</label>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-cairo border border-gray-200 rounded-xl overflow-hidden">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">مقاس \ لون</th>
                              {productForm.colors.map((c, ci) => (
                                <th key={ci} className="px-3 py-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: c }} />
                                    <span className="text-[10px] text-gray-500">{productForm.colorLabels?.[c] || COLOR_NAMES[c] || c}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {productForm.sizes.map(size => (
                              <tr key={size} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-bold text-gray-700 whitespace-nowrap">{size}</td>
                                {productForm.colors.map((c, ci) => {
                                  const key = `${size}|${c}`;
                                  return (
                                    <td key={ci} className="px-2 py-1.5 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        value={productForm.stock[key] ?? 0}
                                        onChange={e => setProductForm(f => ({
                                          ...f,
                                          stock: { ...f.stock, [key]: Math.max(0, Number(e.target.value)) }
                                        }))}
                                        className="w-16 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button type="button" onClick={() => {
                          const val = parseInt(prompt('قيمة المخزون لكل مقاس/لون:') || '0', 10);
                          if (isNaN(val) || val < 0) return;
                          const newStock = { ...productForm.stock };
                          for (const s of productForm.sizes) {
                            for (const c of productForm.colors) {
                              newStock[`${s}|${c}`] = val;
                            }
                          }
                          setProductForm(f => ({ ...f, stock: newStock }));
                        }} className="text-xs text-pink-600 font-cairo hover:text-pink-700 font-bold">
                          تعبئة الكل بقيمة واحدة
                        </button>
                        <span className="text-xs text-gray-400 font-cairo">
                          الإجمالي: {Object.values(productForm.stock).reduce((a, b) => a + (b || 0), 0)} قطعة
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">صور المنتج *</label>
                    <div className="space-y-2">
                      {productForm.images.map((img, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => {
                              const imgs = [...productForm.images];
                              if (idx > 0) { [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]]; }
                              setProductForm(f => ({ ...f, images: imgs }));
                            }} disabled={idx === 0}
                              className={`p-0.5 rounded transition-all ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => {
                              const imgs = [...productForm.images];
                              if (idx < imgs.length - 1) { [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]]; }
                              setProductForm(f => ({ ...f, images: imgs }));
                            }} disabled={idx === productForm.images.length - 1}
                              className={`p-0.5 rounded transition-all ${idx === productForm.images.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                          {img.startsWith('data:') ? (
                            <img src={img} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                          ) : null}
                          <input value={img.startsWith('data:') ? '' : img} onChange={e => {
                            const imgs = [...productForm.images];
                            imgs[idx] = e.target.value;
                            setProductForm(f => ({ ...f, images: imgs }));
                          }} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300" placeholder="https://..." />
                          {productForm.images.length > 1 && (
                            <button type="button" onClick={() => setProductForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                              className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all text-sm">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" onClick={() => setProductForm(f => ({ ...f, images: [...f.images, ''] }))}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-cairo hover:bg-gray-100 transition-all">
                          <Plus className="w-4 h-4" /> إضافة رابط صورة
                        </button>
                        <label className="relative flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-cairo hover:bg-pink-100 transition-all cursor-pointer overflow-hidden">
                          <ImageIcon className="w-4 h-4" /> رفع صورة من الجهاز
                          <input type="file" accept="image/*" multiple
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            onChange={e => {
                              const files = Array.from(e.target.files || []);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  const dataUrl = ev.target?.result as string;
                                  setProductForm(f => ({ ...f, images: [...f.images.filter(Boolean), dataUrl] }));
                                };
                                reader.readAsDataURL(file);
                              });
                              e.target.value = '';
                            }} />
                        </label>
                      </div>
                    </div>
                    {/* Image Preview */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {productForm.images.filter(Boolean).map((img, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                          <img src={img} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                            onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {productForm.colors.length > 0 && productForm.images.filter(Boolean).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">ربط الصور بالألوان</label>
                      <p className="text-xs text-gray-400 font-cairo mb-3"> اختار ايه هي الصور اللي بتظهر لما المستخدم يضغط على لون معين</p>
                      <div className="space-y-3">
                        {productForm.colors.map((c, ci) => (
                          <div key={ci} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: c }} />
                              <span className="text-xs font-bold font-cairo text-gray-700">{productForm.colorLabels?.[c] || COLOR_NAMES[c] || c}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {productForm.images.filter(Boolean).map((img, imgIdx) => {
                                const isSelected = productForm.colorImages?.[c]?.includes(img) || false;
                                return (
                                  <button
                                    key={imgIdx}
                                    type="button"
                                    onClick={() => {
                                      setProductForm(f => {
                                        const current = f.colorImages?.[c] || [];
                                        const updated = isSelected
                                          ? current.filter(url => url !== img)
                                          : [...current, img];
                                        return { ...f, colorImages: { ...f.colorImages, [c]: updated } };
                                      });
                                    }}
                                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                                      isSelected ? 'border-pink-500 shadow-md' : 'border-gray-200 opacity-50 hover:opacity-80'
                                    }`}
                                  >
                                    <img src={img} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                                    {isSelected && <span className="absolute bottom-0 left-0 right-0 bg-pink-500 text-white text-[8px] text-center font-bold py-0.5">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-2">الألوان المتاحة *</label>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {productForm.colors.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="w-5 h-5 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: c }} />
                          <span className="text-xs font-bold font-cairo text-gray-700">{productForm.colorLabels?.[c] || COLOR_NAMES[c] || c}</span>
                          <button type="button" onClick={() => {
                            const newColors = productForm.colors.filter((_, i) => i !== idx);
                            const newLabels = { ...productForm.colorLabels };
                            delete newLabels[c];
                            const newStock = { ...productForm.stock };
                            for (const s of productForm.sizes) {
                              delete newStock[`${s}|${c}`];
                            }
                            const newColorImages = { ...productForm.colorImages };
                            delete newColorImages[c];
                            setProductForm(f => ({ ...f, colors: newColors, colorLabels: newLabels, stock: newStock, colorImages: newColorImages }));
                          }}
                            className="text-red-400 hover:text-red-600 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-3 items-center">
                        <input type="color" value={newColor || '#000000'} onChange={e => { setNewColor(e.target.value); if (!newColorName) setNewColorName(COLOR_NAMES[e.target.value] || ''); }}
                          className="w-16 h-16 rounded-xl border-2 border-gray-200 cursor-pointer p-1" />
                        <div className="flex-1">
                          <input type="text" value={newColor} onChange={e => setNewColor(e.target.value)}
                            placeholder="#000000" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono" dir="ltr" />
                          <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)}
                            placeholder="اسم اللون" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 mt-2" />
                        </div>
                        <button type="button" onClick={() => {
                          if (newColor && !productForm.colors.includes(newColor)) {
                            const newLabels = { ...productForm.colorLabels };
                            if (newColorName) newLabels[newColor] = newColorName;
                            setProductForm(f => ({ ...f, colors: [...f.colors, newColor], colorLabels: newLabels }));
                            setNewColor('');
                            setNewColorName('');
                          }
                        }}
                          className="px-5 py-4 bg-pink-500 text-white rounded-xl text-sm font-cairo font-bold hover:bg-pink-600 transition-all flex items-center gap-1 h-fit">
                          <Plus className="w-4 h-4" /> إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الوصف</label>
                    <textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={productForm.featured} onChange={e => setProductForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                      <span className="text-sm font-cairo text-gray-600">منتج مميز</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={productForm.newArrival} onChange={e => setProductForm(f => ({ ...f, newArrival: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                      <span className="text-sm font-cairo text-gray-600">وصل حديثاً</span>
                    </label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowProductModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200">
                      إلغاء
                    </button>
                    <button onClick={handleSaveProduct} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold font-cairo text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {editingProductId ? 'حفظ التغييرات' : 'إضافة المنتج'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrderId && (() => {
          const order = orders.find(o => o.id === selectedOrderId);
          if (!order) return null;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedOrderId(null)} className="fixed inset-0 bg-black/50 z-50" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl" style={{ maxHeight: '90vh' }}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-gray-900 font-cairo">تفاصيل الطلب {order.id}</h2>
                    <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 font-cairo mb-2">👤 بيانات العميل</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm font-cairo text-gray-600">
                        <span>الاسم: <span className="font-bold text-gray-900">{order.userName}</span></span>
                        <span>البريد: <span className="font-bold text-gray-900">{order.userEmail}</span></span>
                        <span>رقم الموبايل: <span className="font-bold text-gray-900">{order.phone}</span></span>
                        <span>تاريخ الطلب: <span className="font-bold text-gray-900">{order.createdAt}</span></span>
                      </div>
                    </div>
                    {/* Shipping Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 font-cairo mb-2">🚚 بيانات الشحن</h3>
                      <div className="text-sm font-cairo text-gray-600">
                        <span>العنوان: <span className="font-bold text-gray-900">{order.address}</span></span>
                        <br />
                        <span>طريقة الدفع: <span className="font-bold text-gray-900">{order.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : order.paymentMethod === 'instapay' ? 'InstaPay' : order.paymentMethod === 'vodafone' ? 'فودافون كاش' : order.paymentMethod}</span></span>
                      </div>
                    </div>
                    {/* Order Status */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 font-cairo mb-2">📦 حالة الطلب</h3>
                      <select value={order.status} onChange={e => { updateOrderStatus(order.id, e.target.value as Order['status']); showNotification('تم تحديث حالة الطلب ✓'); }}
                        className={`text-sm px-4 py-2 rounded-full border font-cairo font-bold ${STATUS_COLORS[order.status]}`}>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </div>
                    {/* Items */}
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
                    {/* Total */}
                    <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl p-4 text-center">
                      <p className="text-sm font-cairo opacity-80">الإجمالي</p>
                      <p className="text-2xl font-black font-cairo">{order.total.toLocaleString()} جنيه</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Customer View Modal */}
      <AnimatePresence>
        {viewingCustomer && (() => {
          const custOrders = orders.filter(o => viewingCustomer.orders.includes(o.id));
          const prodMap = new Map(products.map(p => [p.id, p]));
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingCustomer(null)} className="fixed inset-0 bg-black/50 z-50" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
                style={{ maxHeight: '90vh' }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 font-cairo flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-sm">{viewingCustomer.name[0]}</div>
                      {viewingCustomer.name}
                    </h2>
                    <button onClick={() => setViewingCustomer(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3 font-cairo mb-5">
                    {viewingCustomer.phone && <p className="text-sm"><span className="text-gray-500">الموبايل:</span> <span className="font-bold">{viewingCustomer.phone}</span></p>}
                    {viewingCustomer.email && <p className="text-sm"><span className="text-gray-500">البريد:</span> <span className="font-bold">{viewingCustomer.email}</span></p>}
                    {viewingCustomer.address && <p className="text-sm"><span className="text-gray-500">العنوان:</span> <span className="font-bold">{viewingCustomer.address}</span></p>}
                    {viewingCustomer.city && <p className="text-sm"><span className="text-gray-500">المدينة:</span> <span className="font-bold">{viewingCustomer.city}</span></p>}
                    <p className="text-sm"><span className="text-gray-500">تاريخ التسجيل:</span> <span className="font-bold">{viewingCustomer.createdAt}</span></p>
                    <p className="text-sm"><span className="text-gray-500">إجمالي الطلبات:</span> <span className="font-bold">{custOrders.length}</span></p>
                    <p className="text-sm"><span className="text-gray-500">إجمالي المشتريات:</span> <span className="font-bold text-green-600">{custOrders.filter(o => o.status === 'delivered').reduce((a, o) => a + o.total, 0).toLocaleString()} ج</span></p>
                  </div>
                  <p className="font-bold text-gray-900 font-cairo mb-3">طلبات العميل:</p>
                  {custOrders.length === 0 && <p className="text-gray-400 text-center font-cairo py-6">لا توجد طلبات</p>}
                  <div className="space-y-3">
                    {custOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => (
                      <div key={o.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-bold font-cairo ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : o.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{STATUS_LABELS[o.status]}</span>
                          <span className="text-xs text-gray-400 font-cairo">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        {o.items.map((item, idx) => {
                          const p = prodMap.get(item.product.id);
                          return (
                            <div key={idx} className="flex items-center gap-3 py-1">
                              {p?.images?.[0] && <img src={p.images[0]} className="w-8 h-8 rounded-lg object-cover" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold font-cairo truncate">{item.product.name}</p>
                                <p className="text-xs text-gray-400 font-cairo">{item.product.price.toLocaleString()} ج × {item.quantity}</p>
                              </div>
                              <p className="text-sm font-bold text-pink-600 font-cairo">{(item.product.price * item.quantity).toLocaleString()} ج</p>
                            </div>
                          );
                        })}
                        <div className="text-left mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm font-black font-cairo">الإجمالي: {o.total.toLocaleString()} ج</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Customer Edit Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCustomer(null)} className="fixed inset-0 bg-black/50 z-50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
              style={{ maxHeight: '90vh' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black text-gray-900 font-cairo">تعديل بيانات العميل</h2>
                  <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4 font-cairo">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">الاسم</label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">رقم الموبايل</label>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">البريد الإلكتروني</label>
                    <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">العنوان</label>
                    <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">المدينة</label>
                    <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  </div>
                  <button
                    onClick={() => {
                      if (!editForm.phone) {
                        useStore.setState(s => ({
                          users: s.users.map(u =>
                            u.email === editingCustomer.email
                              ? { ...u, name: editForm.name, email: editForm.email }
                              : u
                          ),
                        }));
                        setEditingCustomer(null);
                        showNotification('تم تحديث بيانات العميل ✓');
                      } else {
                        useStore.setState(s => ({
                          customers: s.customers.map(c =>
                            c.phone === editingCustomer.phone
                              ? { ...c, name: editForm.name, phone: editForm.phone, email: editForm.email, address: editForm.address, city: editForm.city }
                              : c
                          ),
                        }));
                        saveCustomersToFirestore(useStore.getState().customers);
                        setEditingCustomer(null);
                        showNotification('تم تحديث بيانات العميل ✓');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-bold font-cairo hover:shadow-lg transition-all"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
