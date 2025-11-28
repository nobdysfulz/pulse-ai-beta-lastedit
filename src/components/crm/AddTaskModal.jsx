
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Phone, Mail, MessageSquare, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AddTaskModal({ isOpen, onClose, onSave, prefillData = {} }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: '',
    stage: '',
    dueDate: '',
    dueTime: '09:00',
    priority: 'medium',
    taskType: 'call',
    assignee: 'me',
    isAutomated: false,
    ...prefillData
  });

  const [contacts, setContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      
      if (!prefillData.dueDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData(prev => ({
          ...prev,
          dueDate: tomorrow.toISOString().split('T')[0],
          dueTime: '09:00'
        }));
      }
    }
  }, [isOpen, prefillData]);

  const loadContacts = async () => {
    try {
      const fetchedContacts = await base44.entities.CrmContact.filter({}, '-created_date', 100);
      setContacts(fetchedContacts);
    } catch (error) {
      console.error('[AddTaskModal] Error loading contacts:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      contactId: '',
      stage: '',
      dueDate: '',
      dueTime: '09:00',
      priority: 'medium',
      taskType: 'call',
      assignee: 'me',
      isAutomated: false
    });
    onClose();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      const taskData = {
        userId: user.id,
        actionDate: formData.dueDate,
        actionType: formData.taskType === 'call' ? 'client_follow_up' : 
                    formData.taskType === 'message' ? 'client_follow_up' :
                    formData.taskType === 'meeting' ? 'networking' :
                    formData.taskType === 'follow_up' ? 'client_follow_up' : 'transaction_task',
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'not_started',
        associatedContactId: formData.contactId || null,
        category: 'pulse_based',
        displayCategory: 'PULSE Tasks',
        pulseImpact: formData.priority === 'high' ? 0.3 : formData.priority === 'medium' ? 0.2 : 0.1,
        metadata: JSON.stringify({
          taskType: formData.taskType,
          stage: formData.stage,
          dueTime: formData.dueTime,
          assignee: formData.assignee,
          isAutomated: formData.isAutomated,
          createdFrom: 'crm_add_task'
        })
      };

      const newTask = await base44.entities.DailyAction.create(taskData);

      if (formData.contactId) {
        await base44.entities.CrmActivity.create({
          userId: user.id,
          contactId: formData.contactId,
          activityType: 'task_completed',
          direction: 'outbound',
          subject: `Task created: ${formData.title}`,
          description: formData.description,
          metadata: JSON.stringify({
            taskId: newTask.id,
            priority: formData.priority,
            dueDate: formData.dueDate
          })
        });
      }

      if (formData.isAutomated) {
        console.log('[AddTaskModal] AI automation enabled for task:', newTask.id);
      }

      toast.success('Task created successfully');
      
      if (onSave) {
        onSave(newTask);
      }
      
      handleClose();
    } catch (error) {
      console.error('[AddTaskModal] Error creating task:', error);
      toast.error('Failed to create task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const taskTypeOptions = [
    { value: 'call', label: 'Call', icon: Phone },
    { value: 'message', label: 'Message', icon: MessageSquare },
    { value: 'meeting', label: 'Meeting', icon: Calendar },
    { value: 'follow_up', label: 'Follow-Up', icon: User },
    { value: 'custom', label: 'Custom', icon: Mail }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose} role="dialog" aria-labelledby="add-task-title" aria-modal="true">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 id="add-task-title" className="text-xl font-semibold text-gray-900">Add Task</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Call Taylor about pre-approval"
              className="w-full"
              autoFocus
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Description / Notes
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional context or instructions..."
              className="w-full min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Related Contact
              </Label>
              <Select
                value={formData.contactId}
                onValueChange={(value) => {
                  const selectedContact = contacts.find(c => c.id === value);
                  setFormData({
                    ...formData,
                    contactId: value,
                    stage: selectedContact?.stage || ''
                  });
                }}
              >
                <SelectTrigger id="contact" aria-label="Select related contact">
                  <SelectValue placeholder="Select contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Stage
              </Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value })}
              >
                <SelectTrigger id="stage" aria-label="Select stage">
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="dueTime" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Due Time
              </Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="priority" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority" aria-label="Select priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true"></span>
                    High
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true"></span>
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
                    Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Task Type
            </Label>
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="Select task type">
              {taskTypeOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: option.value })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.taskType === option.value
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    aria-label={option.label}
                    aria-pressed={formData.taskType === option.value}
                  >
                    <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="assignee" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Assignee
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => setFormData({ ...formData, assignee: value })}
            >
              <SelectTrigger id="assignee" aria-label="Select assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="nova">Nova (Executive Assistant)</SelectItem>
                <SelectItem value="phoenix">Phoenix (Leads Agent)</SelectItem>
                <SelectItem value="sirius">Sirius (Content Agent)</SelectItem>
                <SelectItem value="vega">Vega (Transaction Coordinator)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border border-violet-200">
            <div>
              <div className="text-sm font-medium text-gray-900">AI Agent Automation</div>
              <div className="text-xs text-gray-600 mt-0.5">
                Enable Nova to handle this task automatically
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isAutomated: !formData.isAutomated })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isAutomated ? 'bg-violet-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={formData.isAutomated}
              aria-label="Toggle AI automation"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isAutomated ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.title.trim()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {saving ? 'Saving...' : 'Save Task'}
          </Button>
        </div>
      </div>
    </div>
  );
}
