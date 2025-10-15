package localfs

import (
	"context"
	"crypto/md5" //nolint:gosec // used only for non-cryptographic ETag
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/gsdta/api/internal/storage"
)

// LocalFS implements storage.ObjectStorage using the local filesystem under a root dir.
type LocalFS struct {
	root string
}

// New returns a new LocalFS rooted at dir. The directory will be created if missing.
func New(dir string) (*LocalFS, error) {
	if dir == "" {
		return nil, fmt.Errorf("localfs: dir is empty")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &LocalFS{root: dir}, nil
}

func (l *LocalFS) path(p string) (string, error) {
	if p == "" {
		return "", fmt.Errorf("path is empty")
	}
	clean := filepath.Clean(p)
	if clean == "." || clean == string(os.PathSeparator) {
		return "", fmt.Errorf("invalid path: %q", p)
	}
	full := filepath.Join(l.root, clean)
	return full, nil
}

// Save writes content to path, computing a simple ETag (md5) and returning a file:// URL.
func (l *LocalFS) Save(_ context.Context, p string, r io.Reader, _ *storage.PutOptions) (string, error) {
	full, err := l.path(p)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(full)
	if err != nil {
		return "", err
	}
	defer f.Close()
	// hash as we copy
	h := md5.New() //nolint:gosec
	mw := io.MultiWriter(f, h)
	if _, err := io.Copy(mw, r); err != nil {
		return "", err
	}
	_ = h.Sum(nil)
	return "file://" + full, nil
}

// Open opens the file for reading.
func (l *LocalFS) Open(_ context.Context, p string) (io.ReadCloser, error) {
	full, err := l.path(p)
	if err != nil {
		return nil, err
	}
	return os.Open(full)
}

// Stat returns file info and an md5-based ETag.
func (l *LocalFS) Stat(_ context.Context, p string) (storage.Info, error) {
	full, err := l.path(p)
	if err != nil {
		return storage.Info{}, err
	}
	fi, err := os.Stat(full)
	if err != nil {
		return storage.Info{}, err
	}
	etag, _ := fileMD5(full)
	return storage.Info{Path: p, Size: fi.Size(), ModTime: fi.ModTime(), ETag: etag}, nil
}

// Delete removes the file at path.
func (l *LocalFS) Delete(_ context.Context, p string) error {
	full, err := l.path(p)
	if err != nil {
		return err
	}
	return os.Remove(full)
}

func fileMD5(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := md5.New() //nolint:gosec
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Ensure interface compliance
var _ storage.ObjectStorage = (*LocalFS)(nil)
