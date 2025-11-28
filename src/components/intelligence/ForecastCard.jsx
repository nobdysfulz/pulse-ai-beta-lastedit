import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/components/lib/utils';

export default function ForecastCard({ forecast, businessPlan, goalMetrics }) {
  const hasData = forecast && (forecast.growthProbability !== undefined || forecast.nextPeriodScore !== undefined);

  const growthProbability = forecast?.growthProbability || 0;
  const nextPeriodScore = forecast?.nextPeriodScore || 0;

  // Prefer goal metrics (live data) over business plan (static plan)
  const forecastedGCI = goalMetrics?.gciTarget || businessPlan?.gciRequired || 0;
  const forecastedDeals = goalMetrics?.dealsTarget || businessPlan?.totalDealsNeeded || 0;

  const currentGCI = goalMetrics?.gciCurrent || 0;
  const currentDeals = goalMetrics?.dealsCurrent || 0;

  const progressPercent = forecastedGCI > 0 ? currentGCI / forecastedGCI * 100 : 0;

  const probabilityColor =
  growthProbability >= 70 ? 'text-green-600' :
  growthProbability >= 40 ? 'text-yellow-600' :
  'text-red-600';

  const hasSufficientData = hasData && (growthProbability > 0 || nextPeriodScore > 0);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Forecast & Projections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSufficientData ?
        <div className="text-center py-8 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Gathering Trend Data</p>
              <p className="text-xs text-gray-600">
                Your forecast will appear once at least a week of data is collected
              </p>
            </div>
          </div> :

        <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="text-gray-700 mb-2 text-xs font-medium block">Growth Probability</span>
                <div className="text-gray-900 text-2xl font-bold">
                  {Math.round(growthProbability)}%
                </div>
                <p className="text-gray-500 mt-1 text-xs">Next 7 days</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="text-gray-700 mb-2 text-xs font-medium block">Next Period Score</span>
                <div className="text-gray-900 text-2xl font-bold">
                  {Math.round(nextPeriodScore)}
                </div>
                <p className="text-gray-500 mt-1 text-xs">Projected in 14 days</p>
              </div>
            </div>

            {forecastedGCI > 0 &&
          <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 block">Annual GCI Target</span>
                    <span className="text-xs text-gray-500">${currentGCI.toLocaleString()} earned</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    ${forecastedGCI.toLocaleString()}
                  </span>
                </div>

                {forecastedDeals > 0 &&
            <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block">Target Deals</span>
                      <span className="text-xs text-gray-500">{currentDeals} closed</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {forecastedDeals}
                    </span>
                  </div>
            }

                <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                  <div className="bg-violet-600 h-3 rounded-full transition-all"

              style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-600 text-center">
                  {Math.round(progressPercent)}% of annual goal completed
                </p>
              </div>
          }
          </>
        }
      </CardContent>
    </Card>);

}