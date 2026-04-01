import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Plus, Edit2, Trash2, Package, DollarSign, ShoppingBag, 
  Clock, CheckCircle, Truck, MapPin, X, TrendingUp, 
  AlertTriangle, BarChart2, LayoutDashboard
} from 'lucide-react';
import { Product, OrderStatus, ProductVariation, SUPPORTED_CURRENCIES } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function VendorDashboard() {
  const { currentUser, products, addProduct, updateProduct, deleteProduct, orders, updateOrderStatus, updateVendorProfile, formatPrice, convertPrice } = useAppContext();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'profile'>('dashboard');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  
  const [variations, setVariations] = useState<ProductVariation[]>([]);

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
      alert('Profile updated successfully!');
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

  const handleAddVariation = () => {
    setVariations([...variations, { name: '', options: [] }]);
  };

  const handleVariationNameChange = (index: number, name: string) => {
    const newVariations = [...variations];
    newVariations[index].name = name;
    setVariations(newVariations);
  };

  const handleVariationOptionsChange = (index: number, optionsString: string) => {
    const newVariations = [...variations];
    newVariations[index].options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    setVariations(newVariations);
  };

  const handleRemoveVariation = (index: number) => {
    const newVariations = [...variations];
    newVariations.splice(index, 1);
    setVariations(newVariations);
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
      variations: variations.filter(v => v.name && v.options.length > 0),
      isHalalCertified: true // All products are Halal certified by default
    };

    try {
      if (editingProduct) {
        await updateProduct({ ...editingProduct, ...productData });
        alert('Product updated successfully!');
      } else {
        await addProduct(productData);
        alert('Product created successfully!');
      }
      resetForm();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', currency: 'USD', category: 'Fresh Items', imageUrl: '', stock: '', tags: '', availableCountries: '', availableCities: '' });
    setVariations([]);
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
    setVariations(product.variations || []);
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
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && renderDashboard()}

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
                <div className="space-y-4 md:col-span-2 mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-semibold text-gray-900">Product Variations</h4>
                    <button type="button" onClick={handleAddVariation} className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add Variation
                    </button>
                  </div>
                  {variations.length === 0 ? (
                    <p className="text-sm text-gray-500">No variations added. Add variations like Size, Color, or Weight.</p>
                  ) : (
                    <div className="space-y-3">
                      {variations.map((variation, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                          <div className="w-full sm:w-1/3">
                            <input 
                              type="text" 
                              placeholder="Variation Name (e.g., Size)" 
                              value={variation.name} 
                              onChange={(e) => handleVariationNameChange(index, e.target.value)} 
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div className="w-full sm:w-flex-grow flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="Options (comma-separated, e.g., Small, Medium, Large)" 
                              value={variation.options.join(', ')} 
                              onChange={(e) => handleVariationOptionsChange(index, e.target.value)} 
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <button type="button" onClick={() => handleRemoveVariation(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
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
                          <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
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
                      <p className="font-bold text-gray-900">{formatPrice(order.totalAmount, order.items[0]?.product?.currency)}</p>
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
                          <span className="text-gray-600">{item.product?.currency || '$'} {(item.price * item.quantity).toFixed(2)}</span>
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
