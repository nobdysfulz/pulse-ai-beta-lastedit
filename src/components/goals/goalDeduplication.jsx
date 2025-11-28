/**
 * Goal Deduplication & Upsert Utilities
 * 
 * Prevents duplicate goals from being created in the database.
 * Ensures a user can only have ONE active goal per unique identifier.
 */

import { base44 } from '@/api/base44Client';

/**
 * Generates a unique key for a goal based on its core attributes
 * Format: "userId_title_category_type"
 */
export function generateGoalKey(goal) {
  const normalizedTitle = (goal.title || '').trim().toLowerCase();
  const category = goal.category || 'production';
  const type = goal.type || 'annual';
  const userId = goal.userId;
  
  return `${userId}_${normalizedTitle}_${category}_${type}`;
}

/**
 * Finds an existing active goal that matches the provided goal data
 * Returns null if no match found
 */
export async function findExistingGoal(goalData, userId) {
  try {
    const normalizedTitle = (goalData.title || '').trim().toLowerCase();
    
    // Fetch all active goals for the user
    const allGoals = await base44.entities.Goal.filter(
      { 
        userId,
        status: 'active'
      },
      '-updated_date'
    );
    
    // Find exact match based on title, category, and type
    const match = allGoals.find(goal => {
      const goalTitleNormalized = (goal.title || '').trim().toLowerCase();
      return (
        goalTitleNormalized === normalizedTitle &&
        goal.category === goalData.category &&
        goal.type === goalData.type
      );
    });
    
    return match || null;
  } catch (error) {
    console.error('[goalDeduplication] Error finding existing goal:', error);
    return null;
  }
}

/**
 * Creates or updates a goal (upsert operation)
 * Prevents duplicates by checking for existing goals first
 * 
 * @param {Object} goalData - The goal data to create/update
 * @param {string} userId - The user ID
 * @returns {Promise<{goal: Object, isNew: boolean}>}
 */
export async function upsertGoal(goalData, userId) {
  try {
    // Add userId to goalData if not present
    const fullGoalData = { ...goalData, userId };
    
    // Check for existing goal
    const existingGoal = await findExistingGoal(goalData, userId);
    
    if (existingGoal) {
      // Update existing goal
      console.log('[goalDeduplication] Updating existing goal:', existingGoal.id);
      
      const updatedGoal = await base44.entities.Goal.update(existingGoal.id, {
        targetValue: goalData.targetValue,
        targetUnit: goalData.targetUnit,
        deadline: goalData.deadline,
        description: goalData.description,
        currentValue: goalData.currentValue !== undefined ? goalData.currentValue : existingGoal.currentValue,
        progressPercentage: goalData.progressPercentage !== undefined ? goalData.progressPercentage : existingGoal.progressPercentage,
        trend: goalData.trend || existingGoal.trend,
        projectedCompletion: goalData.projectedCompletion || existingGoal.projectedCompletion,
        confidenceLevel: goalData.confidenceLevel !== undefined ? goalData.confidenceLevel : existingGoal.confidenceLevel,
        milestones: goalData.milestones || existingGoal.milestones
      });
      
      return { goal: updatedGoal, isNew: false };
    } else {
      // Create new goal
      console.log('[goalDeduplication] Creating new goal:', goalData.title);
      
      const newGoal = await base44.entities.Goal.create(fullGoalData);
      
      return { goal: newGoal, isNew: true };
    }
  } catch (error) {
    console.error('[goalDeduplication] Error in upsertGoal:', error);
    throw error;
  }
}

/**
 * Removes duplicate goals from a list, keeping the most recently updated
 * Used as a client-side safety net
 */
export function deduplicateGoals(goals) {
  if (!goals || goals.length === 0) return [];
  
  const seen = new Map();
  const deduplicated = [];
  
  // Sort by updated_date descending (most recent first)
  const sorted = [...goals].sort((a, b) => {
    const dateA = new Date(a.updated_date || a.created_date);
    const dateB = new Date(b.updated_date || b.created_date);
    return dateB - dateA;
  });
  
  for (const goal of sorted) {
    const key = generateGoalKey(goal);
    
    if (!seen.has(key)) {
      seen.set(key, true);
      deduplicated.push(goal);
    } else {
      console.warn('[goalDeduplication] Duplicate goal detected:', {
        title: goal.title,
        id: goal.id,
        category: goal.category
      });
    }
  }
  
  return deduplicated;
}

/**
 * Bulk upsert operation for multiple goals
 * Used by Production Planner to create/update all goals at once
 * 
 * @param {Array<Object>} goalsData - Array of goal data objects
 * @param {string} userId - The user ID
 * @returns {Promise<{created: number, updated: number, goals: Array}>}
 */
export async function bulkUpsertGoals(goalsData, userId) {
  const results = {
    created: 0,
    updated: 0,
    goals: []
  };
  
  try {
    for (const goalData of goalsData) {
      const { goal, isNew } = await upsertGoal(goalData, userId);
      
      if (isNew) {
        results.created++;
      } else {
        results.updated++;
      }
      
      results.goals.push(goal);
    }
    
    console.log('[goalDeduplication] Bulk upsert complete:', results);
    return results;
  } catch (error) {
    console.error('[goalDeduplication] Error in bulkUpsertGoals:', error);
    throw error;
  }
}