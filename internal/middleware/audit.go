package middleware

import (
	"bytes"
	"io"
	"leave-management-system/pkg/logger"
	"strings"
	"time"

	"leave-management-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuditMiddleware struct {
	auditLogger *logger.AuditLogger
}

func NewAuditMiddleware(auditLogger *logger.AuditLogger) *AuditMiddleware {
	return &AuditMiddleware{auditLogger: auditLogger}
}

func (m *AuditMiddleware) AuditLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip logging for certain endpoints
		if strings.Contains(c.Request.URL.Path, "/health") ||
			strings.Contains(c.Request.URL.Path, "/metrics") {
			c.Next()
			return
		}

		// Capture request body
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Capture response
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		startTime := time.Now()
		c.Next()
		duration := time.Since(startTime)

		// Get user info if authenticated
		userID, _ := c.Get("user_id")
		userEmail, _ := c.Get("user_email")
		userRole, _ := c.Get("user_role")

		// Log audit trail
		m.auditLogger.LogHTTP(
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			duration,
			c.ClientIP(),
			c.Request.UserAgent(),
			userID.(uuid.UUID),
			userEmail.(string),
			userRole.(models.UserRole),
			string(requestBody),
			blw.body.String(),
		)
	}
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}
