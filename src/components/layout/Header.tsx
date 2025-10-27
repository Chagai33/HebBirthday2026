import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { useGroups } from '../../hooks/useGroups';
import { LogOut, Globe, Menu, X, FolderTree, Filter } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();
  const { data: allGroups = [] } = useGroups();

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-base sm:text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t('birthday.birthdays')}
            </button>

          </div>

          <div className="hidden md:flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-600">
                {user.display_name || user.email}
              </span>
            )}

            {location.pathname === '/' && (
              <div className="relative">
                <button
                  onClick={() => setShowGroupFilter(!showGroupFilter)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedGroupIds.length > 0
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">{t('groups.filterByGroup')}</span>
                  {selectedGroupIds.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
                      {selectedGroupIds.length}
                    </span>
                  )}
                </button>

                {showGroupFilter && (
                  <GroupFilterDropdown
                    allGroups={allGroups}
                    selectedGroupIds={selectedGroupIds}
                    toggleGroupFilter={toggleGroupFilter}
                    clearGroupFilters={clearGroupFilters}
                    onClose={() => setShowGroupFilter(false)}
                  />
                )}
              </div>
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
            className="md:hidden p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
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

interface GroupFilterDropdownProps {
  allGroups: any[];
  selectedGroupIds: string[];
  toggleGroupFilter: (id: string) => void;
  clearGroupFilters: () => void;
  onClose: () => void;
}

const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  allGroups,
  selectedGroupIds,
  toggleGroupFilter,
  clearGroupFilters,
  onClose,
}) => {
  const { t } = useTranslation();
  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);

  return (
    <div className="absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[280px] max-h-[400px] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {t('groups.filterByGroup')}
        </span>
        {selectedGroupIds.length > 0 && (
          <button
            onClick={() => {
              clearGroupFilters();
              onClose();
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('common.clear', 'נקה הכל')}
          </button>
        )}
      </div>

      <div className="py-2">
        {rootGroups.map((root) => {
          const children = childGroups.filter(c => c.parent_id === root.id);
          if (children.length === 0) return null;

          return (
            <div key={root.id} className="mb-2">
              <div className="px-4 py-1 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: root.color }}
                />
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {root.name}
                </span>
              </div>
              {children.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroupFilter(group.id)}
                  className={`w-full px-6 py-2 text-start hover:bg-gray-50 flex items-center justify-between ${
                    selectedGroupIds.includes(group.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700">{group.name}</span>
                  {selectedGroupIds.includes(group.id) && (
                    <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
