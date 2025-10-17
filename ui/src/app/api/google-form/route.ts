// Minimal proxy to submit to Google Forms from server-side to avoid CORS.
// Usage: POST JSON { data: { "entry.123": "value", ... } }
// Configure the FORM_ID below or via env var.

const FORM_ID = process.env.GOOGLE_FORM_ID || "1FAIpQLSdroKw_dnEwZmr3BrUxe-99ywJbScr-QTkhl98HUiAMzDC6Ng";
const FORM_ENDPOINT = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") || "";

    let formData: URLSearchParams;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (!body || typeof body !== "object" || typeof body.data !== "object") {
        return new Response(JSON.stringify({ error: "Invalid payload. Expected { data: Record<string,string|string[]> }" }), { status: 400 });
      }
      formData = new URLSearchParams();
      for (const [k, v] of Object.entries(body.data as Record<string, string | string[]>)) {
        if (Array.isArray(v)) {
          v.forEach((item) => {
            if (typeof item === "string") formData.append(k, item);
          });
        } else if (typeof v === "string") {
          formData.append(k, v);
        }
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Allow passthrough of raw form-encoded data
      const text = await request.text();
      formData = new URLSearchParams(text);
    } else if (contentType.includes("multipart/form-data")) {
      // Convert multipart FormData to URLSearchParams
      const fd = await request.formData();
      formData = new URLSearchParams();
      fd.forEach((value, key) => {
        if (typeof value === "string") formData.append(key, value);
      });
    } else {
      return new Response(JSON.stringify({ error: "Unsupported content type" }), { status: 415 });
    }

    if ([...formData.keys()].length === 0) {
      return new Response(JSON.stringify({ error: "No fields supplied" }), { status: 400 });
    }

    const resp = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formData.toString(),
      redirect: "manual",
    });

    // Google may return 200 or a redirect (303) on success
    const ok = resp.status >= 200 && resp.status < 400;
    if (!ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "Google form submission failed", status: resp.status, body: text.slice(0, 500) }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Unknown error" }), { status: 500 });
  }
}
