
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Smile, Meh, Frown, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AddNoteModal({ 
  isOpen, 
  onClose, 
  onSave, 
  contact,
  user,
  existingNote = null 
}) {
  const [formData, setFormData] = useState({
    relatedType: 'contact',
    contactId: contact?.id || '',
    category: existingNote?.category || 'general',
    content: existingNote?.content || '',
    tags: existingNote?.tags || [],
    sentiment: existingNote?.sentiment || 'neutral',
    attachments: existingNote?.attachments || []
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast.error('Note content is required');
      return;
    }

    if (formData.content.length > 2000) {
      toast.error('Note content must be 2000 characters or less');
      return;
    }

    try {
      setSaving(true);
      
      const noteData = {
        userId: user.id,
        contactId: contact.id,
        relatedType: formData.relatedType,
        relatedId: contact.id,
        category: formData.category,
        content: formData.content,
        tags: formData.tags,
        sentiment: formData.sentiment,
        attachments: formData.attachments
      };

      if (existingNote) {
        await base44.entities.ContactNote.update(existingNote.id, noteData);
        toast.success('Note updated successfully');
      } else {
        await base44.entities.ContactNote.create(noteData);
        toast.success('Note added successfully');
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('[AddNote] Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-5 h-5" />;
      case 'negative':
        return <Frown className="w-5 h-5" />;
      default:
        return <Meh className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-labelledby="add-note-title" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="add-note-title" className="text-xl font-semibold text-gray-900">
            {existingNote ? 'Edit Note' : 'Add Note'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <Label htmlFor="related">Related To</Label>
            <Input
              id="related"
              value={`Contact: ${contact?.firstName} ${contact?.lastName}`}
              disabled
              className="bg-gray-50"
              aria-readonly="true"
            />
          </div>

          <div>
            <Label htmlFor="category">Note Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category" aria-label="Select note category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="call_summary">Call Summary</SelectItem>
                <SelectItem value="meeting_summary">Meeting Summary</SelectItem>
                <SelectItem value="client_feedback">Client Feedback</SelectItem>
                <SelectItem value="transaction_update">Transaction Update</SelectItem>
                <SelectItem value="personal_detail">Personal Detail</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">Note Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Record observations, conversations, or updates..."
              className="h-32 resize-none"
              maxLength={2000}
              autoFocus
              aria-required="true"
              aria-describedby="content-helper"
            />
            <div id="content-helper" className="text-xs text-gray-500 mt-1 text-right" aria-live="polite">
              {formData.content.length} / 2000 characters
            </div>
          </div>

          <div>
            <Label htmlFor="tag-input">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tags (press Enter)"
                aria-describedby="tag-helper"
              />
              <Button type="button" onClick={handleAddTag} variant="outline" aria-label="Add tag">
                Add
              </Button>
            </div>
            <div id="tag-helper" className="sr-only">Press Enter or click Add button to add a tag</div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2" role="list" aria-label="Note tags">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm"
                    role="listitem"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-violet-900"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Sentiment</Label>
            <div className="flex gap-2" role="group" aria-label="Select sentiment">
              <Button
                type="button"
                variant={formData.sentiment === 'positive' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setFormData({ ...formData, sentiment: 'positive' })}
                aria-pressed={formData.sentiment === 'positive'}
              >
                <Smile className="w-4 h-4" aria-hidden="true" />
                Positive
              </Button>
              <Button
                type="button"
                variant={formData.sentiment === 'neutral' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setFormData({ ...formData, sentiment: 'neutral' })}
                aria-pressed={formData.sentiment === 'neutral'}
              >
                <Meh className="w-4 h-4" aria-hidden="true" />
                Neutral
              </Button>
              <Button
                type="button"
                variant={formData.sentiment === 'negative' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setFormData({ ...formData, sentiment: 'negative' })}
                aria-pressed={formData.sentiment === 'negative'}
              >
                <Frown className="w-4 h-4" aria-hidden="true" />
                Negative
              </Button>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !formData.content.trim()}
          >
            {saving ? 'Saving...' : existingNote ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  );
}
