package services

import (
	"leave-management-system/internal/models"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// Additional methods for LeaveService

func (ls *LeaveService) GetPendingRequestsOlderThan(date time.Time) ([]models.LeaveRequest, error) {
	var requests []models.LeaveRequest
	err := ls.db.Preload("User").Preload("User.Manager").
		Where("status = ? AND created_at < ?", models.StatusPending, date).
		Find(&requests).Error
	return requests, err
}

func (ls *LeaveService) EscalateRequest(requestID uuid.UUID) error {
	return ls.db.Model(&models.LeaveRequest{}).
		Where("id = ?", requestID).
		Updates(map[string]interface{}{
			"status":       models.StatusEscalated,
			"is_escalated": true,
			"escalated_at": time.Now(),
		}).Error
}

func (ls *LeaveService) ArchiveOldRecords(date time.Time) error {
	// Example implementation
	return nil
}

func (ls *LeaveService) GetUserLeaveRequests(userID uuid.UUID, status, year, leaveType string) ([]models.LeaveRequest, error) {
	query := ls.db.Where("user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if year != "" {
		query = query.Where("EXTRACT(YEAR FROM start_date) = ?", year)
	}
	if leaveType != "" {
		query = query.Where("leave_type = ?", leaveType)
	}
	var requests []models.LeaveRequest
	err := query.Find(&requests).Error
	return requests, err
}

func (ls *LeaveService) GetLeaveRequest(requestID uuid.UUID) (*models.LeaveRequest, error) {
	var request models.LeaveRequest
	err := ls.db.Preload("User").First(&request, "id = ?", requestID).Error
	return &request, err
}

func (ls *LeaveService) CancelLeaveRequest(requestID, userID uuid.UUID) error {
	return ls.db.Model(&models.LeaveRequest{}).
		Where("id = ? AND user_id = ?", requestID, userID).
		Update("status", models.StatusCancelled).Error
}

func (ls *LeaveService) RejectLeave(requestID, approverID uuid.UUID, comment string) error {
	// Reuse ApproveLeave logic but set to Rejected and don't deduct balance
	return ls.db.Model(&models.LeaveRequest{}).
		Where("id = ?", requestID).
		Updates(map[string]interface{}{
			"status":      models.StatusRejected,
			"approver_id": approverID,
			"updated_at":  time.Now(),
		}).Error
}

func (ls *LeaveService) GetTeamLeaveRequests(managerID uuid.UUID, status, year string) ([]models.LeaveRequest, error) {
	// Find users managed by managerID
	var userIDs []uuid.UUID
	if err := ls.db.Model(&models.User{}).Where("manager_id = ?", managerID).Pluck("id", &userIDs).Error; err != nil {
		return nil, err
	}

	query := ls.db.Where("user_id IN ?", userIDs)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	// Add year filter if needed
	var requests []models.LeaveRequest
	err := query.Preload("User").Find(&requests).Error
	return requests, err
}

func (ls *LeaveService) GetUserLeaveBalance(userID uuid.UUID, yearStr string) (interface{}, error) {
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return nil, err
	}
	// Return all balances for that year
	var balances []models.LeaveBalance
	err = ls.db.Where("user_id = ? AND year = ?", userID, year).Find(&balances).Error
	return balances, err
}

func (ls *LeaveService) UpdateLeaveBalance(userID uuid.UUID, leaveType models.LeaveType, year int, total, adj float64, reason string) (*models.LeaveBalance, error) {
	// Implement update
	return nil, nil
}

func (ls *LeaveService) GetAllLeaveRequests(status, year, department string) ([]models.LeaveRequest, error) {
	// Implement query
	return []models.LeaveRequest{}, nil
}

func (ls *LeaveService) GeneratePayrollReport(month, year string) ([]byte, error) {
	// Implement report generation
	return []byte("report"), nil
}
