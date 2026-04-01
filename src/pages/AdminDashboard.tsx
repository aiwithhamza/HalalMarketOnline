import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Users, Store, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser, adminStats, adminVendors, fetchAdminStats, fetchAdminVendors, updateVendorStatus, formatPrice } = useAppContext();

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdminStats();
      fetchAdminVendors();
    }
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
        <p className="text-gray-500 mt-2">Monitor platform performance and manage vendor approvals.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(adminStats?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalCustomers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalVendors || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.pendingVendors || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Vendor Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Store / Vendor</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Joined Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adminVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{vendor.storeName || 'No Store Name'}</div>
                    <div className="text-sm text-gray-500">{vendor.name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{vendor.email}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      vendor.status === 'active' ? 'bg-green-100 text-green-700' :
                      vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {vendor.status !== 'active' && (
                        <button
                          onClick={() => updateVendorStatus(vendor.id, 'active')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve Vendor"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {vendor.status !== 'suspended' && (
                        <button
                          onClick={() => updateVendorStatus(vendor.id, 'suspended')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Suspend Vendor"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {adminVendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No vendors found on the platform.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
