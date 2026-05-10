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

	// BlockUntil, when non-nil, makes Generate wait for either the
	// channel to be closed (or sent-on) or the context to be cancelled
	// before returning. Used by UI-001c tests to drive cancellation
	// deterministically. nil = unchanged UI-001b behavior.
	BlockUntil chan struct{}
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

// Generate records the prompt and returns Response, Err. If BlockUntil
// is non-nil, blocks until the channel is closed/received-from or the
// context is cancelled, whichever comes first.
//
// Cancellation est prioritaire : si ctx.Done() est ready au moment où
// la select se débloque, on renvoie ctx.Err() même si BlockUntil est
// aussi ready (Go select pickerait sinon aléatoirement et le test
// CancelMidStream voyait parfois le success path emit `done`).
func (m *MockProvider) Generate(ctx context.Context, prompt string) (string, error) {
	m.Calls = append(m.Calls, prompt)
	if m.BlockUntil != nil {
		select {
		case <-m.BlockUntil:
			// Race-safe : avant de retourner la réponse, on vérifie
			// une dernière fois ctx.Done(). Le test CancelMidStream
			// fait `cancel(); close(block)` ; sans cette double
			// vérification, la select peut élire BlockUntil même si
			// ctx était cancelled juste avant.
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			default:
			}
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	if m.Err != nil {
		return "", m.Err
	}
	return m.Response, nil
}
