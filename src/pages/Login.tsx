import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Store, User as UserIcon } from 'lucide-react';
import { User, Role } from '../types';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAppContext();
  
  const isSignup = searchParams.get('mode') === 'signup';
  const defaultRole = (searchParams.get('role') as Role) || 'customer';

  const [isLoginMode, setIsLoginMode] = useState(!isSignup);
  const [role, setRole] = useState<Role>(defaultRole);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    storeName: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isLoginMode) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
          const redirect = searchParams.get('redirect');
          const from = (location.state as any)?.from;
          
          if (redirect) {
            navigate(redirect);
          } else if (from) {
            navigate(from.pathname, { state: from.state });
          } else {
            navigate(data.user.role === 'vendor' ? '/vendor' : '/');
          }
        } else {
          setError(data.error || "Invalid credentials.");
        }
      } else {
        // Signup mode
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: role,
            storeName: role === 'vendor' ? (formData.storeName || `${formData.name}'s Store`) : undefined
          })
        });
        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
          const redirect = searchParams.get('redirect');
          const from = (location.state as any)?.from;

          if (redirect) {
            navigate(redirect);
          } else if (from) {
            navigate(from.pathname, { state: from.state });
          } else {
            navigate(data.user.role === 'vendor' ? '/vendor' : '/');
          }
        } else {
          setError(data.error || "An error occurred during signup.");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <Store className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Halal Market
          </h1>
          <p className="text-gray-500 mt-2">
            Sign in or create an account to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

          <div className="space-y-4">
            {/* Role Selection (Only for Signup) */}
            {!isLoginMode && (
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                    role === 'customer' 
                      ? 'border-green-600 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:border-green-200 text-gray-600'
                  }`}
                >
                  <UserIcon className="w-6 h-6" />
                  <span className="font-medium">Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('vendor')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                    role === 'vendor' 
                      ? 'border-green-600 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:border-green-200 text-gray-600'
                  }`}
                >
                  <Store className="w-6 h-6" />
                  <span className="font-medium">Vendor</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                    placeholder="John Doe"
                  />
                </div>
              )}

              {!isLoginMode && role === 'vendor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                  <input 
                    required 
                    type="text" 
                    name="storeName" 
                    value={formData.storeName} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                    placeholder="Halal Fresh Meats"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  required 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md mt-6 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-green-600 hover:underline text-sm font-medium"
              >
                {isLoginMode 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
