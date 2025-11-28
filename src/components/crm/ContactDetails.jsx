import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MessageSquare, Calendar, User, MapPin, DollarSign, Save, X, Edit2, Plus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/components/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import AddTaskModal from './AddTaskModal';

export default function ContactDetails({ contact, onUpdate, onActivityUpdate }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContact, setEditedContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  if (!contact) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contact Selected</h3>
          <p className="text-sm text-gray-500">Select a contact from the list to view details</p>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedContact({ ...contact });
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditedContact(null);
    setEditMode(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.CrmContact.update(contact.id, editedContact);
      toast.success('Contact updated successfully');
      setEditMode(false);
      if (onUpdate) {
        const updated = await base44.entities.CrmContact.filter({ id: contact.id });
        if (updated.length > 0) onUpdate(updated[0]);
      }
    } catch (error) {
      console.error('[ContactDetails] Error saving:', error);
      toast.error('Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedContact((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickAction = async (actionType) => {
    setActionLoading(actionType);

    try {
      if (actionType === 'call') {
        await base44.entities.CrmActivity.create({
          userId: contact.userId,
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
      } else if (actionType === 'email') {
        if (contact.email) {
          window.location.href = `mailto:${contact.email}`;
        }

        await base44.entities.CrmActivity.create({
          userId: contact.userId,
          contactId: contact.id,
          activityType: 'email',
          direction: 'outbound',
          subject: `Emailed ${contact.firstName} ${contact.lastName}`,
          outcome: 'completed'
        });
      } else if (actionType === 'text') {
        await base44.entities.CrmActivity.create({
          userId: contact.userId,
          contactId: contact.id,
          activityType: 'text',
          direction: 'outbound',
          subject: `Texted ${contact.firstName} ${contact.lastName}`,
          outcome: 'completed'
        });

        toast.success('Text logged successfully');
      } else if (actionType === 'task') {
        setShowAddTaskModal(true);
        return; // Don't proceed to common activity update as modal handles its own saving and refresh
      }

      // Only call onActivityUpdate if it's not a task, as task modal will handle its own success/refresh
      if (actionType !== 'task' && onActivityUpdate) onActivityUpdate();

      // Only update contact if it's a call (which updates lastContactDate)
      if (actionType === 'call' && onUpdate) {
        const updated = await base44.entities.CrmContact.filter({ id: contact.id });
        if (updated.length > 0) onUpdate(updated[0]);
      }
    } catch (error) {
      console.error('[ContactDetails] Action error:', error);
      toast.error('Failed to complete action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTaskSaved = () => {
    toast.success('Task created and linked to contact');
    if (onActivityUpdate) onActivityUpdate();
    setShowAddTaskModal(false); // Close modal after saving
  };

  const displayContact = editMode ? editedContact : contact;

  const EditableField = ({ label, field, type = 'text', options = null, placeholder = '' }) => {
    const value = displayContact[field] || '';

    if (!editMode) {
      return (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
          <div className="text-sm text-gray-900">
            {value || <span className="text-gray-400">Not set</span>}
          </div>
        </div>
      );
    }

    if (type === 'select' && options) {
      return (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
          <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px]"
          />
        </div>
      );
    }

    return (
      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
        <Input
          type={type}
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="h-9"
        />
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col bg-white">
        <div className="bg-slate-50 p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {contact.firstName} {contact.lastName}
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="capitalize bg-violet-50 text-violet-700 border-violet-200">{contact.type}</Badge>
                <Badge variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-200">
                  {contact.stage?.replace('_', ' ')}
                </Badge>
                {contact.source && <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{contact.source}</Badge>}
              </div>
            </div>
            
            {contact.followUpPriorityScore !== undefined && (
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Priority Score</div>
                  <div className="text-gray-500 text-3xl font-bold">
                    {contact.followUpPriorityScore}
                  </div>
                </div>
                
                {editMode ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{contact.location}</span>
              </div>
            )}
            {contact.budget && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>{contact.budget}</span>
              </div>
            )}
          </div>

          {contact.pgicInsightSummary && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-4">
              <div className="text-xs font-semibold text-violet-900 mb-1">AI Insight</div>
              <p className="text-sm text-violet-700">{contact.pgicInsightSummary}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={() => handleQuickAction('call')} disabled={actionLoading === 'call'}>
              <Phone className="w-4 h-4" />
              {actionLoading === 'call' ? 'Logging...' : 'Call'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleQuickAction('text')} 
              disabled={!contact.phone || actionLoading === 'text'} 
              className="bg-transparent text-gray-700 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border hover:bg-accent h-9"
            >
              <MessageSquare className="w-4 h-4" />
              {actionLoading === 'text' ? 'Logging...' : 'Text'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleQuickAction('email')} 
              disabled={!contact.email || actionLoading === 'email'} 
              className="bg-transparent text-gray-600 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border hover:bg-accent h-9"
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleQuickAction('task')} 
              disabled={actionLoading === 'task'} 
              className="bg-transparent text-gray-600 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border hover:bg-accent h-9"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <EditableField label="First Name" field="firstName" placeholder="John" />
              <EditableField label="Last Name" field="lastName" placeholder="Smith" />
              <EditableField label="Display Name" field="displayName" placeholder="John Smith" />
              <EditableField label="Company" field="company" placeholder="ABC Corp" />
              <EditableField label="Job Title" field="jobTitle" placeholder="CEO" />
              <EditableField label="Primary Email" field="email" type="email" placeholder="john@example.com" />
              <EditableField label="Secondary Email" field="secondaryEmail" type="email" placeholder="john.alt@example.com" />
              <EditableField label="Primary Phone" field="phone" type="tel" placeholder="555-0100" />
              <EditableField label="Secondary Phone" field="secondaryPhone" type="tel" placeholder="555-0101" />
              <EditableField
                label="Preferred Contact Method"
                field="preferredContactMethod"
                type="select"
                options={['call', 'text', 'email', 'whatsapp']}
                placeholder="Select method" />

              <EditableField label="Language" field="language" placeholder="English" />
              <EditableField label="Timezone" field="timezone" placeholder="America/New_York" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <EditableField label="Street Address" field="addressStreet" placeholder="123 Main St" />
              </div>
              <EditableField label="City" field="addressCity" placeholder="Dallas" />
              <EditableField label="State" field="addressState" placeholder="TX" />
              <EditableField label="Postal Code" field="addressPostalCode" placeholder="75201" />
              <EditableField label="Country" field="addressCountry" placeholder="USA" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <EditableField label="Lead Source" field="leadSource" placeholder="Referral, Ad, Website, etc." />
              <EditableField label="Source Detail" field="sourceDetail" placeholder="Facebook Campaign ID" />
              <EditableField label="Referrer Name" field="referrerName" placeholder="Jane Doe" />
              <EditableField label="Referrer Contact ID" field="referrerContactId" placeholder="contact_123" />
              <EditableField label="Lead Origin System" field="leadOriginSystem" placeholder="Manual, FUB, Lofty, etc." />
              <EditableField label="Campaign Tag" field="sourceCampaignTag" placeholder="utm_campaign=spring2024" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Interest</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <EditableField label="Property Interest" field="propertyInterest" type="textarea" placeholder="Looking for 3-bed home in downtown area" />
              </div>
              <EditableField label="Budget" field="budget" placeholder="$500,000 - $750,000" />
              <EditableField label="Location Preference" field="location" placeholder="Downtown Dallas" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction & Financials</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <EditableField
                label="Transaction Stage"
                field="transactionStage"
                type="select"
                options={['inquiry', 'offer', 'under_contract', 'closed']}
                placeholder="Select stage" />

              <EditableField label="Transaction Value" field="transactionValue" type="number" placeholder="750000" />
              <EditableField label="Projected Commission" field="projectedCommission" type="number" placeholder="22500" />
              <EditableField label="Actual Commission" field="actualCommission" type="number" placeholder="22500" />
              <EditableField label="Closing Date" field="closingDate" type="date" />
              <EditableField label="Lender Name" field="lenderName" placeholder="ABC Bank" />
              <EditableField label="Title Company" field="titleCompany" placeholder="XYZ Title" />
              <EditableField
                label="Inspection Status"
                field="inspectionStatus"
                type="select"
                options={['none', 'pending', 'complete']}
                placeholder="Select status" />

              <EditableField
                label="Appraisal Status"
                field="appraisalStatus"
                type="select"
                options={['none', 'ordered', 'complete']}
                placeholder="Select status" />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <EditableField label="Referral Count" field="referralCount" type="number" placeholder="0" />
              <EditableField label="Last Referral Date" field="lastReferralDate" type="date" />
              <EditableField label="Birthday" field="birthday" type="date" />
              <EditableField label="Anniversary" field="anniversary" type="date" />
              <div className="col-span-2">
                <EditableField label="Notes" field="notes" type="textarea" placeholder="Add personal notes, background, or other details" />
              </div>
            </CardContent>
          </Card>

          {contact.lastContactDate &&
          <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Last Contact</div>
                  <div className="text-sm text-gray-900 flex items-center gap-2">
                    {formatDistanceToNow(new Date(contact.lastContactDate), { addSuffix: true })}
                  </div>
                </div>
                {contact.nextFollowUpDate &&
              <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Next Follow-Up</div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(contact.nextFollowUpDate), 'MMM d, yyyy')}
                    </div>
                  </div>
              }
                {contact.tags && contact.tags.length > 0 &&
              <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag, idx) =>
                  <Badge key={idx} variant="outline">{tag}</Badge>
                  )}
                    </div>
                  </div>
              }
              </CardContent>
            </Card>
          }

          {contact.relationshipScore &&
          <Card>
              <CardHeader>
                <CardTitle className="text-base">Relationship Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Relationship Score</span>
                  <span className="text-gray-950 text-lg font-bold">
                    {contact.relationshipScore}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                  className="bg-violet-600 h-2 rounded-full transition-all"
                  style={{ width: `${contact.relationshipScore}%` }} />

                </div>
              </CardContent>
            </Card>
          }
        </div>
      </div>

      {showAddTaskModal && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          onSave={handleTaskSaved}
          prefillData={{
            contactId: contact.id,
            stage: contact.stage, // Pass contact's stage if useful for task categorization
            title: `Follow up with ${contact.firstName} ${contact.lastName}` // Pre-fill task title
          }}
        />
      )}
    </>
  );
}