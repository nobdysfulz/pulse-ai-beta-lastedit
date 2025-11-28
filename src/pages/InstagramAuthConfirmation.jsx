import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function InstagramAuthConfirmation() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const error = params.get('error');

    console.log('[InstagramAuthConfirmation] Params:', { success, error });

    // Close the popup window after a brief delay to show the status
    const timer = setTimeout(() => {
      if (window.opener) {
        console.log('[InstagramAuthConfirmation] Closing OAuth popup window');
        window.close();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [location]);

  const params = new URLSearchParams(location.search);
  const success = params.get('success');
  const error = params.get('error');

  if (success === 'true') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1E293B] mb-2">Connected Successfully!</h2>
          <p className="text-[#64748B] mb-4">
            Your Instagram account has been connected.
          </p>
          <p className="text-sm text-[#94A3B8]">This window will close automatically...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1E293B] mb-2">Connection Failed</h2>
          <p className="text-[#64748B] mb-4">
            {decodeURIComponent(error)}
          </p>
          <p className="text-sm text-[#94A3B8]">This window will close automatically...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <LoadingIndicator text="Processing..." size="lg" />
    </div>
  );
}