import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Phone, Star, Download, Upload, Trash2, DollarSign, Mail, PhoneIcon as PhoneIconLucide, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/components/lib/utils';

const PIPELINE_STAGES = [
  { id: 'new', label: 'New Leads', color: 'bg-blue-500', lightColor: 'bg-blue-50' },
  { id: 'active', label: 'Active', color: 'bg-orange-500', lightColor: 'bg-orange-50' },
  { id: 'under_contract', label: 'Under Contract', color: 'bg-purple-600', lightColor: 'bg-purple-50' },
  { id: 'closed', label: 'Closed', color: 'bg-green-500', lightColor: 'bg-green-50' },
  { id: 'inactive', label: 'Inactive', color: 'bg-gray-400', lightColor: 'bg-gray-50' }
];

export default function PipelineView({ contacts, onSelectContact, onUpdate, onNavigateToContact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch = !searchQuery ||
        contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery);

      const matchesSource = sourceFilter === 'all' || contact.sourceSystem === sourceFilter;
      const matchesType = typeFilter === 'all' || contact.type === typeFilter;

      return matchesSearch && matchesSource && matchesType;
    });
  }, [contacts, searchQuery, sourceFilter, typeFilter]);

  const contactsByStage = useMemo(() => {
    const stages = {};
    PIPELINE_STAGES.forEach(stage => {
      stages[stage.id] = filteredContacts.filter(c => c.stage === stage.id);
    });
    return stages;
  }, [filteredContacts]);

  const parseBudget = (budgetString) => {
    if (!budgetString) return 0;
    if (typeof budgetString === 'number') return budgetString;
    
    const cleaned = budgetString.toString().replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateStageTotal = (stageContacts) => {
    return stageContacts.reduce((sum, contact) => {
      return sum + parseBudget(contact.budget);
    }, 0);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const contactId = draggableId;
    const newStage = destination.droppableId;

    try {
      await base44.entities.CrmContact.update(contactId, { stage: newStage });
      
      await base44.entities.CrmActivity.create({
        userId: contacts.find(c => c.id === contactId)?.userId,
        contactId: contactId,
        activityType: 'status_change',
        subject: `Status changed to ${newStage.replace('_', ' ')}`,
        description: `Contact moved to ${newStage.replace('_', ' ')} stage`
      });

      toast.success('Contact stage updated');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('[Pipeline] Error updating stage:', error);
      toast.error('Failed to update contact stage');
    }
  };

  const handleCardClick = (contact, event) => {
    if (event.target.closest('.arrow-button')) {
      if (onNavigateToContact) {
        onNavigateToContact(contact);
      }
    }
  };

  const handleRefresh = () => {
    if (onUpdate) {
      onUpdate();
      toast.success('Pipeline refreshed');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
      <div className="p-6 border-b border-[#E2E8F0] bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="follow_up_boss">Follow Up Boss</SelectItem>
              <SelectItem value="lofty">Lofty</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleRefresh}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Refresh pipeline"
            >
              <RefreshCw className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Log calls"
            >
              <Phone className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Toggle favorites"
            >
              <Star className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Download"
            >
              <Download className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Upload"
            >
              <Upload className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-6 p-6 min-w-max h-full">
            {PIPELINE_STAGES.map((stage) => {
              const stageContacts = contactsByStage[stage.id] || [];
              const stageTotal = calculateStageTotal(stageContacts);

              return (
                <div key={stage.id} className="flex flex-col w-80 flex-shrink-0">
                  <div className={cn('rounded-t-lg p-4 text-white', stage.color)}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{stage.label}</h3>
                      <div className="text-sm">
                        {stageContacts.length} - {formatCurrency(stageTotal)}
                      </div>
                    </div>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 overflow-y-auto p-3 space-y-3 rounded-b-lg border-x border-b border-gray-200',
                          stage.lightColor,
                          snapshot.isDraggingOver && 'bg-gray-100'
                        )}
                      >
                        {stageContacts.map((contact, index) => (
                          <Draggable
                            key={contact.id}
                            draggableId={contact.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-move',
                                  snapshot.isDragging && 'shadow-lg rotate-2'
                                )}
                                onClick={(e) => handleCardClick(contact, e)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs capitalize',
                                      contact.type === 'lead' && 'bg-blue-100 text-blue-800 border-blue-200',
                                      contact.type === 'buyer' && 'bg-green-100 text-green-800 border-green-200',
                                      contact.type === 'seller' && 'bg-orange-100 text-orange-800 border-orange-200',
                                      contact.type === 'referral' && 'bg-purple-100 text-purple-800 border-purple-200'
                                    )}
                                  >
                                    {contact.type}
                                  </Badge>
                                  <button
                                    className="arrow-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onNavigateToContact) {
                                        onNavigateToContact(contact);
                                      }
                                    }}
                                  >
                                    <ArrowRight className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                  </button>
                                </div>

                                <h4 className="font-medium text-gray-900 mb-3">
                                  {contact.firstName} {contact.lastName}
                                </h4>

                                <div className="space-y-2 text-sm">
                                  {contact.budget && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <DollarSign className="w-4 h-4" />
                                      <span>{contact.budget}</span>
                                    </div>
                                  )}

                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <Mail className="w-4 h-4" />
                                      <span className="truncate">{contact.email}</span>
                                    </div>
                                  )}

                                  {contact.phone && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <PhoneIconLucide className="w-4 h-4" />
                                      <span>{contact.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageContacts.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No contacts in this stage
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}