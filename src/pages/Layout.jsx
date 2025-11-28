
import React from 'react';
import AppLayout from './components/layout/AppLayout';
import UserProvider from './components/context/UserProvider';
import ReferralTracker from './components/referrals/ReferralTracker';
import SupportChatWidget from './components/support/SupportChatWidget';
import ErrorBoundary from './components/ErrorBoundary';

const DesignSystemStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      /* Default Violet Shadcn/UI Theme */
      --background: 0 0% 100%;
      --foreground: 224 71.4% 4.1%;
      --card: 0 0% 100%;
      --card-foreground: 224 71.4% 4.1%;
      --popover: 0 0% 100%;
      --popover-foreground: 224 71.4% 4.1%;
      --primary: 262.1 83.3% 57.8%;
      --primary-foreground: 210 20% 98%;
      --secondary: 220 14.3% 95.9%;
      --secondary-foreground: 220.9 39.3% 11%;
      --muted: 220 14.3% 95.9%;
      --muted-foreground: 220 8.9% 46.1%;
      --accent: 220 14.3% 95.9%;
      --accent-foreground: 220.9 39.3% 11%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 20% 98%;
      --border: 220 13% 91%;
      --input: 220 13% 91%;
      --ring: 262.1 83.3% 57.8%;
      --radius: 0.5rem;
      --chart-1: 12 76% 61%;
      --chart-2: 173 58% 39%;
      --chart-3: 197 37% 24%;
      --chart-4: 43 74% 66%;
      --chart-5: 27 87% 67%;


    }

    .dark {
      --background: 224 71.4% 4.1%;
      --foreground: 210 20% 98%;
      --card: 224 71.4% 4.1%;
      --card-foreground: 210 20% 98%;
      --popover: 224 71.4% 4.1%;
      --popover-foreground: 210 20% 98%;
      --primary: 263.4 70% 50.4%;
      --primary-foreground: 210 20% 98%;
      --secondary: 215 27.9% 16.9%;
      --secondary-foreground: 210 20% 98%;
      --muted: 215 27.9% 16.9%;
      --muted-foreground: 217.9 10.6% 64.9%;
      --accent: 215 27.9% 16.9%;
      --accent-foreground: 210 20% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 210 20% 98%;
      --border: 215 27.9% 16.9%;
      --input: 215 27.9% 16.9%;
      --ring: 263.4 70% 50.4%;
      --chart-1: 220 70% 50%;
      --chart-2: 160 60% 45%;
      --chart-3: 30 80% 55%;
      --chart-4: 280 65% 60%;
      --chart-5: 340 75% 55%;
    }

    /* Global Typography */
    body {
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: hsl(var(--foreground));
      background-color: hsl(var(--background));
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'SF Pro Display', 'Inter', sans-serif;
    }

    /* Utility Overrides & Additions */
    .text-tiny { font-size: 0.75rem; line-height: 1rem; }
    .text-hero { font-size: 2rem; font-weight: 700; }
    
    /* Animations */
    @keyframes complete {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    .animate-task-complete { animation: complete 0.35s ease-in-out; }
    .animate-shimmer { animation: shimmer 2s infinite linear; background: linear-gradient(to right, #f6f7f8 8%, #edeef1 18%, #f6f7f8 33%); background-size: 1000px 100%; }

    /* Professional Print Styles */
    @media print {
      /* ... keep existing code (all print styles) ... */
    }
  `}</style>
);

export default function Layout({ children, currentPageName }) {
    return (
        <ErrorBoundary>
            <UserProvider>
                {/* Preconnect to critical third-party origins */}
                <link rel="preconnect" href="https://qtrypzzcjebvfcihiynt.supabase.co" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://base44.app" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://app.base44.com" crossOrigin="anonymous" />
                
                <DesignSystemStyles />
                <AppLayout>
                    {children}
                    <ReferralTracker />
                    <SupportChatWidget />
                </AppLayout>
            </UserProvider>
        </ErrorBoundary>
    );
}
