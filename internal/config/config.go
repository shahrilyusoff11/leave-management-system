package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
	"go.uber.org/zap"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Leave    LeaveConfig
	Email    EmailConfig
}

type ServerConfig struct {
	Port         string
	Env          string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	SecretKey      string
	AccessTokenTTL time.Duration
}

type LeaveConfig struct {
	MaxCarryForwardDays int
	WorkingDays         []string // ["Monday", "Tuesday", ...]
	EscalationDays      int
}

type EmailConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func LoadConfig(logger *zap.Logger) (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("/etc/lms/")

	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.env", "development")
	viper.SetDefault("database.sslmode", "disable")
	viper.SetDefault("leave.escalation_days", 7)
	viper.SetDefault("leave.max_carry_forward_days", 5)
	viper.SetDefault("jwt.access_token_ttl", "24h")

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err := viper.ReadInConfig(); err != nil {
		logger.Warn("No config file found, using defaults and environment variables")
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("unable to decode config: %w", err)
	}

	return &config, nil
}
