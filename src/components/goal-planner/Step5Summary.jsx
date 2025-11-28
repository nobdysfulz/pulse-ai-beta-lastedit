
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';

export default function Step5Summary({ planData, user, calculateGoalsFromPlan }) {
    const [downloading, setDownloading] = useState(false);
    const [emailing, setEmailing] = useState(false);

    const calculatedTargets = calculateGoalsFromPlan ? calculateGoalsFromPlan(planData) : null;

    if (!calculatedTargets) {
        return (
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <p className="text-gray-500">Calculating your business plan...</p>
                </div>
            </div>
        );
    }

    // Recalculate totals for display
    const calculateTotal = (expenses) => {
        return Object.values(expenses).reduce((total, item) => {
            const amount = parseFloat(item?.amount) || 0;
            if (item?.frequency === 'monthly') {
                return total + amount * 12;
            }
            return total + amount;
        }, 0);
    };

    const totalPersonal = calculateTotal(planData.personalExpenses);
    const totalBusiness = calculateTotal(planData.businessExpenses);
    const totalExpenses = totalPersonal + totalBusiness;
    const grossIncomeNeeded = planData.netIncomeGoal + totalExpenses;
    const taxReserve = grossIncomeNeeded / (1 - planData.taxRate / 100) - grossIncomeNeeded;
    const totalIncomeNeeded = grossIncomeNeeded + taxReserve;

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const doc = new jsPDF();

            // Load and add logo
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/c8406aefd_PWRULogoBlack.png';
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load logo'));
                img.src = logoUrl;
            });

            const logoWidth = 40;
            const logoHeight = img.height / img.width * logoWidth;
            doc.addImage(img, 'PNG', 210 - 20 - logoWidth, 10, logoWidth, logoHeight);

            // Title
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`${user.firstName}'s ${planData.planYear} Business Plan`, 20, 20);

            // Divider
            doc.setDrawColor(124, 58, 237); // A shade of purple for the divider
            doc.setLineWidth(0.5);
            doc.line(20, 28, 190, 28); // Adjusted Y position for divider after title

            let yPos = 40;

            // Income Summary
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Income Summary', 20, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.text(`Net Income Goal: $${planData.netIncomeGoal.toLocaleString()}`, 20, yPos);
            yPos += 6;
            doc.text(`Total Expenses: $${Math.round(totalExpenses).toLocaleString()}`, 20, yPos);
            yPos += 6;
            doc.text(`Tax Set Aside: $${Math.round(taxReserve).toLocaleString()}`, 20, yPos);
            yPos += 6;
            doc.setFont(undefined, 'bold');
            doc.text(`Total Income Needed: $${Math.round(totalIncomeNeeded).toLocaleString()}`, 20, yPos);
            yPos += 15;

            // Production Goals
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Production Goals', 20, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.text(`GCI Needed: $${Math.round(calculatedTargets.gciRequired).toLocaleString()}`, 20, yPos);
            yPos += 6;
            doc.text(`Total Sales Volume: $${Math.round(calculatedTargets.totalVolume).toLocaleString()}`, 20, yPos);
            yPos += 6;
            doc.text(`Buyer Deals: ${calculatedTargets.buyerDeals}`, 20, yPos);
            yPos += 6;
            doc.text(`Listing Deals: ${calculatedTargets.listingDeals}`, 20, yPos);
            yPos += 15;

            // Activity Goals
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Activity Goals (Annual)', 20, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.text(`Conversations: ${calculatedTargets.totalConversations}`, 20, yPos);
            yPos += 6;
            doc.text(`Appointments: ${calculatedTargets.totalAppointments}`, 20, yPos);
            yPos += 6;
            doc.text(`Agreements: ${calculatedTargets.totalAgreements}`, 20, yPos);
            yPos += 6;
            doc.text(`Contracts: ${calculatedTargets.totalContracts}`, 20, yPos);

            doc.save(`Business_Plan_${planData.planYear}.pdf`);
            toast.success('Production plan PDF downloaded');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setDownloading(false);
        }
    };

    const handleEmail = async () => {
        setEmailing(true);
        try {
            const emailContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h1 style="color: #6a0dad;">${user.firstName}'s ${planData.planYear} Business Plan</h1>
                    <hr style="border: 0; height: 1px; background-color: #eee; margin: 20px 0;">
                    
                    <h2 style="color: #333;">Income Summary</h2>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 5px;">Net Income Goal: <strong>$${planData.netIncomeGoal.toLocaleString()}</strong></li>
                        <li style="margin-bottom: 5px;">Total Expenses: <strong>$${Math.round(totalExpenses).toLocaleString()}</strong></li>
                        <li style="margin-bottom: 5px;">Tax Set Aside: <strong>$${Math.round(taxReserve).toLocaleString()}</strong></li>
                        <li style="margin-bottom: 5px; color: #7f00ff;"><strong>Total Income Needed: $${Math.round(totalIncomeNeeded).toLocaleString()}</strong></li>
                    </ul>
                    
                    <h2 style="color: #333;">Production Goals</h2>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 5px;">GCI Needed: <strong>$${Math.round(calculatedTargets.gciRequired).toLocaleString()}</strong></li>
                        <li style="margin-bottom: 5px;">Total Sales Volume: <strong>$${Math.round(calculatedTargets.totalVolume).toLocaleString()}</strong></li>
                        <li style="margin-bottom: 5px;">Buyer Deals: <strong>${calculatedTargets.buyerDeals}</strong></li>
                        <li style="margin-bottom: 5px;">Listing Deals: <strong>${calculatedTargets.listingDeals}</strong></li>
                    </ul>
                    
                    <h2 style="color: #333;">Activity Goals (Annual)</h2>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 5px;">Conversations: <strong>${calculatedTargets.totalConversations}</strong></li>
                        <li style="margin-bottom: 5px;">Appointments: <strong>${calculatedTargets.totalAppointments}</strong></li>
                        <li style="margin-bottom: 5px;">Agreements: <strong>${calculatedTargets.totalAgreements}</strong></li>
                        <li style="margin-bottom: 5px;">Contracts: <strong>${calculatedTargets.totalContracts}</strong></li>
                    </ul>
                    <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Generated by PULSE Intelligence.</p>
                </div>
            `;

            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `Your ${planData.planYear} Production Plan - PULSE Intelligence`,
                body: emailContent
            });

            toast.success(`Production plan emailed to ${user.email}`);
        } catch (error) {
            console.error('Error emailing plan:', error);
            toast.error('Failed to email production plan');
        } finally {
            setEmailing(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold">{user.firstName}'s {planData.planYear} Business Plan</h2>
                <div className="flex justify-center gap-4 mt-4">
                    <Button
                        variant="outline"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="bg-white text-zinc-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-[#E2E8F0] hover:bg-[#F8FAFC] h-10">
                        {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download PDF
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleEmail}
                        disabled={emailing}
                        className="bg-white text-zinc-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-[#E2E8F0] hover:bg-[#F8FAFC] h-10">
                        {emailing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        Email Plan
                    </Button>
                </div>
            </div>

            {/* Income Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-center">Income Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500">Net Income Goal</p>
                        <p className="font-bold text-xl">${planData.netIncomeGoal.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Expenses</p>
                        <p className="font-bold text-xl">${Math.round(totalExpenses).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Tax Set Aside</p>
                        <p className="font-bold text-xl">${Math.round(taxReserve).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-950 text-sm font-semibold">Total Income Needed</p>
                        <p className="text-violet-700 text-xl font-bold">${Math.round(totalIncomeNeeded).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Production Goals */}
            <div className="border p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-center">Production Goals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500">GCI Needed</p>
                        <p className="font-bold text-xl">${Math.round(calculatedTargets.gciRequired).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Sales Volume</p>
                        <p className="font-bold text-xl">${Math.round(calculatedTargets.totalVolume).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Buyer Deals</p>
                        <p className="font-bold text-xl">{calculatedTargets.buyerDeals}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Listing Deals</p>
                        <p className="font-bold text-xl">{calculatedTargets.listingDeals}</p>
                    </div>
                </div>
            </div>

            {/* Activity Goals */}
            <div className="border p-6 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-lg mb-4 text-center">Activity Goals (Annual)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-700">Conversations</p>
                        <p className="font-bold text-2xl text-blue-900">{calculatedTargets.totalConversations}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-700">Appointments</p>
                        <p className="font-bold text-2xl text-blue-900">{calculatedTargets.totalAppointments}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-700">Agreements</p>
                        <p className="font-bold text-2xl text-blue-900">{calculatedTargets.totalAgreements}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-700">Contracts</p>
                        <p className="font-bold text-2xl text-blue-900">{calculatedTargets.totalContracts}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
