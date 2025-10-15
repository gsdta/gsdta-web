package apihttp

import (
	"bytes"
	"crypto/md5" //nolint:gosec
	"encoding/hex"
	"io"
	"net/http"
	"strings"
)

type etagCapture struct {
	h   http.Header
	st  int
	buf bytes.Buffer
}

func newETagCapture() *etagCapture { return &etagCapture{h: make(http.Header), st: http.StatusOK} }

func (rc *etagCapture) Header() http.Header         { return rc.h }
func (rc *etagCapture) Write(b []byte) (int, error) { return rc.buf.Write(b) }
func (rc *etagCapture) WriteHeader(code int)        { rc.st = code }

// ETagMiddleware sets ETag for GET responses and returns 304 on If-None-Match matches.
func ETagMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}
		rc := newETagCapture()
		next.ServeHTTP(rc, r)

		// Copy headers first
		for k, vv := range rc.h {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		// Do not set ETag on error responses
		if rc.st >= 400 {
			w.WriteHeader(rc.st)
			_, _ = io.Copy(w, &rc.buf)
			return
		}
		// Compute weak ETag on body
		h := md5.Sum(rc.buf.Bytes()) //nolint:gosec
		etag := "W/\"" + hex.EncodeToString(h[:]) + "\""
		w.Header().Set("ETag", etag)
		if inm := r.Header.Get("If-None-Match"); inm != "" && strings.Contains(inm, etag) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.WriteHeader(rc.st)
		_, _ = io.Copy(w, &rc.buf)
	})
}
