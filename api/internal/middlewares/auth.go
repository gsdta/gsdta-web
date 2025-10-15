package middlewares

import (
	"context"
	"net/http"
	"strings"

	"github.com/gsdta/api/internal/domain"
)

// Principal represents the authenticated user (stubbed for dev).
type Principal struct {
	ID    string        `json:"id"`
	Email string        `json:"email"`
	Name  string        `json:"name"`
	Roles []domain.Role `json:"roles"`
}

type ctxKey int

const principalKey ctxKey = 1

// WithPrincipal stores the principal in context.
func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

// FromContext retrieves the principal from context.
func FromContext(ctx context.Context) (*Principal, bool) {
	p, ok := ctx.Value(principalKey).(*Principal)
	return p, ok && p != nil
}

// DebugAuth parses X-Debug-User header of the form: id|role1,role2|email|name
// and attaches a Principal to the request context if present.
func DebugAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("X-Debug-User")
		if strings.TrimSpace(h) != "" {
			p := parseDebugHeader(h)
			r = r.WithContext(WithPrincipal(r.Context(), p))
		}
		next.ServeHTTP(w, r)
	})
}

func parseDebugHeader(h string) *Principal {
	parts := strings.Split(h, "|")
	p := &Principal{}
	if len(parts) > 0 {
		p.ID = strings.TrimSpace(parts[0])
	}
	if len(parts) > 1 {
		roles := strings.Split(parts[1], ",")
		for _, r := range roles {
			r = strings.TrimSpace(r)
			if r == "" {
				continue
			}
			p.Roles = append(p.Roles, domain.Role(r))
		}
	}
	if len(parts) > 2 {
		p.Email = strings.TrimSpace(parts[2])
	}
	if len(parts) > 3 {
		p.Name = strings.TrimSpace(parts[3])
	}
	return p
}

// RequireAuth ensures a principal is present; otherwise 401.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if p, ok := FromContext(r.Context()); !ok || p == nil || p.ID == "" {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAnyRole ensures the principal has at least one of the provided roles.
func RequireAnyRole(roles ...domain.Role) func(http.Handler) http.Handler {
	set := map[domain.Role]struct{}{}
	for _, r := range roles {
		set[r] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			p, ok := FromContext(r.Context())
			if !ok || p == nil {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}
			for _, pr := range p.Roles {
				if _, ok := set[pr]; ok {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		})
	}
}

// RequireRole ensures the principal has the specified single role.
func RequireRole(role domain.Role) func(http.Handler) http.Handler {
	return RequireAnyRole(role)
}
