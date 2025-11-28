import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { 
  User, 
  MapPin, 
  Bell, 
  Settings, 
  Lock, 
  Plug, 
  Brain,
  Gift,
  CheckCircle,
  Users,
  CreditCard,
  FileText,
  Package,
  Star,
  MessageSquare,
  Upload,
  BookOpen,
  Target,
  Mic,
  Shield,
  Mail,
  Activity,
  AlertTriangle,
  Flag,
  Network,
  Zap,
  Database,
  ShoppingBag
} from 'lucide-react';

export default function SettingsSidebar({ activeTab, onTabChange }) {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'admin';

  const regularSections = [
    {
      title: 'Account Settings',
      items: [
        { id: 'account', label: 'Profile', icon: User },
        { id: 'market', label: 'Market', icon: MapPin },
        { id: 'agent-intelligence', label: 'Agent Intelligence', icon: Brain },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'preferences', label: 'Preferences', icon: Settings },
        { id: 'security', label: 'Security', icon: Lock },
      ]
    },
    {
      title: 'Connections',
      items: [
        { id: 'integrations', label: 'Integrations', icon: Plug },
        { id: 'crm', label: 'CRM', icon: Database },
      ]
    },
    {
      title: 'Rewards',
      items: [
        { id: 'referrals', label: 'Referrals', icon: Gift }
      ]
    },
    {
      title: 'Onboarding',
      items: [
        { id: 'setup-progress', label: 'Setup Progress', icon: CheckCircle }
      ]
    }
  ];

  // Mobile specific items based on user request
  const mobileItems = [
    { id: 'account', label: 'Profile', icon: User },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  const adminSections = [
    {
      title: 'User Management',
      items: [
        { id: 'admin-users', label: 'Users', icon: Users },
        { id: 'admin-subscriptions', label: 'Subscriptions', icon: CreditCard },
        { id: 'admin-products', label: 'Product Offerings', icon: ShoppingBag }
      ]
    },
    {
      title: 'Content Management',
      items: [
        { id: 'admin-content', label: 'Content Topics', icon: FileText },
        { id: 'admin-packs', label: 'Content Packs', icon: Package },
        { id: 'admin-featured', label: 'Featured Packs', icon: Star },
        { id: 'admin-prompts', label: 'AI Prompts', icon: MessageSquare }
      ]
    },
    {
      title: 'Call Center',
      items: [
        { id: 'admin-campaigns', label: 'Campaign Templates', icon: Upload },
        { id: 'admin-voices', label: 'Agent Voices', icon: Mic }
      ]
    },
    {
      title: 'Training',
      items: [
        { id: 'admin-scenarios', label: 'Role-Play Scenarios', icon: BookOpen },
        { id: 'admin-personas', label: 'Client Personas', icon: Target },
        { id: 'admin-scripts', label: 'Objection Scripts', icon: FileText }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'admin-tasks', label: 'Task Templates', icon: CheckCircle },
        { id: 'admin-disclosures', label: 'Legal Documents', icon: Shield },
        { id: 'admin-emails', label: 'Email Campaigns', icon: Mail },
        { id: 'admin-monitoring', label: 'System Monitoring', icon: Activity },
        { id: 'admin-errors', label: 'Error Logs', icon: AlertTriangle },
        { id: 'admin-flags', label: 'Feature Flags', icon: Flag },
        { id: 'admin-integrations', label: 'Integration Health', icon: Network },
        { id: 'admin-autopilot', label: 'Autopilot Monitor', icon: Zap }
      ]
    }
  ];

  const renderSection = (section) => (
    <div key={section.title} className="mb-6">
      <h3 className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {section.title}
      </h3>
      <nav className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === item.id
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-text-body hover:bg-accent hover:text-text-title'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar (Horizontal Scroll) */}
      <div className="md:hidden w-full bg-surface border-b border-border overflow-x-auto flex-shrink-0">
        <div className="flex p-2 gap-2 min-w-max">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-surface border-r border-border overflow-y-auto flex-shrink-0 h-full">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-title mb-6">Settings</h2>
          
          {regularSections.map(renderSection)}
          
          {isAdmin && (
            <>
              <div className="my-6 border-t border-border" />
              <h2 className="text-lg font-semibold text-text-title mb-6">Admin Panel</h2>
              {adminSections.map(renderSection)}
            </>
          )}
        </div>
      </aside>
    </>
  );
}