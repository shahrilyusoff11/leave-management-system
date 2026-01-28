package services

type ConfigService struct {
	// Add DB or config source here
}

type SystemConfigRequest struct {
	MaxCarryForwardDays int      `json:"max_carry_forward_days"`
	WorkingDays         []string `json:"working_days"`
	EscalationDays      int      `json:"escalation_days"`
}

type SystemConfig struct {
	MaxCarryForwardDays int      `json:"max_carry_forward_days"`
	WorkingDays         []string `json:"working_days"`
	EscalationDays      int      `json:"escalation_days"`
}

func (s *ConfigService) UpdateSystemConfig(req SystemConfigRequest) error {
	return nil
}

func (s *ConfigService) GetSystemConfig() (*SystemConfig, error) {
	return &SystemConfig{}, nil
}
