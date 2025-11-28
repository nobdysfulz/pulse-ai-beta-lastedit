import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function LinkPropertyModal({ isOpen, onClose, contact, onSuccess }) {
  const [formData, setFormData] = useState({
    address: '',
    price: '',
    propertyType: 'single_family',
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const propertyData = {
        address: formData.address,
        price: formData.price ? parseFloat(formData.price) : null,
        type: formData.propertyType
      };

      await base44.entities.CrmContact.update(contact.id, {
        propertyInterest: JSON.stringify(propertyData),
        budget: formData.price ? `$${parseFloat(formData.price).toLocaleString()}` : contact.budget
      });

      await base44.entities.CrmActivity.create({
        userId: contact.userId,
        contactId: contact.id,
        activityType: 'note',
        subject: 'Property Linked',
        description: `Property linked: ${formData.address} - $${parseFloat(formData.price).toLocaleString()}`
      });

      toast.success('Property linked successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('[LinkProperty] Error:', error);
      toast.error('Failed to link property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Property</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State ZIP"
              required
            />
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="500000"
              required
            />
          </div>

          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Select
              value={formData.propertyType}
              onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="multi_family">Multi-Family</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Link Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}