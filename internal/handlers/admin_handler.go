package handlers

import (
	"leave-management-system/internal/models"
	"leave-management-system/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	holidayService *services.HolidayService
	configService  *services.ConfigService
	leaveService   *services.LeaveService
	auditService   *services.AuditService
}

func NewAdminHandler(holidayService *services.HolidayService,
	configService *services.ConfigService,
	leaveService *services.LeaveService,
	auditService *services.AuditService) *AdminHandler {
	return &AdminHandler{
		holidayService: holidayService,
		configService:  configService,
		leaveService:   leaveService,
		auditService:   auditService,
	}
}

type CreateHolidayRequest struct {
	Name        string    `json:"name" binding:"required"`
	Date        time.Time `json:"date" binding:"required"`
	Description string    `json:"description"`
	State       string    `json:"state"`
}

func (h *AdminHandler) CreatePublicHoliday(c *gin.Context) {
	var req CreateHolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	holiday := &models.PublicHoliday{
		Name:        req.Name,
		Date:        req.Date,
		Description: req.Description,
		State:       req.State,
		IsActive:    true,
	}

	if err := h.holidayService.AddHoliday(holiday); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, holiday)
}

func (h *AdminHandler) GetPublicHolidays(c *gin.Context) {
	yearStr := c.Query("year")
	var year int

	if yearStr == "" {
		year = time.Now().Year()
	} else {
		var err error
		year, err = strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
			return
		}
	}

	holidays, err := h.holidayService.GetHolidays(year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, holidays)
}

func (h *AdminHandler) UpdatePublicHoliday(c *gin.Context) {
	holidayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid holiday ID"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.holidayService.UpdateHoliday(holidayID, updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Holiday updated"})
}

func (h *AdminHandler) DeletePublicHoliday(c *gin.Context) {
	holidayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid holiday ID"})
		return
	}

	if err := h.holidayService.DeleteHoliday(holidayID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Holiday deleted"})
}

type SystemConfigRequest struct {
	MaxCarryForwardDays int      `json:"max_carry_forward_days"`
	WorkingDays         []string `json:"working_days"`
	EscalationDays      int      `json:"escalation_days"`
}

func (h *AdminHandler) UpdateSystemConfig(c *gin.Context) {
	var req SystemConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcReq := services.SystemConfigRequest{
		MaxCarryForwardDays: req.MaxCarryForwardDays,
		WorkingDays:         req.WorkingDays,
		EscalationDays:      req.EscalationDays,
	}

	if err := h.configService.UpdateSystemConfig(svcReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "System configuration updated"})
}

func (h *AdminHandler) GetSystemConfig(c *gin.Context) {
	config, err := h.configService.GetSystemConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

func (h *AdminHandler) TriggerYearEndProcess(c *gin.Context) {
	if err := h.leaveService.ProcessYearEndCarryForward(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Year-end process completed"})
}

func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	actorID := c.Query("actor_id")
	targetID := c.Query("target_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	logs, total, err := h.auditService.GetAuditLogs(page, limit, actorID, targetID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
