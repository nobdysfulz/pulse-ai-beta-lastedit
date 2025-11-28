import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../components/context/UserContext';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import IntegrationsTab from '../components/settings/IntegrationsTab';
import ReferralTab from '../components/settings/ReferralTab';
import AgentIntelligenceTab from '../components/settings/AgentIntelligenceTab';
import ProfileTab from '../components/settings/ProfileTab';
import MarketTab from '../components/settings/MarketTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import PreferencesTab from '../components/settings/PreferencesTab';
import SecurityTab from '../components/settings/SecurityTab';
import SetupProgressTab from '../components/settings/SetupProgressTab';
import CrmTab from '../components/settings/CrmTab';
import { Card, CardContent } from '@/components/ui/card';

import UserManagementTab from '../components/settings/UserManagementTab';
import ManualSubscriptionManager from '../components/settings/ManualSubscriptionManager';
import ContentTopicsManager from '../components/settings/ContentTopicsManager';
import ContentPackManager from '../components/settings/ContentPackManager';
import FeaturedContentPackManager from '../components/settings/FeaturedContentPackManager';
import AiPromptManager from '../components/settings/AiPromptManager';
import CampaignTemplateManager from '../components/settings/CampaignTemplateManager';
import ScenarioManager from '../components/settings/ScenarioManager';
import ClientPersonaManager from '../components/settings/ClientPersonaManager';
import ObjectionScriptManager from '../components/settings/ObjectionScriptManager';
import TaskTemplateManager from '../components/settings/TaskTemplateManager';
import AgentVoiceManager from '../components/settings/AgentVoiceManager';
import DisclosureManager from '../components/settings/DisclosureManager';
import EmailCampaignManager from '../components/settings/EmailCampaignManager';
import SystemMonitoringDashboard from '../components/settings/SystemMonitoringDashboard';
import SystemErrorsManager from '../components/settings/SystemErrorsManager';
import FeatureFlagsManager from '../components/settings/FeatureFlagsManager';
import IntegrationHealthMonitor from '../components/settings/IntegrationHealthMonitor';
import AutopilotMonitoring from '../components/settings/AutopilotMonitoring';
import ProductOfferingManager from '../components/settings/ProductOfferingManager';
import PopupAdManager from '../components/settings/PopupAdManager';

export default function SettingsPage() {
  const { user, loading } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('account');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    "Everyone likes things their way...almost done!",
    "Dialing in your personal touch...",
    "Tweaking the dials for peak performance!",
    "Your business, your settings...just how it should be.",
    "Almost there because the details matter."
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <ProfileTab />;
      case 'market':
        return <MarketTab />;
      case 'agent-intelligence':
        return <AgentIntelligenceTab />;
      case 'integrations':
        return <IntegrationsTab user={user} />;
      case 'crm':
        return <CrmTab onNavigateToIntegrations={() => setActiveTab('integrations')} />;
      case 'notifications':
        return <NotificationsTab />;
      case 'preferences':
        return <PreferencesTab />;
      case 'referrals':
        return <ReferralTab user={user} />;
      case 'security':
        return <SecurityTab />;
      case 'setup-progress':
        return <SetupProgressTab />;
      
      case 'admin-users':
        return user?.role === 'admin' ? <UserManagementTab /> : <AccessDenied />;
      case 'admin-subscriptions':
        return user?.role === 'admin' ? <ManualSubscriptionManager /> : <AccessDenied />;
      case 'admin-content':
        return user?.role === 'admin' ? <ContentTopicsManager /> : <AccessDenied />;
      case 'admin-packs':
        return user?.role === 'admin' ? <ContentPackManager /> : <AccessDenied />;
      case 'admin-featured':
        return user?.role === 'admin' ? <FeaturedContentPackManager /> : <AccessDenied />;
      case 'admin-prompts':
        return user?.role === 'admin' ? <AiPromptManager /> : <AccessDenied />;
      case 'admin-campaigns':
        return user?.role === 'admin' ? <CampaignTemplateManager /> : <AccessDenied />;
      case 'admin-scenarios':
        return user?.role === 'admin' ? <ScenarioManager /> : <AccessDenied />;
      case 'admin-personas':
        return user?.role === 'admin' ? <ClientPersonaManager /> : <AccessDenied />;
      case 'admin-scripts':
        return user?.role === 'admin' ? <ObjectionScriptManager /> : <AccessDenied />;
      case 'admin-tasks':
        return user?.role === 'admin' ? <TaskTemplateManager /> : <AccessDenied />;
      case 'admin-voices':
        return user?.role === 'admin' ? <AgentVoiceManager /> : <AccessDenied />;
      case 'admin-disclosures':
        return user?.role === 'admin' ? <DisclosureManager /> : <AccessDenied />;
      case 'admin-emails':
        return user?.role === 'admin' ? <EmailCampaignManager /> : <AccessDenied />;
      case 'admin-monitoring':
        return user?.role === 'admin' ? <SystemMonitoringDashboard /> : <AccessDenied />;
      case 'admin-errors':
        return user?.role === 'admin' ? <SystemErrorsManager /> : <AccessDenied />;
      case 'admin-flags':
        return user?.role === 'admin' ? <FeatureFlagsManager /> : <AccessDenied />;
      case 'admin-integrations':
        return user?.role === 'admin' ? <IntegrationHealthMonitor /> : <AccessDenied />;
      case 'admin-autopilot':
        return user?.role === 'admin' ? <AutopilotMonitoring /> : <AccessDenied />;
      case 'admin-products':
        return user?.role === 'admin' ? (
          <div className="space-y-8">
            <ProductOfferingManager />
            <PopupAdManager />
          </div>
        ) : <AccessDenied />;
      
      default:
        return <ProfileTab />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingIndicator text={loadingMessages[loadingMessageIndex]} size="lg" />
      </div>
    );
  }

  return (
    <>
      <title>Settings - PULSE Intelligence</title>
      <div className="flex h-screen overflow-hidden flex-col md:flex-row">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8 mb-16 md:mb-0" role="main" aria-label="Settings content">
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
}

function AccessDenied() {
  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-12 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
        <p className="text-sm text-muted-foreground">You don't have permission to access this section</p>
      </CardContent>
    </Card>
  );
}