/**
 * PULSE Intelligence - Context Builder
 * Version: 1.0
 * 
 * Efficiently builds AI context from user data with caching support.
 * Fetches only what's needed and reuses cached data when available.
 */

import { base44 } from '@/api/base44Client';
import { sessionCache } from './sessionCache';
import { calculatePulseScore } from '../pulse/pulseScoring';

/**
 * Build complete context for AI with intelligent caching
 */
export async function buildAIContext(user, options = {}) {
  const {
    includeProfile = true,
    includePulse = true,
    includeMarket = true,
    includeCRM = true,
    includeCalendar = false,
    includeTransactions = false,
    includeSocial = false,
    forceRefresh = false
  } = options;

  const userId = user.id;
  const context = {
    userId,
    timestamp: new Date().toISOString()
  };

  try {
    // User Profile (cached for 1 hour)
    if (includeProfile) {
      let userProfile = !forceRefresh ? sessionCache.get(userId, 'context', 'user_profile') : null;
      
      if (!userProfile) {
        userProfile = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          brokerage: user.brokerage,
          market: user.marketConfig?.primaryTerritory,
          tier: user.subscriptionTier
        };
        sessionCache.set(userId, 'context', 'user_profile', userProfile);
      }
      
      context.userProfile = userProfile;
    }

    // PULSE Score (cached for 15 minutes)
    if (includePulse) {
      let pulseData = !forceRefresh ? sessionCache.get(userId, 'context', 'pulse_score') : null;
      
      if (!pulseData) {
        // Fetch fresh data
        const [actions, goals, agentProfile] = await Promise.all([
          base44.entities.DailyAction.filter({ userId }),
          base44.entities.Goal.filter({ userId }),
          base44.entities.AgentIntelligenceProfile.filter({ userId })
        ]);

        const pulseScore = calculatePulseScore(actions, goals, agentProfile[0]);
        
        pulseData = {
          score: pulseScore.overallScore,
          trend: pulseScore.trend,
          dimensions: {
            planning: pulseScore.planning,
            urgency: pulseScore.urgency,
            leads: pulseScore.leads,
            systems: pulseScore.systems,
            execution: pulseScore.execution
          },
          diagnostics: pulseScore.diagnostics
        };
        
        sessionCache.set(userId, 'context', 'pulse_score', pulseData);
      }
      
      context.pulseScore = pulseData;
    }

    // Market Data (cached for 6 hours)
    if (includeMarket) {
      let marketData = !forceRefresh ? sessionCache.get(userId, 'context', 'market_data') : null;
      
      if (!marketData) {
        const redfinData = await base44.entities.RedfinMarketData.filter(
          { userId },
          '-dataDate',
          1
        );
        
        if (redfinData && redfinData.length > 0) {
          const latest = redfinData[0];
          marketData = {
            territory: latest.territory,
            medianPrice: latest.medianSalePrice,
            medianPriceMoM: latest.medianSalePriceMoM,
            medianPriceYoY: latest.medianSalePriceYoY,
            daysOnMarket: latest.medianDaysOnMarket,
            activeListings: latest.activeListings,
            monthsOfSupply: latest.monthsOfSupply,
            dataDate: latest.dataDate
          };
          
          sessionCache.set(userId, 'context', 'market_data', marketData);
        }
      }
      
      if (marketData) {
        context.marketData = marketData;
      }
    }

    // CRM Snapshot (cached for 10 minutes)
    if (includeCRM) {
      let crmData = !forceRefresh ? sessionCache.get(userId, 'context', 'crm_snapshot') : null;
      
      if (!crmData) {
        const contacts = await base44.entities.Contact.filter({ created_by: user.email });
        
        crmData = {
          totalContacts: contacts.length,
          newLeads: contacts.filter(c => c.leadStatus === 'new').length,
          qualified: contacts.filter(c => c.leadStatus === 'qualified').length,
          appointments: contacts.filter(c => c.leadStatus === 'appointment').length,
          hotLeads: contacts.filter(c => c.temperature === 'hot').length
        };
        
        sessionCache.set(userId, 'context', 'crm_snapshot', crmData);
      }
      
      context.crmSnapshot = crmData;
    }

    // Calendar Summary (cached for 15 minutes)
    if (includeCalendar) {
      let calendarData = !forceRefresh ? sessionCache.get(userId, 'context', 'calendar_events') : null;
      
      // This would require integration with Google/Microsoft Calendar APIs
      // For now, just check if connected
      const connections = await base44.entities.ExternalServiceConnection.filter({
        userId,
        serviceName: { $in: ['google_workspace', 'microsoft_365'] },
        status: 'connected'
      });
      
      if (!calendarData) {
        calendarData = {
          hasCalendar: connections.length > 0,
          provider: connections[0]?.serviceName || null
        };
        
        sessionCache.set(userId, 'context', 'calendar_events', calendarData);
      }
      
      context.calendarSummary = calendarData;
    }

    // Transaction Summary (cached for 15 minutes)
    if (includeTransactions) {
      let transactionData = !forceRefresh ? sessionCache.get(userId, 'context', 'transaction_summary') : null;
      
      if (!transactionData) {
        const transactions = await base44.entities.Transaction.filter({ userId });
        
        transactionData = {
          total: transactions.length,
          active: transactions.filter(t => t.status === 'under_contract').length,
          closing: transactions.filter(t => t.status === 'closing').length,
          pending: transactions.filter(t => t.status === 'pending').length
        };
        
        sessionCache.set(userId, 'context', 'transaction_summary', transactionData);
      }
      
      context.transactionSummary = transactionData;
    }

    // Social Media Stats (cached for 15 minutes)
    if (includeSocial) {
      let socialData = !forceRefresh ? sessionCache.get(userId, 'context', 'social_stats') : null;
      
      if (!socialData) {
        const connections = await base44.entities.ExternalServiceConnection.filter({
          userId,
          serviceName: { $in: ['facebook', 'instagram', 'linkedin'] },
          status: 'connected'
        });
        
        socialData = {
          connectedPlatforms: connections.map(c => c.serviceName),
          hasInstagram: connections.some(c => c.serviceName === 'instagram'),
          hasFacebook: connections.some(c => c.serviceName === 'facebook'),
          hasLinkedIn: connections.some(c => c.serviceName === 'linkedin')
        };
        
        sessionCache.set(userId, 'context', 'social_stats', socialData);
      }
      
      context.socialStats = socialData;
    }

  } catch (error) {
    console.error('[ContextBuilder] Error building context:', error);
  }

  return context;
}

