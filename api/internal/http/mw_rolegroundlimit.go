package apihttp

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
)

type rlCounter struct {
	count int
	start time.Time
}

type roleRLState struct {
	sync.Mutex
	perID        map[string]*rlCounter
	limits       map[domain.Role]int
	defaultLimit int
	win          time.Duration
}

// RoleRateLimit applies per-principal (principal ID) rate limiting using role-specific limits.
// The highest limit among a principal's roles is used; unauthenticated uses defaultLimit.
func RoleRateLimit(limits map[domain.Role]int, defaultLimit int, window time.Duration) func(http.Handler) http.Handler {
	st := &roleRLState{perID: make(map[string]*rlCounter), limits: limits, defaultLimit: defaultLimit, win: window}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			p, _ := middlewares.FromContext(r.Context())
			lim := st.defaultLimit
			id := "anon"
			if p != nil && p.ID != "" {
				id = p.ID
				// choose max limit among roles
				for _, role := range p.Roles {
					if v, ok := st.limits[role]; ok && v > lim {
						lim = v
					}
				}
			}
			now := time.Now()
			st.Lock()
			ctr := st.perID[id]
			if ctr == nil || now.Sub(ctr.start) >= st.win {
				ctr = &rlCounter{count: 0, start: now}
				st.perID[id] = ctr
			}
			ctr.count++
			over := ctr.count > lim
			remain := 0
			if ctr.count <= lim {
				remain = lim - ctr.count
			}
			reset := int(st.win.Seconds() - now.Sub(ctr.start).Seconds())
			st.Unlock()

			w.Header().Set("X-RoleRateLimit-Limit", strconv.Itoa(lim))
			w.Header().Set("X-RoleRateLimit-Remaining", strconv.Itoa(remain))
			w.Header().Set("X-RoleRateLimit-Reset", strconv.Itoa(reset))

			if over {
				writeProblem(w, r, http.StatusTooManyRequests, http.StatusText(http.StatusTooManyRequests), "role rate limit exceeded", "about:blank", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
