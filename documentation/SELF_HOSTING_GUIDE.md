# Self-Hosting Base44 Projects with Universal Custom SDK

> **🚀 Need Professional Help?** I offer complete Base44 migration services with zero downtime and guaranteed results. [Skip the DIY and get professional migration →](#-professional-migration-services)

This guide explains how to migrate **any** Base44 project to a self-hosted solution using our universal custom SDK that provides 100% API compatibility with **zero code changes** required.

## 🎯 Overview

Our universal custom SDK aims to be a true drop-in replacement for Base44 that:

- ✅ **Zero Code Changes Required** - Works with any Base44 app immediately
- ✅ **Universal Compatibility** - Automatically discovers and supports all Base44 entities
- ✅ **100% API Compatibility** - All existing Base44 code works unchanged
- ✅ **Intelligent Entity Management** - Automatically creates entities on-demand
- ✅ **Smart Security** - Automatically applies appropriate security policies
- ✅ **Uses Supabase (PostgreSQL)** as the backend database
- ✅ **Multiple Deployment Options** (Cloudflare Pages, Vercel, self-hosted)
- ✅ **Enhanced Security** with Row Level Security (RLS)
- ✅ **Real-time Capabilities** and advanced querying
- ✅ **Eliminates Vendor Lock-in** and reduces costs significantly

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
npm install --save-dev vitest dotenv  # For testing and development
```

### Step 2: Copy Universal SDK Files

Copy these universal files to your Base44 project (works for any Base44 app):

```
src/lib/
├── supabase-client.js    # Supabase connection setup
└── custom-sdk.js         # Universal custom SDK implementation

src/api/
└── base44Client.js       # Universal drop-in replacement for Base44 client
```

**That's it!** No modifications needed - the SDK automatically discovers and supports all your Base44 entities.

### Step 3: Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Install Supabase CLI**:
   ```bash
   npm install -g @supabase/cli
   ```
3. **Initialize Supabase in your project**:
   ```bash
   supabase init
   ```

### Step 4: Configure Environment Variables

Create `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
VITE_APP_NAME=Your App Name
VITE_APP_DOMAIN=https://your-domain.com
```

## 📊 Database Migration

### Step 1: Export Your Base44 Data

If you have existing Base44 data, export it using Base44's export functionality or API.

Here is a sample prompt you can give to Base44 to get it to create a data export system:

I need to export all my application data from Base44 in a format that I can easily import into Supabase PostgreSQL. Please provide the data in the following format:

Export Format Requirements:
Provide data as SQL INSERT statements compatible with PostgreSQL Include proper UUID generation for primary keys Use ISO 8601 format for all timestamps Escape all text fields properly for SQL insertion Include foreign key relationships correctly

Please add this export functionality somewhere in my site that makes sense, or create a new page for this if needed.

### Step 2: Create Database Schema

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (adapt to your Base44 user structure)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  -- Add other fields from your Base44 user model
  email_verified BOOLEAN DEFAULT FALSE
);

-- Add your other Base44 entities here
-- Example: Products, Orders, etc.
CREATE TABLE your_entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add fields based on your Base44 schema
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
-- Add other indexes as needed

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Set Up Row Level Security

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Enable RLS on your other tables

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admin policies (adjust based on your needs)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add policies for your other entities
```

### Step 4: Apply Migrations

```bash
supabase db reset  # This applies all migrations
```

## 🔧 Code Migration

### Universal Migration (Zero Code Changes)

The beauty of our universal custom SDK is that **absolutely no code changes are required** in your existing Base44 project. The SDK automatically discovers and supports all your entities:

```javascript
// This code works unchanged with our universal custom SDK
import { Product, User, BlogPost, YourCustomEntity } from "./src/api/entities";

// All these operations work identically - entities are created automatically
const products = await Product.list("-created_date");
const user = await User.me();
const posts = await BlogPost.filter({ status: "published" });
const custom = await YourCustomEntity.create(data);
```

### Universal Entity Support

Your existing `src/api/entities.js` works unchanged for **any** Base44 application:

```javascript
import { base44 } from "./base44Client";

// These work for ANY Base44 entities - automatically discovered and created
export const Product = base44.entities.Product;             // → products table
export const BlogPost = base44.entities.BlogPost;           // → blog_posts table  
export const UserMembership = base44.entities.UserMembership; // → user_memberships table
export const YourCustomEntity = base44.entities.YourCustomEntity; // → your_custom_entities table

// Authentication works universally
export const User = base44.auth;
```

### How Universal Discovery Works

The SDK automatically:

1. **Converts Entity Names**: `BlogPost` → `blog_posts` table
2. **Detects Security Needs**: Automatically uses service role for sensitive entities (users, transactions, etc.)
3. **Creates On-Demand**: Entities are created when first accessed
4. **Caches for Performance**: Entities are cached after creation
5. **Handles All Operations**: Full CRUD operations work immediately

**No configuration required!** The SDK works with any Base44 application out of the box.

## 🚀 Deployment Options

### Option 1: Cloudflare Pages (Recommended)

1. **Build your project**:

   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Pages**:
   - Connect your GitHub repo to Cloudflare Pages
   - Set build command: `npm run build`
   - Set build output directory: `dist`
   - Add environment variables in Cloudflare dashboard

### Option 2: Vercel

1. **Deploy to Vercel**:

   ```bash
   npx vercel
   ```

2. **Set environment variables** in Vercel dashboard

### Option 3: Self-Hosted (Docker)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Deploy with:

```bash
docker build -t your-app .
docker run -p 3000:3000 --env-file .env your-app
```

## 🔒 Security Configuration

### Authentication Setup

Configure Supabase Auth providers in your Supabase dashboard:

1. **Enable OAuth providers** (Google, GitHub, etc.)
2. **Set redirect URLs** for your domain
3. **Configure email templates**
4. **Set up custom SMTP** (optional)

### Row Level Security

Our RLS policies ensure:

- Users can only access their own data
- Admins have appropriate elevated permissions
- Public data is accessible to all users
- Sensitive operations require authentication

## 📈 Advanced Features

### Real-time Subscriptions

Add real-time capabilities to your app:

```javascript
// Subscribe to changes in real-time
const subscription = supabase
  .channel("your-channel")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "your_table" },
    (payload) => {
      console.log("Change received!", payload);
    }
  )
  .subscribe();
```

### Advanced Querying

Extend the CustomEntity class for complex queries:

```javascript
// Add to CustomEntity class
async complexQuery(params) {
  const { data, error } = await this.supabase
    .from(this.tableName)
    .select(`
      *,
      related_table(*)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

## 🧪 Testing

### Unit Tests

Our custom SDK includes comprehensive unit tests. Run them with:

```bash
npm test
```

### Integration Testing

Test your migration with:

```bash
# Test database connection
node -e "
import('./src/lib/custom-sdk.js').then(async ({ customClient }) => {
  const entities = await customClient.entities.YourEntity.list();
  console.log('✅ Connection successful:', entities.length, 'records');
});
"
```

## 🔄 Universal Migration Checklist

- [ ] Install dependencies (`@supabase/supabase-js`)
- [ ] Copy universal SDK files to your project (no modifications needed)
- [ ] Create Supabase project and get credentials
- [ ] Set up environment variables
- [ ] Create database schema based on your Base44 entities
- [ ] Set up Row Level Security policies
- [ ] **That's it!** Your existing code works unchanged
- [ ] Test all existing functionality (should work immediately)
- [ ] Deploy to your chosen platform
- [ ] Set up monitoring and backups

**Key Advantage**: The universal SDK automatically discovers and supports all your Base44 entities without any configuration!

## 🆘 Troubleshooting

### Common Issues

**"Cannot read properties of undefined"**

- Check that all your Base44 entities are mapped in the custom SDK
- Verify environment variables are set correctly

**"Row Level Security policy violation"**

- Review your RLS policies
- Ensure users have proper permissions
- Check authentication state

**"Table does not exist"**

- Run `supabase db reset` to apply migrations
- Verify table names match between schema and entity mappings

### Getting Help

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review our universal custom SDK implementation
3. Test with the included unit tests
4. Check database logs in Supabase dashboard
5. **Need professional help?** [Contact me for migration services →](#-professional-migration-services)

## 💰 Cost Comparison

### Base44 vs Self-Hosted

| Feature            | Base44   | Self-Hosted |
| ------------------ | -------- | ----------- |
| Monthly Cost       | $X/month | $0-25/month |
| Data Control       | Limited  | Full        |
| Customization      | Limited  | Unlimited   |
| Vendor Lock-in     | Yes      | No          |
| Real-time Features | Limited  | Full        |
| Backup Control     | No       | Yes         |

### Supabase Pricing

- **Free Tier**: Up to 50,000 monthly active users
- **Pro Tier**: $25/month for production apps
- **Team Tier**: $599/month for teams

## 🎉 Benefits of Self-Hosting

- **Cost Savings**: Eliminate Base44 subscription fees
- **Data Ownership**: Full control over your data
- **Performance**: Optimized queries and caching
- **Security**: Enhanced with RLS and custom policies
- **Scalability**: Handle any traffic volume
- **Flexibility**: Add features without vendor limitations
- **Compliance**: Meet specific regulatory requirements

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

## 🤝 Professional Migration Services

### Need Help with Your Migration?

Migrating from Base44 to self-hosted infrastructure can be complex, especially for production applications with custom integrations, complex data relationships, or specific compliance requirements.

**I'm available for hire to fully manage your Base44 to self-hosted transition.**

#### What's Included:

✅ **Complete Data Migration**
- Export all your Base44 data safely
- Set up optimized PostgreSQL schema
- Migrate all records with data integrity verification
- Handle complex relationships and foreign keys

✅ **Custom Integration Implementation**
- Implement all Base44 integrations (InvokeLLM, SendEmail, UploadFile, etc.)
- Set up proper API keys and service connections
- Test all functionality to ensure 100% compatibility
- Optimize performance and add error handling

✅ **Infrastructure Setup**
- Configure Supabase project with proper security
- Set up Row Level Security policies
- Configure authentication and user management
- Set up automated backups and monitoring

✅ **Deployment & Go-Live**
- Deploy to your preferred platform (Cloudflare, Vercel, or self-hosted)
- Configure custom domains and SSL certificates
- Performance optimization and caching setup
- Go-live support and monitoring

✅ **Post-Migration Support**
- 30 days of post-migration support included
- Documentation and training for your team
- Performance monitoring and optimization
- Ongoing maintenance options available

#### Why Choose Professional Migration?

- **Zero Downtime**: Seamless transition with minimal disruption
- **Risk Mitigation**: Experienced handling of data migration challenges
- **Time Savings**: Complete migration in days, not weeks or months
- **Cost Effective**: Often cheaper than the time cost of DIY migration
- **Peace of Mind**: Professional testing and validation of all functionality

#### Investment:

Migration services start at **$2,500** for standard applications, with custom pricing for complex projects based on:
- Number of entities and data volume
- Custom integrations required
- Deployment complexity
- Timeline requirements

#### Get Started:

Ready to discuss your migration? Contact me at:

📧 **Email**: info@ai-automators.org  
💬 **Schedule a Call**: https://calendly.com/timstew  
🌐 **Website**: https://ai-automators.org

*Free 30-minute consultation to assess your project and provide a detailed migration plan and timeline.*

---

**Ready to break free from vendor lock-in?** Follow this guide for DIY migration, or contact me for professional migration services with guaranteed results and ongoing support!