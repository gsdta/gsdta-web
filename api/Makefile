SHELL := /bin/sh

APP := api
BIN := bin/$(APP)
PKG := github.com/gsdta/api
VERSION ?= $(shell git describe --tags --always 2>/dev/null || echo dev)
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
BUILDTIME ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS := -X $(PKG)/internal/version.Version=$(VERSION) -X $(PKG)/internal/version.Commit=$(COMMIT) -X $(PKG)/internal/version.BuildTime=$(BUILDTIME)

IMAGE ?= gsdta/api:local

.PHONY: run dev test lint build tidy docker docker-run

run:
	go run ./cmd/api

dev: run

test:
	go test ./... -v

lint:
	golangci-lint run || true

build:
	mkdir -p bin
	go build -ldflags "$(LDFLAGS)" -o $(BIN) ./cmd/api

docker:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p 8080:8080 --name gsdta-api $(IMAGE)

tidy:
	go mod tidy
