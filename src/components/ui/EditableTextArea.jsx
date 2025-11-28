import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '@/components/lib/utils';

/**
 * Inline Editable Text Area
 * For caption editing, email body editing, etc.
 */
export default function EditableTextArea({
  value = '',
  onChange,
  onSave,
  onCancel,
  placeholder = "Enter text...",
  autosize = true,
  inline = true,
  maxLength = null,
  className
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      if (autosize) {
        adjustHeight();
      }
    }
  }, [isEditing, autosize]);

  const adjustHeight = () => {
    if (textareaRef.current && autosize) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) return;
    
    setEditValue(newValue);
    if (onChange) onChange(newValue);
    if (autosize) adjustHeight();
  };

  const handleSave = () => {
    if (onSave) onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    if (onCancel) onCancel();
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className={cn("group relative", className)}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#1E293B]">
          {value || placeholder}
        </div>
        {inline && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-[#64748B]" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Textarea
        ref={textareaRef}
        value={editValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-sm resize-none"
        rows={autosize ? 1 : 4}
      />
      
      {maxLength && (
        <div className="text-xs text-[#94A3B8] text-right">
          {editValue.length} / {maxLength}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
        >
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
      </div>
      
      <div className="text-xs text-[#64748B]">
        Tip: Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Cmd+Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to cancel
      </div>
    </div>
  );
}