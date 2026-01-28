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

type LeaveHandler struct {
	leaveService *services.LeaveService
}

func NewLeaveHandler(leaveService *services.LeaveService) *LeaveHandler {
	return &LeaveHandler{leaveService: leaveService}
}

type CreateLeaveRequest struct {
	LeaveType        models.LeaveType `json:"leave_type" binding:"required"`
	StartDate        time.Time        `json:"start_date" binding:"required"`
	EndDate          time.Time        `json:"end_date" binding:"required"`
	Reason           string           `json:"reason" binding:"required"`
	AttachmentURL    string           `json:"attachment_url"`
	SpecialLeaveType string           `json:"special_leave_type"`
}

func (h *LeaveHandler) CreateLeaveRequest(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	var req CreateLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate attachment requirements
	if req.LeaveType == models.LeaveTypeSick && req.AttachmentURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Medical certificate is required for sick leave"})
		return
	}

	if req.LeaveType == models.LeaveTypeSpecial && req.SpecialLeaveType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Special leave type is required"})
		return
	}

	leaveRequest := &models.LeaveRequest{
		LeaveType:        req.LeaveType,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		Reason:           req.Reason,
		AttachmentURL:    req.AttachmentURL,
		SpecialLeaveType: req.SpecialLeaveType,
	}

	if err := h.leaveService.CreateLeaveRequest(userID, leaveRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, leaveRequest)
}

func (h *LeaveHandler) GetMyLeaveRequests(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	status := c.Query("status")
	year := c.Query("year")
	leaveType := c.Query("leave_type")

	requests, err := h.leaveService.GetUserLeaveRequests(userID, status, year, leaveType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *LeaveHandler) GetLeaveRequest(c *gin.Context) {
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	request, err := h.leaveService.GetLeaveRequest(requestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	c.JSON(http.StatusOK, request)
}

func (h *LeaveHandler) CancelLeaveRequest(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	if err := h.leaveService.CancelLeaveRequest(requestID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leave request cancelled"})
}

type ApproveRejectRequest struct {
	Comment string `json:"comment"`
}

func (h *LeaveHandler) ApproveLeaveRequest(c *gin.Context) {
	approverID := c.MustGet("user_id").(uuid.UUID)
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var req ApproveRejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.leaveService.ApproveLeave(requestID, approverID, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leave request approved"})
}

func (h *LeaveHandler) RejectLeaveRequest(c *gin.Context) {
	approverID := c.MustGet("user_id").(uuid.UUID)
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var req ApproveRejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.leaveService.RejectLeave(requestID, approverID, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leave request rejected"})
}

func (h *LeaveHandler) GetTeamLeaveRequests(c *gin.Context) {
	managerID := c.MustGet("user_id").(uuid.UUID)

	status := c.Query("status")
	year := c.Query("year")

	requests, err := h.leaveService.GetTeamLeaveRequests(managerID, status, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *LeaveHandler) GetLeaveBalance(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)
	year := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))

	balance, err := h.leaveService.GetUserLeaveBalance(userID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, balance)
}
