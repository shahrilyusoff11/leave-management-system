package services

import (
	"leave-management-system/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HolidayService struct {
	db *gorm.DB
}

func NewHolidayService(db *gorm.DB) *HolidayService {
	return &HolidayService{db: db}
}

func (hs *HolidayService) IsPublicHoliday(date time.Time) (bool, error) {
	var count int64
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())

	err := hs.db.Model(&models.PublicHoliday{}).
		Where("date = ? AND is_active = ?", dateOnly, true).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (hs *HolidayService) GetHolidays(year int) ([]models.PublicHoliday, error) {
	var holidays []models.PublicHoliday
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year, 12, 31, 23, 59, 59, 0, time.UTC)

	err := hs.db.Where("date BETWEEN ? AND ? AND is_active = ?",
		startDate, endDate, true).
		Order("date ASC").
		Find(&holidays).Error

	return holidays, err
}

func (hs *HolidayService) AddHoliday(holiday *models.PublicHoliday) error {
	holiday.ID = uuid.New()
	return hs.db.Create(holiday).Error
}

func (hs *HolidayService) UpdateHoliday(id uuid.UUID, updates map[string]interface{}) error {
	return hs.db.Model(&models.PublicHoliday{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (hs *HolidayService) DeleteHoliday(id uuid.UUID) error {
	return hs.db.Delete(&models.PublicHoliday{}, "id = ?", id).Error
}
