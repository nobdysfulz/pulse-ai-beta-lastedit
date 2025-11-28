import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PopupAdModal({ triggerType = 'both', onClose }) {
  const [popupAd, setPopupAd] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkAndShowPopup = async () => {
      // Check if popup was already shown this session
      const sessionKey = 'popupAdShown';
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) {
        if (onClose) onClose();
        return;
      }

      try {
        // Fetch active popup ads
        const ads = await base44.entities.PopupAd.filter({ isActive: true }, '-priority');
        
        // Find matching ad based on trigger type
        const matchingAd = ads.find(ad => 
          ad.triggerType === 'both' || 
          ad.triggerType === triggerType
        );

        if (matchingAd) {
          setPopupAd(matchingAd);
          setIsVisible(true);
          // Mark as shown for this session
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(sessionKey, 'true');
          }
        } else {
          if (onClose) onClose();
        }
      } catch (error) {
        console.error('[PopupAd] Error loading popup:', error);
        if (onClose) onClose();
      }
    };

    checkAndShowPopup();
  }, [triggerType, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 200);
  };

  const handleImageClick = () => {
    if (popupAd?.targetUrl) {
      window.open(popupAd.targetUrl, '_blank');
      handleClose();
    }
  };

  if (!isVisible || !popupAd) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-2xl w-full animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
          aria-label="Close popup"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
        
        <div 
          onClick={handleImageClick}
          className="cursor-pointer rounded-lg overflow-hidden shadow-2xl"
        >
          <img
            src={popupAd.imageUrl}
            alt={popupAd.title}
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}