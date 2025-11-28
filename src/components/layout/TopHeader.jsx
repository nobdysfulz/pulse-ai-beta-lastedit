import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { Bell, Settings, LogOut, LifeBuoy, BookOpen, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import UsageWidget from '../usage/UsageWidget';
import { getSetupNotifications, getTotalNotificationCount } from '../onboarding/setupNotifications';
import NotificationDropdown from '../onboarding/NotificationDropdown';

export default function TopHeader() {
  const { user, onboarding, userAgentSubscription, setSupportChatOpen } = useContext(UserContext);
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const pendingNotifications = useMemo(() => {
    return getSetupNotifications(user, onboarding, userAgentSubscription);
  }, [user, onboarding, userAgentSubscription]);

  const notificationCount = getTotalNotificationCount(pendingNotifications);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTrainingCenterClick = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/functions/generateSSOToLSVT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate SSO token');
      }

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        console.error('Failed to get redirect URL:', data.error);
        window.open('https://pwru.app/login', '_blank');
      }
    } catch (error) {
      console.error('Error initiating SSO:', error);
      window.open('https://pwru.app/login', '_blank');
    }
  };

  const getUserInitials = () => {
    if (!user) return '?';
    
    // Strictly prefer explicit first/last names if available to avoid "team" or email prefix
    let displayName;
    if (user.firstName && user.lastName) {
        displayName = `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
        displayName = user.firstName;
    } else {
        // Fallback to full_name or email if specific names aren't set yet
        displayName = user.full_name || user.email || '?';
    }
    
    const names = displayName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  // Helper to get display name for the menu text
  const getDisplayName = () => {
      if (!user) return 'User';
      if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
      if (user.firstName) return user.firstName;
      return user.full_name || user.email?.split('@')[0] || 'User';
  };

  return (
    <header className="bg-[#232323] text-white pt-10 pr-6 pb-10 pl-6 h-14 flex-shrink-0 flex items-center justify-between shadow-[2px_2px_20px_0px_#707070AD]" role="banner">
      
      <div className="flex items-center gap-3">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/294a5aae0_PULSEINTELLIGENCEPROEMBLEM.png"
          alt="PULSE Intelligence Emblem"
          width="28"
          height="28"
          className="h-7 w-auto" />

        <span className="text-xl font-bold tracking-tight">
          <span className="font-extrabold">PULSE</span>
          <span className="font-medium">IntelligencePRO</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        
        <button
          onClick={handleTrainingCenterClick}
          className="text-sm font-semibold tracking-wider hover:text-gray-200 transition-colors"
          aria-label="Go to Training Center">

          TRAINING CENTER
        </button>

        <div className="relative flex items-center" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="hover:text-gray-200 transition-colors relative flex items-center"
            aria-label={`Notifications ${notificationCount > 0 ? `- ${notificationCount} unread` : ''}`}>

            <Bell className="w-5 h-5" />
            {notificationCount > 0 &&
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center" aria-hidden="true">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            }
          </button>

          {isNotificationOpen &&
          <NotificationDropdown
            notifications={pendingNotifications}
            onDismiss={() => setIsNotificationOpen(false)} />

          }
        </div>

        <button
          onClick={() => navigate(createPageUrl('Settings'))}
          className="hover:text-gray-200 transition-colors"
          aria-label="Settings">

          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={() => setSupportChatOpen(true)}
          className="hover:text-gray-200 transition-colors"
          aria-label="Support">

          <LifeBuoy className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <UsageWidget />
          
          <div className="relative" ref={userMenuRef}>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setIsUserMenuOpen(true)}>

              {user?.avatar ?
              <img
                src={user.avatar}
                alt={`${user.full_name || 'User'} avatar`}
                width="32"
                height="32"
                className="h-8 w-8 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} /> :

              null}
              
              <div
                className={`h-8 w-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-sm font-semibold ${
                user?.avatar ? 'hidden' : 'flex'}`
                }
                aria-label={`${user?.full_name || 'User'} avatar`}>

                {getUserInitials()}
              </div>

              <span className="text-sm font-medium hidden md:inline">
                {getDisplayName()}
              </span>
              
              <ChevronDown className="w-4 h-4 opacity-70" aria-hidden="true" />
            </div>
            
            {isUserMenuOpen &&
            <div
              className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
              role="menu"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}>

                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                </div>
                
                <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate(createPageUrl('Settings'));
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem">

                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </button>
                
                <button
                onClick={(e) => {
                  setIsUserMenuOpen(false);
                  handleTrainingCenterClick(e);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem">

                  <BookOpen className="w-4 h-4 mr-2" />
                  Training Center
                </button>
                
                <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setSupportChatOpen(true);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem">

                  <LifeBuoy className="w-4 h-4 mr-2" />
                  Support
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem">

                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </header>);

}