package services

import (
	"errors"
	"leave-management-system/internal/models"
	"leave-management-system/pkg/logger"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db          *gorm.DB
	auditLogger *logger.AuditLogger
}

func NewUserService(db *gorm.DB, auditLogger *logger.AuditLogger) *UserService {
	return &UserService{
		db:          db,
		auditLogger: auditLogger,
	}
}

func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetUser(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) UpdateUser(user *models.User) error {
	return s.db.Save(user).Error
}

func (s *UserService) ChangePassword(userID uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.GetUser(userID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("invalid current password")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hashedPassword)
	return s.db.Save(user).Error
}

func (s *UserService) GetUserWithDetails(userID uuid.UUID) (*models.User, error) {
	var user models.User
	// Preload Manager or other relations if needed
	if err := s.db.Preload("Manager").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) UpdateProbationStatus(userID uuid.UUID, isConfirmed bool, notes string) error {
	user, err := s.GetUser(userID)
	if err != nil {
		return err
	}

	// Logic to update status
	// user.IsProbation = !isConfirmed // Example logic
	// user.ProbationNotes = notes

	return s.db.Save(user).Error
}

// Methods required by HRHandler (inferring signatures)
func (s *UserService) GetAllUsers() ([]models.User, error) {
	var users []models.User
	if err := s.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *UserService) CreateUser(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *UserService) ConfirmProbation(userID uuid.UUID) error {
	// Implementation stub
	return nil
}

func (s *UserService) UpdateLeaveBalance(userID uuid.UUID, year int, leaveType models.LeaveType, quota float64) error {
	// Implementation stub
	return nil
}
