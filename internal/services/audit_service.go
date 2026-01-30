package services

import (
	"leave-management-system/internal/models"

	"gorm.io/gorm"
)

type AuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

func (s *AuditService) GetAuditLogs(page, limit int, actorID, targetID, startDate, endDate string) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := s.db.Model(&models.AuditLog{})

	// Apply filters
	if actorID != "" {
		query = query.Where("actor_id = ?", actorID)
	}

	if targetID != "" {
		query = query.Where("target_id = ?", targetID)
	}

	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

func (s *AuditService) CreateAuditLog(log *models.AuditLog) error {
	return s.db.Create(log).Error
}
