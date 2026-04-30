package provider

import "context"

// MockProvider is a test double implementing Provider. Set Response (and
// optionally Err) to control its behavior. Calls captures the prompts.
type MockProvider struct {
	NameVal    string
	Response   string
	Err        error
	VersionErr error
	Calls      []string
}

// Name returns NameVal or "mock" if empty.
func (m *MockProvider) Name() string {
	if m.NameVal != "" {
		return m.NameVal
	}
	return "mock"
}

// CheckVersion returns VersionErr.
func (m *MockProvider) CheckVersion(ctx context.Context) error {
	return m.VersionErr
}

// Generate records the prompt and returns Response, Err.
func (m *MockProvider) Generate(ctx context.Context, prompt string) (string, error) {
	m.Calls = append(m.Calls, prompt)
	if m.Err != nil {
		return "", m.Err
	}
	return m.Response, nil
}
