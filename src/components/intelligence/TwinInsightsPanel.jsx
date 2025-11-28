import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { findTwinAgents } from '@/api/functions';
import { getProvenMethods } from '@/api/functions';
import ProvenMethodBadge from './ProvenMethodBadge';

export default function TwinInsightsPanel({ userId }) {
  const [twins, setTwins] = useState([]);
  const [provenMethods, setProvenMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTwinData();
  }, [userId]);

  const loadTwinData = async () => {
    try {
      setLoading(true);
      const [twinResponse, methodsResponse] = await Promise.all([
        findTwinAgents(),
        getProvenMethods()
      ]);

      setTwins(twinResponse.data?.twins || []);
      setProvenMethods(methodsResponse.data?.methods || []);
    } catch (error) {
      console.error('Error loading twin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-600" />
          <p className="text-sm text-slate-600 mt-2">Finding your twin agents...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {twins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              Your Twin Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              We found {twins.length} agents with similar profiles and goals. Learn from their success patterns.
            </p>
            <div className="space-y-3">
              {twins.map((twin, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(twin.similarityScore)}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {twin.matchingFactors?.slice(0, 2).join(' • ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {provenMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Proven Methods for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Based on {provenMethods[0]?.twinCount || 0} similar agents
            </p>
            <div className="space-y-3">
              {provenMethods.slice(0, 5).map((method, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900 mb-1">
                        {method.actionDescription}
                      </p>
                      <p className="text-xs text-slate-600">
                        {method.recommendation}
                      </p>
                    </div>
                    <ProvenMethodBadge 
                      successRate={method.twinSuccessRate || method.successRate}
                      twinCount={method.twinCount}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {twins.length === 0 && provenMethods.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-600 mb-4">
              Complete your Agent Intelligence Profile to unlock twin matching and proven methods
            </p>
            <Button onClick={loadTwinData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}