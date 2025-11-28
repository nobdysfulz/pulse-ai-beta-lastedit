import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Home, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LoadingIndicator from '../../ui/LoadingIndicator';

export default function MarketSnapshot({ userId }) {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      loadMarketData();
    }
  }, [userId]);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await base44.functions.invoke('fetchRedfinMarketData');

      if (response.data.error) {
        // Check if it's a 404/not found error
        if (response.status === 404 || response.data.error.includes('not found') || response.data.error.includes('unavailable')) {
            console.log('[MarketSnapshot] Market data unavailable, showing empty state.');
            setMarketData(null); // This will trigger the empty state UI instead of error UI
            return;
        }
        setError(response.data.error);
        return;
      }

      setMarketData(response.data);
    } catch (error) {
      console.error('[MarketSnapshot] Error loading data:', error);
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadMarketData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-green-600" />
            Market Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingIndicator size="sm" text="Loading market data..." />
        </CardContent>
      </Card>);

  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-green-600" />
            Market Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>);

  }

  if (!marketData?.metrics) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-green-600" />
                Market Snapshot
            </CardTitle>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
            <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No Market Data Available</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                We couldn't find data for your current location settings.
            </p>
            <Button 
                variant="link" 
                size="sm" 
                className="mt-2 text-xs"
                onClick={() => window.location.href='/Settings?tab=market'}
            >
                Check Settings
            </Button>
          </div>
        </CardContent>
      </Card>);
  }

  const { metrics, location } = marketData;

  const getTrendIcon = (value) => {
    if (!value) return null;
    const numValue = parseFloat(value);
    return numValue >= 50 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (value) => {
    if (!value) return 'text-gray-500';
    const numValue = parseFloat(value);
    return numValue >= 50 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-green-600" />
            Market Snapshot
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}>

            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-gray-500">{location}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700 text-xs font-medium">Active Listings</span>
            </div>
            <div className="text-gray-900 text-2xl font-bold">
              {metrics.activeListings || 0}
            </div>
            {metrics.totalSampleSize &&
            <p className="text-gray-500 mt-1 text-xs">
                of {metrics.totalSampleSize} total
              </p>
            }
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700 text-xs font-medium">Median DOM</span>
            </div>
            <div className="text-gray-900 text-2xl font-bold">
              {metrics.medianDaysOnMarket || 'N/A'}
            </div>
            {metrics.medianDaysOnMarket &&
            <p className="text-gray-500 mt-1 text-xs">days on market</p>
            }
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Absorption Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {metrics.absorptionRate || 'N/A'}
              </span>
              {metrics.absorptionRate &&
              <Badge variant="outline" className="text-xs">
                  {parseFloat(metrics.absorptionRate) >= 20 ? 'Strong' : 'Moderate'}
                </Badge>
              }
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-gray-700">List-to-Sale Ratio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {metrics.listToSaleRatio || 'N/A'}
              </span>
              {metrics.listToSaleRatio &&
              <Badge variant="outline" className="text-xs">
                  {parseFloat(metrics.listToSaleRatio) >= 95 ? 'Seller Market' : 'Buyer Market'}
                </Badge>
              }
            </div>
          </div>

          {metrics.medianListPrice &&
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Median Price</span>
              <span className="text-sm font-bold text-gray-900">
                ${metrics.medianListPrice.toLocaleString()}
              </span>
            </div>
          }

          {metrics.pricePerSqft &&
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Price per Sqft</span>
              <span className="text-sm font-bold text-gray-900">
                ${metrics.pricePerSqft}
              </span>
            </div>
          }

          {metrics.monthsOfSupply &&
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Months of Supply</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {metrics.monthsOfSupply}
                </span>
                <Badge variant="outline" className="text-xs">
                  {parseFloat(metrics.monthsOfSupply) < 5 ? 'Low Inventory' :
                parseFloat(metrics.monthsOfSupply) > 7 ? 'High Inventory' :
                'Balanced'}
                </Badge>
              </div>
            </div>
          }
        </div>

        {marketData.lastUpdated &&
        <p className="text-xs text-gray-500 text-center pt-2 border-t">
            Updated: {new Date(marketData.lastUpdated).toLocaleString()}
          </p>
        }
      </CardContent>
    </Card>);

}