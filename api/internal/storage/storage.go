package storage

import (
	"context"
	"io"
	"time"
)

// Info describes a stored object.
type Info struct {
	Path    string
	Size    int64
	ModTime time.Time
	ETag    string // optional, implementation-defined
}

// PutOptions controls how objects are saved.
type PutOptions struct {
	ContentType string
	PublicRead  bool
}

// ObjectStorage defines a simple object storage interface suitable for dev and prod backends.
type ObjectStorage interface {
	// Save writes the content from r to the given path, creating parent directories as needed.
	// Returns a URL or empty string depending on implementation.
	Save(ctx context.Context, path string, r io.Reader, opts *PutOptions) (string, error)
	// Open opens the object at path for reading.
	Open(ctx context.Context, path string) (io.ReadCloser, error)
	// Stat returns metadata about the object at path.
	Stat(ctx context.Context, path string) (Info, error)
	// Delete removes the object at path.
	Delete(ctx context.Context, path string) error
}
