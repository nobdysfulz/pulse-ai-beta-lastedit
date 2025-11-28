import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Edit2, Plus, Phone, Mail, Printer, MapPin, DollarSign, Calendar, Star, FileText, Pencil, Trash2, Smile, Meh, Frown, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/components/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ActivityFeed from './ActivityFeed';
import AddTaskModal from './AddTaskModal';
import AddNoteModal from './AddNoteModal';
import EditContactModal from './EditContactModal';

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 transition-colors"
      >
        <h4 className="text-sm font-semibold text-violet-600">{title}</h4>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default function ContactDetailsSidebar({
  contact,
  activities,
  tasks,
  onUpdate,
  onActivityUpdate,
  user,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [templateUrl, setTemplateUrl] = useState(null);

  useEffect(() => {
    if (contact && activeTab === 'notes') {
      loadNotes();
    }
  }, [contact, activeTab]);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const templates = await base44.entities.CsvImportTemplate.filter({
        templateType: 'crm_contacts',
        isActive: true
      });
      if (templates && templates.length > 0) {
        setTemplateUrl(templates[0].fileUrl);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const loadNotes = async () => {
    if (!contact) return;
    try {
      const data = await base44.entities.ContactNote.filter(
        { contactId: contact.id },
        '-created_date'
      );
      setNotes(data || []);
    } catch (error) {
      console.error('[ContactDetails] Error loading notes:', error);
    }
  };

  if (!contact) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex items-center justify-center p-8">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contact Selected</h3>
          <p className="text-sm text-gray-500 mb-4">Select a contact to view details</p>
          {templateUrl && (
            <a
              href={templateUrl}
              download
              className="text-sm text-black hover:underline"
            >
              Click here to download the contacts CSV template
            </a>
          )}
        </div>
      </div>
    );
  }

  const handleQuickAction = async (actionType) => {
    try {
      if (actionType === 'call') {
        await base44.entities.CrmActivity.create({
          userId: user.id,
          contactId: contact.id,
          activityType: 'call',
          direction: 'outbound',
          subject: `Called ${contact.firstName} ${contact.lastName}`,
          outcome: 'completed'
        });
        await base44.entities.CrmContact.update(contact.id, {
          lastContactDate: new Date().toISOString()
        });
        toast.success('Call logged successfully');
        if (onActivityUpdate) onActivityUpdate();
      } else if (actionType === 'email') {
        if (contact.email) {
          window.location.href = `mailto:${contact.email}`;
        }
      } else if (actionType === 'task') {
        setShowAddTaskModal(true);
      } else if (actionType === 'note') {
        setEditingNote(null);
        setShowAddNoteModal(true);
      } else if (actionType === 'print') {
        window.print();
      }
    } catch (error) {
      toast.error('Failed to complete action');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await base44.entities.CrmContact.update(contact.id, {
        isFavorite: !contact.isFavorite
      });
      toast.success(contact.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      if (onUpdate) {
        const updated = await base44.entities.CrmContact.filter({ id: contact.id });
        if (updated.length > 0) onUpdate(updated[0]);
      }
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await base44.entities.ContactNote.delete(noteId);
      toast.success('Note deleted successfully');
      loadNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowAddNoteModal(true);
  };

  const handleContactSave = async () => { // Renamed from handleContactSave(updatedContact) as onUpdate already handles refreshing the specific contact prop
    if (onUpdate) {
      // Refresh the contact in the parent component
      const refreshed = await base44.entities.CrmContact.filter({ id: contact.id });
      if (refreshed.length > 0) onUpdate(refreshed[0]);
    }
    setShowEditModal(false); // Close the modal after saving
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <Frown className="w-4 h-4 text-red-600" />;
      default:
        return <Meh className="w-4 h-4 text-gray-600" />;
    }
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' }
  ];

  const renderFieldValue = (value, placeholder = 'Not set') => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : placeholder;
    }
    return value || placeholder;
  };

  return (
    <aside className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col h-full" role="complementary" aria-label="Contact details">
      <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-900 flex-shrink-0">
        {/* Mobile Back Button */}
        <div className="md:hidden mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-white/10 pl-0 gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Contacts
          </Button>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-1">
            <h3 className="text-xl font-bold text-white">
              {contact.firstName} {contact.lastName}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Edit contact"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('task')}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Add task"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('note')}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Add note"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('call')}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Log call"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('email')}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Send email"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('print')}
              className="text-white hover:bg-gray-800 h-7 w-7 p-0"
              aria-label="Print contact"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-white">
            <Phone className="w-4 h-4" />
            <span>{contact.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Mail className="w-4 h-4" />
            <span className="truncate">{contact.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <MapPin className="w-4 h-4" />
            <span>{contact.location || contact.addressCity || 'No location'}</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <DollarSign className="w-4 h-4" />
            <span>{contact.budget || contact.transactionValue ? `$${(contact.budget || contact.transactionValue).toLocaleString()}` : 'No price'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="capitalize">
            {contact.type}
          </Badge>
          <Badge variant="outline" className="capitalize text-white border-white">
            {contact.stage?.replace('_', ' ')}
          </Badge>
          {contact.source && (
            <Badge variant="outline" className="text-white border-white">
              {contact.source}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="ml-auto text-white hover:bg-gray-800 h-7 w-7 p-0"
            aria-label={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn(
              "w-4 h-4",
              contact.isFavorite && "fill-yellow-500 text-yellow-500"
            )} />
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' && (
          <div className="space-y-1">
            <CollapsibleSection title="Contact Identity" defaultOpen={true}>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-500 mb-1">First Name</div>
                    <div className="text-gray-900">{renderFieldValue(contact.firstName)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Last Name</div>
                    <div className="text-gray-900">{renderFieldValue(contact.lastName)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">DisplayName</div>
                  <div className="text-gray-900">{renderFieldValue(contact.displayName)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Company</div>
                  <div className="text-gray-900">{renderFieldValue(contact.company)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Job Title</div>
                  <div className="text-gray-900">{renderFieldValue(contact.jobTitle)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Primary Email</div>
                  <div className="text-gray-900">{renderFieldValue(contact.email)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Secondary Email</div>
                  <div className="text-gray-900">{renderFieldValue(contact.secondaryEmail)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Primary Phone</div>
                  <div className="text-gray-900">{renderFieldValue(contact.phone)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Secondary Phone</div>
                  <div className="text-gray-900">{renderFieldValue(contact.secondaryPhone)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Preferred Contact Method</div>
                  <div className="text-gray-900 capitalize">{renderFieldValue(contact.preferredContactMethod)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Language</div>
                  <div className="text-gray-900">{renderFieldValue(contact.language)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Timezone</div>
                  <div className="text-gray-900">{renderFieldValue(contact.timezone)}</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Address" defaultOpen={false}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Street Address</div>
                  <div className="text-gray-900">{renderFieldValue(contact.addressStreet)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-500 mb-1">City</div>
                    <div className="text-gray-900">{renderFieldValue(contact.addressCity)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">State</div>
                    <div className="text-gray-900">{renderFieldValue(contact.addressState)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-500 mb-1">Postal Code</div>
                    <div className="text-gray-900">{renderFieldValue(contact.addressPostalCode)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Country</div>
                    <div className="text-gray-900">{renderFieldValue(contact.addressCountry)}</div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Lead Details" defaultOpen={false}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Lead Source</div>
                  <div className="text-gray-900">{renderFieldValue(contact.leadSource)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Source Detail</div>
                  <div className="text-gray-900">{renderFieldValue(contact.sourceDetail)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Referrer Name</div>
                  <div className="text-gray-900">{renderFieldValue(contact.referrerName)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Referrer Contact ID</div>
                  <div className="text-gray-900">{renderFieldValue(contact.referrerContactId)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Lead Origin System</div>
                  <div className="text-gray-900 capitalize">{renderFieldValue(contact.sourceSystem)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Source Campaign Tag</div>
                  <div className="text-gray-900">{renderFieldValue(contact.sourceCampaignTag)}</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Property Information" defaultOpen={false}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Property Interest</div>
                  <div className="text-gray-900">{renderFieldValue(contact.propertyInterest)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Budget</div>
                  <div className="text-gray-900">{renderFieldValue(contact.budget)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Location</div>
                  <div className="text-gray-900">{renderFieldValue(contact.location)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Properties</div>
                  <div className="text-gray-900">{renderFieldValue(contact.properties)}</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Transaction & Financials" defaultOpen={false}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Transaction Stage</div>
                  <div className="text-gray-900 capitalize">{renderFieldValue(contact.transactionStage)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Transaction Value</div>
                  <div className="text-gray-900">{contact.transactionValue ? `$${contact.transactionValue.toLocaleString()}` : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Projected Commission</div>
                  <div className="text-gray-900">{contact.projectedCommission ? `$${contact.projectedCommission.toLocaleString()}` : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Actual Commission</div>
                  <div className="text-gray-900">{contact.actualCommission ? `$${contact.actualCommission.toLocaleString()}` : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Closing Date</div>
                  <div className="text-gray-900">{contact.closingDate ? format(new Date(contact.closingDate), 'MMM d, yyyy') : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Lender Name</div>
                  <div className="text-gray-900">{renderFieldValue(contact.lenderName)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Title Company</div>
                  <div className="text-gray-900">{renderFieldValue(contact.titleCompany)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Inspection Status</div>
                  <div className="text-gray-900 capitalize">{renderFieldValue(contact.inspectionStatus)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Appraisal Status</div>
                  <div className="text-gray-900 capitalize">{renderFieldValue(contact.appraisalStatus)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Transaction IDs</div>
                  <div className="text-gray-900">{renderFieldValue(contact.transactionIds)}</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Network Intelligence" defaultOpen={false}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Relationships</div>
                  <div className="text-gray-900">{renderFieldValue(contact.relationships)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Connected Vendors</div>
                  <div className="text-gray-900">{renderFieldValue(contact.connectedVendors)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Referral Count</div>
                  <div className="text-gray-900">{contact.referralCount || 0}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Last Referral Date</div>
                  <div className="text-gray-900">{contact.lastReferralDate ? format(new Date(contact.lastReferralDate), 'MMM d, yyyy') : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Birthday</div>
                  <div className="text-gray-900">{contact.birthday ? format(new Date(contact.birthday), 'MMM d, yyyy') : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Anniversary</div>
                  <div className="text-gray-900">{contact.anniversary ? format(new Date(contact.anniversary), 'MMM d, yyyy') : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Social Links</div>
                  <div className="text-gray-900">{renderFieldValue(contact.socialLinks)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Notes</div>
                  <div className="text-gray-900">{renderFieldValue(contact.notes)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Tags</div>
                  <div className="text-gray-900">{renderFieldValue(contact.tags)}</div>
                </div>
              </div>
            </CollapsibleSection>

            {contact.pgicInsightSummary && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mt-4">
                <h4 className="text-sm font-semibold text-violet-900 mb-2">AI Insight</h4>
                <p className="text-sm text-violet-700">{contact.pgicInsightSummary}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                        {task.actionDate && (
                          <span className="text-xs text-gray-500">
                            {format(new Date(task.actionDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No tasks yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <ActivityFeed activities={activities} loading={false} />
        )}

        {activeTab === 'notes' && (
          <div>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id} className="border-l-4 border-violet-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {note.category?.replace('_', ' ') || 'General'}
                          </Badge>
                          {getSentimentIcon(note.sentiment)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {note.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-4">No notes yet</p>
                <Button onClick={() => handleQuickAction('note')} variant="outline" size="sm">
                  Add First Note
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <EditContactModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          contact={contact}
          onSave={handleContactSave}
        />
      )}

      {showAddTaskModal && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          onSave={() => {
            toast.success('Task created successfully');
            setShowAddTaskModal(false);
            if (onActivityUpdate) onActivityUpdate();
          }}
          prefillData={{
            contactId: contact.id,
            title: `Follow up with ${contact.firstName} ${contact.lastName}`
          }}
        />
      )}

      {showAddNoteModal && (
        <AddNoteModal
          isOpen={showAddNoteModal}
          onClose={() => {
            setShowAddNoteModal(false);
            setEditingNote(null);
          }}
          onSave={loadNotes}
          contact={contact}
          user={user}
          existingNote={editingNote}
        />
      )}
    </aside>
  );
}