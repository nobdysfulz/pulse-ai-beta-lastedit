import React, { useState, useEffect, useContext, useMemo } from 'react';
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, CalendarPlus, Phone, Upload } from 'lucide-react';
import { toast } from 'sonner';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import ContextualSidebar from '../components/layout/ContextualSidebar';
import AgentChatInterface from '../components/agents/AgentChatInterface';
import GuidelinesPanel from '../components/agents/GuidelinesPanel';
import KnowledgePanel from '../components/agents/KnowledgePanel';
import PastContentPanel from '../components/agents/PastContentPanel';
import CurrentTransactionsPanel from '../components/agents/CurrentTransactionsPanel';
import ConnectedSocialAccountsPanel from '../components/agents/ConnectedSocialAccountsPanel';
import AgentOnboardingFlow from '../components/agents/onboarding/AgentOnboardingFlow';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { safeAsyncOperation } from '../components/utils/safeAsync';
import { sessionCache } from '../components/ai/sessionCache';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CallDetailSidebar from '../components/agents/CallDetailSidebar';
import CallMetrics from '../components/agents/CallMetrics';
import CreateCampaignModal from '../components/agents/CreateCampaignModal';
import SingleCallModal from '../components/agents/SingleCallModal';

export default function AgentsPage() {
  const { user, loading: contextLoading } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('executive_assistant');
  const [loading, setLoading] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState('guidelines');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [callLogs, setCallLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSingleCallModal, setShowSingleCallModal] = useState(false);
  const logsPerPage = 10;

  const isSubscriber = user?.subscriptionTier === 'Subscriber' || user?.subscriptionTier === 'Admin';

  // Redirect if not subscriber
  useEffect(() => {
    if (user && !contextLoading && !isSubscriber) {
      window.location.href = '/Plans';
    }
  }, [user, contextLoading, isSubscriber]);

  const agents = useMemo(() => [
  { id: 'executive_assistant', label: 'NOVA', subtitle: 'Executive Assistant', type: 'executive_assistant' },
  { id: 'leads_agent', label: 'PHOENIX', subtitle: 'Leads Agent', type: 'leads_agent' },
  { id: 'content_agent', label: 'SIRIUS', subtitle: 'Content Agent', type: 'content_agent' },
  { id: 'transaction_coordinator', label: 'VEGA', subtitle: 'Transaction Coordinator', type: 'transaction_coordinator' }],
  []);

  useEffect(() => {
    if (!user) return;
    if (!isSubscriber) return; // Skip if redirecting

    const checkOnboarding = async () => {
      const result = await safeAsyncOperation(
        async () => {
          const onboardingRecords = await base44.entities.UserOnboarding.filter({ userId: user.id });
          return onboardingRecords;
        },
        'CheckOnboarding'
      );

      if (result.success) {
        const onboardingRecords = result.data || [];
        if (onboardingRecords.length === 0 || !onboardingRecords[0].agentOnboardingCompleted) {
          setShowOnboarding(true);
        }
      } else {
        console.error('[AgentsPage] Failed to check onboarding:', result.error);
      }
    };

    checkOnboarding();
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && agents.some((agent) => agent.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [agents]);

  const handleTabChange = (tabId) => {
    // Clear session cache when switching agents
    if (activeTab && activeTab !== tabId && user) {
      sessionCache.remove(user.id, 'context', `${activeTab}_context`);
    }

    setActiveTab(tabId);
    setRightSidebarTab('guidelines');
    setSelectedLog(null);

    const newUrl = `${window.location.pathname}?tab=${tabId}`;
    window.history.pushState({}, '', newUrl);
  };

  useEffect(() => {
    if (contextLoading || !user) return;

    const loadPageData = async () => {
      setLoading(true);

      const result = await safeAsyncOperation(
        async () => {
          const logsData = await base44.entities.CallLog.filter({ userEmail: user.email }, '-created_date');
          return logsData;
        },
        'LoadCallLogs'
      );

      if (result.success) {
        setCallLogs(result.data || []);
      } else {
        console.error('[AgentsPage] Failed to load call logs:', result.error);
        toast.error('Failed to load agent data');
      }

      setLoading(false);
    };

    loadPageData();
  }, [contextLoading, user]);

  if (showOnboarding) {
    return <AgentOnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <LoadingIndicator text="Loading AI Agents..." size="lg" />
      </div>);

  }

  const handleDownloadLogs = async () => {
    if (callLogs.length === 0) {
      toast.info("No call logs to download.");
      return;
    }

    const result = await safeAsyncOperation(
      async () => {
        const loadingToast = toast.loading('Preparing download...');

        await new Promise((resolve) => setTimeout(resolve, 0));

        const headers = ['Date', 'Name', 'Phone', 'Status', 'Duration (s)', 'Campaign'];
        const csvRows = [headers.join(',')];

        const chunkSize = 100;
        for (let i = 0; i < callLogs.length; i += chunkSize) {
          const chunk = callLogs.slice(i, i + chunkSize);

          chunk.forEach((log) => {
            // Convert UTC to EST for display
            const logDate = new Date(log.created_date);
            const estDate = logDate.toLocaleString('en-US', {
              timeZone: 'America/New_York',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            const row = [
            estDate,
            `"${log.contactName || 'Unknown'}"`,
            log.contactPhone || '',
            log.status?.replace(/_/g, ' ') || 'N/A',
            log.duration || 0,
            `"${log.campaignName || ''}"`];

            csvRows.push(row.join(','));
          });

          if (i + chunkSize < callLogs.length) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pulse_call_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss(loadingToast);
        return true;
      },
      'DownloadCallLogs'
    );

    if (result.success) {
      toast.success("Call logs downloaded successfully.");
    } else {
      toast.error("Failed to download logs. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':return 'text-green-600';
      case 'appointment_set':return 'text-blue-600';
      case 'failed':return 'text-red-600';
      case 'initiated':return 'text-yellow-600';
      default:return 'text-gray-600';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format timestamp in user's timezone (EST)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      const date = new Date(timestamp);
      const userTimezone = user?.timezone || 'America/New_York';

      return date.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return 'Invalid date';
    }
  };

  const handleRowClick = (log) => {
    setSelectedLog(log);
  };

  const handleBackToList = () => {
    setSelectedLog(null);
  };

  const paginatedLogs = callLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(callLogs.length / logsPerPage);

  const renderMainContent = (agentId) => {
    switch (agentId) {
      case 'executive_assistant':
      case 'content_agent':
      case 'transaction_coordinator':
        return <AgentChatInterface agentType={agentId} />;

      case 'leads_agent':
        return (
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-[30px] font-semibold text-foreground">Call History</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCampaignModal(true)}
                  className="bg-card border-border hover:bg-muted"
                  title="Start Campaign">
                  <CalendarPlus className="w-5 h-5 text-foreground" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSingleCallModal(true)}
                  className="bg-card border-border hover:bg-muted"
                  title="Call Now">
                  <Phone className="w-5 h-5 text-foreground" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDownloadLogs}
                  className="bg-card border-border hover:bg-muted"
                  title="Download Logs">
                  <Upload className="w-5 h-5 text-foreground" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.location.reload()}
                  className="bg-card border-border hover:bg-muted"
                  title="Refresh">
                  <RefreshCw className="w-5 h-5 text-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="bg-card border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recent</TableHead>
                      <TableHead>Time (EST)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) =>
                    <TableRow key={log.id} onClick={() => handleRowClick(log)} className="cursor-pointer hover:bg-muted">
                        <TableCell>
                          <div className="font-medium text-foreground">{log.contactPhone}</div>
                          <div className="text-sm text-muted-foreground">{log.contactName || 'Unknown'}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(log.created_date)}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium text-sm ${getStatusColor(log.status)}`}>
                            {log.status?.replace(/_/g, ' ') || 'No Information'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDuration(log.duration)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {callLogs.length === 0 &&
                <div className="text-center py-16">
                    <p className="text-base text-muted-foreground">No calls yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a campaign to see call history</p>
                  </div>
                }
              </div>

              {totalPages > 1 &&
              <div className="flex items-center justify-center gap-4 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Previous
                  </Button>
                  <span className="text-sm">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Next
                  </Button>
                </div>
              }
            </div>
          </div>);


      default:
        return null;
    }
  };

  const SidebarTabButton = ({ active, onClick, children }) =>
  <button
    onClick={onClick}
    className={`flex-1 py-3 text-sm font-medium transition-colors ${
    active ?
    'text-primary border-b-2 border-primary' :
    'text-muted-foreground hover:text-foreground'}`
    }>

      {children}
    </button>;


  const renderSidebarContent = (agentId) => {
    if (selectedLog && agentId === 'leads_agent') {
      return <CallDetailSidebar log={selectedLog} onBack={handleBackToList} onDelete={() => window.location.reload()} />;
    }

    switch (agentId) {
      case 'leads_agent':
        if (selectedLog) return null;
        return (
          <div className="space-y-6 p-6">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Smart Lead Management</h3>
              <CallMetrics callLogs={callLogs} />
            </div>
          </div>);


      case 'executive_assistant':
        return (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-border">
              <SidebarTabButton
                active={rightSidebarTab === 'guidelines'}
                onClick={() => setRightSidebarTab('guidelines')}>
                Guidelines
              </SidebarTabButton>
              <SidebarTabButton
                active={rightSidebarTab === 'knowledge'}
                onClick={() => setRightSidebarTab('knowledge')}>
                Knowledge
              </SidebarTabButton>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {rightSidebarTab === 'guidelines' && <GuidelinesPanel agentType={agentId} />}
              {rightSidebarTab === 'knowledge' && <KnowledgePanel />}
            </div>
          </div>);


      case 'content_agent':
        return (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-border">
              <SidebarTabButton
                active={rightSidebarTab === 'guidelines'}
                onClick={() => setRightSidebarTab('guidelines')}>
                Guidelines
              </SidebarTabButton>
              <SidebarTabButton
                active={rightSidebarTab === 'social_accounts'}
                onClick={() => setRightSidebarTab('social_accounts')}>
                Social Accounts
              </SidebarTabButton>
              <SidebarTabButton
                active={rightSidebarTab === 'past_content'}
                onClick={() => setRightSidebarTab('past_content')}>
                Past Content
              </SidebarTabButton>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {rightSidebarTab === 'guidelines' && <GuidelinesPanel agentType={agentId} />}
              {rightSidebarTab === 'social_accounts' && <ConnectedSocialAccountsPanel />}
              {rightSidebarTab === 'past_content' && <PastContentPanel />}
            </div>
          </div>);


      case 'transaction_coordinator':
        return (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-border">
              <SidebarTabButton
                active={rightSidebarTab === 'guidelines'}
                onClick={() => setRightSidebarTab('guidelines')}>
                Guidelines
              </SidebarTabButton>
              <SidebarTabButton
                active={rightSidebarTab === 'transactions'}
                onClick={() => setRightSidebarTab('transactions')}>
                Current Transactions
              </SidebarTabButton>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {rightSidebarTab === 'guidelines' && <GuidelinesPanel agentType={agentId} />}
              {rightSidebarTab === 'transactions' && <CurrentTransactionsPanel />}
            </div>
          </div>);


      default:
        return null;
    }
  };

  const getSidebarTitle = (currentAgentId) => {
    if (selectedLog && currentAgentId === 'leads_agent') return "Call Details";

    const agent = agents.find((a) => a.id === currentAgentId);
    return agent ? `${agent.label} - ${agent.subtitle}` : "Agent";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <title>My AI Agents - PULSE Intelligence</title>
      <meta name="description" content="Interact with your AI team including Executive Assistant, Content Agent, Transaction Coordinator, and Leads Agent." />
      
      <ContextualTopNav
        tabs={agents}
        activeTab={activeTab}
        onTabChange={handleTabChange} />


      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {renderMainContent(activeTab)}
        </div>

        <ContextualSidebar title={getSidebarTitle(activeTab)}>
          {renderSidebarContent(activeTab)}
        </ContextualSidebar>
      </div>

      <CreateCampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        onCampaignStarted={() => {
          setShowCampaignModal(false);
          window.location.reload();
        }} />


      <SingleCallModal
        isOpen={showSingleCallModal}
        onClose={() => setShowSingleCallModal(false)}
        onCallStarted={() => {
          setShowSingleCallModal(false);
          window.location.reload();
        }} />

    </div>);

}