import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SecurityTab() {
    const { user } = useContext(UserContext);

    const handleSignOut = async () => {
        try {
            await base44.auth.logout();
            toast.success("You have been signed out.");
        } catch (error) {
            console.error("Sign out failed:", error);
            toast.error("Sign out failed. Please try again.");
        }
    };

    const handleDeleteAccount = () => {
        toast.info("To delete your account, please contact support through the chat widget.");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#1E293B] mb-1">Security & Privacy</h2>
                <p className="text-sm text-[#475569]">Manage your account security and data settings.</p>
            </div>
            
            <Card className="bg-white">
                 <CardHeader>
                    <CardTitle>Sign Out</CardTitle>
                    <CardDescription>Sign out of your PULSE AI account on this device.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="outline" onClick={handleSignOut} aria-label="Sign out of your account">Sign Out</Button>
                </CardContent>
            </Card>

            <Card className="bg-white border-red-500">
                <CardHeader>
                    <CardTitle className="text-red-600">Delete Account</CardTitle>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-slate-600 mb-4">Permanently delete your account and all associated data. This action is irreversible.</p>
                     <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        aria-label="Request account deletion"
                    >
                        Request Account Deletion
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}