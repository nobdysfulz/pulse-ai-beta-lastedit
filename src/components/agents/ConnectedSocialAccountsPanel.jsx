
import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { ExternalServiceConnection } from '@/api/entities';
import { Loader2, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ConnectedSocialAccountsPanel() {
  const { user, refreshUserData } = useContext(UserContext);
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);
  const popupCheckIntervalRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
    
    // Cleanup on unmount
    return () => {
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, [user]);

  // Refresh connections when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('[ConnectedSocialAccountsPanel] Page became visible, refreshing connections');
        loadConnections();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      console.log('[ConnectedSocialAccountsPanel] Loading connections for user:', user.id);
      
      const allConnections = await ExternalServiceConnection.filter({ 
        userId: user.id 
      });
      
      console.log('[ConnectedSocialAccountsPanel] All connections:', allConnections);
      
      const socialConnections = allConnections.filter(c => 
        ['facebook', 'instagram', 'linkedin'].includes(c.serviceName) &&
        c.status === 'connected'
      );
      
      console.log('[ConnectedSocialAccountsPanel] Social connections:', socialConnections);
      
      setConnections(socialConnections);
    } catch (error) {
      console.error('[ConnectedSocialAccountsPanel] Error loading social connections:', error);
      toast.error('Failed to load social media connections');
    } finally {
      setLoading(false);
    }
  };

  const getProfileData = (connection) => {
    if (!connection || !connection.metadata) return null;
    try {
      const parsed = JSON.parse(connection.metadata);
      console.log('[ConnectedSocialAccountsPanel] Parsed profile data:', parsed);
      return parsed;
    } catch (error) {
      console.error('[ConnectedSocialAccountsPanel] Error parsing metadata:', error);
      return null;
    }
  };

  const openOAuthPopup = async (initFunctionName, serviceName) => {
    try {
      // Close any existing popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      
      // Clear any existing interval
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }

      // Get the OAuth URL
      const { data } = await base44.functions.invoke(initFunctionName, {});
      if (!data?.authUrl) {
        throw new Error('No auth URL returned');
      }

      // Open popup window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      popupRef.current = window.open(
        data.authUrl,
        `${serviceName}_oauth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popupRef.current) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Check if popup is closed
      popupCheckIntervalRef.current = setInterval(async () => {
        if (popupRef.current.closed) {
          clearInterval(popupCheckIntervalRef.current);
          console.log('[ConnectedSocialAccountsPanel] OAuth popup closed, refreshing connections');
          
          // Refresh connections and user data
          await loadConnections();
          await refreshUserData();
          
          toast.success(`${serviceName} integration updated`);
        }
      }, 500);

    } catch (error) {
      console.error(`Error connecting ${serviceName}:`, error);
      toast.error(`Failed to connect ${serviceName}`);
    }
  };

  const handleConnect = (platform) => {
    let functionName = '';
    let serviceName = '';
    
    switch (platform) {
      case 'facebook':
        functionName = 'metaOAuthInit';
        serviceName = 'Facebook';
        break;
      case 'instagram':
        functionName = 'instagramOAuthInit';
        serviceName = 'Instagram';
        break;
      case 'linkedin':
        functionName = 'linkedinOAuthInit';
        serviceName = 'LinkedIn';
        break;
    }
    
    openOAuthPopup(functionName, serviceName);
  };

  const handleManageConnections = () => {
    navigate(`${createPageUrl('Settings')}?tab=integrations`);
  };

  const getPlatformInfo = (serviceName) => {
    const info = {
      facebook: {
        name: 'Facebook',
        iconUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/e5092bc76_image.png',
        color: '#1877F2'
      },
      instagram: {
        name: 'Instagram',
        iconUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/e4e1d4bd8_image.png',
        color: '#E4405F'
      },
      linkedin: {
        name: 'LinkedIn',
        iconUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/6eeae8985_image.png',
        color: '#0A66C2'
      }
    };
    return info[serviceName] || { name: serviceName, iconUrl: '', color: '#7C3AED' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 p-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  const platforms = ['facebook', 'instagram', 'linkedin'];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1E293B] mb-1">Connected Social Accounts</h3>
        <p className="text-xs text-[#64748B] mb-4">
          Manage which social media accounts SIRIUS can post to
        </p>
      </div>

      <div className="space-y-3">
        {platforms.map((platform) => {
          const connection = connections.find(c => c.serviceName === platform);
          const profileData = getProfileData(connection);
          const platformInfo = getPlatformInfo(platform);
          
          return (
            <div 
              key={platform} 
              className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <img 
                    src={platformInfo.iconUrl} 
                    alt={platformInfo.name}
                    className="w-8 h-8 rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#1E293B] mb-1">
                      {platformInfo.name}
                    </h4>
                    
                    {connection && profileData ? (
                      <div className="space-y-2">
                        {platform === 'instagram' && profileData.accounts ? (
                          profileData.accounts.map((account, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {account.profileImageUrl && (
                                <img 
                                  src={account.profileImageUrl} 
                                  alt={account.username}
                                  className="w-6 h-6 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <span className="text-xs font-medium text-[#1E293B]">
                                @{account.username}
                              </span>
                              <CheckCircle2 className="w-3 h-3 text-green-600 ml-auto" />
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2">
                            {profileData.profileImageUrl && (
                              <img 
                                src={profileData.profileImageUrl} 
                                alt={profileData.username}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-xs font-medium text-[#1E293B]">
                              {profileData.username}
                            </span>
                            <CheckCircle2 className="w-3 h-3 text-green-600 ml-auto" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-[#94A3B8]" />
                        <span className="text-xs text-[#64748B]">Not connected</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!connection && (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(platform)}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-xs"
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
        <p className="text-xs text-[#64748B] text-center">
          SIRIUS can only post to connected accounts
        </p>
        <Button
          variant="outline"
          onClick={handleManageConnections}
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Connections
        </Button>
      </div>
    </div>
  );
}
