import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { LogOut, Users, Globe, Menu, X, FolderTree } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { currentTenant, userTenants, switchTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t('birthday.birthdays')}
            </button>

            {currentTenant && userTenants.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowTenantMenu(!showTenantMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentTenant.name}</span>
                </button>

                {showTenantMenu && (
                  <div className="absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                    {userTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          switchTenant(tenant.id);
                          setShowTenantMenu(false);
                        }}
                        className={`w-full text-start px-4 py-2 hover:bg-gray-50 ${
                          tenant.id === currentTenant.id
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                      >
                        {tenant.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-600">
                {user.display_name || user.email}
              </span>
            )}

            <button
              onClick={() => navigate('/groups')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/groups'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span className="text-sm">{t('groups.manageGroups')}</span>
            </button>

            <button
              onClick={toggleLanguage}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={i18n.language === 'he' ? 'English' : 'עברית'}
            >
              <Globe className="w-5 h-5" />
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{t('auth.signOut')}</span>
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            {user && (
              <div className="px-4 py-2 text-sm text-gray-600">
                {user.display_name || user.email}
              </div>
            )}

            <button
              onClick={() => {
                navigate('/groups');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg ${
                location.pathname === '/groups'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FolderTree className="w-5 h-5" />
              {t('groups.manageGroups')}
            </button>

            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Globe className="w-5 h-5" />
              {i18n.language === 'he' ? 'English' : 'עברית'}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
