import React, { useContext } from 'react';
import { UserContext } from './context/UserContext';

export default function DebugInfo() {
  const { user, onboarding, loading, error } = useContext(UserContext);
  
  // Check if we should show debug info (only in development or with query param)
  const urlParams = new URLSearchParams(window.location.search);
  const showDebug = urlParams.get('debug') === 'true';
  
  if (!showDebug) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: loading ? '#EF4444' : '#22C55E', 
      color: 'white', 
      padding: '12px', 
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      minWidth: '200px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        🔍 Debug Info
      </div>
      <div style={{ marginBottom: '4px' }}>
        Loading: <strong>{loading ? '🔴 TRUE' : '🟢 FALSE'}</strong>
      </div>
      <div style={{ marginBottom: '4px' }}>
        User: <strong>{user ? `✅ ${user.email}` : '❌ None'}</strong>
      </div>
      <div style={{ marginBottom: '4px' }}>
        Onboarding: <strong>{onboarding ? '✅ Loaded' : '❌ None'}</strong>
      </div>
      {onboarding && (
        <>
          <div style={{ marginBottom: '4px', paddingLeft: '10px', fontSize: '11px' }}>
            Core: <strong>{onboarding.onboardingCompleted ? '✅' : '❌'}</strong>
          </div>
          <div style={{ marginBottom: '4px', paddingLeft: '10px', fontSize: '11px' }}>
            Agent: <strong>{onboarding.agentOnboardingCompleted ? '✅' : '❌'}</strong>
          </div>
          <div style={{ marginBottom: '4px', paddingLeft: '10px', fontSize: '11px' }}>
            CallCenter: <strong>{onboarding.callCenterOnboardingCompleted ? '✅' : '❌'}</strong>
          </div>
        </>
      )}
      {error && (
        <div style={{ marginTop: '8px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}
      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.8 }}>
        Add ?debug=true to URL to show
      </div>
    </div>
  );
}