import React, { useState, useEffect, useContext, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserContext } from '../context/UserContext';
import { ExternalServiceConnection, CrmConnection } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsTab({ user }) {
  const { refreshUserData } = useContext(UserContext);
  const [connections, setConnections] = useState([]);
  const [crmConnections, setCrmConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);
  const popupCheckIntervalRef = useRef(null);

  // Check if user has premium access
  const isPremium = user?.subscriptionTier === 'Subscriber' || user?.subscriptionTier === 'Admin';

  useEffect(() => {
    if (isPremium) {
      loadConnections();
    } else {
      setLoading(false);
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
  }, [user, isPremium]);

  // Refresh connections when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPremium) {
        console.log('[IntegrationsTab] Page became visible, refreshing connections');
        loadConnections();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPremium]);

  const loadConnections = async () => {
    try {
      console.log('[IntegrationsTab] Loading connections for user:', user.id);
      
      const [externalConns, crmConns] = await Promise.all([
        ExternalServiceConnection.filter({ userId: user.id }),
        CrmConnection.filter({ userId: user.id })
      ]);
      
      console.log('[IntegrationsTab] External connections:', externalConns);
      console.log('[IntegrationsTab] CRM connections:', crmConns);
      
      setConnections(externalConns || []);
      setCrmConnections(crmConns || []);
    } catch (error) {
      console.error('[IntegrationsTab] Error loading connections:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const openOAuthPopup = async (initFunctionName, serviceName) => {
    if (!isPremium) {
      toast.error('Integrations are only available for Subscribers');
      return;
    }

    try {
      // Close any existing popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      
      // Clear any existing interval
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }

      console.log(`[IntegrationsTab] Initiating ${serviceName} OAuth`);

      // Get the OAuth URL
      const { data } = await base44.functions.invoke(initFunctionName, {});
      if (!data?.authUrl) {
        throw new Error('No auth URL returned');
      }

      console.log(`[IntegrationsTab] Opening OAuth popup for ${serviceName}`);

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
          console.log('[IntegrationsTab] OAuth popup closed, refreshing connections');
          
          // Wait a moment for database write to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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

  const handleGoogleConnect = () => openOAuthPopup('initiateGoogleWorkspaceOAuth', 'Google Workspace');
  const handleGoogleCalendarNoCodeConnect = () => openOAuthPopup('initiateGoogleCalendarNoCodeOAuth', 'Google Calendar (NoCodeAPI)');
  const handleMicrosoftConnect = () => openOAuthPopup('microsoftOAuthInit', 'Microsoft 365');
  const handleFacebookConnect = () => openOAuthPopup('facebookOAuthInit', 'Facebook');
  const handleInstagramConnect = () => openOAuthPopup('instagramOAuthInit', 'Instagram');
  const handleLinkedInConnect = () => openOAuthPopup('linkedinOAuthInit', 'LinkedIn');
  const handleZoomConnect = () => openOAuthPopup('zoomOAuthInit', 'Zoom');

  const handleDisconnect = async (serviceName) => {
    if (!isPremium) {
      toast.error('Integrations are only available for Subscribers');
      return;
    }

    try {
      const connection = connections.find(c => c.serviceName === serviceName);
      if (connection) {
        await ExternalServiceConnection.update(connection.id, { status: 'disconnected' });
        await loadConnections();
        await refreshUserData();
        toast.success(`${serviceName} disconnected successfully`);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect');
    }
  };

  const handleLoftyConnect = async (apiKey) => {
    if (!isPremium) {
      toast.error('Integrations are only available for Subscribers');
      return;
    }

    try {
      const { data } = await base44.functions.invoke('loftyAuth', { apiKey });
      
      if (data.success) {
        toast.success('Lofty connected successfully');
        await loadConnections();
        await refreshUserData();
      } else {
        throw new Error(data.error || 'Failed to connect Lofty');
      }
    } catch (error) {
      console.error('Error connecting Lofty:', error);
      toast.error(error.message || 'Failed to connect Lofty');
      throw error;
    }
  };

  const handleLoftyDisconnect = async () => {
    try {
      const connection = crmConnections.find(c => c.crmType === 'lofty');
      if (connection) {
        await CrmConnection.update(connection.id, { connectionStatus: 'disconnected' });
        await loadConnections();
        await refreshUserData();
        toast.success('Lofty disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting Lofty:', error);
      toast.error('Failed to disconnect');
    }
  };

  const handleFollowUpBossConnect = async (apiKey) => {
    if (!isPremium) {
      toast.error('Integrations are only available for Subscribers');
      return;
    }

    try {
      const { data } = await base44.functions.invoke('followUpBossAuth', { apiKey });
      
      if (data.success) {
        toast.success('Follow Up Boss connected successfully');
        await loadConnections();
        await refreshUserData();
      } else {
        throw new Error(data.error || 'Failed to connect Follow Up Boss');
      }
    } catch (error) {
      console.error('Error connecting Follow Up Boss:', error);
      toast.error(error.message || 'Failed to connect Follow Up Boss');
      throw error;
    }
  };

  const handleFollowUpBossDisconnect = async () => {
    try {
      const connection = crmConnections.find(c => c.crmType === 'follow_up_boss');
      if (connection) {
        await CrmConnection.update(connection.id, { connectionStatus: 'disconnected' });
        await loadConnections();
        await refreshUserData();
        toast.success('Follow Up Boss disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting Follow Up Boss:', error);
      toast.error('Failed to disconnect');
    }
  };

  const handleSkySlopeConnect = async (accessKey, secretKey) => {
    if (!isPremium) {
      toast.error('Integrations are only available for Subscribers');
      return;
    }

    try {
      const { data } = await base44.functions.invoke('skyslopeAuth', {
        accessKey,
        secretKey
      });

      if (data.success) {
        toast.success('SkySlope connected successfully');
        await loadConnections();
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error connecting SkySlope:', error);
      toast.error('Failed to connect SkySlope');
      throw error;
    }
  };

  const handleSkySlopeDisconnect = async () => {
    try {
      const connection = connections.find(c => c.serviceName === 'skyslope');
      if (connection) {
        await ExternalServiceConnection.update(connection.id, { status: 'disconnected' });
        await loadConnections();
        await refreshUserData();
        toast.success('SkySlope disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting SkySlope:', error);
      toast.error('Failed to disconnect');
    }
  };

  const getConnectionStatus = (serviceName) => {
    const connection = connections.find(c => c.serviceName === serviceName);
    return connection?.status === 'connected' ? connection : null;
  };

  const getCrmConnectionStatus = (crmType) => {
    const connection = crmConnections.find(c => c.crmType === crmType);
    return connection?.connectionStatus === 'connected' ? connection : null;
  };

  const getProfileData = (connection) => {
    if (!connection || !connection.metadata) return null;
    try {
      const parsed = JSON.parse(connection.metadata);
      console.log('[IntegrationsTab] Parsed profile data:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" aria-label="Loading integrations" />
      </div>
    );
  }

  // Show premium upsell if not premium
  if (!isPremium) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1E293B] mb-2">Integrations</h2>
          <p className="text-[#64748B]">Connect your tools and platforms to enhance your workflow</p>
        </div>

        <Card className="bg-gradient-to-br from-[#7C3AED]/10 to-[#6D28D9]/10 border border-[#7C3AED]/20">
          <CardContent className="p-12 text-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/3d30606e9_pulseaiupgradeicon.png"
              alt=""
              className="w-16 h-16 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Premium Feature</h3>
            <p className="text-[#64748B] mb-6 max-w-md mx-auto">
              Upgrade your plan to connect your favorite tools and more.
            </p>
            <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => window.location.href = '/Plans'}>
              See Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const googleConnection = getConnectionStatus('google_workspace');
  const googleCalendarNoCodeConnection = getConnectionStatus('google_calendar_nocode');
  const microsoftConnection = getConnectionStatus('microsoft_365');
  const facebookConnection = getConnectionStatus('facebook');
  const instagramConnection = getConnectionStatus('instagram');
  const linkedinConnection = getConnectionStatus('linkedin');
  const zoomConnection = getConnectionStatus('zoom');

  const googleProfile = getProfileData(googleConnection);
  const googleCalendarNoCodeProfile = getProfileData(googleCalendarNoCodeConnection);
  const microsoftProfile = getProfileData(microsoftConnection);
  const facebookProfile = getProfileData(facebookConnection);
  const instagramProfile = getProfileData(instagramConnection);
  const linkedinProfile = getProfileData(linkedinConnection);

  console.log('[IntegrationsTab] Facebook profile:', facebookProfile);
  console.log('[IntegrationsTab] Instagram profile:', instagramProfile);

  const skyslopeConnection = getConnectionStatus('skyslope');
  const loftyConnection = getCrmConnectionStatus('lofty');
  const fubConnection = getCrmConnectionStatus('follow_up_boss');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#1E293B] mb-2">Integrations</h2>
        <p className="text-[#64748B]">Connect your tools and platforms to enhance your workflow</p>
      </div>

      {/* Email & Calendar */}
      <Card className="bg-white border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1E293B]">Email & Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntegrationRow
            name="Google Workspace"
            description="Gmail, Google Calendar, Drive"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/8cf1c9e07_image.png"
            isConnected={!!googleConnection}
            profileData={googleProfile}
            onConnect={handleGoogleConnect}
            onDisconnect={() => handleDisconnect('google_workspace')}
          />
          {/* <IntegrationRow
            name="Google Calendar (NoCodeAPI)"
            description="Connect Google Calendar specifically for NoCodeAPI Integration"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/8cf1c9e07_image.png"
            isConnected={!!googleCalendarNoCodeConnection}
            profileData={googleCalendarNoCodeProfile}
            onConnect={handleGoogleCalendarNoCodeConnect}
            onDisconnect={() => handleDisconnect('google_calendar_nocode')}
          /> */}
          <IntegrationRow
            name="Microsoft 365"
            description="Outlook, Calendar, OneDrive"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/76f79877e_image.png"
            isConnected={!!microsoftConnection}
            profileData={microsoftProfile}
            onConnect={handleMicrosoftConnect}
            onDisconnect={() => handleDisconnect('microsoft_365')}
          />
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card className="bg-white border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1E293B]">Social Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntegrationRow
            name="Facebook"
            description="Post and manage your Facebook page"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/e5092bc76_image.png"
            isConnected={!!facebookConnection}
            profileData={facebookProfile}
            onConnect={handleFacebookConnect}
            onDisconnect={() => handleDisconnect('facebook')}
          />
          <IntegrationRow
            name="Instagram"
            description="Post and manage your Instagram Business account"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/e4e1d4bd8_image.png"
            isConnected={!!instagramConnection}
            profileData={instagramProfile}
            onConnect={handleInstagramConnect}
            onDisconnect={() => handleDisconnect('instagram')}
            isInstagram={true}
          />
          <IntegrationRow
            name="LinkedIn"
            description="Post and manage your LinkedIn profile"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/6eeae8985_image.png"
            isConnected={!!linkedinConnection}
            profileData={linkedinProfile}
            onConnect={handleLinkedInConnect}
            onDisconnect={() => handleDisconnect('linkedin')}
          />
        </CardContent>
      </Card>

      {/* Video Conferencing - TEMPORARILY HIDDEN */}
      {/* <Card className="bg-white border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1E293B]">Video Conferencing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntegrationRow
            name="Zoom"
            description="Schedule and manage Zoom meetings"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/210b0040b_image.png"
            isConnected={!!zoomConnection}
            profileData={null}
            onConnect={handleZoomConnect}
            onDisconnect={() => handleDisconnect('zoom')}
          />
        </CardContent>
      </Card> */}

      {/* CRM & Transactions */}
      <Card className="bg-white border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1E293B]">CRM & Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CrmIntegrationRow
            name="SkySlope"
            description="Transaction management and document coordination"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/50f0b9539_skyslope.png"
            isConnected={!!skyslopeConnection}
            onConnect={handleSkySlopeConnect}
            onDisconnect={handleSkySlopeDisconnect}
            connectionType="dual_key"
          />
          <CrmIntegrationRow
            name="Lofty"
            description="CRM for lead management and automation"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/ca5f1d5be_lofty.jpg"
            isConnected={!!loftyConnection}
            onConnect={handleLoftyConnect}
            onDisconnect={handleLoftyDisconnect}
            connectionType="single_key"
          />
          <CrmIntegrationRow
            name="Follow Up Boss"
            description="Real estate CRM and lead nurturing"
            iconUrl="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/e3b6317be_followupboss.jpg"
            isConnected={!!fubConnection}
            onConnect={handleFollowUpBossConnect}
            onDisconnect={handleFollowUpBossDisconnect}
            connectionType="single_key"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationRow({ 
  name, 
  description, 
  iconUrl,
  isConnected, 
  profileData,
  onConnect, 
  onDisconnect,
  isInstagram = false
}) {
  console.log(`[IntegrationRow ${name}] profileData:`, profileData);
  
  return (
    <div className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <img src={iconUrl} alt="" className="w-10 h-10 rounded" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#1E293B] mb-1">{name}</h3>
          <p className="text-sm text-[#64748B]">{description}</p>
          
          {isConnected && profileData && (
            <div className="mt-2">
              {isInstagram && profileData.accounts && Array.isArray(profileData.accounts) ? (
                <div className="space-y-2">
                  {profileData.accounts.map((account, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {account.profileImageUrl && (
                        <img 
                          src={account.profileImageUrl} 
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs font-medium text-[#7C3AED]">@{account.username}</span>
                      {account.followers_count && (
                        <span className="text-xs text-[#64748B]">
                          {account.followers_count.toLocaleString()} followers
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : profileData.username ? (
                <div className="flex items-center gap-2">
                  {profileData.profileImageUrl && (
                    <img 
                      src={profileData.profileImageUrl} 
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-xs font-medium text-[#7C3AED]">{profileData.username}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-green-600" role="status" aria-label="Connected">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              aria-label={`Disconnect ${name}`}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button 
            onClick={onConnect}
            className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            aria-label={`Connect ${name}`}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function CrmIntegrationRow({ 
  name, 
  description, 
  iconUrl,
  isConnected, 
  onConnect, 
  onDisconnect,
  connectionType = 'single_key'
}) {
  const [showModal, setShowModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (connectionType === 'single_key') {
      if (!apiKey) {
        toast.error('Please enter your API Key');
        return;
      }
    } else if (connectionType === 'dual_key') {
      if (!accessKey || !secretKey) {
        toast.error('Please enter both Access Key and Secret Key');
        return;
      }
    }

    setConnecting(true);
    try {
      if (connectionType === 'single_key') {
        await onConnect(apiKey);
      } else if (connectionType === 'dual_key') {
        await onConnect(accessKey, secretKey);
      }
      setShowModal(false);
      setApiKey('');
      setAccessKey('');
      setSecretKey('');
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img src={iconUrl} alt="" className="w-10 h-10 rounded" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1E293B] mb-1">{name}</h3>
            <p className="text-sm text-[#64748B]">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 text-green-600" role="status" aria-label="Connected">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              {onDisconnect && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onDisconnect}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  aria-label={`Disconnect ${name}`}
                >
                  Disconnect
                </Button>
              )}
            </>
          ) : (
            <Button 
              onClick={handleConnect}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
              aria-label={`Connect ${name}`}
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-labelledby="connect-crm-title" aria-modal="true">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 id="connect-crm-title" className="text-lg font-semibold text-[#1E293B] mb-4">Connect {name}</h3>
            <p className="text-sm text-[#64748B] mb-4">
              Enter your {name} API credentials. You can find these in your {name} account settings.
            </p>
            
            <div className="space-y-4">
              {connectionType === 'single_key' ? (
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                    className="mt-1"
                    aria-required="true"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="accessKey">Access Key</Label>
                    <Input
                      id="accessKey"
                      type="text"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="Enter your Access Key"
                      className="mt-1"
                      aria-required="true"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Enter your Secret Key"
                      className="mt-1"
                      aria-required="true"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setApiKey('');
                  setAccessKey('');
                  setSecretKey('');
                }}
                className="flex-1"
                disabled={connecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9]"
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}