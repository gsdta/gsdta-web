package store

import "fmt"

type NotFoundError struct{ Resource, ID string }

func (e NotFoundError) Error() string { return fmt.Sprintf("%s not found: %s", e.Resource, e.ID) }

type ConflictError struct{ Reason string }

func (e ConflictError) Error() string { return fmt.Sprintf("conflict: %s", e.Reason) }

type ValidationError struct{ Field, Reason string }

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation failed: %s %s", e.Field, e.Reason)
}

type PermissionError struct{ Reason string }

func (e PermissionError) Error() string { return fmt.Sprintf("permission denied: %s", e.Reason) }
