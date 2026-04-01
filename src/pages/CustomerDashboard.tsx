import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Package, Clock, CheckCircle, Truck, MapPin, CreditCard, Banknote } from 'lucide-react';
import { OrderStatus } from '../types';

export default function CustomerDashboard() {
  const { currentUser, orders, formatPrice } = useAppContext();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const myOrders = orders.filter(o => o.customerId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <MapPin className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

  const getStepIndex = (status: OrderStatus) => {
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 mt-2">Track and manage your halal market orders.</p>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-500">When you place an order, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myOrders.map(order => {
            const currentStepIndex = getStepIndex(order.status);
            
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-gray-900">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                      <p className="font-bold text-gray-900">{formatPrice(order.totalAmount, order.items[0]?.product?.currency)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 capitalize ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>
                </div>
                
                {/* Status Tracker */}
                <div className="px-6 py-8 border-b border-gray-100">
                  <div className="relative">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200">
                      <div 
                        style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }} 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-gray-500 px-1">
                      {STATUS_STEPS.map((step, index) => (
                        <div key={step} className={`flex flex-col items-center w-1/5 ${index <= currentStepIndex ? 'text-green-600' : ''}`}>
                          <span className="capitalize mt-1 hidden sm:block">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Order Items */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Items</h4>
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
                          <span className="text-gray-600">{formatPrice(item.price * item.quantity, item.product?.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping & Payment Details */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Order Details</h4>
                    
                    {order.shippingDetails && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Shipping Address</p>
                        <p className="text-sm text-gray-900 font-medium">{order.shippingDetails.fullName}</p>
                        <p className="text-sm text-gray-600">{order.shippingDetails.address}</p>
                        <p className="text-sm text-gray-600">{order.shippingDetails.city}, {order.shippingDetails.zipCode}</p>
                        <p className="text-sm text-gray-600 mt-1">Contact: {order.shippingDetails.phone}</p>
                        <p className="text-sm text-gray-600">Email: {order.shippingDetails.email}</p>
                      </div>
                    )}

                    {order.paymentMethod && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                        <p className="text-sm text-gray-900 font-medium flex items-center gap-2">
                          {order.paymentMethod === 'card' ? (
                            <><CreditCard className="w-4 h-4 text-gray-500" /> Credit/Debit Card</>
                          ) : (
                            <><Banknote className="w-4 h-4 text-green-600" /> Cash on Delivery</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Updates History */}
                {order.history && order.history.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Order Updates</h4>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
