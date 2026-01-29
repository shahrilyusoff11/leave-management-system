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
	Port         string        `mapstructure:"port"`
	Env          string        `mapstructure:"env"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
}

type JWTConfig struct {
	SecretKey      string        `mapstructure:"secret_key"`
	AccessTokenTTL time.Duration `mapstructure:"access_token_ttl"`
}

type LeaveConfig struct {
	MaxCarryForwardDays int      `mapstructure:"max_carry_forward_days"`
	WorkingDays         []string `mapstructure:"working_days"`
	EscalationDays      int      `mapstructure:"escalation_days"`
}

type EmailConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	From     string `mapstructure:"from"`
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
