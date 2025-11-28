import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function DailyBriefCard({ user, brief, pgicData, goalProgress, tasksCount }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const MetricBox = ({ label, value, change, trend }) =>
  <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 flex flex-col items-center justify-center min-w-[100px] shadow-sm">
            <div className="text-2xl font-bold text-[#4C1D95]">{value}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
            <div className={`flex items-center text-xs font-medium ${
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}`
    }>
                {trend === 'up' && <ArrowUp className="w-3 h-3 mr-0.5" />}
                {trend === 'down' && <ArrowDown className="w-3 h-3 mr-0.5" />}
                {trend === 'flat' && <Minus className="w-3 h-3 mr-0.5" />}
                {change}
            </div>
        </div>;


  // Safe defaults
  const pulseScore = pgicData?.pulse || 0;
  const ganeScore = pgicData?.gane || 0;
  const moroScore = pgicData?.moro || 0;

  // Calculate changes from trend data
  const formatChange = (val) => {
    const num = parseFloat(val) || 0;
    return num > 0 ? `+${num}` : `${num}`;
  };

  const getTrendDirection = (val) => {
    const num = parseFloat(val) || 0;
    if (num > 0) return 'up';
    if (num < 0) return 'down';
    return 'flat';
  };

  const pulseChange = formatChange(pgicData?.trend?.pulse);
  const ganeChange = formatChange(pgicData?.trend?.gane);
  const moroChange = formatChange(pgicData?.trend?.moro);

  const pulseTrend = getTrendDirection(pgicData?.trend?.pulse);
  const ganeTrend = getTrendDirection(pgicData?.trend?.gane);
  const moroTrend = getTrendDirection(pgicData?.trend?.moro);

  const firstName = user?.first_name || user?.firstName || user?.full_name?.split(' ')[0] || 'Agent';

  return (
    <div className="w-full rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#a57de4] p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-4 max-w-2xl">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                            {getGreeting()}, {firstName}! 👋
                        </h1>
                        {brief?.focusTheme &&
            <div className="flex items-center gap-2 text-indigo-100 font-medium">
                                <span className="uppercase tracking-wide text-xs font-bold opacity-80">Today's Focus</span>
                            </div>
            }
                    </div>

                    <div className="space-y-2">
                        <p className="text-white text-sm font-normal leading-relaxed">
                            {brief?.focusTheme || "Accelerate lead generation while nurturing your database"}
                        </p>
                        
                        {goalProgress &&
            <div className="inline-block bg-black/20 rounded-lg p-3 border border-white/10">
                                <p className="text-sm sm:text-base">
                                    <span className="text-yellow-300 text-sm font-medium">💪 You're {goalProgress.percent}% to your ${goalProgress.target?.toLocaleString()} goal.</span>
                                    <span className="text-indigo-100 ml-1 text-sm">
                                        {goalProgress.percent < 50 ? "Let's accelerate!" : "Keep the momentum!"}
                                    </span>
                                </p>
                            </div>
            }
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
                    <MetricBox label="PULSE" value={pulseScore} change={pulseChange} trend={pulseTrend} />
                    <MetricBox label="GANE" value={ganeScore} change={ganeChange} trend={ganeTrend} />
                    <MetricBox label="MORO" value={moroScore} change={moroChange} trend={moroTrend} />
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex flex-col items-center justify-center min-w-[100px] border border-white/20">
                        <div className="text-2xl font-bold text-white">{tasksCount !== undefined ? tasksCount : brief?.tasksGenerated || 0}</div>
                        <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Tasks</div>
                        <div className="text-xs font-medium text-indigo-100">Today</div>
                    </div>
                </div>
            </div>
        </div>);

}