package services

import (
	"errors"
	"fmt"
	"leave-management-system/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"leave-management-system/pkg/logger"
)

type LeaveService struct {
	db             *gorm.DB
	calculator     *LeaveCalculator
	auditLogger    *logger.AuditLogger
	holidayService *HolidayService
}

func NewLeaveService(db *gorm.DB, calculator *LeaveCalculator,
	auditLogger *logger.AuditLogger, holidayService *HolidayService) *LeaveService {
	return &LeaveService{
		db:             db,
		calculator:     calculator,
		auditLogger:    auditLogger,
		holidayService: holidayService,
	}
}

func (ls *LeaveService) CreateLeaveRequest(userID uuid.UUID, request *models.LeaveRequest) error {
	return ls.db.Transaction(func(tx *gorm.DB) error {
		// Get user with manager
		var user models.User
		if err := tx.Preload("Manager").First(&user, "id = ?", userID).Error; err != nil {
			return err
		}

		// Validate request
		if err := ls.calculator.ValidateLeaveRequest(&user, request); err != nil {
			return err
		}

		// Calculate working days
		workingDays, err := ls.calculator.CalculateWorkingDays(
			request.StartDate, request.EndDate, request.LeaveType)
		if err != nil {
			return err
		}
		request.DurationDays = workingDays

		// Check balance for leave types that deduct from balance
		if request.LeaveType == models.LeaveTypeAnnual ||
			request.LeaveType == models.LeaveTypeEmergency ||
			request.LeaveType == models.LeaveTypeSick {

			balance, err := ls.GetLeaveBalance(userID, int(time.Now().Year()), request.LeaveType)
			if err != nil {
				return err
			}

			available := balance.TotalEntitlement + balance.CarriedForward +
				balance.Adjusted - balance.Used

			if available < request.DurationDays {
				return fmt.Errorf("insufficient balance. Available: %.1f, Requested: %.1f",
					available, request.DurationDays)
			}
		}

		// Set request details
		request.ID = uuid.New()
		request.UserID = userID
		request.Status = models.StatusPending

		if user.ManagerID != nil {
			request.ApproverID = user.ManagerID
		} else {
			// If no manager, escalate to HR
			request.Status = models.StatusEscalated
			request.IsEscalated = true
			now := time.Now()
			request.EscalatedAt = &now
		}

		// Create chronology entry
		chronology := models.Chronology{
			ID:             uuid.New(),
			LeaveRequestID: request.ID,
			Action:         "submitted",
			ActorID:        userID,
			Comment:        "Leave application submitted",
			Metadata: models.JSONMap{
				"leave_type": request.LeaveType,
				"start_date": request.StartDate.Format(time.RFC3339),
				"end_date":   request.EndDate.Format(time.RFC3339),
				"duration":   request.DurationDays,
			},
			CreatedAt: time.Now(),
		}

		// Save everything
		if err := tx.Create(request).Error; err != nil {
			return err
		}

		if err := tx.Create(&chronology).Error; err != nil {
			return err
		}

		return nil
	})
}

func (ls *LeaveService) ApproveLeave(requestID, approverID uuid.UUID, comment string) error {
	return ls.db.Transaction(func(tx *gorm.DB) error {
		var request models.LeaveRequest
		if err := tx.Preload("User").First(&request, "id = ?", requestID).Error; err != nil {
			return err
		}

		// Check if approver is the manager
		if request.ApproverID == nil || *request.ApproverID != approverID {
			return errors.New("not authorized to approve this request")
		}

		// Update request
		now := time.Now()
		request.Status = models.StatusApproved
		request.ApprovedAt = &now
		request.UpdatedAt = now

		// Deduct balance if applicable
		if request.LeaveType == models.LeaveTypeAnnual ||
			request.LeaveType == models.LeaveTypeEmergency ||
			request.LeaveType == models.LeaveTypeSick {

			var balance models.LeaveBalance
			err := tx.Where("user_id = ? AND year = ? AND leave_type = ?",
				request.UserID, request.StartDate.Year(), request.LeaveType).
				First(&balance).Error

			if err != nil {
				return err
			}

			// Update balance
			balance.Used += request.DurationDays
			balance.UpdatedAt = time.Now()

			if err := tx.Save(&balance).Error; err != nil {
				return err
			}
		}

		// Create chronology entry
		chronology := models.Chronology{
			ID:             uuid.New(),
			LeaveRequestID: request.ID,
			Action:         "approved",
			ActorID:        approverID,
			Comment:        comment,
			CreatedAt:      time.Now(),
		}

		// Save updates
		if err := tx.Save(&request).Error; err != nil {
			return err
		}

		if err := tx.Create(&chronology).Error; err != nil {
			return err
		}

		return nil
	})
}

