import React from 'react';
import { NavLink } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckSquare, Briefcase, MessageSquare, Target, TrendingUp, Settings, Home } from 'lucide-react';

export default function MobileBottomNav() {
  const navItems = [
    {
      label: 'Dashboard',
      icon: Home,
      to: createPageUrl('ToDo'),
    },
    {
      label: 'CRM',
      icon: Briefcase,
      to: createPageUrl('Crm'),
    },
    {
      label: 'Advisor',
      icon: MessageSquare,
      to: createPageUrl('PersonalAdvisor'),
    },
    {
      label: 'Goals',
      icon: Target,
      to: createPageUrl('Goals'),
    },
    {
      label: 'Analytics',
      icon: TrendingUp,
      to: createPageUrl('Intelligence'),
    },
    {
      label: 'Settings',
      icon: Settings,
      to: createPageUrl('Settings'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#232323] border-t border-[#333333] px-2 py-2 z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 px-0.5 min-w-[3.5rem] transition-colors ${
                isActive ? 'text-white font-semibold' : 'text-white/60 hover:text-white'
              }`
            }
          >
            <item.icon className={`w-6 h-6 mb-1 ${item.label === 'Tasks' ? 'p-0.5' : ''}`} strokeWidth={2} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}