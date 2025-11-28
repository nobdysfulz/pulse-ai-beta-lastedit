import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function EditContactModal({ isOpen, onClose, contact, onSave }) {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    displayName: contact?.displayName || '',
    company: contact?.company || '',
    jobTitle: contact?.jobTitle || '',
    email: contact?.email || '',
    secondaryEmail: contact?.secondaryEmail || '',
    phone: contact?.phone || '',
    secondaryPhone: contact?.secondaryPhone || '',
    preferredContactMethod: contact?.preferredContactMethod || 'email',
    language: contact?.language || '',
    timezone: contact?.timezone || '',
    addressStreet: contact?.addressStreet || '',
    addressCity: contact?.addressCity || '',
    addressState: contact?.addressState || '',
    addressPostalCode: contact?.addressPostalCode || '',
    addressCountry: contact?.addressCountry || '',
    type: contact?.type || 'lead',
    stage: contact?.stage || 'new',
    source: contact?.source || '',
    leadSource: contact?.leadSource || '',
    sourceDetail: contact?.sourceDetail || '',
    referrerName: contact?.referrerName || '',
    location: contact?.location || '',
    budget: contact?.budget || '',
    propertyInterest: contact?.propertyInterest || '',
    transactionStage: contact?.transactionStage || '',
    transactionValue: contact?.transactionValue || '',
    lenderName: contact?.lenderName || '',
    titleCompany: contact?.titleCompany || '',
    notes: contact?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      toast.error('First and last name are required');
      return;
    }

    setSaving(true);
    try {
      const cleanedData = { ...formData };
      
      if (cleanedData.transactionValue === '' || cleanedData.transactionValue === null) {
        delete cleanedData.transactionValue;
      } else if (cleanedData.transactionValue) {
        cleanedData.transactionValue = parseFloat(cleanedData.transactionValue);
      }
      
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          delete cleanedData[key];
        }
      });

      const updatedContact = await base44.entities.CrmContact.update(contact.id, cleanedData);
      toast.success('Contact updated successfully');
      onClose();
      if (onSave) onSave(updatedContact);
    } catch (error) {
      console.error('[EditContact] Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-labelledby="edit-contact-title" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="edit-contact-title" className="text-xl font-semibold text-gray-900">Edit Contact</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Contact Identity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Primary Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryEmail">Secondary Email</Label>
                  <Input
                    id="secondaryEmail"
                    type="email"
                    value={formData.secondaryEmail}
                    onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Primary Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                  <Input
                    id="secondaryPhone"
                    value={formData.secondaryPhone}
                    onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                  <Select value={formData.preferredContactMethod} onValueChange={(value) => setFormData({ ...formData, preferredContactMethod: value })}>
                    <SelectTrigger id="preferredContactMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="America/New_York"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="addressStreet">Street Address</Label>
                  <Input
                    id="addressStreet"
                    value={formData.addressStreet}
                    onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="addressCity">City</Label>
                  <Input
                    id="addressCity"
                    value={formData.addressCity}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="addressState">State</Label>
                  <Input
                    id="addressState"
                    value={formData.addressState}
                    onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="addressPostalCode">Postal Code</Label>
                  <Input
                    id="addressPostalCode"
                    value={formData.addressPostalCode}
                    onChange={(e) => setFormData({ ...formData, addressPostalCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="addressCountry">Country</Label>
                  <Input
                    id="addressCountry"
                    value={formData.addressCountry}
                    onChange={(e) => setFormData({ ...formData, addressCountry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Lead Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Contact Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                    <SelectTrigger id="stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="under_contract">Under Contract</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Input
                    id="leadSource"
                    value={formData.leadSource}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sourceDetail">Source Detail</Label>
                  <Input
                    id="sourceDetail"
                    value={formData.sourceDetail}
                    onChange={(e) => setFormData({ ...formData, sourceDetail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="referrerName">Referrer Name</Label>
                  <Input
                    id="referrerName"
                    value={formData.referrerName}
                    onChange={(e) => setFormData({ ...formData, referrerName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Property Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="propertyInterest">Property Interest</Label>
                  <Input
                    id="propertyInterest"
                    value={formData.propertyInterest}
                    onChange={(e) => setFormData({ ...formData, propertyInterest: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-violet-600 mb-3">Transaction Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transactionStage">Transaction Stage</Label>
                  <Select value={formData.transactionStage || ''} onValueChange={(value) => setFormData({ ...formData, transactionStage: value })}>
                    <SelectTrigger id="transactionStage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Not set</SelectItem>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="under_contract">Under Contract</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transactionValue">Transaction Value</Label>
                  <Input
                    id="transactionValue"
                    type="number"
                    value={formData.transactionValue}
                    onChange={(e) => setFormData({ ...formData, transactionValue: e.target.value })}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label htmlFor="lenderName">Lender Name</Label>
                  <Input
                    id="lenderName"
                    value={formData.lenderName}
                    onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="titleCompany">Title Company</Label>
                  <Input
                    id="titleCompany"
                    value={formData.titleCompany}
                    onChange={(e) => setFormData({ ...formData, titleCompany: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about this contact..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}