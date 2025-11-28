import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PopupAdModal from '../ads/PopupAdModal';

export default function LockedFeature({ title, description, children, className = "" }) {
  const navigate = useNavigate();
  const [showPopupAd, setShowPopupAd] = useState(false);

  const handleUpgradeClick = () => {
    // Check if popup ad was already shown this session
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('popupAdShown')) {
      setShowPopupAd(true);
    } else {
      navigate(createPageUrl('Plans'));
    }
  };

  const handlePopupClose = () => {
    setShowPopupAd(false);
    // If user closed the popup, navigate to plans page
    navigate(createPageUrl('Plans'));
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h3 className="text-xl font-bold text-[#1E293B] mb-2">{title}</h3>
            <p className="text-[#475569] mb-4">{description}</p>
            <Button onClick={handleUpgradeClick} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
              Upgrade to Unlock
            </Button>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>

      {showPopupAd && (
        <PopupAdModal 
          triggerType="premium_feature" 
          onClose={handlePopupClose}
        />
      )}
    </>
  );
}