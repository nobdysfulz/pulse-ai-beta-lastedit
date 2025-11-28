import React from 'react';
import SetupProgressTab from '@/components/settings/SetupProgressTab';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function SetupProgressPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="rounded-full hover:bg-white hover:shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Onboarding Progress</h1>
            <p className="text-slate-500">Track your account setup and unlock full capabilities</p>
          </div>
        </div>

        <SetupProgressTab />
      </div>
    </div>
  );
}