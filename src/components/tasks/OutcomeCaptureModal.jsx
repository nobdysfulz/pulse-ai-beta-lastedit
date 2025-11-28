import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider"; // Assume standard slider
import { PartyPopper, Frown, Meh, Smile } from "lucide-react"; // Corrected import
import { cn } from "@/components/lib/utils";

// Simple Slider if not in ui
const SimpleSlider = ({ value, onValueChange, max, step }) => (
    <input 
        type="range" 
        min="0" 
        max={max} 
        step={step} 
        value={value[0]} 
        onChange={(e) => onValueChange([parseInt(e.target.value)])} 
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
);

export default function OutcomeCaptureModal({ isOpen, onClose, task, onSubmit }) {
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(null);
    const [leads, setLeads] = useState([0]);
    const [appointments, setAppointments] = useState([0]);
    const [notes, setNotes] = useState("");

    const handleSubmit = () => {
        onSubmit({
            rating,
            leadsGenerated: leads[0],
            appointmentsSet: appointments[0],
            notes
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                        <PartyPopper className="w-8 h-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Great work! How did it go?</DialogTitle>
                    <p className="text-center text-slate-500">This helps us improve future tasks for you.</p>
                </DialogHeader>

                {step === 1 ? (
                    <div className="grid grid-cols-3 gap-4 py-4">
                        <RatingButton 
                            icon={Smile} 
                            label="Worked Great!" 
                            active={rating === 'great'} 
                            onClick={() => { setRating('great'); setStep(2); }}
                            color="text-green-600"
                        />
                        <RatingButton 
                            icon={Meh} 
                            label="It Was Okay" 
                            active={rating === 'okay'} 
                            onClick={() => { setRating('okay'); setStep(2); }}
                            color="text-yellow-600"
                        />
                        <RatingButton 
                            icon={Frown} 
                            label="Didn't Work" 
                            active={rating === 'bad'} 
                            onClick={() => { setRating('bad'); handleSubmit(); }} // Skip details for bad
                            color="text-red-600"
                        />
                    </div>
                ) : (
                    <div className="space-y-6 py-2">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label>How many leads did you generate?</Label>
                                <span className="font-bold text-indigo-600">{leads[0]}</span>
                            </div>
                            <SimpleSlider value={leads} onValueChange={setLeads} max={20} step={1} />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label>Set any appointments?</Label>
                                <span className="font-bold text-indigo-600">{appointments[0]}</span>
                            </div>
                            <SimpleSlider value={appointments} onValueChange={setAppointments} max={10} step={1} />
                        </div>

                        <div className="space-y-2">
                            <Label>Any notes? (Optional)</Label>
                            <Textarea 
                                placeholder="E.g. The script worked really well..." 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="sm:justify-between">
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="ghost" onClick={onClose}>Skip</Button>
                        {step === 2 && (
                            <Button onClick={handleSubmit} className="bg-indigo-600">Done</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RatingButton({ icon: Icon, label, active, onClick, color }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:bg-slate-50",
                active ? `border-current ${color} bg-${color.split('-')[1]}-50` : "border-slate-100 text-slate-600"
            )}
        >
            <Icon className={cn("w-8 h-8", active ? color : "text-slate-400")} />
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
}