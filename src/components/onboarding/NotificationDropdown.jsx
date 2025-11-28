import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function NotificationDropdown({ notifications, onDismiss }) {
  const navigate = useNavigate();

  const handleActionClick = (notification) => {
    if (notification.actionUrl) {
      navigate(createPageUrl(notification.actionUrl));
      onDismiss(notification.id);
    }
  };

  if (notifications.length === 0) {
    return (
      <div 
        className="absolute right-0 top-12 w-80 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-8 z-50"
      >
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1E293B]">You're all set!</p>
          <p className="text-xs text-[#64748B] mt-1">No pending setup tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="absolute right-0 top-12 w-96 bg-white rounded-lg border border-[#E2E8F0] shadow-md max-h-[480px] overflow-y-auto z-50"
    >
      <div className="p-4 border-b border-[#E2E8F0]">
        <h3 className="font-semibold text-[#1E293B]">Setup Reminders</h3>
        <p className="text-xs text-[#64748B] mt-1">{notifications.length} pending tasks</p>
      </div>

      <div className="divide-y divide-[#E2E8F0]">
        {notifications.map((notification) => (
          <div key={notification.id} className="p-4 hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-[#1E293B] mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-[#64748B] mb-3">
                  {notification.message}
                </p>
                {notification.actionUrl && (
                  <button
                    onClick={() => handleActionClick(notification)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                  >
                    {notification.actionLabel || 'Complete Setup'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {notification.dismissible && (
                <button
                  onClick={() => onDismiss(notification.id)}
                  className="text-[#94A3B8] hover:text-[#64748B] text-xs"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}