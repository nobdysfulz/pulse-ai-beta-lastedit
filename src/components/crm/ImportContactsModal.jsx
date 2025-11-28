
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import Papa from 'npm:papaparse@5.4.1';

export default function ImportContactsModal({ isOpen, onClose, onImportComplete, userId }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);

  const fieldOptions = [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'type', label: 'Type' },
    { value: 'stage', label: 'Stage' },
    { value: 'source', label: 'Source' },
    { value: 'location', label: 'Location' },
    { value: 'budget', label: 'Budget' },
    { value: 'propertyInterest', label: 'Property Interest' },
    { value: 'notes', label: 'Notes' },
    { value: 'skip', label: '-- Skip --' }
  ];

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        setHeaders(results.meta.fields);
        setCsvData(results.data);
        
        const autoMapping = {};
        results.meta.fields.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
            autoMapping[header] = 'firstName';
          } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
            autoMapping[header] = 'lastName';
          } else if (lowerHeader.includes('email')) {
            autoMapping[header] = 'email';
          } else if (lowerHeader.includes('phone')) {
            autoMapping[header] = 'phone';
          } else {
            autoMapping[header] = 'skip';
          }
        });
        setMapping(autoMapping);
        
        setStep(2);
      },
      error: (error) => {
        toast.error('Failed to parse CSV file');
        console.error(error);
      }
    });
  };

  const handleImport = async () => {
    const hasFirstName = Object.values(mapping).includes('firstName');
    const hasLastName = Object.values(mapping).includes('lastName');

    if (!hasFirstName || !hasLastName) {
      toast.error('First Name and Last Name are required fields');
      return;
    }

    setImporting(true);

    try {
      const contactsToImport = csvData.map(row => {
        const contact = { userId, sourceSystem: 'csv' };
        
        Object.entries(mapping).forEach(([csvColumn, fieldName]) => {
          if (fieldName !== 'skip' && row[csvColumn]) {
            contact[fieldName] = row[csvColumn];
          }
        });

        return contact;
      });

      const existingContacts = await base44.entities.CrmContact.filter({ userId });
      const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean));

      const newContacts = contactsToImport.filter(contact => {
        if (!contact.email) return true;
        return !existingEmails.has(contact.email.toLowerCase());
      });

      if (newContacts.length === 0) {
        toast.info('All contacts already exist in your CRM');
        setImporting(false);
        return;
      }

      const imported = await base44.entities.CrmContact.bulkCreate(newContacts);
      
      const skipped = contactsToImport.length - newContacts.length;
      
      if (skipped > 0) {
        toast.success(`Imported ${imported.length} contacts, skipped ${skipped} duplicates`);
      } else {
        toast.success(`Successfully imported ${imported.length} contacts`);
      }

      onImportComplete(imported);
      resetModal();
    } catch (error) {
      console.error('[CRM] Import error:', error);
      toast.error('Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-labelledby="import-contacts-title" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="import-contacts-title" className="text-xl font-semibold text-gray-900">Import Contacts from CSV</h2>
          <button
            onClick={resetModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 1 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-violet-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your CSV File</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Your CSV should include columns for first name, last name, email, phone, and any other contact details.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                aria-label="Choose CSV file to upload"
              />
              <label htmlFor="csv-upload">
                <Button type="button" className="gap-2" onClick={() => document.getElementById('csv-upload').click()}>
                  <Upload className="w-4 h-4" />
                  Choose CSV File
                </Button>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Your Columns</h3>
                <p className="text-sm text-gray-500">
                  Match your CSV columns to contact fields. Found {csvData.length} rows.
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {headers.map(header => (
                  <div key={header} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{header}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sample: {csvData[0]?.[header] || 'N/A'}
                      </div>
                    </div>
                    <div className="w-48">
                      <label htmlFor={`mapping-${header}`} className="sr-only">
                        Map {header} to field
                      </label>
                      <select
                        id={`mapping-${header}`}
                        value={mapping[header] || 'skip'}
                        onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                        aria-label={`Map ${header} column`}
                      >
                        {fieldOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500" aria-live="polite">
            {step === 2 && `${csvData.length} contacts ready to import`}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={resetModal}>
              Cancel
            </Button>
            {step === 2 && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Import Contacts
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
