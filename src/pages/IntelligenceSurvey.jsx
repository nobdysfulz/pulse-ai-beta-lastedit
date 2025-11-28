import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { AgentIntelligenceProfile } from "@/api/entities";
import { UserOnboarding } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function IntelligenceSurvey({ onComplete }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    experienceLevel: "",
    workCommitment: "",
    businessStructure: "",
    workSchedule: "",
    databaseSize: "",
    sphereWarmth: "",
    previousYearTransactions: 0,
    previousYearVolume: 0,
    averagePricePoint: 0,
    businessConsistency: "",
    biggestChallenges: [],
    growthGoal: "",
    learningPreference: ""
  });

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const profiles = await AgentIntelligenceProfile.filter({ userId: user.id });
      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setFormData({
          experienceLevel: profile.experienceLevel || "",
          workCommitment: profile.workCommitment || "",
          businessStructure: profile.businessStructure || "",
          workSchedule: profile.workSchedule || "",
          databaseSize: profile.databaseSize || "",
          sphereWarmth: profile.sphereWarmth || "",
          previousYearTransactions: profile.previousYearTransactions || 0,
          previousYearVolume: profile.previousYearVolume || 0,
          averagePricePoint: profile.averagePricePoint || 0,
          businessConsistency: profile.businessConsistency || "",
          biggestChallenges: profile.biggestChallenges || [],
          growthGoal: profile.growthTimeline || "",
          learningPreference: profile.learningPreference || ""
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      if (!user) {
        toast.error("User not found");
        return;
      }

      const existingProfiles = await AgentIntelligenceProfile.filter({ userId: user.id });
      const existingProfile = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null;

      const profileData = {
        userId: user.id,
        experienceLevel: formData.experienceLevel,
        workCommitment: formData.workCommitment,
        businessStructure: formData.businessStructure,
        workSchedule: formData.workSchedule,
        databaseSize: formData.databaseSize,
        sphereWarmth: formData.sphereWarmth,
        previousYearTransactions: formData.previousYearTransactions,
        previousYearVolume: formData.previousYearVolume,
        averagePricePoint: formData.averagePricePoint,
        businessConsistency: formData.businessConsistency,
        biggestChallenges: formData.biggestChallenges,
        growthTimeline: formData.growthGoal,
        learningPreference: formData.learningPreference,
        surveyCompletedAt: new Date().toISOString()
      };

      if (existingProfile) {
        await AgentIntelligenceProfile.update(existingProfile.id, profileData);
      } else {
        await AgentIntelligenceProfile.create(profileData);
      }

      const onboarding = await UserOnboarding.filter({ userId: user.id });
      if (onboarding && onboarding.length > 0) {
        const currentSteps = onboarding[0].completedSteps || [];
        await UserOnboarding.update(onboarding[0].id, {
          agentIntelligenceCompleted: true,
          agentIntelligenceCompletionDate: new Date().toISOString(),
          completedSteps: [...new Set([...currentSteps, 'agent-intelligence'])]
        });
      } else {
        await UserOnboarding.create({
          userId: user.id,
          agentIntelligenceCompleted: true,
          agentIntelligenceCompletionDate: new Date().toISOString(),
          completedSteps: ['agent-intelligence']
        });
      }

      toast.success("Intelligence profile saved successfully!");
      if (onComplete) {
        onComplete();
      } else {
        setTimeout(() => {
          window.location.href = '/Dashboard';
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving intelligence profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChallengeToggle = (challenge) => {
    setFormData((prev) => ({
      ...prev,
      biggestChallenges: prev.biggestChallenges.includes(challenge) ?
      prev.biggestChallenges.filter((c) => c !== challenge) :
      [...prev.biggestChallenges, challenge]
    }));
  };

  const tabs = [
  { id: 0, label: "Agent Profile" },
  { id: 1, label: "Network Assessment" },
  { id: 2, label: "Performance History" },
  { id: 3, label: "Challenges & Goals" }];


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-slate-900 mb-2 text-xl font-bold">PULSE Intelligence Assessment</h1>
          <p className="text-slate-600 text-sm">Help us understand your business to provide personalized AI insights.</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between mb-8 border-b pb-4">
            {tabs.map((tab) =>
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              currentTab === tab.id ?
              "text-purple-600 border-b-2 border-purple-600" :
              "text-slate-500 hover:text-slate-700"}`
              }>

                {tab.label}
              </button>
            )}
          </div>

          {currentTab === 0 &&
          <div className="space-y-6">
              <h2 className="text-slate-900 mb-4 text-lg font-semibold">Agent Profile</h2>
              
              <div>
                <Label>Experience Level *</Label>
                <Select value={formData.experienceLevel} onValueChange={(val) => setFormData({ ...formData, experienceLevel: val })}>
                  <SelectTrigger><SelectValue placeholder="Select experience level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rookie">Rookie (0-2 years)</SelectItem>
                    <SelectItem value="developing">Developing (3-5 years)</SelectItem>
                    <SelectItem value="experienced">Experienced (6-10 years)</SelectItem>
                    <SelectItem value="veteran">Veteran (11-15 years)</SelectItem>
                    <SelectItem value="master">Master (16+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Work Commitment *</Label>
                <Select value={formData.workCommitment} onValueChange={(val) => setFormData({ ...formData, workCommitment: val })}>
                  <SelectTrigger><SelectValue placeholder="Select work commitment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="full_time_plus">Full-time+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Business Structure *</Label>
                <Select value={formData.businessStructure} onValueChange={(val) => setFormData({ ...formData, businessStructure: val })}>
                  <SelectTrigger><SelectValue placeholder="Select business structure" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo Agent</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Work Schedule *</Label>
                <Select value={formData.workSchedule} onValueChange={(val) => setFormData({ ...formData, workSchedule: val })}>
                  <SelectTrigger><SelectValue placeholder="Select work schedule" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible</SelectItem>
                    <SelectItem value="fixed">Fixed Schedule</SelectItem>
                    <SelectItem value="weekend_focused">Weekend Focused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }

          {currentTab === 1 &&
          <div className="space-y-6">
              <h2 className="text-slate-900 mb-4 text-lg font-semibold">Network Assessment</h2>

              <div>
                <Label>Database Size *</Label>
                <Select value={formData.databaseSize} onValueChange={(val) => setFormData({ ...formData, databaseSize: val })}>
                  <SelectTrigger><SelectValue placeholder="Select database size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-100">0-100 contacts</SelectItem>
                    <SelectItem value="101-250">101-250 contacts</SelectItem>
                    <SelectItem value="251-500">251-500 contacts</SelectItem>
                    <SelectItem value="501-1000">501-1,000 contacts</SelectItem>
                    <SelectItem value="1000+">1,000+ contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sphere Warmth *</Label>
                <Select value={formData.sphereWarmth} onValueChange={(val) => setFormData({ ...formData, sphereWarmth: val })}>
                  <SelectTrigger><SelectValue placeholder="Select sphere warmth" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold (mostly leads)</SelectItem>
                    <SelectItem value="warm">Warm (mix of leads & relationships)</SelectItem>
                    <SelectItem value="hot">Hot (mostly relationships)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }

          {currentTab === 2 &&
          <div className="space-y-6">
              <h2 className="text-slate-900 mb-4 text-lg font-semibold">Performance History</h2>

              <div>
                <Label>Previous Year Transactions</Label>
                <Input
                type="number"
                value={formData.previousYearTransactions}
                onChange={(e) => setFormData({ ...formData, previousYearTransactions: parseInt(e.target.value) || 0 })}
                placeholder="Number of closings last year" />

              </div>

              <div>
                <Label>Previous Year Volume</Label>
                <Input
                type="number"
                value={formData.previousYearVolume}
                onChange={(e) => setFormData({ ...formData, previousYearVolume: parseInt(e.target.value) || 0 })}
                placeholder="Total sales volume last year" />

              </div>

              <div>
                <Label>Average Price Point</Label>
                <Input
                type="number"
                value={formData.averagePricePoint}
                onChange={(e) => setFormData({ ...formData, averagePricePoint: parseInt(e.target.value) || 0 })}
                placeholder="Average sale price" />

              </div>
            </div>
          }

          {currentTab === 3 &&
          <div className="space-y-6">
              <h2 className="text-slate-900 mb-4 text-lg font-semibold">Challenges & Goals</h2>

              <div>
                <Label>What are your biggest current challenges? (Select up to 3)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                "Consistent lead generation",
                "Time management & organization",
                "Converting leads to clients",
                "Market knowledge & expertise",
                "Technology & systems",
                "Marketing & personal branding"].
                map((challenge) =>
                <button
                  key={challenge}
                  onClick={() => handleChallengeToggle(challenge)}
                  disabled={!formData.biggestChallenges.includes(challenge) && formData.biggestChallenges.length >= 3}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.biggestChallenges.includes(challenge) ?
                  "border-purple-600 bg-purple-50 text-purple-900" :
                  "border-slate-200 hover:border-slate-300"} ${

                  !formData.biggestChallenges.includes(challenge) && formData.biggestChallenges.length >= 3 ?
                  "opacity-50 cursor-not-allowed" :
                  ""}`
                  }>

                      {challenge}
                    </button>
                )}
                </div>
              </div>

              <div>
                <Label>What is your primary growth goal for the next 12 months?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                "Double my production",
                "Hire my first assistant",
                "Start building a team",
                "Systematize my current business",
                "Increase profitability/net income"].
                map((goal) =>
                <button
                  key={goal}
                  onClick={() => setFormData({ ...formData, growthGoal: goal })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.growthGoal === goal ?
                  "border-green-600 bg-green-50 text-green-900" :
                  "border-slate-200 hover:border-slate-300"}`
                  }>

                      {goal}
                    </button>
                )}
                </div>
              </div>

              <div>
                <Label>How do you prefer to learn and improve?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                "Watching videos/webinars",
                "Reading books/articles",
                "One-on-one coaching/mentorship",
                "Learning by doing/trial-and-error",
                "Group masterminds/discussion"].
                map((pref) =>
                <button
                  key={pref}
                  onClick={() => setFormData({ ...formData, learningPreference: pref })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.learningPreference === pref ?
                  "border-green-600 bg-green-50 text-green-900" :
                  "border-slate-200 hover:border-slate-300"}`
                  }>

                      {pref}
                    </button>
                )}
                </div>
              </div>

              <div>
                <Label>Business Consistency</Label>
                <Select value={formData.businessConsistency} onValueChange={(val) => setFormData({ ...formData, businessConsistency: val })}>
                  <SelectTrigger><SelectValue placeholder="How consistent is your business?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_consistent">Very Consistent</SelectItem>
                    <SelectItem value="somewhat_consistent">Somewhat Consistent</SelectItem>
                    <SelectItem value="inconsistent">Inconsistent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentTab(Math.max(0, currentTab - 1))}
              disabled={currentTab === 0}>

              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentTab < tabs.length - 1 ?
            <Button onClick={() => setCurrentTab(currentTab + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button> :

            <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Assessment
              </Button>
            }
          </div>
        </div>
      </div>
    </div>);

}