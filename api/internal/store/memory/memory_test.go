package memory

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

func TestStudentRepoCRUD(t *testing.T) {
	ctx := context.Background()
	s := New()
	repo := s.Students()

	// Create
	st, err := repo.Create(ctx, domain.Student{FirstName: "Ada", LastName: "Lovelace"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if st.ID == "" {
		t.Fatalf("expected id to be set")
	}
	if !st.CreatedAt.Equal(st.UpdatedAt) {
		t.Fatalf("create times should match")
	}

	// Get
	got, err := repo.Get(ctx, st.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.ID != st.ID || got.FirstName != "Ada" {
		t.Fatalf("unexpected student: %#v", got)
	}

	// Update
	time.Sleep(5 * time.Millisecond)
	st.PriorLevel = "L2"
	upd, err := repo.Update(ctx, st)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if !upd.UpdatedAt.After(upd.CreatedAt) {
		t.Fatalf("updatedAt should be after createdAt")
	}
	if upd.PriorLevel != "L2" {
		t.Fatalf("update not applied")
	}

	// List
	list, total, err := repo.List(ctx, store.ListOptions{Limit: 10, Offset: 0, SortBy: "createdAt", Desc: false})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected 1 item, total=1 got: %d %d", len(list), total)
	}

	// Delete
	if err := repo.Delete(ctx, st.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := repo.Get(ctx, st.ID); err == nil {
		t.Fatalf("expected not found after delete")
	}
}

func TestNotFoundErrors(t *testing.T) {
	ctx := context.Background()
	s := New()
	// Verify student not found
	if _, err := s.Students().Get(ctx, "missing"); err == nil {
		t.Fatalf("expected not found error")
	}
	// Verify delete not found
	if err := s.Students().Delete(ctx, "missing"); err == nil {
		t.Fatalf("expected not found error on delete")
	}
}

func TestConcurrentCreates(t *testing.T) {
	ctx := context.Background()
	s := New()
	repo := s.Students()

	const n = 100
	wg := sync.WaitGroup{}
	wg.Add(n)
	ids := make(chan string, n)
	for i := 0; i < n; i++ {
		go func(i int) {
			defer wg.Done()
			st, err := repo.Create(ctx, domain.Student{FirstName: "S", LastName: "#"})
			if err != nil {
				t.Errorf("create[%d]: %v", i, err)
				return
			}
			ids <- st.ID
		}(i)
	}
	wg.Wait()
	close(ids)

	seen := map[string]bool{}
	for id := range ids {
		if id == "" {
			t.Fatalf("empty id generated")
		}
		if seen[id] {
			t.Fatalf("duplicate id: %s", id)
		}
		seen[id] = true
	}

	// Ensure list shows n items
	list, total, err := repo.List(ctx, store.ListOptions{})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != n || len(list) != n {
		t.Fatalf("expected %d items got %d/%d", n, len(list), total)
	}
}
