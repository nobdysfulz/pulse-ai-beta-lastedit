import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import LoadingIndicator from '../../ui/LoadingIndicator';
import { TrendingUp } from 'lucide-react';

export default function PerformanceVsMarket({ userId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [transactions, goals, marketDataResponse, agentProfile] = await Promise.all([
        base44.entities.Transaction.filter(
          { userId, status: 'closed' },
          '-closingDate',
          50
        ),
        base44.entities.Goal.filter({ userId, status: 'active' }),
        base44.functions.invoke('fetchRedfinMarketData').catch(() => null),
        base44.entities.AgentIntelligenceProfile.filter({ userId })
      ]);

      const userDeals = transactions?.length || 0;
      const userBuyerDeals = transactions?.filter(t => t.transactionType === 'buyer').length || 0;
      const userSellerDeals = transactions?.filter(t => t.transactionType === 'seller').length || 0;

      const profile = agentProfile?.[0];
      const experienceYears = profile?.yearsExperience || 3;
      
      let marketAvgDeals = 12;
      let marketAvgBuyerDeals = 7;
      let marketAvgListings = 5;

      if (marketDataResponse?.data?.metrics) {
        const metrics = marketDataResponse.data.metrics;
        const homesSold = metrics.homesSold || 1000;
        const medianDom = metrics.medianDaysOnMarket || 30;
        const absorptionRate = parseFloat(metrics.absorptionRate) || 20;
        
        const velocityMultiplier = medianDom < 20 ? 1.3 : medianDom < 40 ? 1.0 : 0.8;
        const experienceMultiplier = Math.min(experienceYears / 5, 1.5);
        
        const baseAgentDeals = Math.max(8, Math.min(20, (absorptionRate / 100) * 15));
        marketAvgDeals = Math.round(baseAgentDeals * velocityMultiplier * experienceMultiplier);
        marketAvgBuyerDeals = Math.round(marketAvgDeals * 0.58);
        marketAvgListings = Math.round(marketAvgDeals * 0.42);
      }

      const totalGoal = goals?.find(g => g.title === 'Total Buyers Closed' || g.title === 'Total Listings Closed');
      const buyerGoal = goals?.find(g => g.title === 'Total Buyers Closed');
      const listingGoal = goals?.find(g => g.title === 'Total Listings Closed');

      const data = [
        {
          name: 'Total Deals',
          Your: userDeals,
          Market: marketAvgDeals,
          Goal: totalGoal?.targetValue || marketAvgDeals
        },
        {
          name: 'Buyer Deals',
          Your: userBuyerDeals,
          Market: marketAvgBuyerDeals,
          Goal: buyerGoal?.targetValue || marketAvgBuyerDeals
        },
        {
          name: 'Listings',
          Your: userSellerDeals,
          Market: marketAvgListings,
          Goal: listingGoal?.targetValue || marketAvgListings
        }
      ];

      setChartData(data);
    } catch (error) {
      console.error('[PerformanceVsMarket] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Performance vs Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingIndicator size="sm" text="Loading performance data..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Performance vs Market Average
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Your" fill="#7C3AED" name="Your Performance" />
            <Bar dataKey="Market" fill="#94A3B8" name="Market Average" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}