import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, X, ExternalLink } from 'lucide-react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PopupAdManager() {
  const [popupAds, setPopupAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPopupAds();
  }, []);

  const loadPopupAds = async () => {
    try {
      setLoading(true);
      const ads = await base44.entities.PopupAd.list('-priority');
      setPopupAds(ads);
    } catch (error) {
      console.error('[PopupAdManager] Error loading popup ads:', error);
      toast.error('Failed to load popup ads');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (adData) => {
    try {
      if (editingAd) {
        await base44.entities.PopupAd.update(editingAd.id, adData);
        toast.success('Popup ad updated successfully');
      } else {
        await base44.entities.PopupAd.create(adData);
        toast.success('Popup ad created successfully');
      }
      
      setShowForm(false);
      setEditingAd(null);
      loadPopupAds();
    } catch (error) {
      console.error('[PopupAdManager] Error saving popup ad:', error);
      toast.error('Failed to save popup ad');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this popup ad?')) return;
    
    try {
      await base44.entities.PopupAd.delete(id);
      toast.success('Popup ad deleted');
      loadPopupAds();
    } catch (error) {
      console.error('[PopupAdManager] Error deleting popup ad:', error);
      toast.error('Failed to delete popup ad');
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingAd(null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator text="Loading popup ads..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#1E293B]">Popup Ads</h3>
          <p className="text-sm text-[#475569]">Manage promotional popups shown to free users</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Popup Ad
        </Button>
      </div>

      {popupAds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No popup ads configured yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {popupAds.map((ad) => (
            <Card key={ad.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{ad.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                            {ad.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {ad.triggerType.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            Priority: {ad.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(ad)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ad.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                      <ExternalLink className="w-4 h-4" />
                      <a 
                        href={ad.targetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 underline truncate"
                      >
                        {ad.targetUrl}
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
        <PopupAdForm
          ad={editingAd}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingAd(null);
          }}
        />
      )}
    </div>
  );
}

function PopupAdForm({ ad, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: ad?.title || '',
    imageUrl: ad?.imageUrl || '',
    targetUrl: ad?.targetUrl || '',
    triggerType: ad?.triggerType || 'both',
    isActive: ad?.isActive !== undefined ? ad.isActive : true,
    priority: ad?.priority || 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{ad ? 'Edit Popup Ad' : 'Create Popup Ad'}</CardTitle>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title (Internal)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Premium Upgrade Promo"
                required
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                required
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full max-w-md h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="targetUrl">Target URL (External Link)</Label>
              <Input
                id="targetUrl"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                placeholder="https://checkout.example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (Premium & Credits)</SelectItem>
                  <SelectItem value="premium_feature">Premium Feature Only</SelectItem>
                  <SelectItem value="insufficient_credits">Insufficient Credits Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority (Higher = Shown First)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {ad ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}