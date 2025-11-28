import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import LoadingIndicator from '../ui/LoadingIndicator';
import { format } from 'date-fns';

export default function CrmSettings() {
  const { user } = useContext(UserContext);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const crmConnections = await base44.entities.CrmConnection.filter({
        userId: user.id
      });
      setConnections(crmConnections);
    } catch (error) {
      console.error('[CRM-Settings] Error loading connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connection) => {
    setSyncing({ ...syncing, [connection.id]: true });
    
    try {
      let result;
      if (connection.crmType === 'follow_up_boss') {
        result = await base44.functions.invoke('syncCrmFromFub', {});
      } else if (connection.crmType === 'lofty') {
        result = await base44.functions.invoke('syncCrmFromLofty', {});
      }
      
      toast.success(`Synced ${result.total} contacts from ${connection.crmType}`);
      await loadConnections();
    } catch (error) {
      console.error('[CRM-Settings] Sync error:', error);
      toast.error('Failed to sync contacts');
    } finally {
      setSyncing({ ...syncing, [connection.id]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIndicator text="Loading settings..." size="md" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">CRM Settings</h2>
          <p className="text-sm text-gray-600">
            Manage your CRM integrations and sync settings
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connected CRM Systems</CardTitle>
            <CardDescription>
              Your CRM integrations and their sync status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Connections</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Connect your CRM to sync contacts automatically
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/settings'}>
                  Go to Settings
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map(connection => (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {connection.crmType.replace('_', ' ')}
                        </h4>
                        <Badge className={
                          connection.connectionStatus === 'connected' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }>
                          {connection.connectionStatus === 'connected' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Disconnected</>
                          )}
                        </Badge>
                      </div>
                      
                      {connection.lastSync && (
                        <p className="text-sm text-gray-500">
                          Last synced: {format(new Date(connection.lastSync), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleSync(connection)}
                      disabled={syncing[connection.id] || connection.connectionStatus !== 'connected'}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing[connection.id] ? 'animate-spin' : ''}`} />
                      {syncing[connection.id] ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>
              Configure how contacts are synced and updated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Automatic Scoring</h4>
                  <p className="text-sm text-gray-500">
                    PGIC automatically calculates follow-up priority scores
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Task Creation</h4>
                  <p className="text-sm text-gray-500">
                    Nova creates follow-up tasks for new contacts
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Activity Logging</h4>
                  <p className="text-sm text-gray-500">
                    Automatically log all CRM interactions
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}