import { useMemo } from 'react';
import { Task } from './useTasks';
import { differenceInDays } from 'date-fns';

interface TaskMetrics {
  avgCompletionDays: number | null;
  topCompleter: { name: string; count: number } | null;
  topCreator: { name: string; count: number } | null;
  totalCompleted: number;
  totalTasks: number;
}

export function useTaskMetrics(tasks: Task[]): TaskMetrics {
  return useMemo(() => {
    // Filter out automated tasks (no created_by means automated)
    const manualTasks = tasks.filter(t => t.created_by);
    
    // Calculate average completion time for completed tasks
    const completedTasks = manualTasks.filter(t => t.completed_at && t.created_at);
    const completionDays = completedTasks.map(t => {
      const created = new Date(t.created_at);
      const completed = new Date(t.completed_at!);
      return differenceInDays(completed, created);
    }).filter(d => d >= 0); // Filter out any negative values
    
    const avgCompletionDays = completionDays.length > 0
      ? Math.round((completionDays.reduce((a, b) => a + b, 0) / completionDays.length) * 10) / 10
      : null;
    
    // Count completions by member (using whoever moved it to done)
    // For now, we'll track by assigned_to at completion time
    // In the future, this could be enhanced with explicit "completed_by" field
    const completionCounts: Record<string, number> = {};
    completedTasks.forEach(t => {
      // Try to get from history who completed it, fallback to assigned_to
      const completer = t.assigned_to || t.created_by || 'Unknown';
      if (completer && completer !== 'Unknown') {
        completionCounts[completer] = (completionCounts[completer] || 0) + 1;
      }
    });
    
    // Find top completer
    let topCompleter: { name: string; count: number } | null = null;
    Object.entries(completionCounts).forEach(([name, count]) => {
      if (!topCompleter || count > topCompleter.count) {
        topCompleter = { name, count };
      }
    });
    
    // Count task creation by member
    const creationCounts: Record<string, number> = {};
    manualTasks.forEach(t => {
      if (t.created_by) {
        creationCounts[t.created_by] = (creationCounts[t.created_by] || 0) + 1;
      }
    });
    
    // Find top creator
    let topCreator: { name: string; count: number } | null = null;
    Object.entries(creationCounts).forEach(([name, count]) => {
      if (!topCreator || count > topCreator.count) {
        topCreator = { name, count };
      }
    });
    
    return {
      avgCompletionDays,
      topCompleter,
      topCreator,
      totalCompleted: completedTasks.length,
      totalTasks: manualTasks.length,
    };
  }, [tasks]);
}
