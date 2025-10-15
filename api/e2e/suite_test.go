package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/cucumber/godog"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/gsdta/api/internal/config"
	apihttp "github.com/gsdta/api/internal/http"
	"github.com/gsdta/api/internal/store/memory"
)

type apiWorld struct {
	server   *httptest.Server
	client   *http.Client
	baseURL  string
	headers  http.Header
	resp     *http.Response
	respBody []byte
	vars     map[string]string
}

func (w *apiWorld) startServer() error {
	if w.server != nil {
		return nil
	}
	cfg := config.Load()
	// ensure predictable env
	cfg.Env = "test"
	cfg.Port = "0"
	cfg.SeedOnStart = false // we'll seed manually for determinism
	// quiet logs in tests
	log.Logger = zerolog.New(io.Discard)

	mem := memory.New()
	// seed minimal data for flows
	if _, err := memory.SeedDev(mem); err != nil {
		return err
	}
	// Boot router with memory store
	h := apihttp.NewRouter(cfg, log.Logger, mem)
	w.server = httptest.NewServer(h)
	w.baseURL = w.server.URL
	w.client = &http.Client{Timeout: 5 * time.Second}
	w.headers = make(http.Header)
	w.vars = map[string]string{}
	return nil
}

func (w *apiWorld) stopServer() {
	if w.server != nil {
		w.server.Close()
		w.server = nil
	}
	w.client = nil
	w.headers = nil
	w.resp = nil
	w.respBody = nil
	w.vars = nil
}

func (w *apiWorld) iAmUnauthenticated() error {
	w.headers.Del("X-Debug-User")
	return nil
}

func (w *apiWorld) iAmRoleWithID(role, id string) error {
	// X-Debug-User format: id|role1,role2|email|name
	name := strings.ToUpper(role)
	h := fmt.Sprintf("%s|%s|%s|%s", id, role, id+"@example.com", name)
	w.headers.Set("X-Debug-User", h)
	return nil
}

func (w *apiWorld) setHeader(name, value string) error {
	w.headers.Set(name, value)
	return nil
}

