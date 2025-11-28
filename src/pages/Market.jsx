import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  TrendingUp, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  MapPin,
  Lock,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import LoadingIndicator from "../components/ui/LoadingIndicator";
import { cn } from '@/components/lib/utils';
import { jsPDF } from 'jspdf';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import { differenceInDays } from 'date-fns';

// Helper to format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(value);
};

// Helper to format number
const formatNumber = (value) => {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('en-US').format(value);
};

export default function MarketPage() {
  const { user, marketConfig, loading: contextLoading } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [metrics, setMetrics] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [comparisonList, setComparisonList] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Comparison State
  const [selectedZipForComparison, setSelectedZipForComparison] = useState('');
  const [comparing, setComparing] = useState(false);

  const tabs = [
    { id: 'analysis', label: 'Analysis' },
    { id: 'comparisons', label: 'Comparisons' },
  ];

  // Initial Load
  useEffect(() => {
    if (user && !contextLoading) {
      loadMarketData();
    }
  }, [user, contextLoading]);

  const loadMarketData = async () => {
    setLoading(true);
    try {
      // 1. Try to get latest MarketData from DB
      const savedData = await base44.entities.MarketData.filter({ userId: user.id }, '-created_date', 1);
      
      if (savedData && savedData.length > 0) {
        const latest = savedData[0];
        setLastUpdated(latest.dataDate || latest.created_date);
        
        try {
          const parsedRaw = JSON.parse(latest.rawData);
          // If saved data structure is from Redfin function, metrics are inside
          if (parsedRaw.metrics) {
             setMetrics(parsedRaw.metrics);
          } else if (parsedRaw.data) {
             // Recalculate if only raw redfin data is there (fallback)
             // ideally we should have saved metrics. 
             // For now, let's assume we might need to fetch if metrics missing
             // But let's try to be optimistic
             if (!parsedRaw.metrics) {
                await fetchFreshData(true); // Silent update if needed
             }
          }
        } catch (e) {
          console.error("Error parsing saved data", e);
        }
        
        // Load Intelligence
        const intel = await base44.entities.MarketIntelligence.filter({ userId: user.id }, '-created_date', 1);
        if (intel && intel.length > 0) {
          try {
            setAiAnalysis(JSON.parse(intel[0].rawResponse));
          } catch (e) {
            console.error("Error parsing AI analysis", e);
          }
        }
      } else {
        await fetchFreshData();
      }
    } catch (error) {
      console.error("Error loading market data:", error);
      toast.error("Failed to load market data.");
    } finally {
      setLoading(false);
    }
  };

  const getRefreshCooldownDays = () => {
    if (user?.role === 'admin') return 0;
    if (user?.subscriptionTier === 'Subscriber') return 7;
    return 30;
  };

  const canRefresh = () => {
    if (!lastUpdated) return true;
    if (user?.role === 'admin') return true;
    
    const daysSince = differenceInDays(new Date(), new Date(lastUpdated));
    const cooldown = getRefreshCooldownDays();
    return daysSince >= cooldown;
  };

  const getDaysUntilRefresh = () => {
    if (!lastUpdated) return 0;
    const daysSince = differenceInDays(new Date(), new Date(lastUpdated));
    const cooldown = getRefreshCooldownDays();
    return Math.max(0, cooldown - daysSince);
  };

  const fetchFreshData = async (silent = false) => {
    if (!canRefresh() && !silent) {
       toast.error(`You can refresh market data in ${getDaysUntilRefresh()} days.`);
       return;
    }

    setIsFetching(true);
    try {
      const { data } = await base44.functions.invoke('fetchRedfinMarketData');
      if (data && data.success) {
        setMetrics(data.metrics);
        setLastUpdated(new Date().toISOString());
        
        // Generate AI Analysis if missing or refreshing
        generateAnalysis(data.metrics);
        
        if (!silent) toast.success("Market data updated");
      } else {
        if (!silent) toast.error(data?.error || "Failed to fetch market data.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      if (!silent) {
          // Check for 404 message in error string if available
          if (error.message?.includes('404')) {
              toast.error("Market data not found. Please check your City/State in settings.");
          } else {
              toast.error("Failed to fetch market data. Please try again.");
          }
      }
    } finally {
      setIsFetching(false);
    }
  };

  const generateAnalysis = async (currentMetrics) => {
    setIsAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('openaiMarketAnalysis', {
        marketArea: marketConfig?.primaryTerritory || `${marketConfig?.city}, ${marketConfig?.state}`,
        marketData: { metrics: currentMetrics }, // Pass metrics to help AI
        forceRefresh: true
      });
      
      if (data && data.analysis) {
        setAiAnalysis(data.analysis);
        
        // Save to DB
        await base44.entities.MarketIntelligence.create({
          userId: user.id,
          territory: marketConfig?.primaryTerritory || 'Primary Market',
          rawResponse: JSON.stringify(data.analysis)
        });
      }
    } catch (error) {
      console.error("Analysis generation error:", error);
      toast.error("Could not generate market strategy analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddComparison = async () => {
    if (!selectedZipForComparison) return;
    
    setComparing(true);
    try {
      const { data } = await base44.functions.invoke('fetchRedfinMarketData', {
        location: selectedZipForComparison
      });
      
      if (data && data.success) {
        setComparisonList(prev => [...prev, {
          id: Date.now(),
          location: selectedZipForComparison,
          metrics: data.metrics
        }]);
        setSelectedZipForComparison('');
        toast.success(`Added ${selectedZipForComparison} to comparison`);
      } else {
        toast.error(`Could not fetch data for ${selectedZipForComparison}`);
      }
    } catch (error) {
      toast.error("Error fetching comparison data");
    } finally {
      setComparing(false);
    }
  };

  const removeComparison = (id) => {
    setComparisonList(prev => prev.filter(item => item.id !== id));
  };

  // PDF Report Generation
  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.text("Market Intelligence Report", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated for: ${user.full_name}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 36);
    doc.text(`Market: ${metrics?.location || 'Primary Market'}`, 20, 42);

    let yPos = 60;

    // Metrics
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Key Market Metrics", 20, yPos);
    yPos += 10;

    if (metrics) {
      const metricsList = [
        ['Median List Price', formatCurrency(metrics.medianListPrice)],
        ['Median Days on Market', `${metrics.medianDaysOnMarket || '-'} days`],
        ['Months of Supply', `${metrics.monthsOfSupply || '-'} months`],
        ['Active Listings', formatNumber(metrics.activeListings)],
        ['Absorption Rate', metrics.absorptionRate || '-'],
        ['List to Sale Ratio', metrics.listToSaleRatio || '-']
      ];

      // Manual table drawing
      doc.setFontSize(12);
      const startX = 20;
      const col1Width = 80;
      const rowHeight = 8;
      
      // Header
      doc.setFillColor(124, 58, 237);
      doc.rect(startX, yPos, 170, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('Metric', startX + 5, yPos + 5.5);
      doc.text('Value', startX + col1Width + 5, yPos + 5.5);
      yPos += rowHeight;

      // Body
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      metricsList.forEach((row, i) => {
        // Zebra striping
        if (i % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(startX, yPos, 170, rowHeight, 'F');
        }
        doc.text(String(row[0]), startX + 5, yPos + 5.5);
        doc.text(String(row[1]), startX + col1Width + 5, yPos + 5.5);
        yPos += rowHeight;
      });
      
      yPos += 10;
    }

    // Analysis
    if (aiAnalysis) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(16);
      doc.text("Market Analysis", 20, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      const splitSummary = doc.splitTextToSize(aiAnalysis.summary || "No summary available", pageWidth - 40);
      doc.text(splitSummary, 20, yPos);
      yPos += splitSummary.length * 7 + 10;

      // Coaching Insights
      if (aiAnalysis.coaching_insights) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text("Coaching Insights", 20, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        aiAnalysis.coaching_insights.forEach(insight => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          doc.setFont(undefined, 'bold');
          doc.text(`• ${insight.insight_type}:`, 20, yPos);
          doc.setFont(undefined, 'normal');
          const desc = doc.splitTextToSize(insight.description, pageWidth - 50);
          doc.text(desc, 25, yPos + 6);
          yPos += desc.length * 7 + 10;
        });
      }
    }

    doc.save("market_report.pdf");
    toast.success("Report downloaded");
  };

  if (loading) {
    return <LoadingIndicator text="Loading Market Intelligence..." />;
  }

  return (
    <>
      <ContextualTopNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="flex items-center gap-2 ml-auto">
             {/* Refresh Button */}
            <div className="relative group">
                <button 
                    onClick={() => fetchFreshData(false)} 
                    disabled={isFetching || !canRefresh()}
                    className={cn(
                      "p-2 bg-card hover:bg-muted border border-border rounded transition-colors flex items-center justify-center h-9 w-9",
                      (isFetching || !canRefresh()) && "opacity-50 cursor-not-allowed"
                    )}
                    title={!canRefresh() ? `Refresh available in ${getDaysUntilRefresh()} days` : "Refresh Market Data"}
                >
                    <RefreshCw className={cn("w-5 h-5 text-muted-foreground", isFetching && "animate-spin")} />
                </button>
                {!canRefresh() && (
                    <div className="absolute top-full mt-1 right-0 bg-black text-white text-xs rounded px-2 py-1 w-32 text-center hidden group-hover:block z-50">
                        Refresh available in {getDaysUntilRefresh()} days
                    </div>
                )}
            </div>

             {/* Print Button */}
             <button 
                onClick={() => window.print()}
                className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors flex items-center justify-center h-9 w-9"
                title="Print Report"
            >
                <Printer className="w-5 h-5 text-muted-foreground" />
            </button>

             {/* Download Button */}
             <button 
                onClick={generatePDF}
                className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors flex items-center justify-center h-9 w-9"
                title="Download PDF"
            >
                <Download className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>
      </ContextualTopNav>

      <div className="flex h-full flex-col overflow-hidden bg-gray-50">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* At-a-Glance Metrics */}
            <section>
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    At-a-Glance Metrics
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchFreshData(false)}
                    disabled={isFetching}
                    className="h-8"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isFetching && "animate-spin")} />
                    Refresh Data
                  </Button>
              </div>
              {!metrics ? (
                 <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Market Data Unavailable</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                        We couldn't find market data for your configured location ({marketConfig?.city}, {marketConfig?.state}). 
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Button variant="outline" onClick={() => window.location.href='/Settings?tab=market'}>
                            Update Location
                        </Button>
                        <Button onClick={() => fetchFreshData(false)} disabled={isFetching}>
                            {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Try Refreshing
                        </Button>
                    </div>
                 </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500 mb-1">Median Home Price</p>
                        <div className="text-2xl font-bold">{formatCurrency(metrics?.medianListPrice)}</div>
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          Current Listing Price
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500 mb-1">Days on Market</p>
                        <div className="text-2xl font-bold">{metrics?.medianDaysOnMarket || '--'}</div>
                        <p className="text-xs text-gray-500 mt-1">Median DOM</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500 mb-1">Inventory Supply</p>
                        <div className="text-2xl font-bold">{metrics?.monthsOfSupply || '--'}</div>
                        <p className="text-xs text-gray-500 mt-1">Months of Supply</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500 mb-1">Active Listings</p>
                        <div className="text-2xl font-bold">{formatNumber(metrics?.activeListings)}</div>
                        <p className="text-xs text-gray-500 mt-1">Total Homes for Sale</p>
                      </CardContent>
                    </Card>
                  </div>
              )}
            </section>

            {activeTab === 'analysis' && metrics && (
              <div className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Current Market Summary
                      {isAnalyzing && <div className="flex items-center text-sm text-primary font-normal"><Loader2 className="w-4 h-4 animate-spin mr-2"/> Analyzing Market...</div>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isAnalyzing && !aiAnalysis ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                        </div>
                    ) : (
                        <p className="text-gray-700 leading-relaxed">
                          {aiAnalysis?.summary || "Click 'Refresh Data' to generate a new market analysis."}
                        </p>
                    )}
                  </CardContent>
                </Card>

                {/* Strategy Coaching */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-blue-700">Buyer Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isAnalyzing && !aiAnalysis ? (
                         <div className="space-y-4 animate-pulse">
                             <div className="h-20 bg-blue-50/50 rounded"></div>
                             <div className="h-20 bg-blue-50/50 rounded"></div>
                         </div>
                      ) : (
                          <>
                              {aiAnalysis?.coaching_insights?.filter(i => i.insight_type?.toLowerCase().includes('buyer')).length > 0 ? (
                                  aiAnalysis.coaching_insights.filter(i => i.insight_type?.toLowerCase().includes('buyer')).map((insight, idx) => (
                                    <div key={idx} className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                                      {insight.description}
                                    </div>
                                  ))
                              ) : (
                                  <p className="text-sm text-gray-500 italic">No buyer strategies available.</p>
                              )}
                              <div className="mt-4">
                                <h4 className="font-semibold text-sm mb-2">Talking Points:</h4>
                                <ReactMarkdown className="prose prose-sm text-gray-600">
                                  {aiAnalysis?.talking_points?.for_buyers || ""}
                                </ReactMarkdown>
                              </div>
                          </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-green-700">Seller Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isAnalyzing && !aiAnalysis ? (
                         <div className="space-y-4 animate-pulse">
                             <div className="h-20 bg-green-50/50 rounded"></div>
                             <div className="h-20 bg-green-50/50 rounded"></div>
                         </div>
                      ) : (
                          <>
                              {aiAnalysis?.coaching_insights?.filter(i => i.insight_type?.toLowerCase().includes('seller')).length > 0 ? (
                                  aiAnalysis.coaching_insights.filter(i => i.insight_type?.toLowerCase().includes('seller')).map((insight, idx) => (
                                    <div key={idx} className="bg-green-50 p-3 rounded-lg text-sm text-green-900">
                                      {insight.description}
                                    </div>
                                  ))
                              ) : (
                                  <p className="text-sm text-gray-500 italic">No seller strategies available.</p>
                              )}
                              <div className="mt-4">
                                <h4 className="font-semibold text-sm mb-2">Talking Points:</h4>
                                <ReactMarkdown className="prose prose-sm text-gray-600">
                                  {aiAnalysis?.talking_points?.for_sellers || ""}
                                </ReactMarkdown>
                              </div>
                          </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'comparisons' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Micro-Market Comparisons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-6">
                        <Select 
                            value={selectedZipForComparison} 
                            onValueChange={setSelectedZipForComparison}
                        >
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select Zip Code to Compare" />
                            </SelectTrigger>
                            <SelectContent>
                                {marketConfig?.zipCodes && marketConfig.zipCodes.length > 0 ? (
                                    marketConfig.zipCodes.map((zip, idx) => (
                                        <SelectItem key={idx} value={zip}>{zip}</SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no_zips" disabled>No Zip Codes Configured</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        
                        <Button onClick={handleAddComparison} disabled={comparing || !selectedZipForComparison || selectedZipForComparison === 'no_zips'}>
                            {comparing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Compare
                        </Button>
                    </div>
                    
                    {(!marketConfig?.zipCodes || marketConfig.zipCodes.length === 0) && (
                         <p className="text-sm text-orange-600 mb-4 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Please configure Zip Codes in your Market Settings to use comparisons.
                         </p>
                    )}

                    {comparisonList.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-xl">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Select a configured Zip Code to compare metrics side-by-side</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                              <th className="px-4 py-3">Metric</th>
                              <th className="px-4 py-3 border-l bg-violet-50 border-violet-100">
                                {metrics?.location || 'Primary'}
                                <span className="block text-xs font-normal text-violet-600">Your Market</span>
                              </th>
                              {comparisonList.map(comp => (
                                <th key={comp.id} className="px-4 py-3 border-l min-w-[150px]">
                                  <div className="flex justify-between items-center">
                                    {comp.location}
                                    <button onClick={() => removeComparison(comp.id)} className="text-gray-400 hover:text-red-500">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-900">Median Price</td>
                              <td className="px-4 py-3 bg-violet-50/30 border-l">{formatCurrency(metrics?.medianListPrice)}</td>
                              {comparisonList.map(comp => (
                                <td key={comp.id} className="px-4 py-3 border-l">{formatCurrency(comp.metrics?.medianListPrice)}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-900">Days on Market</td>
                              <td className="px-4 py-3 bg-violet-50/30 border-l">{metrics?.medianDaysOnMarket || '-'}</td>
                              {comparisonList.map(comp => (
                                <td key={comp.id} className="px-4 py-3 border-l">{comp.metrics?.medianDaysOnMarket || '-'}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-900">Price / SqFt</td>
                              <td className="px-4 py-3 bg-violet-50/30 border-l">{formatCurrency(metrics?.pricePerSqft)}</td>
                              {comparisonList.map(comp => (
                                <td key={comp.id} className="px-4 py-3 border-l">{formatCurrency(comp.metrics?.pricePerSqft)}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-900">Absorption Rate</td>
                              <td className="px-4 py-3 bg-violet-50/30 border-l">{metrics?.absorptionRate}</td>
                              {comparisonList.map(comp => (
                                <td key={comp.id} className="px-4 py-3 border-l">{comp.metrics?.absorptionRate}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-900">Supply (Months)</td>
                              <td className="px-4 py-3 bg-violet-50/30 border-l">{metrics?.monthsOfSupply}</td>
                              {comparisonList.map(comp => (
                                <td key={comp.id} className="px-4 py-3 border-l">{comp.metrics?.monthsOfSupply}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}