import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Product, VariationCombination } from '../types';
import { ArrowLeft, Store, ShoppingCart, Check, AlertCircle, CheckCircle, MapPin, Tag, MessageSquare, Star } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, formatPrice, currentUser } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentCombination, setCurrentCombination] = useState<VariationCombination | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const product = products.find(p => p.id === id);

  // Initialize default variations if not set
  useEffect(() => {
    if (product?.variationTypes && product.variationTypes.length > 0) {
      const initialOptions: Record<string, string> = {};
      product.variationTypes.forEach(vt => {
        if (vt.options.length > 0) initialOptions[vt.name] = vt.options[0];
      });
      setSelectedOptions(initialOptions);
    }
  }, [product?.id]);

  // Find matching combination
  useEffect(() => {
    if (product?.variationCombinations && Object.keys(selectedOptions).length > 0) {
      const match = product.variationCombinations.find(vc => 
        Object.entries(selectedOptions).every(([key, value]) => vc.combination[key] === value)
      );
      setCurrentCombination(match || null);
      setActiveImageIndex(0); // Reset image index when variation changes
    } else {
      setCurrentCombination(null);
    }
  }, [selectedOptions, product]);

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
        <button onClick={() => navigate('/')} className="text-green-600 hover:underline flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    const finalProduct = {
      ...product,
      price: currentCombination?.price ?? product.price,
      stock: currentCombination?.stock ?? product.stock,
      imageUrl: (currentCombination?.images && currentCombination.images.length > 0) 
        ? currentCombination.images[0] 
        : product.imageUrl,
    };
    addToCart(finalProduct, quantity, selectedOptions);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const displayPrice = currentCombination?.price ?? product.price;
  const displayStock = currentCombination?.stock ?? product.stock;
  const displayImages = currentCombination?.images && currentCombination.images.length > 0 
    ? currentCombination.images 
    : [product.imageUrl];
  const activeImage = displayImages[activeImageIndex] || product.imageUrl;

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
        {/* Product Image Gallery */}
        <div className="lg:w-1/2 p-4 sm:p-8 bg-gray-50 flex flex-col gap-4">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-white border border-gray-100">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            {product.isHalalCertified && (
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> 100% Halal
              </div>
            )}
          </div>
          
          {displayImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                    activeImageIndex === idx ? 'border-green-600 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:w-1/2 p-8 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wider">
              {product.category}
            </span>
            <Link to={`/vendor/${product.vendorId}`} className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1 transition-colors">
              <Store className="w-4 h-4" /> {product.vendorName}
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          
          {/* Rating Summary */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`w-4 h-4 ${s <= Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                />
              ))}
            </div>
            <span className="text-sm font-bold text-gray-900">{product.rating?.toFixed(1) || '0.0'}</span>
            <span className="text-sm text-gray-500">({product.reviewCount || 0} reviews)</span>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {product.description}
          </p>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Available Countries and Cities for Fresh Items */}
          {(product.availableCountries?.length || product.availableCities?.length) ? (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Available for delivery in:
              </h4>
              <div className="flex flex-col gap-2">
                {product.availableCountries && product.availableCountries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-blue-800">Countries:</span>
                    {product.availableCountries.map(country => (
                      <span key={country} className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        {country}
                      </span>
                    ))}
                  </div>
                )}
                {product.availableCities && product.availableCities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-blue-800">Cities:</span>
                    {product.availableCities.map(city => (
                      <span key={city} className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        {city}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Variations */}
          {product.variationTypes && product.variationTypes.length > 0 && (
            <div className="space-y-6 mb-8">
              {product.variationTypes.map(vt => (
                <div key={`vt-${vt.name}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{vt.name}</h4>
                    {selectedOptions[vt.name] && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        Selected: {selectedOptions[vt.name]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vt.options.map(option => (
                      <button
                        key={option}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [vt.name]: option }))}
                        className={`px-4 py-2 text-sm border-2 rounded-xl transition-all ${
                          selectedOptions[vt.name] === option
                            ? 'border-green-600 bg-green-50 text-green-700 font-bold shadow-sm'
                            : 'border-gray-100 text-gray-600 hover:border-green-200 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Variation Attributes */}
          {currentCombination && (
            <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {currentCombination.weight && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Weight</p>
                  <p className="text-sm font-medium text-gray-900">{currentCombination.weight}</p>
                </div>
              )}
              {currentCombination.attributes && Object.entries(currentCombination.attributes).map(([key, value]) => (
                <div key={`attr-${key}`}>
                  <p className="text-xs text-gray-500 uppercase font-bold">{key}</p>
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="border-t border-gray-100 pt-6 mt-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-4xl font-extrabold text-gray-900">{formatPrice(displayPrice, product.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Availability</p>
                {displayStock > 0 ? (
                  <p className="text-green-600 font-medium flex items-center gap-1 justify-end">
                    <Check className="w-4 h-4" /> In Stock ({displayStock})
                  </p>
                ) : (
                  <p className="text-red-500 font-medium flex items-center gap-1 justify-end">
                    <AlertCircle className="w-4 h-4" /> Out of Stock
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden w-full sm:w-auto">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-600 transition-colors border-r border-gray-100"
                  disabled={displayStock === 0}
                >
                  -
                </button>
                <div className="w-12 text-center font-bold text-gray-900">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-600 transition-colors border-l border-gray-100"
                  disabled={displayStock === 0 || quantity >= displayStock}
                >
                  +
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={displayStock === 0}
                className={`flex-1 w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all ${
                  displayStock === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : added 
                      ? 'bg-green-500 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-5 h-5" /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </>
                )}
              </button>
            </div>

            <button 
              onClick={() => {
                const targetPath = currentUser?.role === 'vendor' ? '/vendor' : '/customer';
                if (!currentUser) {
                  navigate('/login', { 
                    state: { 
                      from: { 
                        pathname: targetPath, 
                        state: { openChatWith: product.vendorId } 
                      } 
                    } 
                  });
                  return;
                }
                navigate(targetPath, { state: { openChatWith: product.vendorId } });
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold border-2 border-green-600 text-green-600 hover:bg-green-50 transition-all"
            >
              <MessageSquare className="w-5 h-5" /> Chat with Vendor
            </button>
          </div>
        </div>
      </div>
      
      {/* Reviews Section */}
      <div className="mt-12 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <ReviewSection productId={product.id} />
      </div>

      {/* More from vendor section */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-gray-900 mb-6">More from {product.vendorName}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.filter(p => p.vendorId === product.vendorId && p.id !== product.id).slice(0, 4).map(p => (
            <Link key={p.id} to={`/product/${p.id}`} className="group">
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                <div className="p-3">
                  <h4 className="font-medium text-gray-900 line-clamp-1 group-hover:text-green-600">{p.name}</h4>
                  <p className="text-green-700 font-bold mt-1">{formatPrice(p.price, p.currency)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
