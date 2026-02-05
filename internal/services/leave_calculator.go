package services

import (
	"fmt"
	"leave-management-system/internal/models"
	"time"
)

type LeaveCalculator struct {
	holidayService     *HolidayService
	leaveTypeConfigSvc *LeaveTypeConfigService
}

func NewLeaveCalculator(holidayService *HolidayService, leaveTypeConfigSvc *LeaveTypeConfigService) *LeaveCalculator {
	return &LeaveCalculator{
		holidayService:     holidayService,
		leaveTypeConfigSvc: leaveTypeConfigSvc,
	}
}

// Calculate leave entitlement based on database config and years of service
func (lc *LeaveCalculator) CalculateAnnualLeaveEntitlement(joinedDate time.Time, currentYear int) float64 {
	yearsOfService := currentYear - joinedDate.Year()

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(models.LeaveTypeAnnual)
	if err != nil {
		// Fallback to hardcoded defaults
		return lc.getDefaultAnnualEntitlement(yearsOfService, joinedDate)
	}

	// Calculate base entitlement with years of service tiers
	entitlement := lc.calculateEntitlementWithTiers(config, yearsOfService)

	// Prorated calculation for first year
	if yearsOfService == 0 && config.ProrateFirstYear {
		monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
		if monthsWorked > 12 {
			monthsWorked = 12
		}
		proratedDays := (entitlement / 12) * float64(monthsWorked)
		return proratedDays
	}

	return entitlement
}

func (lc *LeaveCalculator) CalculateSickLeaveEntitlement(joinedDate time.Time, currentYear int) float64 {
	yearsOfService := currentYear - joinedDate.Year()

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(models.LeaveTypeSick)
	if err != nil {
		// Fallback to hardcoded defaults
		return lc.getDefaultSickEntitlement(yearsOfService)
	}

	return lc.calculateEntitlementWithTiers(config, yearsOfService)
}

// CalculateLeaveEntitlement calculates entitlement for any leave type
func (lc *LeaveCalculator) CalculateLeaveEntitlement(leaveType models.LeaveType, joinedDate time.Time, currentYear int) float64 {
	yearsOfService := currentYear - joinedDate.Year()

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(leaveType)
	if err != nil {
		// Fallback to type-specific defaults
		switch leaveType {
		case models.LeaveTypeAnnual:
			return lc.getDefaultAnnualEntitlement(yearsOfService, joinedDate)
		case models.LeaveTypeSick:
			return lc.getDefaultSickEntitlement(yearsOfService)
		case models.LeaveTypeMaternity:
			return 98
		case models.LeaveTypePaternity:
			return 7
		case models.LeaveTypeHospitalization:
			return 60
		default:
			return 0
		}
	}

	// Calculate base entitlement with years of service tiers
	entitlement := lc.calculateEntitlementWithTiers(config, yearsOfService)

	// Prorated calculation for first year if applicable
	if yearsOfService == 0 && config.ProrateFirstYear {
		monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
		if monthsWorked > 12 {
			monthsWorked = 12
		}
		return (entitlement / 12) * float64(monthsWorked)
	}

	return entitlement
}

// calculateEntitlementWithTiers applies years of service bonus from config
func (lc *LeaveCalculator) calculateEntitlementWithTiers(config *models.LeaveTypeConfig, yearsOfService int) float64 {
	entitlement := config.BaseEntitlement

	if config.YearsOfServiceTiers != nil {
		for years, bonus := range config.YearsOfServiceTiers {
			var yearsThreshold int
			if _, err := fmt.Sscanf(years, "%d", &yearsThreshold); err != nil {
				continue
			}

			if yearsOfService >= yearsThreshold {
				switch b := bonus.(type) {
				case float64:
					entitlement += b
				case int:
					entitlement += float64(b)
				}
			}
		}
	}

	return entitlement
}

// Fallback methods for when config is not available
func (lc *LeaveCalculator) getDefaultAnnualEntitlement(yearsOfService int, joinedDate time.Time) float64 {
	if yearsOfService == 0 {
		monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
		if monthsWorked > 12 {
			monthsWorked = 12
		}
		return (8.0 / 12) * float64(monthsWorked)
	}

	switch yearsOfService {
	case 1, 2:
		return 8
	case 3, 4:
		return 12
	default:
		return 16
	}
}

func (lc *LeaveCalculator) getDefaultSickEntitlement(yearsOfService int) float64 {
	if yearsOfService < 2 {
		return 14
	} else if yearsOfService < 5 {
		return 18
	}
	return 22
}

// Calculate working days between dates, excluding weekends and public holidays
func (lc *LeaveCalculator) CalculateWorkingDays(startDate, endDate time.Time, leaveType models.LeaveType) (float64, error) {
	var totalDays float64

	// Normalize dates to start of day to avoid time comparison issues
	startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, endDate.Location())

	// For maternity and paternity leave, count all days including weekends
	if leaveType == models.LeaveTypeMaternity || leaveType == models.LeaveTypePaternity {
		days := endDate.Sub(startDate).Hours()/24 + 1
		return days, nil
	}

	// For other leaves, exclude weekends and public holidays
	currentDate := startDate
	for !currentDate.After(endDate) {
		// Skip weekends
		if currentDate.Weekday() != time.Saturday && currentDate.Weekday() != time.Sunday {
			// Check if it's a public holiday
			isHoliday, err := lc.holidayService.IsPublicHoliday(currentDate)
			if err != nil {
				return 0, err
			}
			if !isHoliday {
				totalDays++
			}
		}
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	return totalDays, nil
}

// Check if leave request is valid
func (lc *LeaveCalculator) ValidateLeaveRequest(user *models.User, request *models.LeaveRequest) error {
	// Check probation status
	if !user.IsConfirmed && request.LeaveType != models.LeaveTypeSick {
		return fmt.Errorf("user is on probation and can only apply for sick leave")
	}

	// Check if dates are valid
	if request.StartDate.After(request.EndDate) {
		return fmt.Errorf("start date must be before end date")
	}

	// Check if applying for past dates (emergency leave exception)
	if request.StartDate.Before(time.Now().AddDate(0, 0, -1)) && request.LeaveType != models.LeaveTypeEmergency {
		return fmt.Errorf("cannot apply for leave in the past")
	}

	return nil
}
