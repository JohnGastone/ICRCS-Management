import React from 'react';
import { X, User, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();
  if (!isOpen) return null;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const info = [
    { label: 'Full Name', value: user?.name || 'Officer', icon: User },
    { label: 'Email Address', value: user?.email || 'officer@icrcs.go.tz', icon: Mail },
    { label: 'Role', value: user?.role || 'Officer', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-icrcs-navy flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">User Profile</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-icrcs-navy flex items-center justify-center text-white text-2xl font-bold shadow-md mb-4">
              {initials}
            </div>
            <h4 className="text-lg font-bold text-gray-900">{user?.name || 'Officer'}</h4>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{user?.role || 'Officer'}</p>
          </div>

          {/* Info Rows */}
          <div className="space-y-3">
            {info.map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="h-10 w-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
