import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Step1AgentInfo from './Step1AgentInfo';
import Step2Financial from './Step2Financial';
import Step3DealStructure from './Step3DealStructure';
import Step4Activities from './Step4Activities';
import Step5Summary from './Step5Summary';

const initialPlanData = {
  planYear: new Date().getFullYear(),
  netIncomeGoal: 70000,
  personalExpenses: {},
  businessExpenses: {},
  taxRate: 25,
  avgSalePrice: 450000,
  commissionRate: 3,
  buyerSellerSplit: 60,
  incomeSplit: 60,
  brokerageSplitBuyers: 20,
  brokerageSplitSellers: 20,
  teamSplitBuyers: 0,
  teamSplitSellers: 0,
  buyerActivities: { conversions: 16, appointments: 1, met: 1, signed: 2, underContract: 1, closings: 1 },
  listingActivities: { conversions: 10, appointments: 0, met: 0, signed: 1, underContract: 1, closings: 1 },
  buyerRates: { convToAppt: 0.25, apptToAgree: 0.40, agreeToContract: 0.80, contractToClose: 0.85 },
  listingRates: { convToAppt: 0.30, apptToAgree: 0.60, agreeToContract: 0.90, contractToClose: 0.95 }
};

export default function ProductionPlannerModal({ isOpen, onClose, onPlanSaved }) {
  const { user, businessPlan, refreshUserData } = useContext(UserContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [planData, setPlanData] = useState(initialPlanData);

  useEffect(() => {
    if (businessPlan?.detailedPlan) {
      try {
        const savedPlan = JSON.parse(businessPlan.detailedPlan);
        // Ensure conversion rates exist by merging with initial data
        const mergedPlan = {
          ...initialPlanData,
          ...savedPlan,
          buyerRates: { ...initialPlanData.buyerRates, ...(savedPlan.buyerRates || {}) },
          listingRates: { ...initialPlanData.listingRates, ...(savedPlan.listingRates || {}) }
        };
        setPlanData(mergedPlan);
        console.log('[ProductionPlanner] Loaded saved plan:', mergedPlan);
      } catch (e) {
        console.error("Failed to parse saved business plan, starting fresh.");
        setPlanData(initialPlanData);
      }
    } else {
      setPlanData(initialPlanData);
    }
  }, [businessPlan, isOpen]);

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateGoalsFromPlan = (data) => {
    try {
      console.log('[ProductionPlanner] Starting calculation with data:', data);
      
      // Validate and set defaults for all inputs
      const netIncome = Number(data.netIncomeGoal) || 70000;
      const taxRate = Math.min(Math.max(Number(data.taxRate) || 25, 0), 99);
      const avgSalePrice = Number(data.avgSalePrice) || 450000;
      const commissionRate = Number(data.commissionRate) || 3;
      const incomeSplit = Number(data.incomeSplit) || 60;
      const buyerSellerSplit = Number(data.buyerSellerSplit) || 60;
      
      console.log('[ProductionPlanner] Parsed inputs:', {
        netIncome, taxRate, avgSalePrice, commissionRate, incomeSplit, buyerSellerSplit
      });
      
      // Validate critical inputs
      if (avgSalePrice <= 0) {
        console.error('[ProductionPlanner] Invalid avgSalePrice:', avgSalePrice);
        throw new Error('Average sale price must be greater than 0');
      }
      
      if (commissionRate <= 0 || commissionRate > 100) {
        console.error('[ProductionPlanner] Invalid commissionRate:', commissionRate);
        throw new Error('Commission rate must be between 0 and 100');
      }
      
      if (incomeSplit <= 0 || incomeSplit > 100) {
        console.error('[ProductionPlanner] Invalid incomeSplit:', incomeSplit);
        throw new Error('Income split must be between 0 and 100');
      }
      
      // Financial calculations
      const grossIncome = netIncome / (1 - (taxRate / 100));
      const totalExpenses = Object.values(data.personalExpenses || {}).reduce((a, b) => {
        const amount = Number(b?.amount) || 0;
        const frequency = b?.frequency || 'annual';
        return a + (frequency === 'monthly' ? amount * 12 : amount);
      }, 0) + Object.values(data.businessExpenses || {}).reduce((a, b) => {
        const amount = Number(b?.amount) || 0;
        const frequency = b?.frequency || 'annual';
        return a + (frequency === 'monthly' ? amount * 12 : amount);
      }, 0);
      
      const gciRequired = Math.round(grossIncome + totalExpenses);
      
      const avgCommission = (avgSalePrice * (commissionRate / 100));
      const agentGrossPerDeal = avgCommission * (incomeSplit / 100);
      
      console.log('[ProductionPlanner] Financial calculations:', {
        grossIncome, totalExpenses, gciRequired, avgCommission, agentGrossPerDeal
      });
      
      if (agentGrossPerDeal <= 0) {
        console.error('[ProductionPlanner] Invalid agentGrossPerDeal:', agentGrossPerDeal);
        throw new Error('Agent gross per deal cannot be zero or negative');
      }

      const totalDealsNeeded = Math.ceil(gciRequired / agentGrossPerDeal);
      
      const buyerSplitPercent = buyerSellerSplit / 100;
      const listingSplitPercent = (100 - buyerSellerSplit) / 100;

      const buyerDeals = Math.ceil(totalDealsNeeded * buyerSplitPercent);
      const listingDeals = Math.ceil(totalDealsNeeded * listingSplitPercent);
      
      // Conversion rates with validation
      const buyerConvRates = {
        conversationToAppointment: Math.max(0.01, Math.min(1, Number(data.buyerRates?.convToAppt) || 0.25)),
        appointmentToAgreement: Math.max(0.01, Math.min(1, Number(data.buyerRates?.apptToAgree) || 0.40)),
        agreementToContract: Math.max(0.01, Math.min(1, Number(data.buyerRates?.agreeToContract) || 0.80)),
        contractToClose: Math.max(0.01, Math.min(1, Number(data.buyerRates?.contractToClose) || 0.85))
      };
      
      const listingConvRates = {
        conversationToAppointment: Math.max(0.01, Math.min(1, Number(data.listingRates?.convToAppt) || 0.30)),
        appointmentToAgreement: Math.max(0.01, Math.min(1, Number(data.listingRates?.apptToAgree) || 0.60)),
        agreementToContract: Math.max(0.01, Math.min(1, Number(data.listingRates?.agreeToContract) || 0.90)),
        contractToClose: Math.max(0.01, Math.min(1, Number(data.listingRates?.contractToClose) || 0.95))
      };

      console.log('[ProductionPlanner] Conversion rates:', { buyerConvRates, listingConvRates });

      // Reverse engineering with proper validation
      const buyerContractsNeeded = Math.ceil(buyerDeals / buyerConvRates.contractToClose);
      const buyerAgreementsNeeded = Math.ceil(buyerContractsNeeded / buyerConvRates.agreementToContract);
      const buyerAppointmentsNeeded = Math.ceil(buyerAgreementsNeeded / buyerConvRates.appointmentToAgreement);
      const buyerConversationsNeeded = Math.ceil(buyerAppointmentsNeeded / buyerConvRates.conversationToAppointment);
      
      const listingContractsNeeded = Math.ceil(listingDeals / listingConvRates.contractToClose);
      const listingAgreementsNeeded = Math.ceil(listingContractsNeeded / listingConvRates.agreementToContract);
      const listingAppointmentsNeeded = Math.ceil(listingAgreementsNeeded / listingConvRates.appointmentToAgreement);
      const listingConversationsNeeded = Math.ceil(listingAppointmentsNeeded / listingConvRates.conversationToAppointment);

      const totalContracts = buyerContractsNeeded + listingContractsNeeded;
      const totalAgreements = buyerAgreementsNeeded + listingAgreementsNeeded;
      const totalAppointments = buyerAppointmentsNeeded + listingAppointmentsNeeded;
      const totalConversations = buyerConversationsNeeded + listingConversationsNeeded;
      const totalVolume = Math.round(totalDealsNeeded * avgSalePrice);

      const result = {
        gciRequired,
        totalDealsNeeded,
        buyerDeals,
        listingDeals,
        totalConversations,
        totalAppointments,
        totalAgreements,
        totalContracts,
        totalVolume,
        buyerActivity: {
          conversations: buyerConversationsNeeded,
          appointments: buyerAppointmentsNeeded,
          agreements: buyerAgreementsNeeded,
          contracts: buyerContractsNeeded,
          closed: buyerDeals,
          falloff: {
            agreementToContract: buyerAgreementsNeeded - buyerContractsNeeded,
            contractToClose: buyerContractsNeeded - buyerDeals
          }
        },
        listingActivity: {
          conversations: listingConversationsNeeded,
          appointments: listingAppointmentsNeeded,
          agreements: listingAgreementsNeeded,
          contracts: listingContractsNeeded,
          closed: listingDeals,
          falloff: {
            agreementToContract: listingAgreementsNeeded - listingContractsNeeded,
            contractToClose: listingContractsNeeded - listingDeals
          }
        },
        conversionRates: {
          buyer: buyerConvRates,
          listing: listingConvRates
        }
      };

      console.log('[ProductionPlanner] Calculation result:', result);
      return result;
    } catch (error) {
      console.error('[ProductionPlanner] Calculation error:', error);
      toast.error(error.message || 'Failed to calculate goals');
      // Return safe defaults instead of NaN
      return {
        gciRequired: 0,
        totalDealsNeeded: 0,
        buyerDeals: 0,
        listingDeals: 0,
        totalConversations: 0,
        totalAppointments: 0,
        totalAgreements: 0,
        totalContracts: 0,
        totalVolume: 0,
        buyerActivity: {
          conversations: 0,
          appointments: 0,
          agreements: 0,
          contracts: 0,
          closed: 0,
          falloff: { agreementToContract: 0, contractToClose: 0 }
        },
        listingActivity: {
          conversations: 0,
          appointments: 0,
          agreements: 0,
          contracts: 0,
          closed: 0,
          falloff: { agreementToContract: 0, contractToClose: 0 }
        },
        conversionRates: {
          buyer: initialPlanData.buyerRates,
          listing: initialPlanData.listingRates
        }
      };
    }
  };

  const handleFinishAndActivate = async () => {
    setSaving(true);
    try {
      console.log('[ProductionPlanner] Starting activation...', { userId: user.id });
      
      if (!user?.id) {
        throw new Error('User ID is missing');
      }

      const calculatedTargets = calculateGoalsFromPlan(planData);
      console.log('[ProductionPlanner] Calculated targets:', calculatedTargets);
      
      // Validate calculated targets
      if (isNaN(calculatedTargets.gciRequired) || calculatedTargets.gciRequired <= 0) {
        throw new Error('Invalid GCI calculation. Please ensure all financial inputs are valid positive numbers.');
      }

      // Call backend function to activate plan
      const { data, error: invokeError } = await base44.functions.invoke('activateProductionPlan', {
        planData,
        calculatedTargets,
        userId: user.id
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'An unknown error occurred during plan activation.');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to activate plan: No success indication from backend.');
      }

      toast.success(`Production plan activated! Created ${data.goalsCreated} new goals, updated ${data.goalsUpdated} goals.`);
      
      await refreshUserData();
      
      if (onPlanSaved) {
        onPlanSaved();
      }
      
      onClose();
    } catch (error) {
      console.error('[ProductionPlanner] Activation failed:', error);
      toast.error(`Failed to activate production plan: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const stepComponents = [
    <Step1AgentInfo planData={planData} setPlanData={setPlanData} />,
    <Step2Financial planData={planData} setPlanData={setPlanData} />,
    <Step3DealStructure planData={planData} setPlanData={setPlanData} />,
    <Step4Activities planData={planData} calculateGoalsFromPlan={calculateGoalsFromPlan} setPlanData={setPlanData} />,
    <Step5Summary planData={planData} user={user} calculateGoalsFromPlan={calculateGoalsFromPlan} />
  ];

  const stepTitles = [
    "Step 1: Agent Information",
    "Step 2: Financial Planning",
    "Step 3: Deal Structure",
    "Step 4: Activity Planning",
    "Step 5: Business Plan Summary"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-[#E2E8F0]">
        <div className="bg-zinc-50 px-6 py-4 flex-shrink-0 flex items-center justify-between border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">12-Month Production Planner</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-violet-700 rounded-full h-2.5" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">{stepTitles[currentStep - 1]}</p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#1E293B]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="pt-4 pr-6 pb-6 pl-6 flex-1 overflow-y-auto">
          {stepComponents[currentStep - 1]}
        </div>

        <div className="bg-zinc-50 pt-4 pr-6 pb-4 pl-6 flex items-center justify-between border-t border-[#E2E8F0] flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="bg-white text-gray-800 px-4 py-2 text-sm font-medium rounded-md"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="bg-white text-zinc-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="bg-violet-700 text-white hover:bg-[#c026d3]">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinishAndActivate} disabled={saving} className="bg-violet-700 text-white hover:bg-[#c026d3]">
                {saving ? 'Activating...' : 'Finish & Activate Plan'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}