/**
 * Invalidate specific context cache
 */
export function invalidateContext(userId, entityType) {
  const entityMap = {
    'user': 'user_profile',
    'pulse': 'pulse_score',
    'market': 'market_data',
    'crm': 'crm_snapshot',
    'calendar': 'calendar_events',
    'transaction': 'transaction_summary',
    'social': 'social_stats'
  };

  const cacheEntity = entityMap[entityType];
  if (cacheEntity) {
    sessionCache.remove(userId, 'context', cacheEntity);
  }
}

/**
 * Get context with cache status metadata
 */
export async function buildAIContextWithMetadata(user, options = {}) {
  const startTime = Date.now();
  const context = await buildAIContext(user, options);
  const endTime = Date.now();

  const cacheStatus = {
    userProfile: sessionCache.getCacheStatus(user.id, 'context', 'user_profile'),
    pulseScore: sessionCache.getCacheStatus(user.id, 'context', 'pulse_score'),
    marketData: sessionCache.getCacheStatus(user.id, 'context', 'market_data'),
    crmSnapshot: sessionCache.getCacheStatus(user.id, 'context', 'crm_snapshot')
  };

  return {
    context,
    metadata: {
      buildTime: endTime - startTime,
      cacheStatus,
      timestamp: new Date().toISOString()
    }
  };
}