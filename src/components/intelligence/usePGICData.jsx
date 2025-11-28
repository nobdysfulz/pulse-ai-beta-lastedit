import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const CACHE_KEY_PREFIX = 'pgicData_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function usePGICData(userId, forceRefresh = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const getCacheKey = useCallback(() => `${CACHE_KEY_PREFIX}:${userId}`, [userId]);

  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

      // Check if cached data seems empty/invalid (all zeros)
      const hasZeroScores = parsed.data?.scores?.pulse === 0 && 
                          parsed.data?.scores?.gane === 0 && 
                          parsed.data?.scores?.moro === 0;

      if (isExpired || hasZeroScores) {
        console.log('[usePGICData] Cache expired or empty, invalidating...');
        localStorage.removeItem(getCacheKey());
        return null;
      }

      return parsed;
    } catch (err) {
      console.error('[usePGICData] Cache read error:', err);
      return null;
    }
  }, [getCacheKey]);

  const setCachedData = useCallback((data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
    } catch (err) {
      console.error('[usePGICData] Cache write error:', err);
    }
  }, [getCacheKey]);

  const fetchPGICData = useCallback(async (bypassCache = false) => {
    if (!userId) return;

    // Check cache first unless bypassing
    if (!bypassCache) {
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setLastRefreshed(new Date(cached.timestamp));
        setLoading(false);
        return cached.data;
      }
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[usePGICData] Starting data fetch...');

      // Fetch from PGIC endpoints in parallel
      const [scoresData, insightsData, forecastData] = await Promise.all([
        fetchScores(),
        fetchInsights(),
        fetchForecast()
      ]);

      console.log('[usePGICData] Data fetched successfully:', {
        hasScores: !!scoresData,
        scoresValues: scoresData,
        insightsCount: insightsData?.length || 0,
        hasForecast: !!forecastData
      });

      const combinedData = {
        scores: scoresData,
        insights: insightsData,
        forecast: forecastData
      };

      console.log('[usePGICData] Setting state with combined data:', combinedData);

      setData(combinedData);
      setLastRefreshed(new Date());
      setCachedData(combinedData);

      return combinedData;
    } catch (err) {
      console.error('[usePGICData] Fetch error:', err);
      setError(err.message || 'Failed to load intelligence data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, getCachedData, setCachedData]);

  const fetchScores = async () => {
    try {
      console.log('[usePGICData] Fetching scores for userId:', userId);
      const records = await base44.entities.PGICRecord.filter(
        { userId },
        '-timestamp',
        30
      );

      console.log('[usePGICData] Found records:', records?.length || 0);

      // Filter out simulated/baseline data from previous logic
      const validRecords = records?.filter(r => {
        const source = r.cacheMeta?.source;
        const model = r.modelVersion;
        const isSimulated = 
            source === 'baseline' || 
            source === 'fallback' || 
            source === 'backfill' ||
            (model && model.includes('backfill'));
        return !isSimulated;
      }) || [];

      if (validRecords.length > 0) {
        const record = validRecords[0];
        
        // Check if record has valid rawMetrics
        const hasRawMetrics = record.rawMetrics && Object.keys(record.rawMetrics).length > 0;

        if (hasRawMetrics) {
          // Calculate trend client-side if needed
          let trend = record.trend || {};
          if (records.length > 1) {
            const previous = records[1];
            if (!trend.pulse) trend.pulse = (record.pulse || 0) - (previous.pulse || 0);
            if (!trend.gane) trend.gane = (record.gane || 0) - (previous.gane || 0);
            if (!trend.moro) trend.moro = (record.moro || 0) - (previous.moro || 0);
            if (!trend.overall) trend.overall = (record.overall || 0) - (previous.overall || 0);
          }

          console.log('[usePGICData] Using existing record with scores:', {
            pulse: record.pulse,
            gane: record.gane,
            moro: record.moro,
            overall: record.overall,
            trend
          });
          return {
            pulse: record.pulse || 0,
            gane: record.gane || 0,
            moro: record.moro || 0,
            overall: record.overall || 0,
            trend: trend,
            rawMetrics: record.rawMetrics || {},
            timestamp: record.timestamp
          };
        } else {
          console.log('[usePGICData] Found record but missing rawMetrics, forcing recalculation...');
        }
      }

      // If no valid records (or they were all filtered out), return zeros
      console.log('[usePGICData] No valid PGIC records found. Returning zeros.');
      // This prevents "fake" scores from appearing before the user has actually done anything.
      console.log('[usePGICData] No PGIC records found. Returning zeros for new user.');
      
      return {
        pulse: 0,
        gane: 0,
        moro: 0,
        overall: 0,
        trend: { pulse: 0, gane: 0, moro: 0, overall: 0 },
        rawMetrics: {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[usePGICData] Error fetching scores:', error);
      return {
        pulse: 0,
        gane: 0,
        moro: 0,
        overall: 0,
        trend: {},
        rawMetrics: {}
      };
    }
  };

  const fetchInsights = async () => {
    try {
      const records = await base44.entities.PGICRecord.filter(
        { userId },
        '-timestamp',
        1
      );

      if (records && records.length > 0) {
        return records[0].insights || [];
      }

      return [];
    } catch (error) {
      console.error('[usePGICData] Error fetching insights:', error);
      return [];
    }
  };

  const fetchForecast = async () => {
    try {
      const records = await base44.entities.PGICRecord.filter(
        { userId },
        '-timestamp',
        1
      );

      if (records && records.length > 0) {
        return records[0].forecast || {
          growthProbability: 0,
          nextPeriodScore: 0
        };
      }

      return {
        growthProbability: 0,
        nextPeriodScore: 0
      };
    } catch (error) {
      console.error('[usePGICData] Error fetching forecast:', error);
      return {
        growthProbability: 0,
        nextPeriodScore: 0
      };
    }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('[usePGICData] Forcing refresh - calling calculatePGICScores...');
      
      // Force recalculation
      const response = await base44.functions.invoke('calculatePGICScores', {
        forceRefresh: true
      });
      
      console.log('[usePGICData] calculatePGICScores response:', response);
      
      if (!response?.data) {
        throw new Error('No data returned from calculation');
      }
      
      // Now fetch all fresh data
      await fetchPGICData(true);
      
      console.log('[usePGICData] Refresh complete');
    } catch (err) {
      console.error('[usePGICData] Refresh failed:', err);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, [fetchPGICData]);

  useEffect(() => {
    if (userId && (forceRefresh || !data)) {
      fetchPGICData(forceRefresh);
    }
  }, [userId, forceRefresh]);

  return {
    data,
    loading,
    error,
    lastRefreshed,
    refreshing,
    refresh
  };
}