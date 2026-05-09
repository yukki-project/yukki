// OPS-001 prompt-update O18 — backend du drawer logs.
//
// TailLogs(maxLines) renvoie les N dernières entrées du fichier du
// jour parsées en LogLine. Gated par IsDevBuild — un binaire de
// release retourne ErrNotDevBuild même si le binding s'expose par
// inadvertance (défense en profondeur, cf. canvas safeguard
// "build-time gating").
//
// EmitLogEvent est exporté pour que ui.go puisse câbler le
// dailyFileWriter (clilog.SetEventListener) à un emetteur Wails
// runtime.EventsEmit("log:event", line).

package uiapp

import (
	"bufio"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/yukki-project/yukki/internal/configdir"
)

// ErrNotDevBuild is returned by TailLogs when called against a
// binary compiled without the `devbuild` tag. The frontend treats
// this as "drawer disabled" and renders nothing.
var ErrNotDevBuild = errors.New("uiapp: TailLogs is disabled in release builds")

// LogLine is the parsed shape of a single slog text-handler record.
// Raw preserves the full original line so the drawer can show it
// when the parser misses a field (defensive).
type LogLine struct {
	Timestamp string
	Level     string
	Source    string
	Msg       string
	Raw       string
}

// maxTailLinesCap clamps the maxLines parameter so a runaway frontend
// loop cannot exhaust memory by asking for the whole file.
const maxTailLinesCap = 2000

// TailLogs reads up to maxLines tail entries from today's log file.
// Returns an empty slice (and nil error) when the file does not yet
// exist (first launch of the day before any record is emitted).
func (a *App) TailLogs(maxLines int) ([]LogLine, error) {
	a.traceBinding("TailLogs", slog.Int("maxLines", maxLines))
	if !IsDevBuild {
		return nil, ErrNotDevBuild
	}
	if maxLines < 1 {
		maxLines = 1
	}
	if maxLines > maxTailLinesCap {
		maxLines = maxTailLinesCap
	}

	logsDir, err := configdir.LogsDir()
	if err != nil {
		return nil, fmt.Errorf("uiapp: resolve logs dir: %w", err)
	}
	today := time.Now().Format("2006-01-02")
	path := filepath.Join(logsDir, "yukki-"+today+".log")

	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return []LogLine{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("uiapp: open %s: %w", path, err)
	}
	defer func() { _ = f.Close() }()

	// Ring buffer over the whole file: O(N file size) memory but
	// cheap for alpha desktop where a daily log is < 10 MB.
	buf := make([]string, 0, maxLines)
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		if len(buf) < maxLines {
			buf = append(buf, scanner.Text())
		} else {
			copy(buf, buf[1:])
			buf[len(buf)-1] = scanner.Text()
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("uiapp: scan %s: %w", path, err)
	}

	out := make([]LogLine, 0, len(buf))
	for _, raw := range buf {
		out = append(out, parseSlogLine(raw))
	}
	return out, nil
}

// EmitLogEventListener returns a callback suitable for
// clilog.SetEventListener. The callback parses the line and emits
// the Wails event "log:event" so the drawer receives live updates.
// Returns nil in release builds — caller (ui.go) inspects the
// return and skips the wiring.
func (a *App) EmitLogEventListener() func([]byte) {
	if !IsDevBuild {
		return nil
	}
	return func(p []byte) {
		// Trim the trailing newline slog appends.
		line := strings.TrimRight(string(p), "\r\n")
		if line == "" {
			return
		}
		parsed := parseSlogLine(line)
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "log:event", parsed)
		}
	}
}

// slogLineRegex captures the four standard fields slog emits with
// the text handler. We match laxly: any extra attrs after `msg=…`
// stay attached to the message field (the drawer renders them as-is).
//
// Example match:
//   time=2026-05-09T18:32:14Z level=WARN source=frontend msg="HubList refresh failed" err="no project"
var slogLineRegex = regexp.MustCompile(`^time=(\S+)\s+level=(\S+)\s+(?:source=(\S+)\s+)?msg=(.+)$`)

// parseSlogLine extracts Timestamp / Level / Source / Msg from the
// slog text-handler line. Falls back to {Raw=line} when the regex
// misses (corrupted file, mid-write read, custom record).
func parseSlogLine(line string) LogLine {
	m := slogLineRegex.FindStringSubmatch(line)
	if m == nil {
		return LogLine{Raw: line}
	}
	msg := strings.TrimSpace(m[4])
	// slog quotes msg with double-quotes when it contains spaces;
	// strip surrounding quotes for the drawer's display layer.
	if len(msg) >= 2 && msg[0] == '"' && msg[len(msg)-1] == '"' {
		msg = msg[1 : len(msg)-1]
	}
	return LogLine{
		Timestamp: m[1],
		Level:     m[2],
		Source:    m[3],
		Msg:       msg,
		Raw:       line,
	}
}
