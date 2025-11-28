import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../components/context/UserContext';
import { GeneratedContent, ContentTopic, FeaturedContentPack, ContentPack, ContentPreference, TaskTemplate, MarketIntelligence, AiPromptConfig } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy, Sparkles, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import ContextualSidebar from '../components/layout/ContextualSidebar';
import AIContentGenerator from '../components/content-studio/AIContentGenerator';
import RecentGenerated from '../components/content-studio/RecentGenerated';
import useCredits from '../components/credits/useCredits';
import InsufficientCreditsModal from '../components/credits/InsufficientCreditsModal';
import ContentDetailModal from '../components/content-studio/ContentDetailModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import LoadingIndicator, { InlineLoadingIndicator } from '../components/ui/LoadingIndicator';

export default function ContentStudioPage() {
  const { user, loading: contextLoading, marketConfig } = useContext(UserContext);
  const { userCredits, hasSufficientCredits, deductCredits } = useCredits();
  const [activeTab, setActiveTab] = useState('create_post');
  const [loading, setLoading] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [weeklyTopic, setWeeklyTopic] = useState(null);
  const [weeklyContentPacks, setWeeklyContentPacks] = useState([]);
  const [featuredPacks, setFeaturedPacks] = useState([]);
  const [recentContent, setRecentContent] = useState([]);
  const [calendarTopics, setCalendarTopics] = useState([]);
  const [socialMediaTemplates, setSocialMediaTemplates] = useState([]);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);
  const [showContentDetail, setShowContentDetail] = useState(false);
  const [marketIntelligence, setMarketIntelligence] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [newlyGeneratedId, setNewlyGeneratedId] = useState(null);
  const [promptConfigs, setPromptConfigs] = useState([]);
  const [showImageOverlay, setShowImageOverlay] = useState(false);
  const [overlayImage, setOverlayImage] = useState(null);

  const loadingMessages = [
    "Loading your Content Studio workspace...",
    "Pulling in your latest marketing assets...",
    "Hang tight! We're gathering your templates and drafts.",
    "Setting up personalized content tools for you.",
    "Brewing up some inspiration for you!"
  ];

  const isSubscriber = user?.subscriptionTier === 'Subscriber' || user?.subscriptionTier === 'Admin';

  const tabs = [
    { id: 'create_post', label: 'Create & Post' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'recents', label: 'Recents' },
    { id: 'preferences', label: 'Preferences' }
  ];

  useEffect(() => {
    if (!contextLoading && user) {
      loadPageData();
    }
  }, [contextLoading, user]);

  // Cycle through loading messages
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading, loadingMessages.length]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [topicData, featuredData, contentData, intelligenceData, calendarTopicsData, prefsData, socialTemplatesData, promptConfigsData] = await Promise.all([
        ContentTopic.filter({ isActive: true, outreachEmail: { '$ne': null } }, '-created_date', 1),
        FeaturedContentPack.filter({ isActive: true }, 'sortOrder'),
        GeneratedContent.filter({ userId: user.id }, '-created_date', 20),
        MarketIntelligence.filter({ userId: user.id }, '-created_date', 1),
        ContentTopic.filter({ isActive: true }, '-weekNumber', 5),
        ContentPreference.filter({ created_by: user.email }, '-created_date', 1),
        TaskTemplate.filter({ isActive: true, category: 'social_media', triggerType: 'day_of_week' }),
        AiPromptConfig.list()
      ]);

      const currentWeeklyTopic = topicData?.[0] || null;
      setWeeklyTopic(currentWeeklyTopic);

      if (currentWeeklyTopic) {
        const packs = await ContentPack.filter({ topicId: currentWeeklyTopic.id, isActive: true });
        setWeeklyContentPacks(packs);
      } else {
        setWeeklyContentPacks([]);
      }

      setFeaturedPacks(featuredData || []);
      setRecentContent(contentData || []);
      setMarketIntelligence(intelligenceData?.[0] || null);
      setCalendarTopics(calendarTopicsData || []);
      setSocialMediaTemplates(socialTemplatesData || []);
      setPromptConfigs(promptConfigsData || []);

      if (prefsData && prefsData.length > 0) {
        setPreferences(prefsData[0]);
      } else {
        const defaultPrefs = {
          defaultTone: 'professional',
          defaultLength: 'medium',
          marketFocus: marketConfig?.primaryTerritory || '',
          targetAudience: 'General audience'
        };
        const newPrefs = await ContentPreference.create(defaultPrefs);
        setPreferences(newPrefs);
      }

    } catch (error) {
      console.error('Error loading content studio data:', error);
      toast.error('Failed to load content data');
    } finally {
      setLoading(false);
    }
  };

  const handleContentGenerated = async (contentData) => {
    if (!hasSufficientCredits(contentData.credits)) {
      setShowCreditModal(true);
      return;
    }

    const success = await deductCredits(contentData.credits, 'Content Studio', `Generated ${contentData.type}: ${contentData.title}`);
    if (!success) return;

    try {
      const newContent = await GeneratedContent.create({
        userId: user.id,
        contentType: contentData.type,
        contentTitle: contentData.title,
        contentBody: contentData.body,
        creditsUsed: contentData.credits
      });
      await loadPageData();
      setNewlyGeneratedId(newContent.id);
      setActiveTab('recents');
      toast.success('Content generated and saved!');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Content generated but failed to save');
    }
  };

  const handleGenerateFromCalendar = async (template) => {
    const socialPostConfig = promptConfigs.find((p) => p.promptId === 'content_studio_social_post');
    if (!socialPostConfig) {
      toast.error("Social post AI configuration is missing. Please contact support.");
      return;
    }
    const cost = socialPostConfig.creditsCost || 2;

    if (!isSubscriber && !hasSufficientCredits(cost)) {
      setShowCreditModal(true);
      return;
    }

    setGeneratingTaskId(template.id);
    const success = await deductCredits(cost, 'Content Studio', `Generated from Calendar: ${template.title}`);
    if (!success) {
      setGeneratingTaskId(null);
      return;
    }

    const marketContext = marketIntelligence?.rawResponse
      ? `\n\nUse the following market analysis as the primary source of truth for any market-specific data:\n---BEGIN MARKET DATA---\n${marketIntelligence.rawResponse}\n---END MARKET DATA---`
      : '';

    const combinedTopic = `${template.title}. ${template.description || ''}`.trim();

    let finalUserPrompt = socialPostConfig.userMessageTemplate
      .replace('{{platform}}', 'social media')
      .replace('{{topic}}', combinedTopic);

    finalUserPrompt += "\n\nImportant: Use double line breaks (press Enter twice) to create paragraph breaks for proper spacing in the output.";
    finalUserPrompt += marketContext;

    try {
      const { data } = await base44.functions.invoke('openaiChat', {
        messages: [{ role: 'user', content: finalUserPrompt }],
        systemPrompt: `${socialPostConfig.systemMessage}`,
        model: 'gpt-4o',
        maxTokens: 1500,
        temperature: 0.7
      });

      if (data?.message) {
        const newContent = await GeneratedContent.create({
          userId: user.id,
          contentType: 'social_post',
          contentTitle: template.title,
          contentBody: data.message,
          creditsUsed: cost
        });
        await loadPageData();
        setNewlyGeneratedId(newContent.id);
        setActiveTab('recents');
        toast.success('Content generated! Check your Recents.');
      } else {
        throw new Error("Received an empty response from AI.");
      }
    } catch (error) {
      console.error('Error generating content from calendar:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setGeneratingTaskId(null);
    }
  };

  const handlePackClick = (pack) => {
    setSelectedPack(pack);
  };

  const handleCopyCaption = (caption) => {
    if (!caption) {
      toast.error("No caption to copy.");
      return;
    }
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied to clipboard!");
  };

  const handleCopyHashtags = (hashtags) => {
    if (!hashtags) {
      toast.error("No hashtags to copy.");
      return;
    }
    navigator.clipboard.writeText(hashtags);
    toast.success("Hashtags copied to clipboard!");
  };

  const handleDownloadImage = (imageUrl, title) => {
    if (!imageUrl) {
      toast.error("No image to download.");
      return;
    }
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const handleDownloadAll = (pack) => {
    if (pack.fileUrl) {
      const link = document.createElement('a');
      link.href = pack.fileUrl;
      link.download = pack.fileName || `Content_Pack_${pack.packType}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Pack downloading!");
    } else {
      toast.info("No downloadable files for this pack.");
    }
  };

  const handleShare = () => {
    toast.info("Share functionality coming soon!");
  };

  const handleContentClick = (content) => {
    setSelectedContent(content);
    setShowContentDetail(true);
  };

  const handleUpdatePreferences = async () => {
    if (!preferences || !preferences.id) {
      toast.error("Preferences not loaded correctly.");
      return;
    }
    setIsUpdatingPrefs(true);
    try {
      const { id, created_date, updated_date, created_by, ...updateData } = preferences;
      await ContentPreference.update(id, updateData);
      toast.success("Preferences saved successfully!");
    } catch (e) {
      console.error("Failed to save preferences", e);
      toast.error("Could not save preferences.");
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const handleImageExpand = (imageUrl) => {
    setOverlayImage(imageUrl);
    setShowImageOverlay(true);
  };

  const renderMainContent = () => {
    return (
      <div className="space-y-8">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Welcome to the</h1>
            <h2 className="text-3xl font-bold text-primary">Content Studio</h2>
            <p className="text-sm text-muted-foreground mt-2">Download ready to post content and generate content with AI</p>
          </div>
          <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Credits:</span>
            <span className="text-lg font-bold text-primary">{userCredits?.creditsRemaining || 0}</span>
          </div>
        </div>

        {/* This Week's Packs */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">This Week's Packs</h3>
          {weeklyTopic ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {/* Social Feed Post Card */}
                {weeklyTopic.socialFeedGraphicUrl && (
                  <Card 
                    className="bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer w-64 flex-shrink-0"
                    onClick={() => handlePackClick({
                      type: 'social_feed',
                      title: 'Social Feed Post',
                      imageUrl: weeklyTopic.socialFeedGraphicUrl,
                      caption: weeklyTopic.socialFeedCaption,
                      hashtags: weeklyTopic.socialHashtags,
                      updated: weeklyTopic.created_date
                    })}
                  >
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/314484249_socialfeedpost.jpg" 
                        alt="Social Feed Post" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground text-sm">Social Feed Post</h4>
                    </CardContent>
                  </Card>
                )}

                {/* Email Script Card */}
                {weeklyTopic.outreachEmail && (
                  <Card 
                    className="bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer w-64 flex-shrink-0"
                    onClick={() => handlePackClick({
                      type: 'email',
                      title: 'Email Script',
                      text: weeklyTopic.outreachEmail,
                      updated: weeklyTopic.created_date
                    })}
                  >
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/d49b2b0e7_emailscript.jpg" 
                        alt="Email Script" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground text-sm">Email Script</h4>
                    </CardContent>
                  </Card>
                )}

                {/* Phone Script Card */}
                {weeklyTopic.outreachCallScript && (
                  <Card 
                    className="bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer w-64 flex-shrink-0"
                    onClick={() => handlePackClick({
                      type: 'phone',
                      title: 'Phone Script',
                      text: weeklyTopic.outreachCallScript,
                      updated: weeklyTopic.created_date
                    })}
                  >
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/62f462aec_phonescript.jpg" 
                        alt="Phone Script" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground text-sm">Phone Script</h4>
                    </CardContent>
                  </Card>
                )}

                {/* Text/DM Script Card */}
                {weeklyTopic.outreachDmTemplate && (
                  <Card 
                    className="bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer w-64 flex-shrink-0"
                    onClick={() => handlePackClick({
                      type: 'text',
                      title: 'Text/DM Script',
                      text: weeklyTopic.outreachDmTemplate,
                      updated: weeklyTopic.created_date
                    })}
                  >
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/bb8eee62d_textdrmscript.jpg" 
                        alt="Text/DM Script" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground text-sm">Text/DM Script</h4>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No packs available this week</p>
            </div>
          )}
        </div>

        {/* Ready-to-Use Content Packs */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Ready-to-Use Content Packs</h3>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {featuredPacks.map((pack) => (
                <Card 
                  key={pack.id} 
                  className="bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer w-64 flex-shrink-0"
                  onClick={() => {
                    if (pack.isPremium && !isSubscriber) {
                      toast.error("This is a premium content pack. Please upgrade to access premium content.");
                      window.location.href = '/plans';
                    } else {
                      handlePackClick({
                        type: 'featured',
                        title: pack.title,
                        description: pack.description,
                        imageUrl: pack.thumbnailUrl,
                        url: pack.url,
                        isPremium: pack.isPremium,
                        updated: pack.created_date
                      });
                    }
                  }}
                >
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-t-lg overflow-hidden">
                    <img 
                      src={pack.thumbnailUrl || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/0b7fa63fd_readytousecontentpacks.jpg'} 
                      alt={pack.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-foreground mb-1 text-sm">{pack.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{pack.description}</p>
                    <div className="mt-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {pack.socialNetworks?.join(', ') || 'All Platforms'}
                      </span>
                    </div>
                    <Button
                      className="w-full mt-3 bg-primary hover:bg-primary/90 text-white h-8 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pack.isPremium && !isSubscriber) {
                          toast.error("This is a premium content pack. Please upgrade to access premium content.");
                          window.location.href = '/plans';
                        } else {
                          window.open(pack.url, '_blank');
                        }
                      }}
                    >
                      Download Pack
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarContent = () => {
    // If a pack is selected, show pack details
    if (selectedPack) {
      return (
        <div className="pt-6 pr-6 pb-6 pl-6 space-y-6">
          {/* Pack Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{selectedPack.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Updated {selectedPack.updated ? format(new Date(selectedPack.updated), 'MMMM d') : 'Recently'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  if (selectedPack.caption) {
                    handleCopyCaption(selectedPack.caption);
                  } else if (selectedPack.text) {
                    navigator.clipboard.writeText(selectedPack.text);
                    toast.success("Content copied to clipboard!");
                  }
                }}
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </Button>
              {selectedPack.imageUrl && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleDownloadImage(selectedPack.imageUrl, selectedPack.title)}
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Visuals Section */}
          {selectedPack.imageUrl && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Visuals</h4>
              <div className="relative group">
                <img 
                  src={selectedPack.imageUrl} 
                  alt={selectedPack.title}
                  className="w-full rounded-lg border border-gray-200" 
                />
                <button
                  onClick={() => handleImageExpand(selectedPack.imageUrl)}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-4 h-4 text-gray-700" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleDownloadImage(selectedPack.imageUrl, selectedPack.title)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </Button>
            </div>
          )}

          {/* Text Content */}
          {selectedPack.text && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Content</h4>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedPack.text}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(selectedPack.text);
                  toast.success("Content copied to clipboard!");
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Content
              </Button>
            </div>
          )}

          {/* Captions */}
          {selectedPack.caption && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Captions</h4>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedPack.caption}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleCopyCaption(selectedPack.caption)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Caption
              </Button>
            </div>
          )}

          {/* Hashtags */}
          {selectedPack.hashtags && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Hashtags</h4>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">{selectedPack.hashtags}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleCopyHashtags(selectedPack.hashtags)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Hashtags
              </Button>
            </div>
          )}

          {/* Back Button */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setSelectedPack(null)}
          >
            Back to AI Creator
          </Button>
        </div>
      );
    }

    // Default sidebar content based on active tab
    switch (activeTab) {
      case 'create_post':
        return (
          <AIContentGenerator
            userCredits={userCredits}
            isSubscriber={isSubscriber}
            marketConfig={marketConfig}
            marketIntelligence={marketIntelligence}
            onContentGenerated={handleContentGenerated}
            onCreditError={() => setShowCreditModal(true)}
            promptConfigs={promptConfigs}
            preferences={preferences}
          />
        );

      case 'calendar':
        const handleCopyToClipboard = (text, title) => {
          if (!text || text.trim() === 'No social media task scheduled for this day.') {
            toast.info("No content to copy.");
            return;
          }
          navigator.clipboard.writeText(text);
          toast.success(`'${title}' content copied to clipboard!`);
        };

        const calendarDays = [
          { label: 'Yesterday', date: subDays(new Date(), 1), color: 'border-l-[#94A3B8] bg-[#F8FAFC]' },
          { label: 'Today', date: new Date(), color: 'border-l-[#EF4444] bg-[#FEF2F2]' },
          { label: 'Tomorrow', date: addDays(new Date(), 1), color: 'border-l-[#EAB308] bg-[#FEFCE8]' },
          { label: format(addDays(new Date(), 2), 'EEEE'), date: addDays(new Date(), 2), color: 'border-l-[#22C55E] bg-[#F0FDF4]' }
        ];

        return (
          <div className="pt-6 pr-6 pb-6 pl-6 space-y-6">
            {calendarDays.map((day, idx) => {
              const jsDayOfWeek = day.date.getDay();
              const templateDayOfWeek = jsDayOfWeek === 0 ? 1 : jsDayOfWeek + 1;
              const templateForDay = socialMediaTemplates.find((t) => parseInt(t.triggerValue) === templateDayOfWeek);
              const postTitle = templateForDay ? templateForDay.title : "No Post Scheduled";
              const postContent = templateForDay ? templateForDay.description || "No description available for this task." : "No social media task scheduled for this day.";
              const isGenerating = generatingTaskId === templateForDay?.id;

              return (
                <div key={idx} className="space-y-2">
                  <h5 className="text-sm font-semibold text-[#1E293B]">{day.label}</h5>
                  <div className={`p-3 border-l-4 ${day.color} rounded`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#1E293B]">{postTitle}</p>
                        <p className="text-xs text-[#64748B] line-clamp-2">{postContent}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyToClipboard(postContent, templateForDay?.title)}
                          className="p-1"
                          disabled={!templateForDay || !templateForDay.description || templateForDay.description.trim() === ''}
                          title={!templateForDay || !templateForDay.description ? "No content to copy" : "Copy to clipboard"}
                        >
                          <Copy className="w-3.5 h-3.5 text-[#64748B] hover:text-[#1E293B]" />
                        </button>
                        {templateForDay && (
                          <button
                            onClick={() => handleGenerateFromCalendar(templateForDay)}
                            className="p-1 text-[#7C3AED] hover:text-[#6D28D9] disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isGenerating}
                            title="Generate this post with AI"
                          >
                            {isGenerating ? <InlineLoadingIndicator className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'recents':
        return (
          <div className="pt-6 pr-6 pb-6 pl-6 space-y-6">
            <RecentGenerated
              content={recentContent}
              onItemClick={handleContentClick}
              highlightId={newlyGeneratedId}
              onHighlightComplete={() => setNewlyGeneratedId(null)}
            />
          </div>
        );

      case 'preferences':
        if (!preferences) {
          return <div className="text-sm text-[#475569]">Loading preferences...</div>;
        }
        return (
          <div className="pt-6 pr-6 pb-6 pl-6 space-y-6">
            <h4 className="text-base font-semibold text-[#1E293B]">Content Preferences</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultTone" className="text-sm font-medium text-foreground">Default Tone</Label>
                <Select value={preferences.defaultTone} onValueChange={(val) => setPreferences((p) => ({ ...p, defaultTone: val }))}>
                  <SelectTrigger id="defaultTone"><SelectValue placeholder="Select a tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="defaultLength" className="text-sm font-medium text-foreground">Default Length</Label>
                <Select value={preferences.defaultLength} onValueChange={(val) => setPreferences((p) => ({ ...p, defaultLength: val }))}>
                  <SelectTrigger id="defaultLength"><SelectValue placeholder="Select a length" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleUpdatePreferences} disabled={isUpdatingPrefs} className="w-full">
              {isUpdatingPrefs ? <InlineLoadingIndicator className="w-4 h-4" /> : 'Save Preferences'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <LoadingIndicator text={loadingMessages[loadingMessageIndex]} size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <title>Content Studio - PULSE Intelligence</title>
      <meta name="description" content="Create AI-powered social media content, market reports, and outreach materials for your real estate business." />
      
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedPack(null);
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="bg-muted/30 pt-6 pr-8 pb-8 pl-8 flex-1 overflow-y-auto">
          {renderMainContent()}
        </div>

        <ContextualSidebar title={selectedPack ? selectedPack.title : 'Content'}>
          {renderSidebarContent()}
        </ContextualSidebar>
      </div>

      <InsufficientCreditsModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />

      {showContentDetail && selectedContent && (
        <ContentDetailModal
          isOpen={showContentDetail}
          onClose={() => {
            setShowContentDetail(false);
            setSelectedContent(null);
          }}
          contentItem={selectedContent}
        />
      )}

      {/* Image Overlay */}
      {showImageOverlay && overlayImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageOverlay(false)}
        >
          <button
            onClick={() => setShowImageOverlay(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={overlayImage} 
            alt="Expanded view"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}