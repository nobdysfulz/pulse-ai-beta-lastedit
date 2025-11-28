import React, { useState, useContext } from 'react';
import { UserContext } from '../../../context/UserContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProfileSetup({ onComplete }) {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    licenseNumber: user?.licenseNumber || '',
    licenseState: user?.licenseState || '',
    brokerage: user?.brokerage || '',
    yearsExperience: user?.yearsExperience || ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.licenseNumber?.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }
    if (!formData.licenseState?.trim()) {
      newErrors.licenseState = 'License state is required';
    }
    if (!formData.brokerage?.trim()) {
      newErrors.brokerage = 'Brokerage is required';
    }
    if (!formData.yearsExperience || formData.yearsExperience < 0) {
      newErrors.yearsExperience = 'Years of experience is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      // Update user profile with full_name properly set
      await base44.auth.updateMe({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        licenseState: formData.licenseState.trim(),
        brokerage: formData.brokerage.trim(),
        yearsExperience: parseInt(formData.yearsExperience)
      });

      toast.success('Profile information saved');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile information');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
          <UserCircle className="w-8 h-8 text-[#7C3AED]" />
        </div>
        <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Tell Us About Yourself</h3>
        <p className="text-sm text-[#475569]">Let's start with some basic information to personalize your experience.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Smith"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              type="text"
              placeholder="12345678"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className={errors.licenseNumber ? 'border-red-500' : ''}
            />
            {errors.licenseNumber && <p className="text-xs text-red-500 mt-1">{errors.licenseNumber}</p>}
          </div>
          <div>
            <Label htmlFor="licenseState">License State</Label>
            <Input
              id="licenseState"
              type="text"
              placeholder="CA"
              value={formData.licenseState}
              onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
              className={errors.licenseState ? 'border-red-500' : ''}
            />
            {errors.licenseState && <p className="text-xs text-red-500 mt-1">{errors.licenseState}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="brokerage">Brokerage</Label>
          <Input
            id="brokerage"
            type="text"
            placeholder="ABC Realty"
            value={formData.brokerage}
            onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
            className={errors.brokerage ? 'border-red-500' : ''}
          />
          {errors.brokerage && <p className="text-xs text-red-500 mt-1">{errors.brokerage}</p>}
        </div>

        <div>
          <Label htmlFor="yearsExperience">Years of Experience</Label>
          <Input
            id="yearsExperience"
            type="number"
            min="0"
            placeholder="5"
            value={formData.yearsExperience}
            onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
            className={errors.yearsExperience ? 'border-red-500' : ''}
          />
          {errors.yearsExperience && <p className="text-xs text-red-500 mt-1">{errors.yearsExperience}</p>}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSaving}
        className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
      >
        {isSaving ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving Profile...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );
}