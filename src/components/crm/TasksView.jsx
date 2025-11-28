import React, { useState, useEffect, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/components/lib/utils';
import { 
  Search, 
  RefreshCw, 
  Phone, 
  Star, 
  Download, 
  Upload, 
  Trash2, 
  Calendar, 
  User, 
  CheckCircle2, 
  ArrowRight,
  Pencil,
  Plus
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import LoadingIndicator from '../ui/LoadingIndicator';
import AddTaskModal from './AddTaskModal';
import { toast } from 'sonner';

const TASK_STAGES = [
  { id: 'upcoming', label: 'Upcoming', color: 'bg-blue-500', lightColor: 'bg-blue-50' },
  { id: 'today', label: 'Today', color: 'bg-orange-500', lightColor: 'bg-orange-50' },
  { id: 'overdue', label: 'Overdue', color: 'bg-red-500', lightColor: 'bg-red-50' },
  { id: 'completed', label: 'Completed', color: 'bg-green-500', lightColor: 'bg-green-50' }
];

export default function TasksView({ contacts, onNavigateToContact }) {
  const { user } = useContext(UserContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const contactIds = contacts.map((c) => c.id);

      const allTasks = await base44.entities.DailyAction.filter(
        {
          userId: user.id,
          associatedContactId: { $in: contactIds }
        },
        '-actionDate',
        500
      );

      setTasks(allTasks || []);
    } catch (error) {
      console.error('[CRM-Tasks] Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getTaskStage = (task) => {
    if (task.status === 'completed') return 'completed';
    
    const taskDate = startOfDay(new Date(task.actionDate));
    const today = startOfDay(new Date());
    
    if (taskDate < today) return 'overdue';
    if (taskDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchQuery ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getContactName(task.associatedContactId).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || task.actionType === categoryFilter;

      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [tasks, searchQuery, priorityFilter, categoryFilter]);

  const tasksByStage = useMemo(() => {
    const stages = {};
    TASK_STAGES.forEach(stage => {
      stages[stage.id] = filteredTasks.filter(task => getTaskStage(task) === stage.id);
    });
    return stages;
  }, [filteredTasks]);

  const getContactName = (contactId) => {
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const taskId = draggableId;
    const newStage = destination.droppableId;

    try {
      const updates = {};
      
      if (newStage === 'completed') {
        updates.status = 'completed';
        updates.completionDate = new Date().toISOString();
        
        const task = tasks.find(t => t.id === taskId);
        if (task?.associatedContactId) {
          await base44.entities.CrmActivity.create({
            userId: user.id,
            contactId: task.associatedContactId,
            activityType: 'task_completed',
            subject: task.title,
            description: task.description,
            outcome: 'completed'
          });

          await base44.entities.CrmContact.update(task.associatedContactId, {
            lastContactDate: new Date().toISOString()
          });
        }
      } else {
        updates.status = 'not_started';
        updates.completionDate = null;
      }

      await base44.entities.DailyAction.update(taskId, updates);
      
      toast.success('Task updated');
      loadTasks();
    } catch (error) {
      console.error('[CRM-Tasks] Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';

    try {
      await base44.entities.DailyAction.update(task.id, {
        status: newStatus,
        completionDate: newStatus === 'completed' ? new Date().toISOString() : null
      });

      if (newStatus === 'completed' && task.associatedContactId) {
        await base44.entities.CrmActivity.create({
          userId: user.id,
          contactId: task.associatedContactId,
          activityType: 'task_completed',
          subject: task.title,
          description: task.description,
          outcome: 'completed'
        });

        await base44.entities.CrmContact.update(task.associatedContactId, {
          lastContactDate: new Date().toISOString()
        });
      }

      toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened');
      loadTasks();
    } catch (error) {
      console.error('[CRM-Tasks] Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleBulkMarkDone = async () => {
    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        await base44.entities.DailyAction.update(taskId, {
          status: 'completed',
          completionDate: new Date().toISOString()
        });

        if (task?.associatedContactId) {
          await base44.entities.CrmActivity.create({
            userId: user.id,
            contactId: task.associatedContactId,
            activityType: 'task_completed',
            subject: task.title,
            description: task.description,
            outcome: 'completed'
          });
        }
      }

      toast.success(`${selectedTasks.length} tasks marked as complete`);
      setSelectedTasks([]);
      loadTasks();
    } catch (error) {
      console.error('[CRM-Tasks] Error marking tasks done:', error);
      toast.error('Failed to mark tasks as complete');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
      return;
    }

    try {
      for (const taskId of selectedTasks) {
        await base44.entities.DailyAction.delete(taskId);
      }

      toast.success(`${selectedTasks.length} tasks deleted`);
      setSelectedTasks([]);
      loadTasks();
    } catch (error) {
      console.error('[CRM-Tasks] Error deleting tasks:', error);
      toast.error('Failed to delete tasks');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowAddTaskModal(true);
  };

  const handleTaskSaved = () => {
    toast.success(editingTask ? 'Task updated' : 'Task created');
    setShowAddTaskModal(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleRefresh = () => {
    loadTasks();
    toast.success('Tasks refreshed');
  };

  const handleNavigateToContact = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact && onNavigateToContact) {
      onNavigateToContact(contact);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <LoadingIndicator text="Loading tasks..." size="md" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0] bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="client_follow_up">Client Follow-Up</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
                <SelectItem value="lead_generation">Lead Generation</SelectItem>
                <SelectItem value="skill_development">Skill Development</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="market_research">Market Research</SelectItem>
                <SelectItem value="transaction_task">Transaction Task</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {selectedTasks.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkDone}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Done ({selectedTasks.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedTasks.length})
                  </Button>
                </>
              )}

              <button
                onClick={handleRefresh}
                className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Refresh tasks"
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
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setShowAddTaskModal(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-6 p-6 min-w-max h-full">
              {TASK_STAGES.map((stage) => {
                const stageTasks = tasksByStage[stage.id] || [];

                return (
                  <div key={stage.id} className="flex flex-col w-96 flex-shrink-0">
                    <div className={cn('rounded-t-lg p-4 text-white', stage.color)}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{stage.label}</h3>
                        <div className="text-sm">{stageTasks.length}</div>
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
                          {stageTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow',
                                    snapshot.isDragging && 'shadow-lg rotate-2'
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={selectedTasks.includes(task.id)}
                                      onCheckedChange={() => handleSelectTask(task.id)}
                                      className="mt-1"
                                      onClick={(e) => e.stopPropagation()}
                                    />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-gray-900">
                                          {task.title}
                                        </h4>
                                        <div className="flex items-center gap-1 ml-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditTask(task);
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleTask(task);
                                            }}
                                            className="text-gray-400 hover:text-green-600"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                          {task.associatedContactId && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigateToContact(task.associatedContactId);
                                              }}
                                              className="text-gray-400 hover:text-gray-600"
                                            >
                                              <ArrowRight className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {task.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}

                                      <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <Calendar className="w-3 h-3" />
                                          <span>{getDateLabel(task.actionDate)}</span>
                                        </div>

                                        {task.associatedContactId && (
                                          <div className="flex items-center gap-1 text-gray-600">
                                            <User className="w-3 h-3" />
                                            <span>{getContactName(task.associatedContactId)}</span>
                                          </div>
                                        )}

                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            'capitalize',
                                            task.priority === 'high' && 'bg-red-100 text-red-800 border-red-200',
                                            task.priority === 'medium' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                            task.priority === 'low' && 'bg-blue-100 text-blue-800 border-blue-200'
                                          )}
                                        >
                                          {task.priority}
                                        </Badge>

                                        {task.actionType && (
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {task.actionType.replace('_', ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {stageTasks.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              No tasks in this category
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

      {showAddTaskModal && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => {
            setShowAddTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSaved}
          prefillData={editingTask || {}}
        />
      )}
    </>
  );
}