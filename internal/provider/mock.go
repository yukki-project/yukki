package provider

import "context"

// MockProvider is a test double implementing Provider. Set Response (and
// optionally Err) to control its behavior. Calls captures the prompts.
type MockProvider struct {
	NameVal    string
	Response   string
	Err        error
	CheckErr   error
	VersionVal string
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

// CheckVersion returns CheckErr.
func (m *MockProvider) CheckVersion(ctx context.Context) error {
	return m.CheckErr
}

// Version returns VersionVal/VersionErr. Defaults to "mock-1.0" when both are
// zero, mirroring how MockProvider behaves when no specific version contract
// is set by the test.
func (m *MockProvider) Version(ctx context.Context) (string, error) {
	if m.VersionErr != nil {
		return "", m.VersionErr
	}
	if m.VersionVal != "" {
		return m.VersionVal, nil
	}
	return "mock-1.0", nil
}

// Generate records the prompt and returns Response, Err.
func (m *MockProvider) Generate(ctx context.Context, prompt string) (string, error) {
	m.Calls = append(m.Calls, prompt)
	if m.Err != nil {
		return "", m.Err
	}
	return m.Response, nil
}
