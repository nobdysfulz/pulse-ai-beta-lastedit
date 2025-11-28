import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Phone, Star, Download, Upload, Trash2, ChevronLeft, ChevronRight, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/components/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const ITEMS_PER_PAGE = 10;

export default function ContactsTableView({
  contacts,
  selectedContact,
  onSelectContact,
  onRefresh,
  user
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [templateUrl, setTemplateUrl] = useState(null);
  const fileInputRef = useRef(null);

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

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = !searchQuery ||
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery);

    const matchesSource = sourceFilter === 'all' || contact.sourceSystem === sourceFilter;
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    const matchesFavorite = !favoriteFilter || contact.isFavorite;

    return matchesSearch && matchesSource && matchesType && matchesFavorite;
  });

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const allSelected = paginatedContacts.length > 0 &&
  paginatedContacts.every((c) => selectedContacts.includes(c.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(paginatedContacts.map((c) => c.id));
    }
  };

  const handleSelectContact = (contactId) => {
    setSelectedContacts((prev) =>
    prev.includes(contactId) ?
    prev.filter((id) => id !== contactId) :
    [...prev, contactId]
    );
  };

  const handleBulkCall = async () => {
    if (selectedContacts.length === 0) return;

    try {
      for (const contactId of selectedContacts) {
        const contact = contacts.find((c) => c.id === contactId);
        await base44.entities.CrmActivity.create({
          userId: user.id,
          contactId: contactId,
          activityType: 'call',
          direction: 'outbound',
          subject: `Called ${contact.firstName} ${contact.lastName}`,
          outcome: 'completed'
        });
      }
      toast.success(`Logged ${selectedContacts.length} calls`);
      setSelectedContacts([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to log calls');
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedContacts.length === 0) return;

    try {
      for (const contactId of selectedContacts) {
        const contact = contacts.find((c) => c.id === contactId);
        await base44.entities.CrmContact.update(contactId, {
          isFavorite: !contact.isFavorite
        });
      }
      toast.success(`Updated ${selectedContacts.length} contacts`);
      setSelectedContacts([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleExportCSV = () => {
    const contactsToExport = selectedContacts.length > 0 ?
    contacts.filter((c) => selectedContacts.includes(c.id)) :
    filteredContacts;

    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Status', 'Last Activity'];
    const rows = contactsToExport.map((c) => [
    c.firstName,
    c.lastName,
    c.phone || '',
    c.email || '',
    c.stage,
    c.lastContactDate ? format(new Date(c.lastContactDate), 'MMM d, yyyy h:mm a') : '']
    );

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();

    toast.success('Contacts exported successfully');
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);
    setImportProgress(0);
    setImportTotal(0);
    setShowImportModal(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        setImportErrors(['CSV file is empty or contains no data rows. Please ensure it has headers and at least one contact row.']);
        setImporting(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const contactsToImport = [];
      const errors = [];

      const requiredFields = ['firstname', 'lastname'];
      const missingFields = requiredFields.filter((field) =>
      !headers.some((h) => h === field || h === field.replace('name', ' name'))
      );

      if (missingFields.length > 0) {
        setImportErrors([`Missing required columns: ${missingFields.join(', ')}. Please ensure 'First Name' and 'Last Name' columns are present. Download the template for correct format.`]);
        setImporting(false);
        return;
      }

      setImportTotal(lines.length - 1);

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map((v) => v.trim());
          const contact = {};

          headers.forEach((header, index) => {
            const value = values[index];

            if (header === 'firstname' || header === 'first name') {
              contact.firstName = value;
            } else if (header === 'lastname' || header === 'last name') {
              contact.lastName = value;
            } else if (header === 'email') {
              contact.email = value;
            } else if (header === 'phone') {
              contact.phone = value;
            } else if (header === 'leadsource' || header === 'lead source') {
              contact.leadSource = value || 'csv';
            } else if (header === 'source') {
              contact.source = value;
            } else if (header === 'addressstreet' || header === 'address street' || header === 'address') {
              contact.addressStreet = value;
            } else if (header === 'addresscity' || header === 'address city' || header === 'city') {
              contact.addressCity = value;
            } else if (header === 'addressstate' || header === 'address state' || header === 'state') {
              contact.addressState = value;
            } else if (header === 'addresspostalcode' || header === 'postal code' || header === 'zip') {
              contact.addressPostalCode = value;
            } else if (header === 'location') {
              contact.location = value;
            } else if (header === 'budget') {
              contact.budget = value;
            } else if (header === 'notes') {
              contact.notes = value;
            } else if (header === 'type') {
              if (['lead', 'buyer', 'seller', 'referral', 'vendor', 'partner'].includes(value.toLowerCase())) {
                contact.type = value.toLowerCase();
              } else if (value) {
                errors.push(`Row ${i + 1}: Invalid type '${value}'. Allowed types are 'lead', 'buyer', 'seller', 'referral', 'vendor', 'partner'.`);
              }
            } else if (header === 'stage') {
              if (['new', 'active', 'under_contract', 'closed', 'inactive'].includes(value.toLowerCase())) {
                contact.stage = value.toLowerCase();
              } else if (value) {
                errors.push(`Row ${i + 1}: Invalid stage '${value}'. Allowed stages are 'new', 'active', 'under_contract', 'closed', 'inactive'.`);
              }
            } else if (header === 'preferredcontactmethod' || header === 'preferred contact method' || header === 'communicationpreference') {
              const method = value.toLowerCase();
              if (['call', 'text', 'email', 'whatsapp'].includes(method)) {
                contact.preferredContactMethod = method;
              } else if (method === 'phone') {
                contact.preferredContactMethod = 'call';
              } else if (method === 'any') {// Default to email if 'any' is specified for now
                contact.preferredContactMethod = 'email';
              } else if (value) {
                errors.push(`Row ${i + 1}: Invalid preferred contact method '${value}'. Allowed methods are 'call', 'text', 'email', 'whatsapp'.`);
              }
            }
          });

          if (contact.firstName && contact.lastName) {
            contact.userId = user.id;
            contact.sourceSystem = 'csv';
            contact.stage = contact.stage || 'new'; // Default stage if not provided or invalid
            contact.type = contact.type || 'lead'; // Default type if not provided or invalid
            contactsToImport.push(contact);
          } else {
            errors.push(`Row ${i + 1}: Missing first name or last name for this entry. Skipping.`);
          }
        } catch (rowError) {
          errors.push(`Row ${i + 1}: Processing error - ${rowError.message}`);
        }
      }

      if (contactsToImport.length === 0) {
        setImportErrors(['No valid contacts found in CSV after parsing. Ensure "First Name" and "Last Name" columns are present and populated.', ...errors]);
        setImporting(false);
        return;
      }

      let successCount = 0;
      for (const contact of contactsToImport) {
        try {
          await base44.entities.CrmContact.create(contact);
          successCount++;
          setImportProgress(successCount);
        } catch (createError) {
          errors.push(`Failed to import ${contact.firstName} ${contact.lastName}: ${createError.message}`);
        }
      }

      setImportErrors(errors);

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} contact${successCount !== 1 ? 's' : ''}`);
        onRefresh();
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} error${errors.length !== 1 ? 's' : ''} occurred during import`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportErrors([`Failed to import contacts. Please check your CSV format and try again: ${error.message}`]);
      toast.error('Failed to import contacts. Please check your CSV format and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;

    try {
      for (const contactId of selectedContacts) {
        await base44.entities.CrmContact.delete(contactId);
      }
      toast.success(`Deleted ${selectedContacts.length} contacts`);
      setSelectedContacts([]);
      setShowDeleteDialog(false);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete contacts');
    }
  };

  const getStatusBadge = (stage) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      under_contract: 'bg-purple-100 text-purple-800',
      closed: 'bg-gray-100 text-gray-800',
      inactive: 'bg-gray-100 text-gray-600'
    };
    return colors[stage] || colors.new;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportCSV}
        className="hidden"
        id="import-csv" />


      <div className="bg-[#F8FAFC] p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-4 mb-4">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by source">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="follow_up_boss">Follow Up Boss</SelectItem>
              <SelectItem value="lofty">Lofty</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search contacts" />

          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onRefresh}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Refresh contacts">

              <RefreshCw className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              onClick={handleBulkCall}
              disabled={selectedContacts.length === 0}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Log calls for ${selectedContacts.length} selected contacts`}>

              <Phone className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              onClick={handleBulkFavorite}
              disabled={selectedContacts.length === 0}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Toggle favorite for ${selectedContacts.length} selected contacts`}>

              <Star className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              onClick={handleExportCSV}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Export contacts to CSV">

              <Download className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Import contacts from CSV">

              {importing ?
              <RefreshCw className="w-4 h-4 text-[#475569] animate-spin" /> :

              <Upload className="w-4 h-4 text-[#475569]" />
              }
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedContacts.length === 0}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Delete ${selectedContacts.length} selected contacts`}>

              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full bg-white" role="table" aria-label="Contacts table">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="bg-white px-6 py-3 w-12" scope="col">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all contacts" />

                </th>
                <th className="bg-white text-gray-500 px-6 py-3 text-xs font-medium text-left uppercase tracking-wider" scope="col">
                  Name
                </th>
                <th className="bg-white text-gray-500 px-6 py-3 text-xs font-medium text-left uppercase tracking-wider" scope="col">
                  Phone
                </th>
                <th className="bg-white text-gray-500 px-6 py-3 text-xs font-medium text-left uppercase tracking-wider" scope="col">
                  Email
                </th>
                <th className="bg-white text-gray-500 px-6 py-3 text-xs font-medium text-left uppercase tracking-wider" scope="col">
                  Status
                </th>
                <th className="bg-white text-gray-500 px-6 py-3 text-xs font-medium text-left uppercase tracking-wider" scope="col">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedContacts.map((contact) =>
              <tr
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={cn(
                  'hover:bg-gray-50 cursor-pointer transition-colors',
                  selectedContact?.id === contact.id && 'bg-violet-50'
                )}>

                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={() => handleSelectContact(contact.id)}
                    aria-label={`Select ${contact.firstName} ${contact.lastName}`} />

                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {contact.isFavorite &&
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-2" aria-label="Favorite contact" />
                    }
                      <div className="text-sm font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusBadge(contact.stage)}>
                      {contact.stage?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.lastContactDate ?
                  format(new Date(contact.lastContactDate), 'MMM d, yyyy h:mm a') :
                  '-'
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className={cn(
                'bg-white rounded-lg border border-gray-200 p-4 shadow-sm active:bg-gray-50 transition-colors',
                selectedContact?.id === contact.id && 'border-violet-500 ring-1 ring-violet-500'
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {contact.isFavorite && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                  <h3 className="font-medium text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </h3>
                </div>
                <Badge className={getStatusBadge(contact.stage)}>
                  {contact.stage?.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between" aria-label="Pagination">
        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages} ({filteredContacts.length} contacts)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page">

            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page">

            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {showDeleteDialog &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-labelledby="delete-dialog-title" aria-modal="true">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">Delete Contacts</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete {selectedContacts.length} contact(s)? 
              This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}>

                Cancel
              </Button>
              <Button
              variant="destructive"
              onClick={handleDeleteContacts}>

                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      }

      {showImportModal &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-labelledby="import-dialog-title" aria-modal="true">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 id="import-dialog-title" className="text-lg font-semibold text-gray-900">
                {importing ? 'Importing Contacts...' : 'Import Complete'}
              </h3>
              {!importing &&
            <button
              onClick={() => setShowImportModal(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close import dialog">

                  <X className="w-5 h-5" />
                </button>
            }
            </div>

            {importing && importTotal > 0 &&
          <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    Importing {importProgress} of {importTotal} contacts
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(importProgress / importTotal * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress / importTotal * 100}%` }} />

                </div>
              </div>
          }

            {!importing && importProgress > 0 &&
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-green-900">
                    Successfully imported {importProgress} contact{importProgress !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Your contacts have been added to the CRM
                  </div>
                </div>
              </div>
          }

            {importErrors.length > 0 &&
          <div className="mb-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-900">
                        {importErrors.length} error{importErrors.length !== 1 ? 's' : ''} occurred
                      </div>
                      {templateUrl &&
                  <a
                    href={templateUrl}
                    download
                    className="text-sm text-red-700 hover:text-red-800 underline mt-1 inline-block">

                          Download the correct template
                        </a>
                  }
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {importErrors.map((error, idx) =>
                <div key={idx} className="text-sm text-red-700 pl-8">
                        {error}
                      </div>
                )}
                  </div>
                </div>
              </div>
          }

            {!importing &&
          <div className="flex justify-end">
                <Button onClick={() => setShowImportModal(false)}>
                  Close
                </Button>
              </div>
          }
          </div>
        </div>
      }
    </div>);

}