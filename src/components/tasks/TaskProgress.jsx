import React from 'react';
import { Progress } from "@/components/ui/progress";

export default function TaskProgress({ completed, total, remainingMinutes }) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-4 shadow-sm">
            <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-700">Today's Progress</span>
                    <span className="text-slate-500">{completed} of {total} tasks ({percent}%)</span>
                </div>
                <Progress value={percent} className="h-2.5" indicatorClassName="bg-gradient-to-r from-violet-500 to-indigo-600" />
            </div>
            <div className="text-right pl-4 border-l border-slate-100">
                <div className="text-xs text-slate-400 uppercase font-medium">Remaining</div>
                <div className="text-lg font-bold text-slate-700">{remainingMinutes || 0} min</div>
            </div>
        </div>
    );
}