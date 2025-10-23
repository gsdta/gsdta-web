# GSDTA API Server

This is a Next.js-based API server for the GSDTA application.

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The API server will run on [http://localhost:3001](http://localhost:3001).

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## API Endpoints

### GET /v1/health

Health check endpoint that returns the service status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T00:00:00.000Z",
  "service": "gsdta-api",
  "version": "v1"
}
```

### POST /v1/echo

Echo endpoint that returns the request body along with metadata.

**Request:**
```json
{
  "message": "Hello, World!"
}
```

**Response:**
```json
{
  "echo": {
    "message": "Hello, World!"
  },
  "timestamp": "2025-10-23T00:00:00.000Z",
  "headers": {
    "content-type": "application/json",
    "user-agent": "..."
  }
}
```

