import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Store, ShoppingCart, Check, AlertCircle, CheckCircle, MapPin, Tag } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, formatPrice } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  const product = products.find(p => p.id === id);

  // Initialize default variations if not set
  useEffect(() => {
    if (product?.variations && product.variations.length > 0) {
      setSelectedVariations(prev => {
        if (Object.keys(prev).length > 0) return prev;
        const initialVars: Record<string, string> = {};
        product.variations!.forEach(v => {
          if (v.options.length > 0) initialVars[v.name] = v.options[0];
        });
        return Object.keys(initialVars).length > 0 ? initialVars : prev;
      });
    }
  }, [product?.id]);

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
    addToCart(product, quantity, selectedVariations);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        {/* Product Image */}
        <div className="md:w-1/2 h-64 md:h-auto relative bg-gray-50">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover absolute inset-0"
            referrerPolicy="no-referrer"
          />
          {product.isHalalCertified && (
            <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> 100% Halal Certified
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="md:w-1/2 p-8 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wider">
              {product.category}
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Store className="w-4 h-4" /> {product.vendorName}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
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
          {product.variations && product.variations.length > 0 && (
            <div className="space-y-4 mb-6">
              {product.variations.map(variation => (
                <div key={variation.name}>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{variation.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {variation.options.map(option => (
                      <button
                        key={option}
                        onClick={() => setSelectedVariations(prev => ({ ...prev, [variation.name]: option }))}
                        className={`px-4 py-2 text-sm border rounded-lg transition-colors ${
                          selectedVariations[variation.name] === option
                            ? 'border-green-600 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 text-gray-700 hover:border-green-300'
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
          
          <div className="border-t border-gray-100 pt-6 mt-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-4xl font-extrabold text-gray-900">{formatPrice(product.price, product.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Availability</p>
                {product.stock > 0 ? (
                  <p className="text-green-600 font-medium flex items-center gap-1 justify-end">
                    <Check className="w-4 h-4" /> In Stock ({product.stock})
                  </p>
                ) : (
                  <p className="text-red-500 font-medium flex items-center gap-1 justify-end">
                    <AlertCircle className="w-4 h-4" /> Out of Stock
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                  disabled={product.stock === 0}
                >
                  -
                </button>
                <div className="w-12 text-center font-medium text-gray-900">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                  disabled={product.stock === 0 || quantity >= product.stock}
                >
                  +
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold transition-all ${
                  product.stock === 0 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : added 
                      ? 'bg-green-500 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
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
          </div>
        </div>
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
