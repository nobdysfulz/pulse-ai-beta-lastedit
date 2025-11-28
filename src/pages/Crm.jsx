import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import ContactsTableView from '../components/crm/ContactsTableView';
import ContactDetailsSidebar from '../components/crm/ContactDetailsSidebar';
import PipelineView from '../components/crm/PipelineView';
import TasksView from '../components/crm/TasksView';
import InsightsView from '../components/crm/InsightsView';
import AddContactModal from '../components/crm/AddContactModal';
import ImportContactsModal from '../components/crm/ImportContactsModal';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingIndicator from '../components/ui/LoadingIndicator';

export default function CrmPage() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const isPremium = user?.subscriptionTier === 'Subscriber' || user?.role === 'admin';

  useEffect(() => {
    if (user) {
      if (!isPremium) {
        setLoading(false);
        return;
      }
      loadContacts();
    }
  }, [user, isPremium]);

  useEffect(() => {
    if (selectedContact) {
      loadActivities();
      loadTasks();
    }
  }, [selectedContact]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.CrmContact.filter(
        { userId: user.id },
        '-created_date'
      );
      setContacts(data || []);
    } catch (error) {
      console.error('[CRM] Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const data = await base44.entities.CrmActivity.filter(
        { contactId: selectedContact.id },
        '-created_date',
        20
      );
      setActivities(data || []);
    } catch (error) {
      console.error('[CRM] Error loading activities:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await base44.entities.DailyAction.filter(
        {
          userId: user.id,
          associatedContactId: selectedContact.id
        },
        '-actionDate',
        10
      );
      setTasks(data || []);
    } catch (error) {
      console.error('[CRM] Error loading tasks:', error);
    }
  };

  const handleContactUpdate = (updatedContact) => {
    setSelectedContact(updatedContact);
    loadContacts();
  };

  const handleNavigateToContactFromPipeline = (contact) => {
    setSelectedContact(contact);
    setActiveTab('contacts');
  };

  const handleAddContact = async (newContactData) => {
    await loadContacts();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = isMobile 
    ? [{ id: 'contacts', label: 'Contacts' }]
    : [
        { id: 'contacts', label: 'Contacts' },
        { id: 'pipeline', label: 'Pipeline' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'insights', label: 'Insights' },
        { id: 'settings', label: 'Settings' }
      ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contacts':
        return (
          <div className="flex h-full w-full overflow-hidden relative">
            <div className={`w-full md:flex-1 overflow-hidden ${selectedContact ? 'hidden md:block' : 'block'}`}>
              <ContactsTableView
                contacts={contacts}
                selectedContact={selectedContact}
                onSelectContact={setSelectedContact}
                onRefresh={loadContacts}
                user={user}
              />
            </div>
            <div className={`absolute inset-0 md:static md:w-96 z-10 bg-white transition-transform duration-200 ${selectedContact ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} ${!selectedContact && 'md:block hidden'}`}>
               {selectedContact ? (
                  <ContactDetailsSidebar
                    contact={selectedContact}
                    activities={activities}
                    tasks={tasks}
                    onUpdate={handleContactUpdate}
                    onActivityUpdate={loadActivities}
                    user={user}
                    onClose={() => setSelectedContact(null)}
                  />
               ) : (
                 <div className="hidden md:flex h-full items-center justify-center border-l bg-gray-50 text-gray-400">
                    Select a contact
                 </div>
               )}
            </div>
          </div>
        );

      case 'pipeline':
        return (
          <PipelineView
            contacts={contacts}
            onSelectContact={setSelectedContact}
            onUpdate={loadContacts}
            onNavigateToContact={handleNavigateToContactFromPipeline}
          />
        );

      case 'tasks':
        return (
          <TasksView
            contacts={contacts}
            onNavigateToContact={handleNavigateToContactFromPipeline}
          />
        );

      case 'insights':
        return <InsightsView contacts={contacts} />;

      case 'settings':
        window.location.href = '/settings?tab=crm';
        return null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIndicator text="Loading CRM..." size="lg" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
        <title>Contacts - PULSE Intelligence</title>
        <meta name="description" content="Manage your real estate contacts, track client relationships, and access AI-powered insights for better follow-up." />
        
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-violet-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Premium Feature
          </h2>
          
          <p className="text-gray-600 mb-6">
            The CRM feature is available exclusively to paid subscribers. Upgrade your plan to access advanced contact management, pipeline tracking, and AI-powered insights.
          </p>
          
          <Button 
            onClick={() => navigate(createPageUrl('Plans'))}
            size="lg"
            className="bg-violet-600 hover:bg-violet-700"
          >
            View Plans & Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <title>Contacts - PULSE Intelligence</title>
      <meta name="description" content="Manage your real estate contacts, track client relationships, and access AI-powered insights for better follow-up." />
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButton={activeTab === 'contacts' ? {
          label: '+ Contact',
          onClick: () => setShowAddModal(true)
        } : null}
      />

      <div className="flex-1 flex w-full overflow-hidden bg-gray-50">
        {renderTabContent()}
      </div>

      {showAddModal && (
        <AddContactModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddContact}
          user={user}
        />
      )}

      {showImportModal && (
        <ImportContactsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            loadContacts();
          }}
        />
      )}
    </div>
  );
}