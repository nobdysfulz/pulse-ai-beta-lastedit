import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, X, Upload, Download, ExternalLink } from 'lucide-react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Textarea } from '@/components/ui/textarea';

export default function CsvTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.CsvImportTemplate.list('-created_date');
      setTemplates(data);
    } catch (error) {
      console.error('[CsvTemplateManager] Error loading templates:', error);
      toast.error('Failed to load CSV templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (templateData) => {
    try {
      if (editingTemplate) {
        await base44.entities.CsvImportTemplate.update(editingTemplate.id, templateData);
        toast.success('Template updated successfully');
      } else {
        await base44.entities.CsvImportTemplate.create(templateData);
        toast.success('Template created successfully');
      }
      
      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('[CsvTemplateManager] Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await base44.entities.CsvImportTemplate.delete(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      console.error('[CsvTemplateManager] Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator text="Loading CSV templates..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#1E293B]">CSV Import Templates</h3>
          <p className="text-sm text-[#475569]">Manage downloadable CSV templates for users</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No CSV templates configured yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={template.isActive ? 'default' : 'secondary'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {template.templateType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                      <Download className="w-4 h-4" />
                      <span className="font-medium">{template.fileName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <ExternalLink className="w-4 h-4" />
                      <a 
                        href={template.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 underline truncate"
                      >
                        View file
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <CsvTemplateForm
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

function CsvTemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    fileName: template?.fileName || '',
    fileUrl: template?.fileUrl || '',
    templateType: template?.templateType || 'crm_contacts',
    isActive: template?.isActive !== undefined ? template.isActive : true
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        fileName: file.name,
        fileUrl: file_url
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      toast.error('Please upload a file');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{template ? 'Edit CSV Template' : 'Create CSV Template'}</CardTitle>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CRM Contacts Import Template"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="templateType">Template Type</Label>
              <select
                id="templateType"
                value={formData.templateType}
                onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="crm_contacts">CRM Contacts</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label>CSV File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {formData.fileName ? 'Change File' : 'Upload File'}
                    </>
                  )}
                </Button>
                {formData.fileName && (
                  <span className="text-sm text-gray-600">{formData.fileName}</span>
                )}
              </div>
              {formData.fileUrl && (
                <a 
                  href={formData.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-violet-600 hover:text-violet-700 underline mt-2 inline-block"
                >
                  View current file
                </a>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Active (users can download this template)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {template ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}