import React, { useState } from 'react';
import { cn } from '@/components/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContextualSidebar({ title, children, className }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if title contains "Copilot" to change the display text
  const showCopilotText = title?.toLowerCase().includes('copilot');

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed right-0 top-1/2 transform -translate-y-1/2 z-40">
        <Button 
          variant="outline" 
          size="icon"
          className="rounded-l-md rounded-r-none bg-white shadow-md border-r-0 h-12 w-8"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "w-[85vw] sm:w-[420px] bg-white border-l border-[#E2E8F0] flex flex-col h-full",
        "fixed lg:static inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out transform",
        isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0",
        className
      )}>
        <div className="bg-neutral-700 pt-3 pr-6 pb-3 pl-6 border-b border-[#E2E8F0] flex-shrink-0 flex justify-between items-center">
          <h3 className="text-[#f0f0f0] text-sm font-medium flex items-center gap-2">
            {showCopilotText ? 'PULSE ai' : title}
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-white hover:bg-white/10 h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </aside>
    </>
  );
}