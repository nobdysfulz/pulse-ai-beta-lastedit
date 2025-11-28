import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./Dashboard'));
const Goals = React.lazy(() => import('./Goals'));
const Market = React.lazy(() => import('./Market'));
const Contacts = React.lazy(() => import('./Contacts'));
const Settings = React.lazy(() => import('./Settings'));
const GoalPlanner = React.lazy(() => import('./GoalPlanner'));
const IntelligenceSurvey = React.lazy(() => import('./IntelligenceSurvey'));
const PersonalAdvisor = React.lazy(() => import('./PersonalAdvisor'));
const RolePlay = React.lazy(() => import('./RolePlay'));
const ContentStudio = React.lazy(() => import('./ContentStudio'));
const AdminTaskTemplates = React.lazy(() => import('./AdminTaskTemplates'));
const AdminContentConfig = React.lazy(() => import('./AdminContentConfig'));
const AllObjections = React.lazy(() => import('./AllObjections'));
const RolePlaySession = React.lazy(() => import('./RolePlaySession'));
const MyMarketPack = React.lazy(() => import('./MyMarketPack'));
const Plans = React.lazy(() => import('./Plans'));
const SessionResults = React.lazy(() => import('./SessionResults'));
const Agents = React.lazy(() => import('./Agents'));
const UsageDetails = React.lazy(() => import('./UsageDetails'));
const GoogleAuthConfirmation = React.lazy(() => import('./GoogleAuthConfirmation'));
const FacebookAuthConfirmation = React.lazy(() => import('./FacebookAuthConfirmation'));
const InstagramAuthConfirmation = React.lazy(() => import('./InstagramAuthConfirmation'));
const SupportAgent = React.lazy(() => import('./SupportAgent'));
const PlatformMetrics = React.lazy(() => import('./PlatformMetrics'));
const AdminUserRepair = React.lazy(() => import('./AdminUserRepair'));
const SsoLogin = React.lazy(() => import('./SsoLogin'));
const ToDo = React.lazy(() => import('./ToDo'));
const KnowledgeBase = React.lazy(() => import('./KnowledgeBase'));
const GoogleWorkspaceAuthConfirmation = React.lazy(() => import('./GoogleWorkspaceAuthConfirmation'));
const MicrosoftAuthConfirmation = React.lazy(() => import('./MicrosoftAuthConfirmation'));
const LinkedInAuthConfirmation = React.lazy(() => import('./LinkedInAuthConfirmation'));
const ZoomAuthConfirmation = React.lazy(() => import('./ZoomAuthConfirmation'));
const AgentsOnboarding = React.lazy(() => import('./AgentsOnboarding'));
const Onboarding = React.lazy(() => import('./onboarding'));
const EmergencyRecovery = React.lazy(() => import('./EmergencyRecovery'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* OAuth Confirmation Routes - Must come before wildcard */}
      <Route path="/GoogleAuthConfirmation" element={<GoogleAuthConfirmation />} />
      <Route path="/GoogleWorkspaceAuthConfirmation" element={<GoogleWorkspaceAuthConfirmation />} />
      <Route path="/FacebookAuthConfirmation" element={<FacebookAuthConfirmation />} />
      <Route path="/InstagramAuthConfirmation" element={<InstagramAuthConfirmation />} />
      <Route path="/MicrosoftAuthConfirmation" element={<MicrosoftAuthConfirmation />} />
      <Route path="/LinkedInAuthConfirmation" element={<LinkedInAuthConfirmation />} />
      <Route path="/ZoomAuthConfirmation" element={<ZoomAuthConfirmation />} />
      <Route path="/SsoLogin" element={<SsoLogin />} />
      
      {/* Main App Routes */}
      <Route path="/Dashboard" element={<Navigate to="/ToDo" replace />} />
      <Route path="/LandingPage" element={<Navigate to="/ToDo" replace />} />
      <Route path="/Goals" element={<Goals />} />
      <Route path="/Market" element={<Market />} />
      <Route path="/Contacts" element={<Contacts />} />
      <Route path="/Settings" element={<Settings />} />
      <Route path="/GoalPlanner" element={<GoalPlanner />} />
      <Route path="/IntelligenceSurvey" element={<IntelligenceSurvey />} />
      <Route path="/PersonalAdvisor" element={<PersonalAdvisor />} />
      <Route path="/RolePlay" element={<RolePlay />} />
      <Route path="/ContentStudio" element={<ContentStudio />} />
      <Route path="/AdminTaskTemplates" element={<AdminTaskTemplates />} />
      <Route path="/AdminContentConfig" element={<AdminContentConfig />} />
      <Route path="/AllObjections" element={<AllObjections />} />
      <Route path="/RolePlaySession" element={<RolePlaySession />} />
      <Route path="/MyMarketPack" element={<MyMarketPack />} />
      <Route path="/Plans" element={<Plans />} />
      <Route path="/SessionResults" element={<SessionResults />} />
      <Route path="/Agents" element={<Agents />} />
      <Route path="/UsageDetails" element={<UsageDetails />} />
      <Route path="/SupportAgent" element={<SupportAgent />} />
      <Route path="/PlatformMetrics" element={<PlatformMetrics />} />
      <Route path="/AdminUserRepair" element={<AdminUserRepair />} />
      <Route path="/ToDo" element={<ToDo />} />
      <Route path="/KnowledgeBase" element={<KnowledgeBase />} />
      <Route path="/AgentsOnboarding" element={<AgentsOnboarding />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/EmergencyRecovery" element={<EmergencyRecovery />} />
      
      {/* Default route */}
      <Route path="/" element={<Navigate to="/ToDo" replace />} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/ToDo" replace />} />
    </Routes>
  );
}