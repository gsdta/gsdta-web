package apihttp

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type limiter struct {
	count int
	start time.Time
}

type rateState struct {
	sync.Mutex
	perIP map[string]*limiter
	limit int
	win   time.Duration
}

// RateLimit returns a middleware enforcing a simple fixed-window limit per IP.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	st := &rateState{perIP: make(map[string]*limiter), limit: limit, win: window}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			now := time.Now()
			st.Lock()
			lr := st.perIP[ip]
			if lr == nil || now.Sub(lr.start) >= st.win {
				lr = &limiter{count: 0, start: now}
				st.perIP[ip] = lr
			}
			lr.count++
			over := lr.count > st.limit
			remain := 0
			if lr.count <= st.limit {
				remain = st.limit - lr.count
			}
			reset := int(st.win.Seconds() - now.Sub(lr.start).Seconds())
			st.Unlock()

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(st.limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remain))
			w.Header().Set("X-RateLimit-Reset", strconv.Itoa(reset))

			if over {
				writeProblem(w, r, http.StatusTooManyRequests, http.StatusText(http.StatusTooManyRequests), "rate limit exceeded", "about:blank", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	// Try X-Forwarded-For first
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
