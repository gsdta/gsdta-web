'use client'
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log the error for diagnostics
  useEffect(() => {
    console.error('App error boundary:', { message: error.message, digest: error.digest });
  }, [error]);
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
