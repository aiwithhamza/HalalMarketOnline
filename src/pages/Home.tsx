import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Search, Filter, ShoppingBag, Store, CheckCircle, MapPin, ChevronRight, Star, Globe2 } from 'lucide-react';

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode, color: string, bg: string }> = {
  'Bakery': { icon: <span className="text-2xl">🥐</span>, color: 'text-amber-600', bg: 'bg-amber-100' },
  'Snacks': { icon: <span className="text-2xl">🥨</span>, color: 'text-orange-600', bg: 'bg-orange-100' },
  'Frozen': { icon: <span className="text-2xl">🧊</span>, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  'Dairy': { icon: <span className="text-2xl">🥛</span>, color: 'text-blue-600', bg: 'bg-blue-100' },
  'Meat': { icon: <span className="text-2xl">🥩</span>, color: 'text-red-600', bg: 'bg-red-100' },
  'Beverages': { icon: <span className="text-2xl">🥤</span>, color: 'text-purple-600', bg: 'bg-purple-100' },
  'Seafood': { icon: <span className="text-2xl">🐟</span>, color: 'text-teal-600', bg: 'bg-teal-100' },
  'Spices': { icon: <span className="text-2xl">🌶️</span>, color: 'text-rose-600', bg: 'bg-rose-100' },
  'Fresh Items': { icon: <span className="text-2xl">🥬</span>, color: 'text-green-600', bg: 'bg-green-100' },
};

export default function Home() {
  const { products, addToCart, formatPrice } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedCity, setSelectedCity] = useState('All Cities');

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category))) as string[]];
  
  // Extract all unique countries and cities from products
  const allCountries = Array.from(new Set(
    products.flatMap(p => p.availableCountries || [])
  )).sort();
  const countries = ['All Countries', ...allCountries];

  const allCities = Array.from(new Set(
    products.flatMap(p => p.availableCities || [])
  )).sort();
  const cities = ['All Cities', ...allCities];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const featuredProducts = [...products].sort((a, b) => {
    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  }).slice(0, 4);
  
  // Filter fresh items based on selected country and city
  const freshItems = products.filter(p => {
    if (p.category !== 'Fresh Items') return false;
    
    const matchesCountry = selectedCountry === 'All Countries' || p.availableCountries?.includes(selectedCountry);
    const matchesCity = selectedCity === 'All Cities' || p.availableCities?.includes(selectedCity);
    
    return matchesCountry && matchesCity;
  }).sort((a, b) => {
    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative bg-green-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600" 
            alt="Fresh Groceries" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-green-900/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-800/50 border border-green-700 text-green-300 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> 100% Halal Certified
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              Premium Halal <br/> <span className="text-green-400">Marketplace</span>
            </h1>
            <p className="text-lg text-green-100 max-w-lg leading-relaxed">
              Shop globally sourced, certified halal products. From fresh local meats to international spices, delivered right to your door.
            </p>
            
            {/* Search Bar in Hero */}
            <div className="relative max-w-xl mt-8">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search for halal meats, spices, fresh items..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-11 pr-4 py-4 border-0 rounded-xl text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-lg sm:leading-6 shadow-lg"
              />
              <button className="absolute inset-y-2 right-2 bg-green-600 text-white px-6 rounded-lg font-medium hover:bg-green-700 transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.filter(c => c !== 'All').map(category => {
            const iconData = CATEGORY_ICONS[category] || { icon: <span className="text-2xl">📦</span>, color: 'text-gray-600', bg: 'bg-gray-100' };
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:shadow-md border border-transparent hover:border-gray-200 ${
                  selectedCategory === category ? 'ring-2 ring-green-500 bg-white' : 'bg-white'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${iconData.bg} ${iconData.color}`}>
                  {iconData.icon}
                </div>
                <span className="text-sm font-medium text-gray-800 text-center">{category}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Products */}
      {searchTerm === '' && selectedCategory === 'All' && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Featured Products
            </h2>
            <button className="text-green-600 font-medium hover:text-green-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        </section>
      )}

      {/* Halal Fresh Items (Location Dependent) */}
      {searchTerm === '' && selectedCategory === 'All' && (
        <section className="bg-green-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 border-y border-green-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
                  <span className="text-2xl">🥬</span> Halal Fresh Items
                </h2>
                <p className="text-green-700 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Available in select local vicinities
                </p>
              </div>
              
              {/* Location Selectors */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-green-200 shadow-sm">
                  <Globe2 className="w-5 h-5 text-green-600" />
                  <select 
                    value={selectedCountry} 
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-transparent border-none text-gray-900 font-medium focus:ring-0 cursor-pointer outline-none"
                  >
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-green-200 shadow-sm">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <select 
                    value={selectedCity} 
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent border-none text-gray-900 font-medium focus:ring-0 cursor-pointer outline-none"
                  >
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {freshItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {freshItems.map(product => (
                  <ProductCard key={product.id} product={product} addToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/50 rounded-2xl border border-green-100">
                <MapPin className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900 mb-1">No fresh items available</h3>
                <p className="text-green-700">We currently don't have fresh items available in {selectedCity !== 'All Cities' ? selectedCity : selectedCountry}.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Product Grid */}
      <section id="products-grid" className="pt-8">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedCategory === 'All' ? (searchTerm ? 'Search Results' : 'All Products') : `${selectedCategory} Products`}
          </h2>
          <span className="text-sm text-gray-500">{filteredProducts.length} items found</span>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 max-w-md mx-auto">We couldn't find any products matching your current search or category filters.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="mt-6 text-green-600 font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        )}
      </section>

      {/* Global Join Section */}
      <section className="bg-emerald-900 rounded-3xl overflow-hidden shadow-xl mt-16">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 p-12 md:p-16 flex flex-col justify-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
              <Globe2 className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Join Halal Mart Global Network
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              We are expanding globally! Whether you're a local butcher, an international spice merchant, or a fresh produce farmer, join our marketplace to reach millions of customers seeking certified halal products.
            </p>
            <ul className="space-y-4 mb-8">
              {['Access to global customer base', 'Secure payment processing', 'Marketing & SEO support', 'Dedicated vendor dashboard'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-500" /> {item}
                </li>
              ))}
            </ul>
            <div>
              <Link to="/login?mode=signup&role=vendor" className="inline-block bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-500 transition-colors shadow-lg">
                Become a Vendor Today
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative min-h-[300px]">
            <img 
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1000" 
              alt="Vendor Store" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 to-transparent"></div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Extracted ProductCard component for reuse
function ProductCard({ product, addToCart }: { product: any, addToCart: any, key?: React.Key }) {
  const { formatPrice } = useAppContext();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
      <Link to={`/product/${product.id}`} className="block relative h-56 overflow-hidden bg-gray-50">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {product.isHalalCertified && (
          <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Halal
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
          {product.category}
        </div>
      </Link>
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> {product.vendorName}
          </p>
          <Link to={`/product/${product.id}`}>
            <h3 className="font-bold text-gray-900 line-clamp-2 hover:text-green-600 transition-colors leading-tight">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-gray-900">{product.rating?.toFixed(1) || '0.0'}</span>
            <span className="text-[10px] text-gray-400">({product.reviewCount || 0})</span>
          </div>
        </div>
        
        {product.availableCities && product.availableCities.length > 0 && (
          <p className="text-xs text-blue-600 mb-3 flex items-center gap-1 bg-blue-50 w-fit px-2 py-1 rounded-md">
            <MapPin className="w-3 h-3" /> {product.availableCities[0]} {product.availableCities.length > 1 ? `+${product.availableCities.length - 1}` : ''}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 line-through">{formatPrice(product.price * 1.2, product.currency)}</span>
            <span className="text-xl font-extrabold text-gray-900">{formatPrice(product.price, product.currency)}</span>
          </div>
          <button 
            onClick={() => addToCart(product, 1)}
            disabled={product.stock === 0}
            className={`p-3 rounded-xl transition-all ${
              product.stock > 0 
                ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md hover:-translate-y-0.5' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
