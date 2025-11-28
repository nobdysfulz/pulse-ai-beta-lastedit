import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import LoadingIndicator from '../ui/LoadingIndicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select"; // Added Select components import

const sourceColors = {
  follow_up_boss: 'bg-green-100 text-green-800',
  lofty: 'bg-blue-100 text-blue-800',
  manual: 'bg-gray-100 text-gray-800',
  csv: 'bg-purple-100 text-purple-800',
  skyslope: 'bg-orange-100 text-orange-800'
};

const sourceLabels = {
  follow_up_boss: 'FUB',
  lofty: 'Lofty',
  manual: 'Manual',
  csv: 'CSV',
  skyslope: 'Skyslope'
};

export default function ContactsList({ contacts, selectedContact, onSelectContact, loading }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('all'); // New state for source filter
  const [typeFilter, setTypeFilter] = React.useState('all'); // New state for type filter

  const filteredContacts = contacts.filter((contact) => {
    // Existing search filter logic
    const matchesSearch = !searchQuery ||
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery);


    // New source filter logic
    const matchesSource = sourceFilter === 'all' || contact.sourceSystem === sourceFilter;
    // New type filter logic
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;

    // Combine all filters
    return matchesSearch && matchesSource && matchesType;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingIndicator size="sm" text="Loading contacts..." />
      </div>);

  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3"> {/* Added mb-3 here */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9" />

        </div>

        {/* New filter dropdowns */}
        <div className="flex gap-2 mb-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="follow_up_boss">Follow Up Boss</SelectItem>
              <SelectItem value="lofty">Lofty</SelectItem>
              <SelectItem value="skyslope">Skyslope</SelectItem> {/* Added Skyslope option */}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-gray-500">
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ?
        <div className="p-8 text-center">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No contacts found</h3>
            <p className="text-xs text-gray-500">
              {searchQuery || sourceFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your filters or search' : 'Add your first contact to get started'}
            </p>
          </div> :

        <div className="divide-y divide-gray-100">
            {filteredContacts.map((contact) =>
          <button
            key={contact.id}
            onClick={() => onSelectContact(contact)} className="bg-slate-50 p-4 text-left w-full transition-colors hover:bg-violet-50 border-l-4 border-violet-600">





                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.email || contact.phone || 'No contact info'}
                    </p>
                  </div>
                  <Badge className={cn('text-xs ml-2', sourceColors[contact.sourceSystem])}>
                    {sourceLabels[contact.sourceSystem]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {contact.type &&
                <span className="text-xs text-gray-600 capitalize">{contact.type}</span>
                }
                    {contact.type && contact.stage && // Only show separator if both type and stage exist
                <span className="text-xs text-gray-400">•</span>
                }
                    {contact.stage &&
                <span className="text-xs text-gray-600 capitalize">
                        {contact.stage.replace('_', ' ')}
                      </span>
                }
                  </div>

                  {contact.followUpPriorityScore !== undefined &&
              <div className="flex items-center gap-1">
                      <div className={cn(
                  'w-2 h-2 rounded-full',
                  contact.followUpPriorityScore >= 75 ? 'bg-red-500' :
                  contact.followUpPriorityScore >= 50 ? 'bg-yellow-500' :
                  'bg-green-500'
                )} />
                      <span className="text-xs font-medium text-gray-600">
                        {contact.followUpPriorityScore}
                      </span>
                    </div>
              }
                </div>
              </button>
          )}
          </div>
        }
      </div>
    </div>);

}