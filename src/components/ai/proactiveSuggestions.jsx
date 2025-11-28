/**
 * PULSE Intelligence - Proactive Suggestion Engine
 * Enables AI to make smart, context-based suggestions instead of only reacting
 * 
 * Version: 1.0
 */

import { base44 } from '@/api/base44Client';

/**
 * Check for triggers that warrant proactive suggestions
 * @param {object} user - Current user
 * @param {object} sessionManager - Chat session manager
 * @returns {array} Array of suggestion objects
 */
export async function checkProactiveTriggers(user, sessionManager) {
  const suggestions = [];
  
  try {
    // Get user's recent activity data
    const [recentPosts, recentActions, transactions, leads] = await Promise.all([
      base44.entities.GeneratedContent.filter({ 
        userId: user.id 
      }, '-created_date', 1).catch(() => []),
      
      base44.entities.DailyAction.filter({ 
        userId: user.id,
        status: { $ne: 'completed' }
      }, '-created_date', 10).catch(() => []),
      
      base44.entities.Transaction.filter({ 
        userId: user.id,
        status: { $in: ['under_contract', 'pending'] }
      }).catch(() => []),
      
      base44.entities.Lead.filter({ 
        userId: user.id,
        status: { $in: ['new', 'contacting', 'qualified'] }
      }).catch(() => [])
    ]);

    // Trigger 1: Long gap since last post
    if (recentPosts.length > 0) {
      const lastPostDate = new Date(recentPosts[0].created_date);
      const daysSincePost = Math.floor((Date.now() - lastPostDate) / (1000 * 60 * 60 * 24));
      
      if (daysSincePost >= 7) {
        suggestions.push({
          type: 'content_gap',
          priority: 'medium',
          message: `You haven't posted on social media in ${daysSincePost} days — want me to queue one for tomorrow?`,
          actions: [
            { label: 'Generate Post', tool: 'generateSocialPostTool', args: {} },
            { label: 'Dismiss', type: 'dismiss' }
          ]
        });
      }
    }

    // Trigger 2: Missed tasks or follow-ups
    const overdueTasks = recentActions.filter(action => {
      if (action.dueDate) {
        return new Date(action.dueDate) < new Date();
      }
      return false;
    });

    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'missed_tasks',
        priority: 'high',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. Want me to help you prioritize them?`,
        actions: [
          { label: 'Review Tasks', type: 'navigate', url: '/ToDo' },
          { label: 'Reschedule', tool: 'createTaskTool', args: {} },
          { label: 'Dismiss', type: 'dismiss' }
        ]
      });
    }

    // Trigger 3: Long-standing transactions
    const longActiveTransactions = transactions.filter(t => {
      const contractDate = t.contractDate ? new Date(t.contractDate) : new Date(t.created_date);
      const daysActive = Math.floor((Date.now() - contractDate) / (1000 * 60 * 60 * 24));
      return daysActive >= 30;
    });

    if (longActiveTransactions.length > 0) {
      suggestions.push({
        type: 'transaction_alert',
        priority: 'medium',
        message: `${longActiveTransactions.length} transaction${longActiveTransactions.length > 1 ? 's have' : ' has'} been active 30+ days. Want to review status?`,
        actions: [
          { label: 'Review Transactions', type: 'navigate', url: '/Contacts' },
          { label: 'Generate Update', tool: 'generateTransactionSummaryTool', args: {} },
          { label: 'Dismiss', type: 'dismiss' }
        ]
      });
    }

    // Trigger 4: Stale leads
    const staleLeads = leads.filter(lead => {
      if (!lead.lastContactDate) return true;
      const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContactDate)) / (1000 * 60 * 60 * 24));
      return daysSinceContact >= 7;
    });

    if (staleLeads.length >= 3) {
      suggestions.push({
        type: 'lead_followup',
        priority: 'high',
        message: `${staleLeads.length} leads haven't been contacted in 7+ days. Want me to draft follow-up messages?`,
        actions: [
          { label: 'Draft Follow-Ups', tool: 'draftPersonalizedOutreachTool', args: {} },
          { label: 'View Leads', type: 'navigate', url: '/Contacts' },
          { label: 'Dismiss', type: 'dismiss' }
        ]
      });
    }

    // Trigger 5: Market data changes (check if new Redfin data)
    const marketData = await base44.entities.RedfinMarketData.filter({ 
      userId: user.id 
    }, '-dataDate', 1).catch(() => []);

    if (marketData.length > 0) {
      const latestData = marketData[0];
      const dataAge = Math.floor((Date.now() - new Date(latestData.created_date)) / (1000 * 60 * 60));
      
      // If we have fresh market data (< 24 hours) with significant changes
      if (dataAge < 24 && latestData.medianSalePriceMoM) {
        const priceChange = Math.abs(latestData.medianSalePriceMoM);
        
        if (priceChange >= 3) {
          const direction = latestData.medianSalePriceMoM > 0 ? 'up' : 'down';
          suggestions.push({
            type: 'market_update',
            priority: 'medium',
            message: `Market prices ${direction} ${priceChange.toFixed(1)}% this month. Want to create a market update post?`,
            actions: [
              { label: 'Create Market Update', tool: 'generateMarketReportTool', args: {} },
              { label: 'View Data', type: 'navigate', url: '/Market' },
              { label: 'Dismiss', type: 'dismiss' }
            ]
          });
        }
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Return top 2 suggestions
    return suggestions.slice(0, 2);

  } catch (error) {
    console.error('[ProactiveSuggestions] Error:', error);
    return [];
  }
}

/**
 * Format suggestion as a chat message bubble
 * @param {object} suggestion - Suggestion object
 * @returns {object} Message object
 */
export function formatSuggestionAsMessage(suggestion) {
  return {
    role: 'assistant',
    content: suggestion.message,
    actions: suggestion.actions,
    timestamp: new Date().toISOString(),
    isProactive: true,
    priority: suggestion.priority
  };
}