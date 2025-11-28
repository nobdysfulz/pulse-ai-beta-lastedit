import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import ContextualSidebar from '../components/layout/ContextualSidebar';
import LoadingIndicator from '../components/ui/LoadingIndicator';

export default function PlansPage() {
  const { user, loading: contextLoading } = useContext(UserContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plans');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(null);
  const [agentSubscription, setAgentSubscription] = useState(null);
  const [selectedPlanUrl, setSelectedPlanUrl] = useState(null);

  useEffect(() => {
    if (!contextLoading && user) {
      loadData();
    }
  }, [contextLoading, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, creditsData, subscriptionData] = await Promise.all([
      base44.entities.ProductOffering.filter({ isActive: true }, 'sortOrder'),
      base44.entities.UserCredit.filter({ userId: user.id }),
      base44.entities.UserAgentSubscription.filter({ userId: user.id })]
      );

      setProducts(productsData);
      setUserCredits(creditsData[0] || null);
      setAgentSubscription(subscriptionData[0] || null);
    } catch (error) {
      console.error('Error loading plans data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = () => {
    navigate(createPageUrl('Settings?tab=account'));
  };

  const tabs = [
  { id: 'plans', label: 'Plans & Pricing' },
  { id: 'manage', label: 'Manage My Account' }];


  useEffect(() => {
    if (activeTab === 'manage') {
      handleManageAccount();
    }
  }, [activeTab]);

  const getCurrentPlanInfo = () => {
    const planName = user?.subscriptionTier || 'Free';

    const features = [
    `${userCredits?.creditsRemaining || 100} credits/month`,
    '5 basic role-play scenarios',
    '15 core scripts',
    'Monthly market updates',
    'Limited AI conversations'];


    const price = '$0 per month';

    return { planName, features, price };
  };

  const renderSidebar = () => {
    const currentPlan = getCurrentPlanInfo();
    const defaultThumbnail = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/3ac877de1_PULSEaiicon.png';

    return (
      <div className="space-y-6 pt-6 pr-6 pb-6 pl-6">
        <div className="bg-foreground text-white rounded-lg p-4">
          <div className="bg-gradient-to-br from-muted to-secondary rounded-lg p-4 mb-4">
            <img
              src={defaultThumbnail}
              alt="Current Plan"
              className="w-full h-32 object-contain rounded-lg mb-4" />

          </div>
          <div className="text-center mb-4">
            <h4 className="text-2xl font-bold mb-2">{currentPlan.planName}</h4>
            <div className="space-y-1 text-sm text-muted-foreground mb-4">
              {currentPlan.features.map((feature, index) =>
              <p key={index}>{feature}</p>
              )}
            </div>
            <p className="text-lg font-semibold">{currentPlan.price}</p>
          </div>
          <Button variant="outline" className="w-full bg-background text-foreground hover:bg-muted">
            Your Current Plan
          </Button>
        </div>
      </div>);

  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingIndicator text="Loading plans..." size="lg" />
        </div>);

    }

    if (selectedPlanUrl) {
      return (
        <div className="h-full flex flex-col space-y-4">
          <div className="flex items-center">
            <Button variant="outline" onClick={() => setSelectedPlanUrl(null)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back to Plans
            </Button>
          </div>
          <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden min-h-[600px]">
            <iframe
              src={selectedPlanUrl}
              className="w-full h-full border-0"
              title="Plan Checkout"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6">
          <h1 className="text-3xl font-bold text-foreground">Plans & Pricing</h1>
          <p className="text-muted-foreground mt-2">Subscription Plans</p>
        </div>

        <div className="grid gap-6">
          {products.length === 0 ?
          <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No products available at this time.</p>
              </CardContent>
            </Card> :

          products.map((product) =>
          <Card key={product.id} className="bg-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <img
                    src={product.thumbnailUrl || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/3ac877de1_PULSEaiicon.png'}
                    alt={product.productName}
                    className="w-48 h-48 object-cover rounded-lg" />

                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-foreground mb-2">
                            {product.productName}
                          </h3>
                          {product.description &&
                      <p className="text-muted-foreground mb-4">{product.description}</p>
                      }
                        </div>
                        <Button
                      className="ml-4 p-2"
                      variant="ghost"
                      size="icon">

                          <Info className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </div>

                      {product.features && product.features.length > 0 &&
                  <ul className="space-y-2 mb-6">
                          {product.features.map((feature, index) =>
                    <li key={index} className="text-muted-foreground flex items-start">
                              <span className="mr-2">•</span>
                              <span>{feature}</span>
                            </li>
                    )}
                        </ul>
                  }

                      <div className="flex items-center justify-between mt-6">
                        <div>
                          <p className="text-3xl font-bold text-foreground">{product.price}</p>
                        </div>
                        <Button className="bg-green-600 text-white px-8 py-3 text-lg font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-transparent h-10 hover:bg-[hsl(var(--status-success))]/90"

                    onClick={() => setSelectedPlanUrl(product.buttonLink)}>

                          {product.buttonText}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )
          }
        </div>
      </div>);

  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator text="Loading..." size="lg" />
      </div>);

  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-background">
      <title>Plans & Pricing - PULSE Intelligence</title>
      <meta name="description" content="Upgrade your PULSE Intelligence subscription and unlock premium features." />
      
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab} />


      <div className="flex-1 flex overflow-hidden bg-background">
        <div className="bg-background pt-6 pr-8 pb-8 pl-8 flex-1 overflow-y-auto">
          {renderMainContent()}
        </div>

        <ContextualSidebar title="">
          {renderSidebar()}
        </ContextualSidebar>
      </div>
    </div>);

}