package logger

import (
	"time"

	"leave-management-system/internal/models"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gorm.io/gorm/logger"
)

func NewLogger(env string) *zap.Logger {
	var config zap.Config

	if env == "production" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
	config.EncoderConfig.MessageKey = "message"
	config.EncoderConfig.LevelKey = "level"
	config.EncoderConfig.CallerKey = "caller"

	log, err := config.Build()
	if err != nil {
		panic(err)
	}

	return log
}

func NewGormLogger(zapLogger *zap.Logger) logger.Interface {
	return logger.New(
		zap.NewStdLog(zapLogger.With(zap.String("component", "gorm"))),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      true,
			Colorful:                  false,
		},
	)
}

type AuditLogger struct {
	logger *zap.Logger
}

func NewAuditLogger(zapLogger *zap.Logger) *AuditLogger {
	return &AuditLogger{
		logger: zapLogger.With(zap.String("component", "audit")),
	}
}

func (a *AuditLogger) Log(action, targetType string, actorID, targetID uuid.UUID,
	actorEmail string, actorRole models.UserRole, before, after interface{},
	ip, userAgent, method, endpoint string) {

	a.logger.Info("audit_log",
		zap.String("action", action),
		zap.String("target_type", targetType),
		zap.String("actor_id", actorID.String()),
		zap.String("target_id", targetID.String()),
		zap.String("actor_email", actorEmail),
		zap.String("actor_role", string(actorRole)),
		zap.Any("before_state", before),
		zap.Any("after_state", after),
		zap.String("ip_address", ip),
		zap.String("user_agent", userAgent),
		zap.String("method", method),
		zap.String("endpoint", endpoint),
	)
}

func (a *AuditLogger) LogHTTP(method, path string, status int, duration time.Duration,
	ip, userAgent string, userID uuid.UUID, userEmail string, userRole models.UserRole,
	requestBody, responseBody string) {

	a.logger.Info("http_audit_log",
		zap.String("method", method),
		zap.String("path", path),
		zap.Int("status", status),
		zap.Duration("duration", duration),
		zap.String("ip", ip),
		zap.String("user_agent", userAgent),
		zap.String("user_id", userID.String()),
		zap.String("user_email", userEmail),
		zap.String("user_role", string(userRole)),
		// zap.String("request_body", requestBody), // Optional: be careful with sensitive data
		// zap.String("response_body", responseBody),
	)
}
