package services

import (
	"fmt"
	"leave-management-system/internal/models"
	"time"
)

type LeaveCalculator struct {
	holidayService *HolidayService
}

func NewLeaveCalculator(holidayService *HolidayService) *LeaveCalculator {
	return &LeaveCalculator{
		holidayService: holidayService,
	}
}

// Calculate Malaysian leave entitlements based on tenure
func (lc *LeaveCalculator) CalculateAnnualLeaveEntitlement(joinedDate time.Time, currentYear int) float64 {
	yearsOfService := currentYear - joinedDate.Year()

	// Prorated calculation for first year
	if yearsOfService == 0 {
		monthsWorked := int(time.Since(joinedDate).Hours()/24/30) + 1
		if monthsWorked > 12 {
			monthsWorked = 12
		}

		// First year: 8 days pro-rated
		proratedDays := (8.0 / 12) * float64(monthsWorked)
		return proratedDays
	}

	// After first year
	switch yearsOfService {
	case 1, 2:
		return 8
	case 3, 4:
		return 12
	default:
		return 16
	}
}

func (lc *LeaveCalculator) CalculateSickLeaveEntitlement(joinedDate time.Time, currentYear int) float64 {
	yearsOfService := currentYear - joinedDate.Year()

	if yearsOfService < 2 {
		return 14
	} else if yearsOfService < 5 {
		return 18
	} else {
		return 22
	}
}

// Calculate working days between dates, excluding weekends and public holidays
func (lc *LeaveCalculator) CalculateWorkingDays(startDate, endDate time.Time, leaveType models.LeaveType) (float64, error) {
	var totalDays float64

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
