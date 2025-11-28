import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ChevronDown, ChevronUp, BarChart, Info, MoreHorizontal, Play, SkipForward, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function PriorityTaskCard({ task, onComplete, onSnooze, onSkip, onHelp, isExpanded = true, toggleExpand, isPremiumUser = false }) {
  const PREMIUM_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/296c6f901_image.png";
  const [internalExpanded, setInternalExpanded] = useState(isExpanded);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const isActuallyExpanded = toggleExpand ? isExpanded : internalExpanded;
  const handleToggle = toggleExpand || (() => setInternalExpanded(!internalExpanded));

  const toggleStep = (index) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(index)) newSet.delete(index);else
    newSet.add(index);
    setCompletedSteps(newSet);
  };

  const isHighPriority = task.priority === 'high';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4 hover:shadow-md transition-shadow group">

            {/* Header - Click to expand/collapse */}
            <div
        onClick={handleToggle}
        className="p-5 sm:p-6 cursor-pointer border-b border-transparent hover:bg-gray-50/50 transition-colors relative">

                {/* Mobile/Desktop Layout */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-3">
                            {isHighPriority ?
              <Badge className="bg-[#F97316] hover:bg-[#EA580C] text-white border-none font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="text-xs">⚡ HIGH PRIORITY</span>
                                </Badge> :

              <Badge variant="secondary" className="inline-flex items-center border transition-colors focus:outline-none focus:ring-0 border-border bg-blue-700 text-blue-100 hover:bg-blue-200 border-none font-bold px-2.5 py-0.5 rounded-full">
                                    <span className="text-xs font-light">MEDIUM PRIORITY</span>
                                </Badge>
              }
                            
                            <span className="text-gray-400 text-xs font-medium flex items-center">
                                • {formatCategory(task.category)}
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight group-hover:text-[#8B5CF6] transition-colors">
                            {task.title}
                        </h3>

                        {/* Collapsed Summary (Only visible when collapsed) */}
                        {!isActuallyExpanded &&
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                <span className="flex items-center font-medium text-green-600">
                                    <BarChart className="w-4 h-4 mr-1.5" />
                                    {task.successProbability || 80}% success based on your profile
                                </span>
                                <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1.5" />
                                    {task.estimatedDurationMinutes || 30} min
                                </span>
                            </div>
            }
                    </div>

                    {/* Quick Actions (Top Right) */}
                    <div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                                <div className="flex flex-col gap-1 text-sm">
                                    <button className="text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2" onClick={() => onSnooze(task)}>
                                        <Clock className="w-4 h-4" /> Snooze
                                    </button>
                                    <button className="text-left px-3 py-2 hover:bg-gray-100 rounded text-red-600 flex items-center gap-2" onClick={() => onSkip(task)}>
                                        <span className="text-xs">✕</span> Skip Task
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isActuallyExpanded &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-t border-gray-100">

                        <div className="p-5 sm:p-6 bg-white space-y-6">
                            
                            {/* Key Stats */}
                            <div className="flex flex-wrap gap-4 sm:gap-8 pb-4 border-b border-gray-100">
                                <div className="flex items-center text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-lg text-sm">
                                    <BarChart className="w-4 h-4 mr-2" />
                                    {task.successProbability || 80}% success rate
                                </div>
                                <div className="flex items-center text-gray-600 text-sm font-medium">
                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                    {task.estimatedDurationMinutes || 30} minutes
                                </div>
                            </div>

                            {/* Expected Results */}
                            <div className="bg-[#F3F4F6] p-4 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    Expected Results
                                </h4>
                                <p className="text-gray-700 text-sm font-medium">
                                    {task.expectedOutcome || "Generate 8-12 new leads and secure appointments within 2 weeks."}
                                </p>
                            </div>

                            {/* Reasoning Box */}
                            <div className="bg-violet-50 p-5 rounded-xl border border-gray-100/50 relative">
                                <div className="absolute top-5 left-5">
                                    <Info className="w-5 h-5 text-[#8B5CF6]" />
                                </div>
                                <div className="pl-8">
                                    <h4 className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider mb-2">
                                        Why This Task Now
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {task.aiReasoning || "Based on your current goals and market conditions, this is the highest leverage activity you can do today."}
                                    </p>
                                </div>
                            </div>

                            {/* Steps */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
                                            {completedSteps.size}/{task.steps?.length || 0}
                                        </span>
                                        Step-by-Step
                                    </h4>
                                    <div className="w-32">
                                        <Progress value={completedSteps.size / (task.steps?.length || 1) * 100} className="h-2" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {task.steps?.map((step, idx) =>
                <div key={idx} className={cn(
                  "flex gap-3 p-3 rounded-lg border transition-all group/step",
                  completedSteps.has(idx) ? "bg-gray-50 border-transparent opacity-60" : "bg-white border-gray-200 hover:border-[#8B5CF6]/30 hover:shadow-sm"
                )}>
                                            <Checkbox
                    checked={completedSteps.has(idx)}
                    onCheckedChange={() => toggleStep(idx)}
                    className="mt-1 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />

                                            <div className="flex-1">
                                                <p className={cn("text-sm font-medium text-gray-900", completedSteps.has(idx) && "line-through text-gray-500")}>
                                                    {step.action}
                                                </p>
                                                {step.instruction &&
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.instruction}</p>
                    }
                                                
                                                {/* Step Actions */}
                                                {step.action.includes("Video") &&
                    <div className="flex gap-2 mt-2">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-gray-200 text-gray-600">
                                                            <Play className="w-3 h-3" /> Watch Example
                                                        </Button>
                                                    </div>
                    }
                                            </div>
                                        </div>
                )}
                                </div>
                            </div>

                            {/* Footer / CTAs */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-100 items-center justify-between">
                                {task.status !== 'completed' ?
              <Button
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold h-11 rounded-lg shadow-sm shadow-indigo-200 px-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task);
                }}>

                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Mark Complete
                                    </Button> :

              <div className="flex items-center text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Completed
                                    </div>
              }
                                
                                <div className="flex gap-4 sm:gap-6 text-sm font-medium text-gray-500">
                                    <button
                  className="hover:text-gray-900 transition-colors flex items-center gap-1"
                  onClick={(e) => {e.stopPropagation();onSnooze(task);}}>

                                        <Clock className="w-4 h-4" /> Snooze
                                    </button>
                                    <button
                  className="hover:text-gray-900 transition-colors flex items-center gap-1"
                  onClick={(e) => {e.stopPropagation();onSkip(task);}}>

                                        <SkipForward className="w-4 h-4" /> Skip & Replace
                                    </button>
                                    <button
                  className="hover:text-gray-900 transition-colors flex items-center gap-1"
                  onClick={(e) => {e.stopPropagation();onHelp && onHelp(task);}}>

                                        <HelpCircle className="w-4 h-4" /> Need Help?
                                        {!isPremiumUser && (
                                          <img 
                                            src={PREMIUM_ICON_URL} 
                                            alt="Premium" 
                                            className="w-3.5 h-3.5 object-contain ml-0.5" 
                                          />
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
        }
            </AnimatePresence>

            {/* Expand Toggle Indicator (Visual Only) */}
            {!isActuallyExpanded &&
      <div className="h-1 bg-gray-50 group-hover:bg-[#e3e3e3]/10 transition-colors" />
      }
        </motion.div>);

}

function formatCategory(cat) {
  if (!cat) return "General";
  return cat.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}