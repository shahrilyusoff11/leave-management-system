export type UserRole = 'sysadmin' | 'admin' | 'hr' | 'manager' | 'hod' | 'staff';

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    department?: string;
    position?: string;
    manager_id?: string;
    joined_date: string;
    is_active: boolean;
    is_confirmed?: boolean;
    leave_entitlements?: LeaveBalance[];
}

export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid' | 'unrecorded' | 'hospitalization';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
    id: string;
    user_id: string;
    user?: User;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    duration_days: number;
    reason: string;
    attachment_url?: string;
    status: LeaveStatus;
    approver_id?: string;
    rejection_reason?: string;
    created_at: string;
}

export interface LeaveBalance {
    id: string;
    user_id: string;
    leave_type: LeaveType;
    year: number;
    total_entitlement: number;
    used: number;
    carried_forward: number;
    adjusted: number;
    remaining: number; // Calculated, or implicit
}
