import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, Bell, Search, ChevronDown, ChevronRight,
  User, Key, Settings
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { menuItems } from '../../app/config/menuConfig';
import useDropdown from '../../hooks/useDropdown';
import UserProfileModal from '../../components/modals/UserProfileModal';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import UserSettingsModal from '../../components/modals/UserSettingsModal';
import logo from '../../assets/images/uhamiaji.png';

export default function InternalLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isOpen: profileOpen,
    close: closeProfile,
    toggle: toggleProfile,
    dropdownRef: profileRef,
    triggerRef: profileTriggerRef,
  } = useDropdown();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(new Set(['/internal/reports']));

  useEffect(() => {
    closeProfile();
  }, [location.pathname, closeProfile]);

  const sidebarMenu = menuItems.filter(item => item.roles ? item.roles.includes(user?.role) : true);
  const activeMenu = sidebarMenu.find(m => location.pathname === m.path || (m.children && m.children.some(c => location.pathname === c.path)) || location.pathname.startsWith(m.path + '/')) || sidebarMenu[0];

  const toggleMenu = (path) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[285px] bg-icrcs-navy sticky top-0 h-screen text-white">
        {/* Gold accent line */}
        <div className="h-1 bg-icrcs-gold shrink-0" />

        {/* Logo */}
        <div className="h-20 flex items-center px-5 border-b border-white/10">
          <div className="h-12 w-12 rounded-xl bg-icrcs-gold flex items-center justify-center mr-4 overflow-hidden shrink-0">
            <img src={logo} alt="ICRCS Logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">ICRCS</h1>
            <p className="text-xs text-white/50 font-medium tracking-wider uppercase">Government Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarMenu.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isActive = location.pathname === item.path || (hasChildren && item.children.some(c => location.pathname === c.path)) || (!hasChildren && location.pathname.startsWith(item.path + '/'));
            const isExpanded = expandedMenus.has(item.path);

            return (
              <div key={item.path}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
                        isActive
                          ? 'bg-icrcs-gold text-icrcs-navy shadow-sm'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {item.children.filter(c => c.roles ? c.roles.includes(user?.role) : true).map((child) => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                childActive
                                  ? 'bg-white/20 text-white'
                                  : 'text-white/50 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
                      isActive
                        ? 'bg-icrcs-gold text-icrcs-navy shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/10 w-full transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Tablet Icon Sidebar */}
      <aside className="hidden md:flex lg:hidden flex-col w-[72px] bg-icrcs-navy sticky top-0 h-screen text-white items-center shrink-0">
        <div className="h-1 bg-icrcs-gold shrink-0 w-full" />
        <div className="h-16 flex items-center justify-center w-full border-b border-white/10">
          <div className="h-9 w-9 rounded-lg bg-icrcs-gold flex items-center justify-center overflow-hidden shrink-0">
            <img src={logo} alt="ICRCS" className="h-7 w-7 object-contain" />
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-1 overflow-y-auto w-full">
          {sidebarMenu.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center justify-center w-full py-3 rounded-xl mx-auto transition-all ${
                  isActive
                    ? 'bg-icrcs-gold text-icrcs-navy shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-white/10 w-full">
          <button
            onClick={() => { logout(); navigate('/'); }}
            title="Logout"
            className="flex items-center justify-center w-full py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Modals */}
      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <UserSettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[285px] bg-icrcs-navy flex flex-col lg:hidden animate-slide-up">
            <div className="h-1 bg-icrcs-gold shrink-0" />
            <div className="h-20 flex items-center justify-between px-5 border-b border-white/10">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-xl bg-icrcs-gold flex items-center justify-center mr-4 overflow-hidden shrink-0">
                  <img src={logo} alt="ICRCS Logo" className="h-10 w-10 object-contain" />
                </div>
                <span className="text-xl font-bold text-white">ICRCS</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {sidebarMenu.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isActive = location.pathname === item.path || (hasChildren && item.children.some(c => location.pathname === c.path)) || (!hasChildren && location.pathname.startsWith(item.path + '/'));
                const isExpanded = expandedMenus.has(item.path);

                return (
                  <div key={item.path}>
                    {hasChildren ? (
                      <>
                        <button
                          onClick={() => toggleMenu(item.path)}
                          className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
                            isActive
                              ? 'bg-icrcs-gold text-icrcs-navy'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-[18px] w-[18px]" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {item.children.filter(c => c.roles ? c.roles.includes(user?.role) : true).map((child) => {
                              const childActive = location.pathname === child.path;
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    childActive
                                      ? 'bg-white/20 text-white'
                                      : 'text-white/50 hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
                          isActive
                            ? 'bg-icrcs-gold text-icrcs-navy'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-white/10">
              <button onClick={() => { logout(); setSidebarOpen(false); navigate('/'); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/10 w-full">
                <LogOut className="h-[18px] w-[18px]" /> <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-muted hover:bg-border/50 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            {activeMenu && (
              <div className="flex items-center gap-2">
                <activeMenu.icon className="h-4 w-4 text-primary hidden sm:block" />
                <h2 className="text-sm font-semibold text-text">{activeMenu.label}</h2>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-1.5 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-56" />
            </div>
            <button className="relative p-2 rounded-lg text-muted hover:bg-border/50 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger rounded-full border-2 border-surface"></span>
            </button>
            <div className="relative">
              <button
                ref={profileTriggerRef}
                onClick={toggleProfile}
                className="flex items-center gap-2.5 text-base font-bold text-text hover:bg-border/50 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {user?.name?.charAt(0) || 'O'}
                </div>
                <span className="hidden sm:inline">{user?.name || 'Officer'}</span>
                <ChevronDown className="h-4 w-4 text-muted hidden sm:block" />
              </button>
              {profileOpen && (
                <div ref={profileRef} className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-border py-1 z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-text">{user?.name || 'Officer'}</p>
                    <p className="text-xs text-muted capitalize">{user?.role || 'Officer'}</p>
                  </div>
                  <button onClick={() => { closeProfile(); setProfileModalOpen(true); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-text hover:bg-border/50 transition-colors">
                    <User className="h-4 w-4 text-muted" /> Profile
                  </button>
                  <button onClick={() => { closeProfile(); setPasswordModalOpen(true); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-text hover:bg-border/50 transition-colors">
                    <Key className="h-4 w-4 text-muted" /> Change Password
                  </button>
                  <button onClick={() => { closeProfile(); setSettingsModalOpen(true); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-text hover:bg-border/50 transition-colors">
                    <Settings className="h-4 w-4 text-muted" /> Settings
                  </button>
                  <div className="border-t border-border my-1" />
                  <button onClick={() => { logout(); closeProfile(); navigate('/login'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-40 px-2 pb-safe">
          <div className="flex items-center justify-around h-14">
            {sidebarMenu.slice(0, 5).map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors ${
                    active ? 'text-primary' : 'text-muted'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
