# Pulse AI - Supabase Migration Quick Start Checklist

## ✅ Pre-Migration Checklist

- [ ] Supabase account created
- [ ] New Supabase project created
- [ ] Project credentials saved securely
- [ ] Backup of current Base44 project made
- [ ] Node.js and npm installed and updated

## 🚀 Migration Steps (30-60 minutes)

### Phase 1: Database Setup (10-15 min)
- [ ] Copy Supabase URL and keys from dashboard
- [ ] Open SQL Editor in Supabase dashboard
- [ ] Copy entire `supabase-schema.sql` file
- [ ] Paste and run in SQL Editor
- [ ] Verify tables created (50+ tables should appear)

### Phase 2: Code Setup (10 min)
- [ ] Install @supabase/supabase-js: `npm install @supabase/supabase-js`
- [ ] SDK files already in place (check src/lib/ and src/api/)
- [ ] Create `.env` file with Supabase credentials
- [ ] Add .env to .gitignore if not already there

### Phase 3: Testing (15-20 min)
- [ ] Run `npm run dev` to start development server
- [ ] Test user registration
- [ ] Test user login
- [ ] Test creating a goal
- [ ] Test listing goals
- [ ] Test creating a daily action
- [ ] Test contact creation
- [ ] Check browser console for errors
- [ ] Verify data appears in Supabase Table Editor

### Phase 4: Integration Functions (20-30 min)
- [ ] Decide which integrations you need immediately
- [ ] Add API keys to .env (OpenAI, Resend, etc.)
- [ ] Implement InvokeLLM in custom-sdk.js
- [ ] Implement SendEmail in custom-sdk.js  
- [ ] Implement UploadFile in custom-sdk.js
- [ ] Test each integration

### Phase 5: Data Migration (if needed) (varies)
- [ ] Export data from Base44
- [ ] Create migration script or use manual import
- [ ] Import data to Supabase
- [ ] Verify all data migrated correctly

### Phase 6: Deploy (15-20 min)
- [ ] Choose hosting platform (Vercel/Netlify/Cloudflare)
- [ ] Connect GitHub repository
- [ ] Add environment variables to platform
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Update DNS/domain if needed

## 📝 Environment Variables Needed

```env
# Required
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Optional (implement as needed)
VITE_OPENAI_API_KEY=sk-...
VITE_RESEND_API_KEY=re_...
VITE_ELEVENLABS_API_KEY=...
VITE_TWILIO_ACCOUNT_SID=...
VITE_TWILIO_AUTH_TOKEN=...
```

## 🎯 Your Entities (Auto-detected from your code)

Your app uses these 50+ entities (all automatically supported):

### Core User & Auth
- User, UserOnboarding, UserPreferences, UserMarketConfig
- UserGuidelines, UserKnowledge, UserDailyBrief

### Goals & Planning  
- Goal, DailyAction, BusinessPlan, TaskTemplate

### CRM & Contacts
- Contact, CrmContact, CrmActivity, ContactNote, CrmConnection
- Lead, Transaction, Meeting

### Intelligence & AI
- AgentIntelligenceProfile, MarketIntelligence, MarketData
- PulseHistory, AiAgentConversation, AiActionLog, AiPromptConfig

### RolePlay & Training
- RolePlayScenario, RolePlaySession, RolePlayExchange
- RolePlaySessionLog, RolePlayAnalysisReport, RolePlayUserProgress
- ClientPersona, CallLog

### Content & Marketing
- GeneratedContent, ContentPreference, ContentTopic, ContentPack
- FeaturedContentPack, BrandColorPalette, SocialMediaPost

### Email & Campaigns
- EmailTemplate, EmailCampaign, CampaignTemplate

### Agents & Automation
- AgentConfig, AgentVoice, UserAgentSubscription
- AutomatedWorkflow

### Objections & Scripts
- ObjectionScript

### Credits & Billing
- UserCredit, CreditTransaction, Referral, ProductOffering

### Integrations
- ExternalServiceConnection, SSOToken

### PGIC (Intelligence)
- PGICRecord, PGICRecommendationAction, PGICModelConfig
- SuccessPattern, BehavioralProfile, TwinMatch
- ProvenStrategy, StrategyOutcome, AgentTwinProfile

### Admin & System
- FeatureFlag, SystemError, LegalDocument, PopupAd
- CsvImportTemplate

## 🔥 Quick Commands

```bash
# Install dependencies
npm install @supabase/supabase-js

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## ❓ Quick Troubleshooting

**Issue:** "Missing Supabase environment variables"
→ **Fix:** Check .env file exists and has all three variables

**Issue:** "Table does not exist"
→ **Fix:** Run supabase-schema.sql in SQL Editor

**Issue:** "Authentication not working"
→ **Fix:** Check SUPABASE_ANON_KEY is correct and user exists

**Issue:** "RLS policy violation"
→ **Fix:** Make sure user is logged in and owns the data

## 🎉 Success Criteria

You'll know the migration is successful when:
- ✅ App loads without errors
- ✅ Can create new account
- ✅ Can log in and out
- ✅ Can create/read/update/delete goals
- ✅ Can create/read/update/delete daily actions
- ✅ All pages load correctly
- ✅ Data persists between sessions
- ✅ Data appears in Supabase dashboard

## 📞 Need Help?

Refer to MIGRATION_GUIDE.md for detailed instructions on each step.

Check the troubleshooting section for common issues and solutions.

## 🚀 What You Get After Migration

- **Full Database Control** - Direct access to PostgreSQL
- **No Vendor Lock-in** - Export data anytime
- **Lower Costs** - Free tier: 500MB database, 2GB bandwidth
- **Better Performance** - Optimize queries and indexes
- **Real-time Features** - WebSocket subscriptions
- **Advanced Security** - Row Level Security built-in
- **Scalability** - Scale to millions of users
- **Open Source** - Full transparency

---

**Estimated Total Time:** 1-2 hours for basic migration  
**Difficulty:** Intermediate (following this guide)  
**Cost:** $0 (Free tier) to $25/month (Pro tier)
