package apihttp

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gsdta/api/internal/storage/localfs"
)

func TestLocalFS_Roundtrip(t *testing.T) {
	dir := t.TempDir()
	fs, err := localfs.New(filepath.Join(dir, "objects"))
	if err != nil {
		t.Fatalf("localfs new: %v", err)
	}
	ctx := context.Background()
	content := "hello, storage"
	url, err := fs.Save(ctx, "test/hello.txt", strings.NewReader(content), nil)
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if url == "" {
		t.Fatalf("expected non-empty url")
	}
	rc, err := fs.Open(ctx, "test/hello.txt")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	b, _ := io.ReadAll(rc)
	_ = rc.Close()
	if string(b) != content {
		t.Fatalf("content mismatch: got %q", string(b))
	}
	info, err := fs.Stat(ctx, "test/hello.txt")
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if info.Size != int64(len(content)) {
		t.Fatalf("size mismatch: got %d want %d", info.Size, len(content))
	}
	if err := fs.Delete(ctx, "test/hello.txt"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "objects", "test", "hello.txt")); !os.IsNotExist(err) {
		t.Fatalf("expected file removed, stat err=%v", err)
	}
}
