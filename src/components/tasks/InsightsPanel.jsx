import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InsightsPanel({ stats, goalProgress }) {
  return (
    <Card className="bg-white border-none shadow-default rounded-xl overflow-hidden sticky top-6">
            <div className="p-5 pb-2">
                <h3 className="text-gray-950 text-base font-bold uppercase tracking-wider">YOUR TASK INSIGHTS</h3>
            </div>
            
            <CardContent className="p-0 pb-6 space-y-6">
                {/* Gradient Banner */}
                <div className="mx-5 mt-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#2DD4BF] p-5 text-white shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-4xl font-bold">
                                {stats.completed}/{stats.total}
                            </span>
                            <span className="text-sm font-medium text-white/90">tasks done</span>
                        </div>
                        
                        <Progress 
                            value={stats.percent} 
                            className="h-1.5 bg-white/30 mb-3" 
                            indicatorClassName="bg-white" 
                        />

                        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                            <TrendingUp className="w-4 h-4" />
                            <span>{stats.percent}% completion rate</span>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-6">
                    {/* Time Invested */}
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Time Invested</p>
                            <p className="text-xl font-bold text-gray-900">{Math.round(stats.timeInvested || 0)} min</p>
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Success Rate</p>
                            <p className="text-xl font-bold text-gray-900">85%</p>
                            <p className="text-xs text-gray-400">Tasks marked "Worked"</p>
                        </div>
                    </div>

                    {/* Button */}
                    <div className="pt-2">
                        <Link
                            to="/intelligence"
                            className="flex items-center justify-center w-full py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg group">
                            View Full Analytics
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
  );
}