func (ls *LeaveService) GetLeaveBalance(userID uuid.UUID, year int, leaveType models.LeaveType) (*models.LeaveBalance, error) {
	var balance models.LeaveBalance

	err := ls.db.Where("user_id = ? AND year = ? AND leave_type = ?",
		userID, year, leaveType).
		First(&balance).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create default balance if not exists
		var user models.User
		if err := ls.db.First(&user, "id = ?", userID).Error; err != nil {
			return nil, err
		}

		balance = models.LeaveBalance{
			ID:               uuid.New(),
			UserID:           userID,
			LeaveType:        leaveType,
			Year:             year,
			TotalEntitlement: ls.calculateDefaultEntitlement(&user, year, leaveType),
			Used:             0,
			CarriedForward:   0,
			Adjusted:         0,
			IsOverridden:     false,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}

		if err := ls.db.Create(&balance).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	return &balance, nil
}

func (ls *LeaveService) calculateDefaultEntitlement(user *models.User, year int, leaveType models.LeaveType) float64 {
	switch leaveType {
	case models.LeaveTypeAnnual:
		return ls.calculator.CalculateAnnualLeaveEntitlement(user.JoinedDate, year)
	case models.LeaveTypeSick:
		return ls.calculator.CalculateSickLeaveEntitlement(user.JoinedDate, year)
	case models.LeaveTypeMaternity:
		return 98
	case models.LeaveTypePaternity:
		return 7
	default:
		return 0
	}
}

func (ls *LeaveService) calculateDefaultEntitlementForNextYear(userID uuid.UUID, year int) float64 {
	user, err := ls.GetLeaveBalance(userID, year, models.LeaveTypeAnnual)
	if err == nil {
		return user.TotalEntitlement // This logic might need refinement based on requirement
	}
	
	// Fallback to fetching user and calculating
	var u models.User
	if err := ls.db.First(&u, "id = ?", userID).Error; err != nil {
		return 0
	}
	return ls.calculateDefaultEntitlement(&u, year, models.LeaveTypeAnnual)
}

// Handle year-end carry forward
func (ls *LeaveService) ProcessYearEndCarryForward() error {
	return ls.db.Transaction(func(tx *gorm.DB) error {
		// Get all annual leave balances for current year
		currentYear := time.Now().Year()
		var balances []models.LeaveBalance

		err := tx.Where("year = ? AND leave_type = ?", currentYear, models.LeaveTypeAnnual).
			Find(&balances).Error

		if err != nil {
			return err
		}

		for _, balance := range balances {
			// Calculate unused leave (considering adjustments)
			available := balance.TotalEntitlement + balance.Adjusted - balance.Used
			if available > 0 {
				// Carry forward up to max limit (configurable)
				maxCarryForward := 5.0 // Should come from config
				carryForward := available
				if carryForward > maxCarryForward {
					carryForward = maxCarryForward
				}

				// Create next year's balance with carried forward amount
				nextYearBalance := models.LeaveBalance{
					ID:               uuid.New(),
					UserID:           balance.UserID,
					LeaveType:        models.LeaveTypeAnnual,
					Year:             currentYear + 1,
					TotalEntitlement: ls.calculateDefaultEntitlementForNextYear(balance.UserID, currentYear+1),
					CarriedForward:   carryForward,
					CreatedAt:        time.Now(),
					UpdatedAt:        time.Now(),
				}

				if err := tx.Create(&nextYearBalance).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}
