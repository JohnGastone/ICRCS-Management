import React, { useState } from 'react';
import { X, Settings, Mail, Bell, Moon, Monitor } from 'lucide-react';

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        enabled ? 'bg-icrcs-gold' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function UserSettingsModal({ isOpen, onClose }) {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    // TODO: Implement settings save logic
    onClose();
  };

  const items = [
    { label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail, state: emailNotif, setState: setEmailNotif },
    { label: 'Push Notifications', desc: 'Browser and desktop alerts', icon: Bell, state: pushNotif, setState: setPushNotif },
    { label: 'Dark Mode', desc: 'Switch to dark theme', icon: Moon, state: darkMode, setState: setDarkMode },
    { label: 'Compact View', desc: 'Reduce spacing and card sizes', icon: Monitor, state: compactView, setState: setCompactView },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-icrcs-navy flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">User Settings</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
              <Toggle enabled={item.state} onChange={item.setState} />
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-icrcs-navy px-4 py-3 text-sm font-semibold text-white hover:bg-icrcs-navy/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
