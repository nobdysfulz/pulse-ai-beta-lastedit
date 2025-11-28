import React from 'react';
import { Users, List, TrendingDown } from 'lucide-react';

const ActivityDisplay = ({ title, values, falloff }) => (
    <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2"><List /> {title}</h4>
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Conversations Needed</span>
                <span className="font-bold text-lg">{values.conversations}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Appointments Needed</span>
                <span className="font-bold text-lg">{values.appointments}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Agreements Needed</span>
                <span className="font-bold text-lg">{values.agreements}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Contracts Needed</span>
                <span className="font-bold text-lg">{values.contracts}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-3">
                <span className="text-gray-900 font-semibold">Closed Deals</span>
                <span className="font-bold text-xl text-violet-700">{values.closed}</span>
            </div>
            
            {falloff && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-semibold text-gray-700 uppercase">Expected Fall-off</span>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-orange-600">
                            <span>Agreement → Contract</span>
                            <span className="font-semibold">-{falloff.agreementToContract} deals</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                            <span>Contract → Close</span>
                            <span className="font-semibold">-{falloff.contractToClose} deals</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);

export default function Step4Activities({ planData, calculateGoalsFromPlan }) {
    // Calculate activity targets
    const calculatedTargets = calculateGoalsFromPlan ? calculateGoalsFromPlan(planData) : null;

    if (!calculatedTargets) {
        return (
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <p className="text-gray-500">Calculating your activity plan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold">Your Activity Plan</h2>
                <p className="text-gray-500">Based on your goals and conversion rates, here is the reverse-engineered activity you need to hit your numbers.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ActivityDisplay 
                    title="Buyer Activities" 
                    values={calculatedTargets.buyerActivity} 
                    falloff={calculatedTargets.buyerActivity.falloff}
                />
                <ActivityDisplay 
                    title="Listing Activities" 
                    values={calculatedTargets.listingActivity}
                    falloff={calculatedTargets.listingActivity.falloff}
                />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">Annual Totals</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-blue-900">{calculatedTargets.totalConversations}</div>
                        <div className="text-xs text-blue-700">Conversations</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-900">{calculatedTargets.totalAppointments}</div>
                        <div className="text-xs text-blue-700">Appointments</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-900">{calculatedTargets.totalAgreements}</div>
                        <div className="text-xs text-blue-700">Agreements</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-900">{calculatedTargets.totalContracts}</div>
                        <div className="text-xs text-blue-700">Contracts</div>
                    </div>
                </div>
            </div>
        </div>
    );
}