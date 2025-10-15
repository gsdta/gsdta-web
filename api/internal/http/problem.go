package apihttp

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// Problem represents an RFC7807 problem+json response.
type Problem struct {
	Type     string                 `json:"type,omitempty"`
	Title    string                 `json:"title"`
	Status   int                    `json:"status"`
	Detail   string                 `json:"detail,omitempty"`
	Instance string                 `json:"instance,omitempty"`
	Extras   map[string]interface{} `json:"extras,omitempty"`
	Time     string                 `json:"time"`
}

func writeProblem(w http.ResponseWriter, r *http.Request, status int, title, detail, typ string, extras map[string]any) {
	p := Problem{
		Type:     typ,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
		Extras:   extras,
		Time:     time.Now().UTC().Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("X-Request-ID", middleware.GetReqID(r.Context()))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(p)
}
