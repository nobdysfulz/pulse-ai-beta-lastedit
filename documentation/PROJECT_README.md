# Pulse AI - Supabase Edition 🚀

> **Migrated from Base44 to Supabase** - Your real estate coaching platform now runs on open-source infrastructure with zero vendor lock-in.

## 🎯 What Changed?

This project has been **successfully migrated from Base44 to Supabase** using a drop-in replacement SDK. 

### ✅ Your Code Remains Unchanged
All your existing imports and API calls work exactly as before:

```javascript
import { Goal, DailyAction, Contact } from './src/api/entities';

// Same code, different backend!
const goals = await Goal.list();
const newGoal = await Goal.create({ title: "My Goal" });
```

### 🔄 What's New Behind the Scenes
- **Database**: PostgreSQL on Supabase (was Base44's database)
- **Authentication**: Supabase Auth (was Base44 Auth)
- **Storage**: Supabase Storage (ready when you implement UploadFile)
- **API**: Direct database access via Supabase JS client

## 📁 Project Structure

```
pulse-ai/
├── src/
│   ├── api/
│   │   ├── base44Client.js         # Updated: Now uses Supabase
│   │   ├── base44Client.js.backup  # Your original Base44 client
│   │   ├── entities.js             # Unchanged: All your entities
│   │   ├── functions.js            # Needs migration to Edge Functions
│   │   └── integrations.js         # Needs implementation
│   ├── lib/
│   │   ├── supabase-client.js      # NEW: Supabase connection
│   │   ├── custom-sdk.js           # NEW: Base44-compatible SDK
│   │   └── utils.js                # Your utilities
│   ├── components/                 # Unchanged: All your UI
│   └── pages/                      # Unchanged: All your routes
├── .env.example                    # NEW: Template for environment vars
├── supabase-schema.sql             # NEW: Complete database schema
├── MIGRATION_GUIDE.md              # NEW: Detailed migration steps
├── QUICK_START.md                  # NEW: Quick reference checklist
└── package.json                    # Updated: Added @supabase/supabase-js
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example and fill in your Supabase credentials
cp .env.example .env

# Edit .env with your values:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Database
1. Go to your Supabase project
2. Open SQL Editor
3. Copy contents of `supabase-schema.sql`
4. Run the script

### 4. Start Development Server
```bash
npm run dev
```

## 📊 Your 50+ Entities (All Supported)

### Core Features
- **Goals & Planning**: Goal, DailyAction, BusinessPlan, TaskTemplate
- **CRM**: Contact, CrmContact, CrmActivity, Lead, Transaction
- **Intelligence**: AgentIntelligenceProfile, MarketIntelligence, PulseHistory
- **RolePlay**: RolePlayScenario, RolePlaySession, RolePlayExchange
- **Content**: GeneratedContent, ContentPack, SocialMediaPost
- **Email**: EmailTemplate, EmailCampaign
- **Agents**: AgentConfig, AgentVoice, UserAgentSubscription
- **Credits**: UserCredit, CreditTransaction, Referral
- **Admin**: FeatureFlag, SystemError

[See full entity list in QUICK_START.md]

## 🔧 Integration Functions Status

Your app uses several integration functions. Here's the status:

### ✅ Ready to Use (Built-in)
- Entity CRUD operations (list, create, update, delete)
- User authentication (sign up, sign in, sign out)
- Session management
- File signed URLs

### 🚧 Needs Implementation
These have placeholder functions in `src/lib/custom-sdk.js`:

- **InvokeLLM**: AI/LLM calls (implement with OpenAI)
- **SendEmail**: Email sending (implement with Resend/SendGrid)
- **UploadFile**: File uploads (implement with Supabase Storage)
- **GenerateImage**: AI images (implement with DALL-E)
- **ExtractDataFromUploadedFile**: OCR (implement with OCR service)

[See implementation examples in MIGRATION_GUIDE.md]

### 🔄 Needs Migration
Your custom Base44 functions need to be migrated to:
- **Supabase Edge Functions** (for server-side operations)
- **Client-side logic** (for browser operations)

## 🏗️ Development Workflow

### Running Locally
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
```

### Testing Authentication
```javascript
import { User } from './src/api/entities';

// Sign up
const { user } = await User.signUp('email@example.com', 'password');

// Sign in
const { user } = await User.signIn('email@example.com', 'password');

// Get current user
const currentUser = await User.me();

// Sign out
await User.signOut();
```

### Testing CRUD Operations
```javascript
import { Goal } from './src/api/entities';

// Create
const goal = await Goal.create({
  title: 'Close 50 deals',
  target_value: 50,
  goal_type: 'transactions'
});

// List
const goals = await Goal.list({ limit: 10 });

// Get one
const myGoal = await Goal.get(goalId);

// Update
await Goal.update(goalId, { current_value: 25 });

// Delete
await Goal.delete(goalId);
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
# Add env vars in Vercel dashboard
```

### Netlify
```bash
# Connect repo in Netlify dashboard
# Set build command: npm run build
# Set environment variables
```

### Cloudflare Pages
```bash
# Connect repo in Cloudflare dashboard
# Set build command: npm run build
# Set environment variables
```

## 📖 Documentation

- **QUICK_START.md** - Quick reference checklist
- **MIGRATION_GUIDE.md** - Complete migration walkthrough
- **supabase-schema.sql** - Full database schema
- **.env.example** - Environment variables template

## 🔐 Security Notes

### Environment Variables
- `VITE_SUPABASE_URL` - Public, safe in browser ✅
- `VITE_SUPABASE_ANON_KEY` - Public, safe in browser ✅
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - **SECRET**, server-side only ⚠️

### Row Level Security (RLS)
All tables have RLS policies that ensure users can only access their own data.

### Best Practices
- Never commit `.env` to git
- Use service role key only for admin operations
- Keep API keys encrypted in database
- Enable 2FA on Supabase account

## 🐛 Troubleshooting

### "Missing environment variables"
→ Check `.env` file exists and has all three Supabase variables

### "Table does not exist"
→ Run `supabase-schema.sql` in Supabase SQL Editor

### "RLS policy violation"
→ Make sure user is authenticated and owns the data

### Integration function not working
→ Check that you've implemented the function in `custom-sdk.js`

[See full troubleshooting guide in MIGRATION_GUIDE.md]

## 📊 Database Schema

Your database has 50+ tables organized into:
- User & Auth (7 tables)
- Goals & Planning (4 tables)
- CRM & Contacts (8 tables)
- Intelligence & AI (7 tables)
- RolePlay & Training (8 tables)
- Content & Marketing (8 tables)
- Email & Campaigns (3 tables)
- Agents & Automation (4 tables)
- Credits & Billing (4 tables)
- PGIC Intelligence (10 tables)
- Admin & System (5 tables)

## 🎨 Tech Stack

### Frontend
- React 18
- React Router v7
- TailwindCSS
- Radix UI Components
- Framer Motion
- shadcn/ui

### Backend
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage (ready when needed)
- Edge Functions (for custom server logic)

### Development
- Vite
- ESLint
- TypeScript types

## 🌟 Benefits of Supabase Migration

- ✅ **Zero vendor lock-in** - Export data anytime
- ✅ **Lower costs** - Free tier: 500MB DB, 2GB bandwidth  
- ✅ **Full control** - Direct database access
- ✅ **Better performance** - Optimize queries yourself
- ✅ **Open source** - Transparency and community
- ✅ **Real-time** - WebSocket subscriptions built-in
- ✅ **Scalable** - Grow to millions of users
- ✅ **Secure** - Row Level Security built-in

## 📈 Next Steps

1. ✅ Database schema created
2. ✅ SDK files in place
3. ✅ Authentication working
4. 🔄 Implement integration functions (InvokeLLM, SendEmail, etc.)
5. 🔄 Migrate custom Base44 functions to Edge Functions
6. 🔄 Set up production environment
7. 🔄 Deploy to hosting platform
8. 🔄 Set up monitoring and logging

## 🤝 Contributing

This is your private project, but you can contribute improvements back to the open-source migration SDK if you discover helpful patterns.

## 📝 License

Your project license (not the migration SDK)

## 💡 Tips & Best Practices

### Development
- Use React DevTools for debugging
- Check Supabase logs for database errors
- Test RLS policies thoroughly
- Keep environment variables updated

### Production
- Enable database backups
- Set up monitoring (Sentry, LogRocket, etc.)
- Configure CDN for static assets
- Implement rate limiting
- Set up CI/CD pipeline

### Performance
- Add database indexes for frequently queried fields
- Use Supabase's built-in caching
- Implement client-side caching where appropriate
- Optimize images and assets
- Use code splitting

## 📞 Support

- Check MIGRATION_GUIDE.md for detailed help
- Check QUICK_START.md for quick reference
- Review Supabase documentation: https://supabase.com/docs
- Check migration SDK repository for updates

---

**Pulse AI** - Powered by Supabase  
Successfully migrated from Base44 | Zero code changes required