func (w *apiWorld) iDoRequest(method, rawPath string, body *godog.DocString) error {
	if w.server == nil {
		if err := w.startServer(); err != nil {
			return err
		}
	}
	path := substituteVars(rawPath, w.vars)
	var rdr io.Reader
	if body != nil {
		b := substituteVars(body.Content, w.vars)
		rdr = bytes.NewBufferString(b)
	}
	// Preserve query strings by concatenating directly
	u := w.baseURL + path
	req, err := http.NewRequest(method, u, rdr)
	if err != nil {
		return err
	}
	for k, vv := range w.headers {
		for _, v := range vv {
			req.Header.Add(k, v)
		}
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := w.client.Do(req)
	if err != nil {
		return err
	}
	w.resp = resp
	w.respBody, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	return nil
}

func (w *apiWorld) responseCodeShouldBe(code int) error {
	if w.resp == nil {
		return fmt.Errorf("no response")
	}
	if w.resp.StatusCode != code {
		return fmt.Errorf("expected status %d, got %d. Body: %s", code, w.resp.StatusCode, string(w.respBody))
	}
	return nil
}

func (w *apiWorld) responseHeaderShouldContain(name, wantSubstr string) error {
	if w.resp == nil {
		return fmt.Errorf("no response")
	}
	got := w.resp.Header.Get(name)
	if !strings.Contains(got, wantSubstr) {
		return fmt.Errorf("expected header %s to contain %q, got %q", name, wantSubstr, got)
	}
	return nil
}

func (w *apiWorld) responseContentTypeShouldBe(ct string) error {
	if w.resp == nil {
		return fmt.Errorf("no response")
	}
	got := w.resp.Header.Get("Content-Type")
	if !strings.HasPrefix(got, ct) { // allow charset
		return fmt.Errorf("expected content-type %q, got %q", ct, got)
	}
	return nil
}

func (w *apiWorld) responseBodyShouldContain(sub string) error {
	if !bytes.Contains(w.respBody, []byte(sub)) {
		return fmt.Errorf("expected response body to contain %q, got: %s", sub, string(w.respBody))
	}
	return nil
}

func (w *apiWorld) responseBodyShouldNotContain(sub string) error {
	if bytes.Contains(w.respBody, []byte(sub)) {
		return fmt.Errorf("expected response body NOT to contain %q, got: %s", sub, string(w.respBody))
	}
	return nil
}

func (w *apiWorld) saveJSONAtPathAs(path, varName string) error {
	val, ok := jsonSelect(w.respBody, path)
	if !ok {
		return fmt.Errorf("json path %q not found in %s", path, string(w.respBody))
	}
	w.vars[varName] = val
	return nil
}

func (w *apiWorld) jsonAtPathEquals(path, expected string) error {
	val, ok := jsonSelect(w.respBody, path)
	if !ok {
		return fmt.Errorf("json path %q not found in %s", path, string(w.respBody))
	}
	if val != expected {
		return fmt.Errorf("json path %q = %q, want %q; body: %s", path, val, expected, string(w.respBody))
	}
	return nil
}

func (w *apiWorld) jsonArrayLengthAtPathOp(path, op string, n int) error {
	arrLen, ok := jsonArrayLen(w.respBody, path)
	if !ok {
		return fmt.Errorf("json array path %q not found or not array; body: %s", path, string(w.respBody))
	}
	switch op {
	case "=":
		if arrLen != n {
			return fmt.Errorf("array len at %q = %d, want %d", path, arrLen, n)
		}
	case ">=":
		if arrLen < n {
			return fmt.Errorf("array len at %q = %d, want >= %d", path, arrLen, n)
		}
	case "<=":
		if arrLen > n {
			return fmt.Errorf("array len at %q = %d, want <= %d", path, arrLen, n)
		}
	default:
		return fmt.Errorf("unsupported operator %q", op)
	}
	return nil
}

// Helpers

var reVar = regexp.MustCompile(`\$\{([A-Za-z0-9_\-]+)\}`)

func substituteVars(s string, vars map[string]string) string {
	return reVar.ReplaceAllStringFunc(s, func(m string) string {
		name := reVar.FindStringSubmatch(m)[1]
		if v, ok := vars[name]; ok {
			return v
		}
		return m
	})
}

// jsonSelect supports simple dotted paths with optional array index, e.g. "items[0].id" or "id"
func jsonSelect(body []byte, path string) (string, bool) {
	var cur any
	if len(body) == 0 {
		return "", false
	}
	if err := json.Unmarshal(body, &cur); err != nil {
		return "", false
	}
	parts := strings.Split(path, ".")
	v := cur
	for _, p := range parts {
		name, idx := parsePart(p)
		m, ok := v.(map[string]any)
		if !ok {
			return "", false
		}
		v, ok = m[name]
		if !ok {
			return "", false
		}
		if idx != nil {
			arr, ok := v.([]any)
			if !ok {
				return "", false
			}
			i := *idx
			if i < 0 || i >= len(arr) {
				return "", false
			}
			v = arr[i]
		}
	}
	// stringify basic types for comparisons and saving
	switch vv := v.(type) {
	case string:
		return vv, true
	case float64:
		// trim .0 for integers
		if vv == float64(int64(vv)) {
			return fmt.Sprintf("%d", int64(vv)), true
		}
		return strconv.FormatFloat(vv, 'f', -1, 64), true
	case bool:
		if vv {
			return "true", true
		}
		return "false", true
	case nil:
		return "null", true
	default:
		b, _ := json.Marshal(v)
		return string(b), true
	}
}

func jsonArrayLen(body []byte, path string) (int, bool) {
	var cur any
	if err := json.Unmarshal(body, &cur); err != nil {
		return 0, false
	}
	parts := strings.Split(path, ".")
	v := cur
	for _, p := range parts {
		name, idx := parsePart(p)
		m, ok := v.(map[string]any)
		if !ok {
			return 0, false
		}
		v, ok = m[name]
		if !ok {
			return 0, false
		}
		if idx != nil {
			arr, ok := v.([]any)
			if !ok {
				return 0, false
			}
			i := *idx
			if i < 0 || i >= len(arr) {
				return 0, false
			}
			v = arr[i]
		}
	}
	arr, ok := v.([]any)
	if !ok {
		return 0, false
	}
	return len(arr), true
}

func parsePart(p string) (name string, idx *int) {
	if i := strings.Index(p, "["); i != -1 && strings.HasSuffix(p, "]") {
		name = p[:i]
		n, _ := strconv.Atoi(p[i+1 : len(p)-1])
		return name, &n
	}
	return p, nil
}

// Steps registration

func (w *apiWorld) InitializeScenario(ctx *godog.ScenarioContext) {
	ctx.Step(`^the API server is running$`, w.startServer)
	ctx.Step(`^I am unauthenticated$`, w.iAmUnauthenticated)
	ctx.Step(`^I am an? (admin|teacher|parent) user with id "([^"]+)"$`, w.iAmRoleWithID)
	ctx.Step(`^I set header "([^"]+)" to "([^"]+)"$`, w.setHeader)
	ctx.Step(`^I (GET|POST|PUT|DELETE) "([^"]+)"$`, func(method, path string) error { return w.iDoRequest(method, path, nil) })
	ctx.Step(`^I (GET|POST|PUT|DELETE) "([^"]+)" with body:$`, func(method, path string, body *godog.DocString) error { return w.iDoRequest(method, path, body) })
	ctx.Step(`^the response code should be (\d+)$`, func(code int) error { return w.responseCodeShouldBe(code) })
	ctx.Step(`^the response header "([^"]+)" should contain "([^"]+)"$`, w.responseHeaderShouldContain)
	ctx.Step(`^the response content\-type should be "([^"]+)"$`, w.responseContentTypeShouldBe)
	ctx.Step(`^the response body should contain "([^"]+)"$`, w.responseBodyShouldContain)
	ctx.Step(`^the response body should not contain "([^"]+)"$`, w.responseBodyShouldNotContain)
	// Allow operator in quotes
	ctx.Step(`^json array "([^"]+)" length "(>=|<=|=)" (\d+)$`, w.jsonArrayLengthAtPathOp)
	ctx.Step(`^save json "([^"]+)" as "([^"]+)"$`, w.saveJSONAtPathAs)
	ctx.Step(`^json "([^"]+)" equals "([^"]+)"$`, w.jsonAtPathEquals)
	// Specific JSON key:value contains helpers for quoted content in steps
	ctx.Step(`^the response body should contain "\\"([^"]+)\\":\[\]"$`, func(key string) error {
		return w.responseBodyShouldContain(fmt.Sprintf("\"%s\":[]", key))
	})
	ctx.Step(`^the response body should contain "\\"([^"]+)\\":\\"([^"]+)\\""$`, func(key, val string) error {
		return w.responseBodyShouldContain(fmt.Sprintf("\"%s\":\"%s\"", key, val))
	})
	ctx.After(func(ctx context.Context, _ *godog.Scenario, _ error) (context.Context, error) {
		// Reset server between scenarios to isolate state
		w.stopServer()
		return ctx, nil
	})
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

func TestFeatures(t *testing.T) {
	w := &apiWorld{}
	suite := godog.TestSuite{
		Name:                "e2e",
		ScenarioInitializer: w.InitializeScenario,
		Options:             &godog.Options{Format: "pretty", Paths: []string{"features"}, Strict: true, TestingT: t},
	}
	if st := suite.Run(); st != 0 {
		t.Fatalf("godog failed with status %d", st)
	}
}
