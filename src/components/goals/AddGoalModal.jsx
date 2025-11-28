import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from 'lucide-react';
import { toast } from "sonner";
import { upsertGoal } from './goalDeduplication';

export default function AddGoalModal({ isOpen, onClose, onAddGoal, userId }) {
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('closings');
  const [category, setCategory] = useState('production');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState('annual');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title || !targetValue || !deadline) {
      toast.error("Please fill out all fields.");
      return;
    }

    if (!userId) {
      toast.error("User ID is required.");
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        title,
        targetValue: Number(targetValue),
        targetUnit,
        category,
        type,
        deadline,
        status: 'active',
        currentValue: 0,
        progressPercentage: 0,
        trend: 'on-track'
      };

      const { goal, isNew } = await upsertGoal(goalData, userId);
      
      if (isNew) {
        toast.success(`Goal "${title}" created successfully!`);
      } else {
        toast.success(`Goal "${title}" updated successfully!`);
      }

      if (onAddGoal) {
        onAddGoal(goal);
      }
      
      // Clear and close
      onClose();
      setTitle('');
      setTargetValue('');
      setTargetUnit('closings');
      setCategory('production');
      setType('annual');
      setDeadline('');
    } catch (error) {
      console.error('[AddGoalModal] Error saving goal:', error);
      toast.error('Failed to save goal: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-labelledby="add-goal-title" aria-modal="true">
      <div className="bg-white rounded-lg max-w-md w-full border border-[#E2E8F0]">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <h2 id="add-goal-title" className="text-xl font-semibold text-[#1E293B]">Add Custom Goal</h2>
          <button onClick={onClose} className="text-[#475569] hover:text-[#1E293B]" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Host 4 Open Houses" 
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" aria-label="Select goal category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="lead-generation">Lead Generation</SelectItem>
                  <SelectItem value="business-development">Business Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Timeframe</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" aria-label="Select goal timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target</Label>
              <Input 
                id="targetValue" 
                type="number" 
                value={targetValue} 
                onChange={(e) => setTargetValue(e.target.value)} 
                placeholder="e.g., 4" 
                aria-required="true"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetUnit">Unit</Label>
              <Select value={targetUnit} onValueChange={setTargetUnit}>
                <SelectTrigger id="targetUnit" aria-label="Select target unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="closings">Closings</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="appointments">Appointments</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input 
              id="deadline" 
              type="date" 
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)} 
              aria-required="true"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-[#E2E8F0]">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Goal'}
          </Button>
        </div>
      </div>
    </div>
  );
}