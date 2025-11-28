-- =====================================================
-- PULSE AI - Supabase Database Schema
-- Migration from Base44 to Supabase
-- =====================================================
-- 
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Execute the script
-- 5. All tables and RLS policies will be created automatically
--
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE USER & AUTH TABLES
-- =====================================================

-- User Onboarding
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT,
  completed BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'daily',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Market Config
CREATE TABLE IF NOT EXISTS user_market_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  market_name TEXT,
  market_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Guidelines
CREATE TABLE IF NOT EXISTS user_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guideline_type TEXT,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Knowledge
CREATE TABLE IF NOT EXISTS user_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_type TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Daily Brief
CREATE TABLE IF NOT EXISTS user_daily_brief (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_date DATE DEFAULT CURRENT_DATE,
  summary TEXT,
  key_metrics JSONB DEFAULT '{}'::jsonb,
  tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GOALS & PLANNING
-- =====================================================

-- Goals
CREATE TABLE IF NOT EXISTS goal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Actions
CREATE TABLE IF NOT EXISTS daily_action (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goal(id) ON DELETE SET NULL,
  action_text TEXT NOT NULL,
  action_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Plan
CREATE TABLE IF NOT EXISTS business_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT,
  plan_year INTEGER,
  goals JSONB DEFAULT '[]'::jsonb,
  strategies JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Templates
CREATE TABLE IF NOT EXISTS task_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CRM & CONTACTS
-- =====================================================

-- Contacts (Legacy)
CREATE TABLE IF NOT EXISTS contact (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  source TEXT,
  tags TEXT[],
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Contacts
CREATE TABLE IF NOT EXISTS crm_contact (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  status TEXT DEFAULT 'active',
  stage TEXT,
  score NUMERIC DEFAULT 0,
  last_contact_date TIMESTAMPTZ,
  next_follow_up_date TIMESTAMPTZ,
  source TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Activities
CREATE TABLE IF NOT EXISTS crm_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Notes
CREATE TABLE IF NOT EXISTS contact_note (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Connection (External CRM integrations)
CREATE TABLE IF NOT EXISTS crm_connection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL, -- 'lofty', 'followupboss', 'highlevel', etc.
  connection_name TEXT,
  credentials JSONB DEFAULT '{}'::jsonb, -- encrypted
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS lead (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  lead_source TEXT,
  lead_status TEXT DEFAULT 'new',
  lead_score NUMERIC DEFAULT 0,
  interest_level TEXT,
  budget_range TEXT,
  timeline TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  property_address TEXT,
  transaction_type TEXT, -- 'buyer', 'seller', 'both'
  status TEXT DEFAULT 'pending',
  list_price NUMERIC,
  sale_price NUMERIC,
  commission NUMERIC,
  close_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTELLIGENCE & AI
-- =====================================================

-- Agent Intelligence Profile
CREATE TABLE IF NOT EXISTS agent_intelligence_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  experience_level TEXT,
  specializations TEXT[],
  strengths TEXT[],
  areas_for_improvement TEXT[],
  communication_style TEXT,
  personality_traits JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Intelligence
CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  market_area TEXT,
  data_type TEXT,
  data_value JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  date_collected TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Data
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_area TEXT,
  data_type TEXT,
  value JSONB DEFAULT '{}'::jsonb,
  date DATE DEFAULT CURRENT_DATE,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pulse History
CREATE TABLE IF NOT EXISTS pulse_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pulse_type TEXT,
  pulse_data JSONB DEFAULT '{}'::jsonb,
  insights JSONB DEFAULT '{}'::jsonb,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Agent Conversations
CREATE TABLE IF NOT EXISTS ai_agent_conversation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  conversation_title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Action Log
CREATE TABLE IF NOT EXISTS ai_action_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Prompt Config
CREATE TABLE IF NOT EXISTS ai_prompt_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_name TEXT NOT NULL,
  prompt_template TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  model TEXT DEFAULT 'gpt-4',
  temperature NUMERIC DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROLEPLAY & TRAINING
-- =====================================================

-- RolePlay Scenarios
CREATE TABLE IF NOT EXISTS role_play_scenario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name TEXT NOT NULL,
  scenario_type TEXT,
  description TEXT,
  difficulty_level TEXT DEFAULT 'medium',
  client_persona JSONB DEFAULT '{}'::jsonb,
  objectives TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RolePlay Sessions
CREATE TABLE IF NOT EXISTS role_play_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES role_play_scenario(id) ON DELETE SET NULL,
  session_type TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RolePlay Exchanges
CREATE TABLE IF NOT EXISTS role_play_exchange (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES role_play_session(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL, -- 'agent' or 'client'
  message TEXT NOT NULL,
  timestamp_seconds NUMERIC,
  sentiment_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RolePlay Session Logs
CREATE TABLE IF NOT EXISTS role_play_session_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES role_play_session(id) ON DELETE CASCADE,
  log_type TEXT,
  log_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RolePlay Analysis Reports
CREATE TABLE IF NOT EXISTS role_play_analysis_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES role_play_session(id) ON DELETE CASCADE,
  overall_score NUMERIC,
  strengths TEXT[],
  areas_for_improvement TEXT[],
  detailed_feedback JSONB DEFAULT '{}'::jsonb,
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RolePlay User Progress
CREATE TABLE IF NOT EXISTS role_play_user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_type TEXT,
  sessions_completed INTEGER DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  best_score NUMERIC DEFAULT 0,
  skill_improvements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Personas
CREATE TABLE IF NOT EXISTS client_persona (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_name TEXT NOT NULL,
  persona_type TEXT,
  personality_traits TEXT[],
  communication_style TEXT,
  objections TEXT[],
  goals TEXT[],
  background JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Logs
CREATE TABLE IF NOT EXISTS call_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  call_type TEXT, -- 'inbound', 'outbound'
  call_sid TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTENT & MARKETING
-- =====================================================

-- Generated Content
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  platform TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Preferences
CREATE TABLE IF NOT EXISTS content_preference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Topics
CREATE TABLE IF NOT EXISTS content_topic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_name TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  target_audience TEXT,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Packs
CREATE TABLE IF NOT EXISTS content_pack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_name TEXT NOT NULL,
  description TEXT,
  content_items JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Featured Content Packs
CREATE TABLE IF NOT EXISTS featured_content_pack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_pack_id UUID REFERENCES content_pack(id) ON DELETE CASCADE,
  featured_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Color Palette
CREATE TABLE IF NOT EXISTS brand_color_palette (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  palette_name TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Media Posts
CREATE TABLE IF NOT EXISTS social_media_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_type TEXT,
  content TEXT,
  media_urls TEXT[],
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EMAIL CAMPAIGNS
-- =====================================================

-- Email Templates
CREATE TABLE IF NOT EXISTS email_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  template_type TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  template_id UUID REFERENCES email_template(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Templates
CREATE TABLE IF NOT EXISTS campaign_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  template_type TEXT,
  description TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AGENTS & AUTOMATION
-- =====================================================

-- Agent Configs
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  agent_name TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Voices
CREATE TABLE IF NOT EXISTS agent_voice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_name TEXT NOT NULL,
  voice_id TEXT,
  provider TEXT DEFAULT 'elevenlabs',
  voice_settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Agent Subscriptions
CREATE TABLE IF NOT EXISTS user_agent_subscription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  subscription_tier TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  minutes_used INTEGER DEFAULT 0,
  minutes_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Workflows
CREATE TABLE IF NOT EXISTS automated_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  trigger_type TEXT,
  actions JSONB DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings
CREATE TABLE IF NOT EXISTS meeting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  title TEXT,
  meeting_type TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  meeting_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OBJECTIONS & SCRIPTS
-- =====================================================

-- Objection Scripts
CREATE TABLE IF NOT EXISTS objection_script (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objection_type TEXT NOT NULL,
  objection_text TEXT,
  response_script TEXT,
  success_rate NUMERIC DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREDITS & BILLING
-- =====================================================

-- User Credits
CREATE TABLE IF NOT EXISTS user_credit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  credit_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE IF NOT EXISTS credit_transaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'earn', 'spend', 'refund'
  amount INTEGER NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals
CREATE TABLE IF NOT EXISTS referral (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT,
  status TEXT DEFAULT 'pending',
  reward_amount INTEGER,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Offerings
CREATE TABLE IF NOT EXISTS product_offering (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  credits_required INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTEGRATIONS & EXTERNAL SERVICES
-- =====================================================

-- External Service Connections
CREATE TABLE IF NOT EXISTS external_service_connection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_name TEXT,
  access_token TEXT, -- should be encrypted
  refresh_token TEXT, -- should be encrypted
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSO Tokens
CREATE TABLE IF NOT EXISTS sso_token (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PGIC (Predictive Growth Intelligence Center)
-- =====================================================

-- PGIC Records
CREATE TABLE IF NOT EXISTS pgic_record (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT,
  scores JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PGIC Recommendation Actions
CREATE TABLE IF NOT EXISTS pgic_recommendation_action (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID,
  action_type TEXT,
  action_taken BOOLEAN DEFAULT false,
  action_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PGIC Model Config
CREATE TABLE IF NOT EXISTS pgic_model_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_name TEXT NOT NULL,
  model_version TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success Patterns
CREATE TABLE IF NOT EXISTS success_pattern (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT,
  pattern_data JSONB DEFAULT '{}'::jsonb,
  effectiveness_score NUMERIC,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral Profiles
CREATE TABLE IF NOT EXISTS behavioral_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  traits TEXT[],
  patterns TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twin Matches
CREATE TABLE IF NOT EXISTS twin_match (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  twin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score NUMERIC,
  shared_traits TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proven Strategies
CREATE TABLE IF NOT EXISTS proven_strategy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_name TEXT NOT NULL,
  strategy_type TEXT,
  description TEXT,
  success_rate NUMERIC,
  sample_size INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy Outcomes
CREATE TABLE IF NOT EXISTS strategy_outcome (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES proven_strategy(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome_data JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Twin Profiles
CREATE TABLE IF NOT EXISTS agent_twin_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADMIN & SYSTEM
-- =====================================================

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  target_users TEXT[], -- array of user IDs or 'all'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Errors
CREATE TABLE IF NOT EXISTS system_error (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal Documents
CREATE TABLE IF NOT EXISTS legal_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL,
  version TEXT,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popup Ads
CREATE TABLE IF NOT EXISTS popup_ad (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_name TEXT NOT NULL,
  ad_type TEXT,
  content TEXT,
  target_audience TEXT,
  is_active BOOLEAN DEFAULT true,
  display_frequency TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSV Import Templates
CREATE TABLE IF NOT EXISTS csv_import_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  entity_type TEXT,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_market_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_brief ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_action ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_intelligence_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_play_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_play_exchange ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_play_session_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_play_analysis_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_play_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pack ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_color_palette ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agent_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_service_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgic_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgic_recommendation_action ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE twin_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_outcome ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_twin_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_error ENABLE ROW LEVEL SECURITY;

-- Create standard RLS policies for user-owned data
-- Users can only access their own data
-- Note: auth.uid() is a built-in Supabase function, no need to create it

-- User Onboarding Policies
CREATE POLICY "Users can view own onboarding" ON user_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON user_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON user_onboarding FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own onboarding" ON user_onboarding FOR DELETE USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Goals Policies
CREATE POLICY "Users can view own goals" ON goal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON goal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goal FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goal FOR DELETE USING (auth.uid() = user_id);

-- Daily Actions Policies
CREATE POLICY "Users can view own actions" ON daily_action FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own actions" ON daily_action FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON daily_action FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actions" ON daily_action FOR DELETE USING (auth.uid() = user_id);

-- CRM Contact Policies
CREATE POLICY "Users can view own contacts" ON crm_contact FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON crm_contact FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON crm_contact FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON crm_contact FOR DELETE USING (auth.uid() = user_id);

-- Apply similar policies to other user-owned tables
-- (You can add more detailed policies as needed)

-- Public read policies for shared/reference data
CREATE POLICY "Anyone can view role play scenarios" ON role_play_scenario FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view objection scripts" ON objection_script FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view content packs" ON content_pack FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view product offerings" ON product_offering FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view agent voices" ON agent_voice FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view client personas" ON client_persona FOR SELECT USING (is_active = true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User-based indexes
CREATE INDEX idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_goal_user_id ON goal(user_id);
CREATE INDEX idx_daily_action_user_id ON daily_action(user_id);
CREATE INDEX idx_daily_action_date ON daily_action(action_date);
CREATE INDEX idx_crm_contact_user_id ON crm_contact(user_id);
CREATE INDEX idx_crm_contact_email ON crm_contact(email);
CREATE INDEX idx_crm_activity_user_id ON crm_activity(user_id);
CREATE INDEX idx_crm_activity_contact_id ON crm_activity(contact_id);
CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_role_play_session_user_id ON role_play_session(user_id);
CREATE INDEX idx_call_log_user_id ON call_log(user_id);
CREATE INDEX idx_ai_agent_conversation_user_id ON ai_agent_conversation(user_id);

-- Date-based indexes
CREATE INDEX idx_daily_action_completed ON daily_action(completed, action_date);
CREATE INDEX idx_meeting_start_time ON meeting(start_time);
CREATE INDEX idx_social_media_post_scheduled ON social_media_post(scheduled_for);

-- Status/type indexes
CREATE INDEX idx_goal_status ON goal(status);
CREATE INDEX idx_crm_contact_status ON crm_contact(status);
CREATE INDEX idx_lead_status ON lead(lead_status);
CREATE INDEX idx_transaction_status ON transaction(status);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goal_updated_at BEFORE UPDATE ON goal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_action_updated_at BEFORE UPDATE ON daily_action FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_contact_updated_at BEFORE UPDATE ON crm_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_content_updated_at BEFORE UPDATE ON generated_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add more triggers as needed for other tables

-- =====================================================
-- COMPLETED!
-- =====================================================

-- Run this query to verify all tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
