import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Plus, Edit2, Trash2, Package, DollarSign, ShoppingBag, 
  Clock, CheckCircle, Truck, MapPin, X, TrendingUp, 
  AlertTriangle, BarChart2, LayoutDashboard, MessageSquare,
  ChevronDown, ChevronUp, Image as ImageIcon, Settings
} from 'lucide-react';
import { Product, OrderStatus, VariationType, VariationCombination, SUPPORTED_CURRENCIES } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

export default function VendorDashboard() {
  const { currentUser, products, addProduct, updateProduct, deleteProduct, orders, updateOrderStatus, updateVendorProfile, formatPrice, convertPrice, conversations } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'profile' | 'messages'>('dashboard');
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { activeTab?: string, openChatWith?: string };
    if (state?.openChatWith) {
      setActiveTab('messages');
      setSelectedChatUserId(state.openChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.activeTab) {
      setActiveTab(state.activeTab as any);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ orderId: string, status: OrderStatus, description: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    category: 'Fresh Items',
    imageUrl: '',
    stock: '',
    tags: '',
    availableCountries: '',
    availableCities: '',
  });
  
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [variationCombinations, setVariationCombinations] = useState<VariationCombination[]>([]);
  const [showCombinations, setShowCombinations] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    storeName: currentUser?.storeName || '',
    storeDescription: currentUser?.storeDescription || '',
    profileImage: currentUser?.profileImage || '',
    coverImage: currentUser?.coverImage || ''
  });

  if (!currentUser || currentUser.role !== 'vendor') {
    return <Navigate to="/login" />;
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      updateVendorProfile({
        ...currentUser,
        storeName: profileData.storeName,
        storeDescription: profileData.storeDescription,
        profileImage: profileData.profileImage,
        coverImage: profileData.coverImage
      });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const myProducts = products.filter(p => p.vendorId === currentUser.id);
  const myOrders = orders.filter(o => o.vendorId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Analytics Data
  const totalRevenue = myOrders.filter(o => o.status === 'delivered').reduce((sum, order) => {
    const orderCurrency = order.items[0]?.product?.currency || 'USD';
    return sum + convertPrice(order.totalAmount, orderCurrency, 'USD');
  }, 0);
  
  const totalOrders = myOrders.length;
  const totalProducts = myProducts.length;
  const pendingOrders = myOrders.filter(o => o.status === 'pending').length;
  const lowStockProducts = myProducts.filter(p => p.stock < 10);

  // Generate chart data from orders
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayOrders = myOrders.filter(o => 
      new Date(o.createdAt).toLocaleDateString() === date.toLocaleDateString() && 
      o.status === 'delivered'
    );
    const amount = dayOrders.reduce((sum, o) => {
      const orderCurrency = o.items[0]?.product?.currency || 'USD';
      return sum + convertPrice(o.totalAmount, orderCurrency, 'USD');
    }, 0);
    return { name: dateStr, sales: amount };
  });

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue, 'USD')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{myOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Sales Performance (Last 7 Days)</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div> Sales (USD)
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Inventory Alerts</h3>
          <div className="space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-3">
                    <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                      <p className="text-xs text-red-600 font-bold">{product.stock} left in stock</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('products'); handleEditClick(product); }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">All products are well stocked!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          <button onClick={() => setActiveTab('orders')} className="text-sm text-green-600 font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {myOrders.slice(0, 5).map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.customerName}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatPrice(order.totalAmount, order.items[0]?.product?.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVariationType = () => {
    setVariationTypes([...variationTypes, { name: '', options: [] }]);
  };

  const handleVariationTypeNameChange = (index: number, name: string) => {
    const newTypes = [...variationTypes];
    newTypes[index].name = name;
    setVariationTypes(newTypes);
  };

  const handleVariationTypeOptionsChange = (index: number, optionsString: string) => {
    const newTypes = [...variationTypes];
    newTypes[index].options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    setVariationTypes(newTypes);
  };

  const handleRemoveVariationType = (index: number) => {
    const newTypes = [...variationTypes];
    newTypes.splice(index, 1);
    setVariationTypes(newTypes);
  };

  const generateCombinations = () => {
    if (variationTypes.length === 0) {
      setVariationCombinations([]);
      return;
    }
    
    // Check if all types have names and options
    if (variationTypes.some(t => !t.name || t.options.length === 0)) {
      setErrorMessage('Please ensure all variation types have a name and at least one option.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    let results: Record<string, string>[] = [{}];
    
    variationTypes.forEach(type => {
      const newResults: Record<string, string>[] = [];
      results.forEach(res => {
        type.options.forEach(opt => {
          newResults.push({ ...res, [type.name]: opt });
        });
      });
      results = newResults;
    });
    
    const newCombinations = results.map(comb => {
      // Try to find existing combination to preserve data
      const existing = variationCombinations.find(vc => 
        Object.entries(comb).every(([key, value]) => vc.combination[key] === value)
      );
      
      if (existing) return existing;

      return {
        id: Math.random().toString(36).substr(2, 9),
        combination: comb,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        images: [formData.imageUrl].filter(Boolean),
        weight: '',
        attributes: {}
      };
    });
    
    setVariationCombinations(newCombinations);
    setShowCombinations(true);
  };

  const handleCombinationChange = (index: number, field: keyof VariationCombination, value: any) => {
    const newCombinations = [...variationCombinations];
    newCombinations[index] = { ...newCombinations[index], [field]: value };
    setVariationCombinations(newCombinations);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      currency: formData.currency,
      category: formData.category,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
      stock: parseInt(formData.stock, 10),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      availableCountries: formData.availableCountries.split(',').map(country => country.trim()).filter(country => country !== ''),
      availableCities: formData.availableCities.split(',').map(city => city.trim()).filter(city => city !== ''),
      variationTypes: variationTypes.filter(v => v.name && v.options.length > 0),
      variationCombinations: variationCombinations,
      isHalalCertified: true
    };

    try {
      if (editingProduct) {
        await updateProduct({ ...editingProduct, ...productData });
        setSuccessMessage('Product updated successfully!');
      } else {
        await addProduct(productData);
        setSuccessMessage('Product created successfully!');
      }
      setTimeout(() => setSuccessMessage(null), 5000);
      resetForm();
    } catch (error: any) {
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const resetForm = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', currency: 'USD', category: 'Fresh Items', imageUrl: '', stock: '', tags: '', availableCountries: '', availableCities: '' });
    setVariationTypes([]);
    setVariationCombinations([]);
    setShowCombinations(false);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      currency: product.currency || 'USD',
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock.toString(),
      tags: product.tags?.join(', ') || '',
      availableCountries: product.availableCountries?.join(', ') || '',
      availableCities: product.availableCities?.join(', ') || ''
    });
    setVariationTypes(product.variationTypes || []);
    setVariationCombinations(product.variationCombinations || []);
    setShowCombinations((product.variationCombinations?.length || 0) > 0);
    setIsAddingProduct(true);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Success Message Banner */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-green-900">{successMessage}</p>
            <p className="text-sm text-green-700">Your changes have been saved and are now live.</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-red-900">Action Failed</p>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage your store: {currentUser.storeName}</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'products' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'profile' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Store Profile
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'messages' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <div className="flex items-center gap-2">
              Messages
              {conversations.some(c => c.unreadCount > 0) && (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && renderDashboard()}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingProductId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteProduct(deletingProductId);
                  setDeletingProductId(null);
                  setSuccessMessage('Product deleted successfully!');
                  setTimeout(() => setSuccessMessage(null), 5000);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview - Only show on other tabs if needed, but we have a dedicated dashboard now */}
      {activeTab !== 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue, 'USD')}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-1 overflow-y-auto">
            <ChatList onSelect={setSelectedChatUserId} activeUserId={selectedChatUserId || undefined} />
          </div>
          <div className="lg:col-span-2 h-full">
            {selectedChatUserId ? (
              <ChatWindow otherUserId={selectedChatUserId} onClose={() => setSelectedChatUserId(null)} />
            ) : (
              <div className="h-full bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Pick a customer from the list to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">My Products</h2>
            <button 
              onClick={() => {
                setIsAddingProduct(!isAddingProduct);
                if (!isAddingProduct) {
                  setEditingProduct(null);
                  setFormData({ name: '', description: '', price: '', category: 'Fresh Items', imageUrl: '', stock: '', tags: '', availableCountries: '', availableCities: '' });
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              {isAddingProduct ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Product</>}
            </button>
          </div>

          {isAddingProduct && (
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <form onSubmit={handleSubmitProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="Fresh Items">Fresh Items</option>
                    <option value="Meat">Meat</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3}></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Price</label>
                  <div className="flex gap-2">
                    <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      {SUPPORTED_CURRENCIES.filter(c => c.code !== 'original').map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                    <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleInputChange} className="flex-grow px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input required type="number" min="0" name="stock" value={formData.stock} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleInputChange} placeholder="e.g., organic, gluten-free, spicy" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Available Countries (comma-separated, for Fresh Items)</label>
                  <input type="text" name="availableCountries" value={formData.availableCountries} onChange={handleInputChange} placeholder="e.g., USA, Canada" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Available Cities (comma-separated, for Fresh Items)</label>
                  <input type="text" name="availableCities" value={formData.availableCities} onChange={handleInputChange} placeholder="e.g., New York, Los Angeles" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Image URL</label>
                  <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://example.com/image.jpg" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                {/* Variations Section */}
                <div className="space-y-6 md:col-span-2 mt-6">
                  <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">1. Define Variation Types</h4>
                        <p className="text-sm text-gray-500">Add types like Size, Color, or Material.</p>
                      </div>
                      <button type="button" onClick={handleAddVariationType} className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold hover:bg-green-100 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Type
                      </button>
                    </div>
                    
                    {variationTypes.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Settings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No variation types added yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {variationTypes.map((type, index) => (
                          <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                            <div className="w-full sm:w-1/3">
                              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Type Name</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Size" 
                                value={type.name} 
                                onChange={(e) => handleVariationTypeNameChange(index, e.target.value)} 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <div className="flex-grow">
                              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Options (comma separated)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Small, Medium, Large" 
                                value={type.options.join(', ')} 
                                onChange={(e) => handleVariationTypeOptionsChange(index, e.target.value)} 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <button type="button" onClick={() => handleRemoveVariationType(index)} className="absolute -top-2 -right-2 sm:static p-2 text-red-400 hover:text-red-600 bg-white sm:bg-transparent rounded-full shadow-sm sm:shadow-none opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        
                        <div className="pt-4 flex justify-center">
                          <button 
                            type="button" 
                            onClick={generateCombinations}
                            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                          >
                            Generate All Combinations
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {showCombinations && variationCombinations.length > 0 && (
                    <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">2. Manage Combinations</h4>
                          <p className="text-sm text-gray-500">Set specific price, stock, and details for each variation.</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowCombinations(!showCombinations)}
                          className="text-gray-500 hover:text-gray-900"
                        >
                          {showCombinations ? <ChevronUp /> : <ChevronDown />}
                        </button>
                      </div>

                      <div className="space-y-4">
                        {variationCombinations.map((vc, index) => (
                          <div key={index} className="border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 flex flex-wrap gap-2 items-center border-b border-gray-100">
                              {Object.entries(vc.combination).map(([key, value]) => (
                                <span key={`combo-${key}`} className="bg-white px-3 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 shadow-sm">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Price</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={vc.price}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      handleCombinationChange(index, 'price', isNaN(val) ? 0 : val);
                                    }}
                                    className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Stock</label>
                                <input 
                                  type="number" 
                                  value={vc.stock}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    handleCombinationChange(index, 'stock', isNaN(val) ? 0 : val);
                                  }}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Weight</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. 500g"
                                  value={vc.weight}
                                  onChange={(e) => handleCombinationChange(index, 'weight', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Images (comma separated)</label>
                                <input 
                                  type="text" 
                                  placeholder="URLs..."
                                  value={vc.images?.join(', ') || ''}
                                  onChange={(e) => handleCombinationChange(index, 'images', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 mt-4 flex justify-end gap-3">
                  <button type="button" onClick={resetForm} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors">
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Stock</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      You haven't added any products yet.
                    </td>
                  </tr>
                ) : (
                  myProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 w-48">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{product.category}</td>
                      <td className="p-4 font-medium text-gray-900">{formatPrice(product.price, product.currency)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {product.stock} in stock
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditClick(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingProductId(product.id)} 
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {myOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
              <p className="text-gray-500">When customers buy your products, orders will appear here.</p>
            </div>
          ) : (
            myOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-gray-900">
                      Customer: {order.customerName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Total</p>
                      <p className="font-bold text-gray-900">{formatPrice(order.totalAmount, order.items[0]?.currency)}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <select 
                        value={order.status}
                        onChange={(e) => setStatusModal({ orderId: order.id, status: e.target.value as OrderStatus, description: '' })}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Ordered Items</h4>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-50 rounded flex items-center justify-center text-green-700 font-bold text-sm">
                              {item.quantity}x
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 block">{item.productName}</span>
                              {item.selectedVariations && Object.keys(item.selectedVariations).length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {Object.entries(item.selectedVariations).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-gray-600">{formatPrice(item.price * item.quantity, item.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping & Payment Details */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Shipping Details</h4>
                    
                    {order.shippingDetails ? (
                      <div className="mb-4">
                        <p className="text-sm text-gray-900 font-medium">{order.shippingDetails.fullName}</p>
                        <p className="text-sm text-gray-600">{order.shippingDetails.address}</p>
                        <p className="text-sm text-gray-600">{order.shippingDetails.city}, {order.shippingDetails.zipCode}</p>
                        <p className="text-sm text-gray-600 mt-1">Contact: {order.shippingDetails.phone}</p>
                        <p className="text-sm text-gray-600">Email: {order.shippingDetails.email}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-4">No shipping details provided.</p>
                    )}

                    {order.paymentMethod && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                        <p className="text-sm text-gray-900 font-medium capitalize">
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Updates History */}
                {order.history && order.history.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Order Updates History</h4>
                    <div className="space-y-4">
                      {order.history.map((update, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${index === order.history!.length - 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            {index !== order.history!.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1"></div>}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium text-gray-900 capitalize">{update.status}</p>
                            <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(update.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Store Profile</h2>
            <p className="text-gray-500 mt-1">Update your store details and images for customers to see.</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Store Name</label>
                <input required type="text" name="storeName" value={profileData.storeName} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Store Description</label>
                <textarea name="storeDescription" value={profileData.storeDescription} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={4} placeholder="Tell customers about your store and products..."></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Profile Image URL (Logo)</label>
                <input type="url" name="profileImage" value={profileData.profileImage} onChange={handleProfileChange} placeholder="https://example.com/logo.jpg" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {profileData.profileImage && (
                  <div className="mt-2">
                    <img src={profileData.profileImage} alt="Profile Preview" className="w-16 h-16 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cover Image URL</label>
                <input type="url" name="coverImage" value={profileData.coverImage} onChange={handleProfileChange} placeholder="https://example.com/cover.jpg" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {profileData.coverImage && (
                  <div className="mt-2">
                    <img src={profileData.coverImage} alt="Cover Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Update Order Status</h3>
              <button onClick={() => setStatusModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">New Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize inline-block ${getStatusColor(statusModal.status)}`}>
                  {statusModal.status}
                </span>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Description (Optional)
                </label>
                <textarea
                  value={statusModal.description}
                  onChange={(e) => setStatusModal({ ...statusModal, description: e.target.value })}
                  placeholder="e.g., Your order has been shipped via FedEx. Tracking #12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">This will be visible to the customer.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStatusModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateOrderStatus(statusModal.orderId, statusModal.status, statusModal.description);
                    setStatusModal(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
