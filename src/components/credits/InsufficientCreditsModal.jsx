import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PopupAdModal from '../ads/PopupAdModal';

export default function InsufficientCreditsModal({ isOpen, onClose, creditsNeeded, creditsAvailable }) {
  const navigate = useNavigate();
  const [showPopupAd, setShowPopupAd] = useState(false);

  useEffect(() => {
    if (isOpen && typeof sessionStorage !== 'undefined') {
      const hasShownPopup = sessionStorage.getItem('popupAdShown');
      setShowPopupAd(!hasShownPopup);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate(createPageUrl('Plans'));
  };

  const handlePopupClose = () => {
    setShowPopupAd(false);
  };

  // Show popup ad first if it hasn't been shown this session
  if (showPopupAd) {
    return (
      <PopupAdModal 
        triggerType="insufficient_credits" 
        onClose={handlePopupClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-[#1E293B] mb-4">Insufficient Credits</h2>
        <p className="text-[#475569] mb-6">
          You need {creditsNeeded} credits for this action, but you only have {creditsAvailable} credits remaining.
        </p>
        <p className="text-[#475569] mb-6">
          Upgrade to a Subscriber plan for unlimited credits and premium features.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUpgrade} className="flex-1">
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
}