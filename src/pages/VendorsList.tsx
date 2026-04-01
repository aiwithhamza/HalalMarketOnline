import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Store, MapPin, Star } from 'lucide-react';

export default function VendorsList() {
  const { vendors } = useAppContext();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Halal Market Vendors</h1>
        <p className="text-gray-500 mt-2">Discover our certified halal vendors and their fresh products.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.filter(v => v.role === 'vendor').map(vendor => (
          <Link 
            key={vendor.id} 
            to={`/vendor/${vendor.id}`}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div className="h-32 bg-gray-200 relative overflow-hidden">
              {vendor.coverImage ? (
                <img 
                  src={vendor.coverImage} 
                  alt={vendor.storeName || vendor.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                  <Store className="w-12 h-12 text-emerald-300" />
                </div>
              )}
            </div>
            
            <div className="p-6 relative">
              <div className="absolute -top-10 left-6">
                {vendor.profileImage ? (
                  <img 
                    src={vendor.profileImage} 
                    alt={vendor.storeName || vendor.name} 
                    className="w-16 h-16 rounded-full border-4 border-white object-cover bg-white shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-emerald-600 flex items-center justify-center shadow-sm">
                    <span className="text-xl font-bold text-white">
                      {(vendor.storeName || vendor.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{vendor.storeName || vendor.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {vendor.storeDescription || 'A certified vendor on Halal Market Online.'}
                </p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-emerald-600 font-medium text-sm flex items-center gap-1">
                    Visit Store &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
