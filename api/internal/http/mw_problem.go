package apihttp

import (
	"bytes"
	"net/http"
	"strings"
)

type respCapture struct {
	h   http.Header
	st  int
	buf bytes.Buffer
}

func newRespCapture() *respCapture { return &respCapture{h: make(http.Header), st: http.StatusOK} }

func (rc *respCapture) Header() http.Header         { return rc.h }
func (rc *respCapture) Write(b []byte) (int, error) { return rc.buf.Write(b) }
func (rc *respCapture) WriteHeader(code int)        { rc.st = code }

// ProblemMiddleware converts plain text error responses into problem+json.
func ProblemMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rc := newRespCapture()
		next.ServeHTTP(rc, r)

		// If status >= 400 and content-type looks like text/plain or empty, emit problem+json
		ct := rc.h.Get("Content-Type")
		if rc.st >= 400 && (ct == "" || strings.HasPrefix(ct, "text/plain")) {
			// pass through headers like X-Request-ID, etc.
			for k, vv := range rc.h {
				for _, v := range vv {
					w.Header().Add(k, v)
				}
			}
			writeProblem(w, r, rc.st, http.StatusText(rc.st), strings.TrimSpace(rc.buf.String()), "about:blank", nil)
			return
		}
		// Otherwise, pass through original headers/body/status
		for k, vv := range rc.h {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(rc.st)
		_, _ = w.Write(rc.buf.Bytes())
	})
}
