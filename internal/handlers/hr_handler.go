package handlers

import (
	"leave-management-system/internal/models"
	"leave-management-system/internal/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type HRHandler struct {
	userService  *services.UserService
	leaveService *services.LeaveService
}

func NewHRHandler(userService *services.UserService, leaveService *services.LeaveService) *HRHandler {
	return &HRHandler{
		userService:  userService,
		leaveService: leaveService,
	}
}

func (h *HRHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *HRHandler) GetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userService.GetUserWithDetails(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

type CreateUserRequest struct {
	Email           string          `json:"email" binding:"required,email"`
	Password        string          `json:"password" binding:"required,min=8"`
	FirstName       string          `json:"first_name" binding:"required"`
	LastName        string          `json:"last_name" binding:"required"`
	Role            models.UserRole `json:"role" binding:"required"`
	Department      string          `json:"department" binding:"required"`
	Position        string          `json:"position" binding:"required"`
	ManagerID       *uuid.UUID      `json:"manager_id"`
	JoinedDate      string          `json:"joined_date" binding:"required"`
	ProbationMonths int             `json:"probation_months" default:"3"`
}

func (h *HRHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role permissions
	userRole := c.MustGet("user_role").(models.UserRole)
	if userRole != models.RoleSysAdmin && userRole != models.RoleAdmin &&
		userRole != models.RoleHR {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions to create user"})
		return
	}

	// HR cannot create SysAdmin or Admin users
	if (userRole == models.RoleHR) &&
		(req.Role == models.RoleSysAdmin || req.Role == models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot create admin users"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		Department:   req.Department,
		Position:     req.Position,
		ManagerID:    req.ManagerID,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	joinedDate, err := time.Parse("2006-01-02", req.JoinedDate)
	if err == nil {
		newUser.JoinedDate = joinedDate
	}

	if err := h.userService.CreateUser(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, newUser)
}

type UpdateLeaveBalanceRequest struct {
	LeaveType        models.LeaveType `json:"leave_type" binding:"required"`
	Year             int              `json:"year" binding:"required"`
	TotalEntitlement float64          `json:"total_entitlement"`
	Adjustment       float64          `json:"adjustment"`
	Reason           string           `json:"reason" binding:"required"`
}

func (h *HRHandler) UpdateLeaveBalance(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdateLeaveBalanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	balance, err := h.leaveService.UpdateLeaveBalance(userID, req.LeaveType, req.Year,
		req.TotalEntitlement, req.Adjustment, req.Reason)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, balance)
}

func (h *HRHandler) GetLeaveRequests(c *gin.Context) {
	status := c.Query("status")
	year := c.Query("year")
	department := c.Query("department")

	requests, err := h.leaveService.GetAllLeaveRequests(status, year, department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *HRHandler) ExportPayrollReport(c *gin.Context) {
	month := c.Query("month")
	year := c.Query("year")

	if month == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Month and year are required"})
		return
	}

	report, err := h.leaveService.GeneratePayrollReport(month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=payroll_report.csv")
	c.Data(http.StatusOK, "text/csv", report)
}

type ConfirmProbationRequest struct {
	IsConfirmed bool   `json:"is_confirmed"`
	Notes       string `json:"notes"`
}

func (h *HRHandler) ConfirmProbation(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req ConfirmProbationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userService.UpdateProbationStatus(userID, req.IsConfirmed, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Probation status updated"})
}
