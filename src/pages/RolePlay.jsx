import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../components/context/UserContext';
import { RolePlayScenario, RolePlaySessionLog, RolePlayUserProgress, ObjectionScript, RolePlayAnalysisReport } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import ContextualSidebar from '../components/layout/ContextualSidebar';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import useCredits from '@/components/credits/useCredits';
import { base44 } from '@/api/base44Client';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { jsPDF } from 'jspdf';
import CustomScenarioModal from '../components/roleplay/CustomScenarioModal';

// --- RIGHT SIDEBAR COMPONENTS ---

// Sidebar for Active Script Display
const ScriptDisplaySidebar = ({ scenario, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handlePrint = () => {
    if (typeof window === 'undefined') {
      toast.error('Printing is not available in this environment.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the script');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${scenario.name} - Script</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #7C3AED; padding-bottom: 10px; }
            .logo { width: 120px; height: auto; }
            h1 { color: #1E293B; margin: 0; font-size: 28px; }
            h2 { color: #475569; margin-top: 20px; font-size: 18px; }
            p { white-space: pre-wrap; color: #1E293B; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${scenario.name}</h1>
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/c8406aefd_PWRULogoBlack.png" alt="PWRU Logo" class="logo" />
          </div>
          <h2>Role-Play Script</h2>
          <p>${scenario.script}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = async () => {
    try {
      toast.info('Generating PDF...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

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

      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.setTextColor('#1E293B');
      doc.text(scenario.name, 20, 20);

      doc.setDrawColor('#7C3AED');
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);

      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      doc.setTextColor('#475569');
      doc.text('Role-Play Script', 20, 35);

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor('#1E293B');

      const pageWidth = 170;
      const lines = doc.splitTextToSize(scenario.script, pageWidth);

      let yPosition = 45;
      const lineHeight = 7;
      const pageHeight = 280;

      lines.forEach((line) => {
        if (yPosition + lineHeight > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(line, 20, yPosition);
        yPosition += lineHeight;
      });

      doc.save(`${scenario.name.replace(/\s+/g, '_')}_script.pdf`);
      toast.success('Script downloaded as PDF');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (!scenario.script) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Script Available</h3>
        <p className="text-sm text-muted-foreground">This role-play scenario doesn't have a script yet.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Script</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            title="Print Script"
            className="h-8 w-8"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download Script as PDF"
            className="h-8 w-8"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
            title={isVisible ? "Hide Script" : "Show Script"}
            className="h-8 w-8"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isVisible ? (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-[hsl(var(--status-info))]/10 border border-[hsl(var(--status-info))]/20 rounded-lg p-4 mb-4">
            <p className="text-xs text-[hsl(var(--status-info))] font-medium">
              Use this script as a guide during your role-play session
            </p>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{scenario.script}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Eye className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">Script hidden</p>
            <p className="text-xs mt-1">Click the eye icon to show</p>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          End Session & Return
        </Button>
      </div>
    </div>
  );
};

// Sidebar for Searching All Scenarios
const ScenarioSearchSidebar = ({ scenarios, onStartScenario }) => {
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');

  const filtered = scenarios.filter((s) =>
    (category === 'all' || s.category === category) &&
    (difficulty === 'all' || s.difficultyLevel === difficulty)
  );

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Filter</h4>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary text-xs text-muted-foreground"
          >
            <option value="all">All Categories</option>
            <option value="price_objections">Price</option>
            <option value="timing_concerns">Timing</option>
            <option value="agent_selection">Agent</option>
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary text-xs text-muted-foreground"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Results</h4>
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
              <div className="flex items-center gap-3">
                <img src={s.avatarImageUrl} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.difficultyLevel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {s.isPremium && (
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/1a5d0b2f1_pulseaiupgradeicon.png" 
                    alt="Premium" 
                    className="w-4 h-4"
                  />
                )}
                <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => onStartScenario(s)}>
                  <Play className="w-4 h-4 text-primary" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sidebar for Viewing Session Results
const SessionResultsSidebar = ({ sessionLog, onDelete }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        console.log('[SessionResults] Loading details for session:', sessionLog.id);

        const [analysisData, scenarioData] = await Promise.all([
          base44.entities.RolePlayAnalysisReport.filter({ sessionId: sessionLog.id }),
          base44.entities.RolePlayScenario.get(sessionLog.scenarioId)
        ]);

        console.log('[SessionResults] Analysis data:', analysisData);
        console.log('[SessionResults] Scenario data:', scenarioData);

        setAnalysis(analysisData?.[0] || null);
        setScenario(scenarioData || null);

        if (sessionLog.recordingUrl) {
          setAudioLoading(true);
          try {
            console.log('[SessionResults] Loading audio from:', sessionLog.recordingUrl);
            const { data } = await base44.functions.invoke('getSignedAudioUrl', { file_uri: sessionLog.recordingUrl });
            console.log('[SessionResults] Audio URL received:', data?.signed_url);
            setAudioUrl(data.signed_url);
          } catch (audioError) {
            console.error("[SessionResults] Failed to get signed audio URL", audioError);
            toast.error("Could not load audio recording.");
          } finally {
            setAudioLoading(false);
          }
        }
      } catch (error) {
        console.error("[SessionResults] Error loading session details", error);
        toast.error("Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [sessionLog]);

  const transcript = sessionLog.rawTranscript ? JSON.parse(sessionLog.rawTranscript) : [];

  const downloadTranscript = () => {
    if (transcript.length === 0) {
      toast.error("No transcript available to download.");
      return;
    }

    if (typeof document === 'undefined' || typeof window === 'undefined') {
      toast.error("Download not available in this environment.");
      return;
    }

    try {
      let transcriptText = `Role-Play Session Transcript\n`;
      transcriptText += `Scenario: ${scenario?.name || 'Unknown'}\n`;
      transcriptText += `Date: ${sessionLog.startTime ? format(new Date(sessionLog.startTime), 'MMM d, yyyy h:mm a') : 'N/A'}\n\n`;
      transcriptText += `${'='.repeat(50)}\n\n`;

      transcript.forEach((turn) => {
        const speaker = turn.role === 'agent' ? 'Client' : 'You';
        transcriptText += `${speaker}: ${turn.message}\n\n`;
      });

      const blob = new Blob([transcriptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      if (!a || !document.body) {
        throw new Error('Unable to create download link');
      }
      
      a.href = url;
      a.download = `roleplay-transcript-${sessionLog.id}.txt`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 100);

      toast.success('Transcript downloaded');
    } catch (error) {
      console.error('Error downloading transcript:', error);
      toast.error('Failed to download transcript.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingIndicator size="sm" /></div>;
  }

  return (
    <div className="py-4 px-6 space-y-6">
      {scenario && (
        <div className="flex flex-col items-center text-center">
          <img src={scenario.avatarImageUrl} alt={scenario.name} className="w-20 h-20 rounded-full object-cover mb-3" />
          <h4 className="text-foreground text-base font-semibold">{scenario.name}</h4>
          <p className="text-muted-foreground text-xs">{format(new Date(sessionLog.startTime), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
      )}

      {audioUrl && (
        <Card>
          <CardContent className="p-4">
            <h5 className="mb-2 text-sm font-semibold">Call Recording</h5>
            {audioLoading ? <LoadingIndicator size="sm" /> : <audio controls className="w-full h-10" src={audioUrl}></audio>}
          </CardContent>
        </Card>
      )}

      {analysis ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h5 className="text-base font-bold">Performance Analysis</h5>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Overall Result</span>
              <Badge
                variant={analysis.overall_pass_fail === 'PASS' ? 'default' : 'destructive'}
                className={analysis.overall_pass_fail === 'PASS' ? 'bg-green-500' : 'bg-red-500'}
              >
                {analysis.overall_pass_fail}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-3">
              <h6 className="text-foreground text-sm font-semibold">Criteria Evaluation</h6>
              {analysis.active_listening_feedback && (
                <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                  <strong>Active Listening:</strong> {analysis.active_listening_feedback}
                </p>
              )}
              {analysis.validating_feelings_feedback && (
                <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                  <strong>Validating Feelings:</strong> {analysis.validating_feelings_feedback}
                </p>
              )}
              {analysis.voice_sentiment && (
                <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                  <strong>Voice Sentiment:</strong> {analysis.voice_sentiment}
                </p>
              )}
              {analysis.objections_given && (
                <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                  <strong>Objections Given:</strong> {analysis.objections_given}
                </p>
              )}
              {analysis.objections_overcame && (
                <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                  <strong>Objections Analysis:</strong> {analysis.objections_overcame}
                </p>
              )}
              {analysis.call_summary && (
                <>
                  <h6 className="text-foreground mt-2 text-sm font-semibold">Call Summary</h6>
                  <p className="bg-transparent text-muted-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">
                    {analysis.call_summary}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Analysis is being processed. Please refresh in a moment.
            </p>
          </CardContent>
        </Card>
      )}

      {transcript.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-base font-semibold">Conversation Transcript</h5>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={downloadTranscript}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3 text-xs">
              {transcript.map((turn, idx) => (
                <div key={idx} className={`p-2 rounded-md ${turn.role === 'agent' ? 'bg-muted' : 'bg-primary/10'}`}>
                  <p className="font-bold">{turn.role === 'agent' ? 'Client' : 'You'}</p>
                  <p className="bg-transparent text-foreground p-4 text-base rounded-lg prose prose-sm border border-primary/20 max-w-none">
                    {turn.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full text-[hsl(var(--status-error))] border-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error))]/10"
        onClick={() => onDelete(sessionLog.id)}
      >
        Delete Session
      </Button>
    </div>
  );
};

// Sidebar for Viewing Scripts
const ScriptsSidebar = () => {
  const [scripts, setScripts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const fetchScripts = async () => {
      const data = await ObjectionScript.filter({ isActive: true });
      setScripts(data || []);
    };
    fetchScripts();
  }, []);

  const filteredScripts = scripts.filter((script) => {
    const nameMatch = script.title.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = category === 'all' || script.category === category;
    return nameMatch && categoryMatch;
  });

  const categories = [...new Set(scripts.map((s) => s.category))];

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary text-xs text-muted-foreground"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary text-xs text-muted-foreground"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="capitalize">{cat.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filteredScripts.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {filteredScripts.map((script) => (
            <AccordionItem value={script.id} key={script.id}>
              <AccordionTrigger className="text-sm">{script.title}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold">Situation:</p>
                  <p className="bg-transparent text-foreground p-4 text-sm rounded-lg prose prose-sm border border-primary/20 max-w-none">{script.situation}</p>
                  <p className="font-semibold mt-2">Response:</p>
                  <p className="text-sm font-mono whitespace-pre-wrap">{script.response}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-sm text-center text-muted-foreground">No scripts match your search.</p>
      )}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function RolePlayPage() {
  const { user, loading: contextLoading } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);

  // Data States
  const [allScenarios, setAllScenarios] = useState([]);
  const [featuredScenarios, setFeaturedScenarios] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [userProgress, setUserProgress] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState('search');
  const [selectedSessionLog, setSelectedSessionLog] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10;
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customBaseScenario, setCustomBaseScenario] = useState(null);

  const navigate = useNavigate();
  const { deductCredits, hasSufficientCredits } = useCredits();

  const tabs = [
    { id: 'search', label: 'Search' },
    { id: 'results', label: 'Results' },
    { id: 'scripts', label: 'Script Stacks' }
  ];

  useEffect(() => {
    document.title = 'Skills Training - PULSE Intelligence';
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'Practice real estate objection handling with AI-powered role-play scenarios and improve your sales skills.';
  }, []);

  useEffect(() => {
    if (!contextLoading && user) {
      loadPageData();
    }
  }, [contextLoading, user]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      console.log('[RolePlay] Loading page data for user:', user?.id);

      const [scenariosData, progressData, logsData] = await Promise.all([
        base44.entities.RolePlayScenario.filter({ isActive: true }),
        // RolePlayUserProgress is not directly used for aggregate stats here, but kept in case it's used elsewhere
        base44.entities.RolePlayUserProgress.filter({ userId: user.id }), 
        base44.entities.RolePlaySessionLog.filter({ userId: user.id }, '-startTime')
      ]);

      console.log('[RolePlay] Loaded scenarios:', scenariosData?.length || 0);
      console.log('[RolePlay] Loaded session logs:', logsData?.length || 0);

      setAllScenarios(scenariosData || []);
      setFeaturedScenarios(scenariosData?.filter((s) => s.isPopular) || []);
      
      // Calculate accurate stats from completed session logs
      const completedSessions = logsData?.filter(log => log.status === 'completed') || [];
      const totalSessions = completedSessions.length;
      const totalTimeSeconds = completedSessions.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
      
      setUserProgress({
        total_sessions: totalSessions,
        total_time: totalTimeSeconds // Store in seconds
      });
      setSessionLogs(logsData || []);

    } catch (error) {
      console.error('[RolePlay] Error loading role-play data:', error);
      toast.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScenario = async (scenario) => {
    if (scenario.name === 'Create A Custom Scenario') {
      if (!user.phone) {
        toast.error("Please add your phone number in Settings > Profile to start a role-play call.");
        navigate(createPageUrl('Settings'));
        return;
      }

      // Stricter check: Block if NOT Subscriber AND NOT Admin
      // Handles cases where subscriptionTier might be undefined/null for new users
      const isPremiumUser = user.subscriptionTier === 'Subscriber' || user.subscriptionTier === 'Admin' || user.role === 'admin';

      if (scenario.isPremium && !isPremiumUser) {
        toast.error("This is a premium feature. Please upgrade to access custom scenarios.");
        navigate(createPageUrl('Plans'));
        return;
      }

      const creditsCost = 10;
      if (!hasSufficientCredits(creditsCost)) {
        toast.error("Insufficient credits to start a session.");
        return;
      }

      setCustomBaseScenario(scenario);
      setShowCustomModal(true);
      return;
    }

    if (!user.phone) {
      toast.error("Please add your phone number in Settings > Profile to start a role-play call.");
      navigate(createPageUrl('Settings'));
      return;
    }

    const isPremiumUser = user.subscriptionTier === 'Subscriber' || user.subscriptionTier === 'Admin' || user.role === 'admin';

    if (scenario.isPremium && !isPremiumUser) {
      toast.error("This is a premium scenario. Please upgrade to access premium role-play sessions.");
      navigate(createPageUrl('Plans'));
      return;
    }

    const creditsCost = 10;
    if (!hasSufficientCredits(creditsCost)) {
      toast.error("Insufficient credits to start a session.");
      return;
    }

    setIsInitiating(true);
    try {
      await deductCredits(creditsCost, "Role-Play", `Initiated: ${scenario.name}`);
      const { data, error } = await base44.functions.invoke('initElevenLabsRolePlaySession', {
        scenarioId: scenario.id
      });

      if (error) {
        throw new Error(error.details || "Failed to initiate session.");
      }

      setActiveScenario(scenario);
      setActiveTab('script_display');

      toast.success(data.message || "Call initiated! Please answer your phone to begin.");
      loadPageData();
    } catch (err) {
      console.error("Error starting scenario:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCustomScenarioSubmit = async (customData) => {
    setIsInitiating(true);
    try {
      await deductCredits(10, "Role-Play", "Initiated: Custom Scenario");
      const { data, error } = await base44.functions.invoke('initCustomRolePlaySession', customData);

      if (error) {
        throw new Error(error.details || "Failed to initiate custom session.");
      }

      toast.success(data.message || "Custom call initiated! Please answer your phone to begin.");
      setShowCustomModal(false);
      loadPageData();
    } catch (err) {
      console.error("Error starting custom scenario:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleEndSession = () => {
    setActiveScenario(null);
    setActiveTab('search');
    loadPageData();
  };

  const handleSessionLogClick = (log) => {
    setSelectedSessionLog(log);
    setActiveTab('results');
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session forever?')) return;
    try {
      await RolePlaySessionLog.delete(sessionId);
      const analysisToDelete = await RolePlayAnalysisReport.filter({ sessionId });
      if (analysisToDelete?.[0]) {
        await RolePlayAnalysisReport.delete(analysisToDelete[0].id);
      }
      toast.success("Session deleted.");
      setSelectedSessionLog(null);
      setActiveTab('search');
      loadPageData();
    } catch (error) {
      toast.error("Failed to delete session.");
      console.error("Deletion error:", error);
    }
  };

  const totalTimeMinutes = Math.round((userProgress?.total_time || 0) / 60);
  const paginatedLogs = sessionLogs.slice((currentPage - 1) * sessionsPerPage, currentPage * sessionsPerPage);
  const totalPages = Math.ceil(sessionLogs.length / sessionsPerPage);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-white';
      case 'advanced': return 'bg-red-500 text-white';
      case 'expert': return 'bg-purple-700 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30">
          <LoadingIndicator text="Loading Role-Play Scenarios..." size="lg" />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-[30px] font-semibold text-foreground mb-4">Scenarios</h1>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card p-4 rounded-lg border border-border">
              <p className="text-muted-foreground text-xs">Total Sessions</p>
              <p className="text-foreground text-xl font-medium">{userProgress?.total_sessions || 0}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <p className="text-muted-foreground text-xs">Total Time</p>
              <p className="text-foreground text-xl font-medium">{totalTimeMinutes} Minutes</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-foreground mb-4 text-base font-semibold">Featured Role-Plays</h2>
          <div className="flex overflow-x-auto gap-6 pb-4">
            {featuredScenarios.map((scenario) => (
              <Card key={scenario.id} className="bg-card border border-border flex-shrink-0">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <img src={scenario.avatarImageUrl} alt={scenario.name} className="w-16 h-16 rounded-full object-cover" />
                  </div>

                  <h3 className="text-foreground mb-1 text-base font-medium whitespace-nowrap">{scenario.name}</h3>
                  <p className="text-muted-foreground mb-4 text-xs line-clamp-2 max-w-xs mx-auto">{scenario.description}</p>
                  <Button className="w-full flex items-center justify-center gap-2" onClick={() => handleStartScenario(scenario)} disabled={isInitiating}>
                    {isInitiating ? <LoadingIndicator size="sm" /> : 'Start Call'}
                    {scenario.isPremium && (
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/1a5d0b2f1_pulseaiupgradeicon.png" 
                        alt="Premium" 
                        className="w-4 h-4"
                      />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-foreground mb-4 text-lg font-semibold">Scenario Log</h2>
          <div className="bg-card rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-zinc-100 text-muted-foreground px-4 font-medium text-left h-12 align-middle [&:has([role=checkbox])]:pr-0">Scenario</TableHead>
                  <TableHead className="bg-zinc-100 text-muted-foreground px-4 font-medium text-left h-12 align-middle [&:has([role=checkbox])]:pr-0">Date</TableHead>
                  <TableHead className="bg-zinc-100 text-muted-foreground px-4 font-medium text-left h-12 align-middle [&:has([role=checkbox])]:pr-0">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const scenario = allScenarios.find((s) => s.id === log.scenarioId);
                  return (
                    <TableRow key={log.id} onClick={() => handleSessionLogClick(log)} className="cursor-pointer hover:bg-muted py-4">
                      <TableCell className="font-medium">{scenario?.name || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(log.startTime), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{log.durationSeconds || 0}s</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight /></Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarContent = () => {
    if (activeTab === 'script_display' && activeScenario) {
      return <ScriptDisplaySidebar scenario={activeScenario} onClose={handleEndSession} />;
    }

    switch (activeTab) {
      case 'search':
        return <ScenarioSearchSidebar scenarios={allScenarios} onStartScenario={handleStartScenario} />;
      case 'results':
        if (selectedSessionLog) {
          return <SessionResultsSidebar sessionLog={selectedSessionLog} onDelete={handleDeleteSession} />;
        }
        return <p className="text-slate-500 py-6 px-6 text-sm text-center">Select a session from the log to see results.</p>;
      case 'scripts':
        return <ScriptsSidebar />;
      default:
        return null;
    }
  };

  const getSidebarTitle = () => {
    if (activeTab === 'script_display' && activeScenario) {
      return activeScenario.name;
    }

    const titles = {
      search: 'Search Scenarios',
      results: 'Session Results',
      scripts: 'Script Stacks'
    };
    return titles[activeTab];
  };

  return (
    <>
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeScenario ? 'script_display' : activeTab}
        onTabChange={(tabId) => {
          if (activeScenario) {
            toast.info("Please end your current session first");
            return;
          }
          setActiveTab(tabId);
          if (tabId !== 'results') setSelectedSessionLog(null);
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="bg-muted/30 p-8 text-xs flex-1 overflow-y-auto">
          {renderMainContent()}
        </div>

        <ContextualSidebar title={getSidebarTitle()}>
          {renderSidebarContent()}
        </ContextualSidebar>
      </div>

      {showCustomModal && customBaseScenario && (
        <CustomScenarioModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          baseScenario={customBaseScenario}
          onSubmit={handleCustomScenarioSubmit}
        />
      )}
    </>
  );
}