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
	// Calculate years of service based on anniversary date relative to start of entitlement year
	calculationDate := time.Date(currentYear, time.January, 1, 0, 0, 0, 0, joinedDate.Location())
	yearsOfService := currentYear - joinedDate.Year()
	if joinedDate.AddDate(yearsOfService, 0, 0).After(calculationDate) {
		yearsOfService--
	}
	if yearsOfService < 0 {
		yearsOfService = 0
	}

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(models.LeaveTypeAnnual)
	if err != nil {
		// Fallback to centralized defaults
		defaultEntitlement := lc.leaveTypeConfigSvc.GetDefaultEntitlement(models.LeaveTypeAnnual, yearsOfService)

		// Handle probation/first year logic manually for fallback if needed, or just return default
		// For first year annual leave, we might need proration even with defaults
		if yearsOfService == 0 {
			monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
			if monthsWorked > 12 {
				monthsWorked = 12
			}
			// Use default entitlement for calculation
			baseEntitlement := lc.leaveTypeConfigSvc.GetDefaultEntitlement(models.LeaveTypeAnnual, 0)
			return (baseEntitlement / 12) * float64(monthsWorked)
		}
		return defaultEntitlement
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
	// Calculate years of service based on anniversary date relative to start of entitlement year
	calculationDate := time.Date(currentYear, time.January, 1, 0, 0, 0, 0, joinedDate.Location())
	yearsOfService := currentYear - joinedDate.Year()
	if joinedDate.AddDate(yearsOfService, 0, 0).After(calculationDate) {
		yearsOfService--
	}
	if yearsOfService < 0 {
		yearsOfService = 0
	}

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(models.LeaveTypeSick)
	if err != nil {
		// Fallback to centralized defaults
		return lc.leaveTypeConfigSvc.GetDefaultEntitlement(models.LeaveTypeSick, yearsOfService)
	}

	return lc.calculateEntitlementWithTiers(config, yearsOfService)
}

// CalculateLeaveEntitlement calculates entitlement for any leave type
func (lc *LeaveCalculator) CalculateLeaveEntitlement(leaveType models.LeaveType, joinedDate time.Time, currentYear int) float64 {
	// Calculate years of service based on anniversary date relative to start of entitlement year
	calculationDate := time.Date(currentYear, time.January, 1, 0, 0, 0, 0, joinedDate.Location())
	yearsOfService := currentYear - joinedDate.Year()
	if joinedDate.AddDate(yearsOfService, 0, 0).After(calculationDate) {
		yearsOfService--
	}
	if yearsOfService < 0 {
		yearsOfService = 0
	}

	// Get config from database
	config, err := lc.leaveTypeConfigSvc.GetConfig(leaveType)
	if err != nil {
		// Fallback to centralized defaults
		entitlement := lc.leaveTypeConfigSvc.GetDefaultEntitlement(leaveType, yearsOfService)

		// Special handling for first year annual leave fallback
		if leaveType == models.LeaveTypeAnnual && yearsOfService == 0 {
			monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
			if monthsWorked > 12 {
				monthsWorked = 12
			}
			baseEntitlement := lc.leaveTypeConfigSvc.GetDefaultEntitlement(models.LeaveTypeAnnual, 0)
			return (baseEntitlement / 12) * float64(monthsWorked)
		}

		return entitlement
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
