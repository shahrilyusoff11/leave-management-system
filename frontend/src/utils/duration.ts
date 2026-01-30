import { isWeekend, eachDayOfInterval, parseISO } from 'date-fns';

/**
 * Calculate the duration of a leave request in working days.
 * If duration_days is provided and valid (> 0), use it.
 * Otherwise, calculate from start and end dates.
 */
export function getDisplayDuration(
    durationDays: number | undefined,
    startDate: string | Date,
    endDate: string | Date
): number {
    // If we have a valid duration from the backend, use it
    if (durationDays && durationDays > 0) {
        return durationDays;
    }

    // Otherwise, calculate it on the frontend
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    // Get all days in the range
    const days = eachDayOfInterval({ start, end });

    // Count working days (exclude weekends)
    const workingDays = days.filter(day => !isWeekend(day)).length;

    // Ensure at least 1 day for same-day leaves
    return Math.max(workingDays, 1);
}

/**
 * Format duration display with proper pluralization
 */
export function formatDuration(days: number): string {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
}
