// Production entry point for the frontend (used instead of build/index.js).
//
// @sveltejs/adapter-node 6 (SvelteKit 3) no longer reads the ORIGIN
// environment variable: it always derives the request origin as
// "https://<Host header>". That breaks every form submission (including login)
// with "Cross-site POST form submissions are forbidden" when the app is opened
// over plain http:// (e.g. http://localhost:8000 or a LAN IP), or behind a
// proxy that rewrites the Host header.
//
// This keeps the documented ORIGIN behaviour: when ORIGIN is set, every request
// is treated as coming from that origin, exactly like adapter-node <= 5 did.
// Without ORIGIN, the adapter's default behaviour (PROTOCOL_HEADER,
// HOST_HEADER, ...) applies unchanged.
import http from "node:http";
import process from "node:process";

const PROTO_HEADER = "x-invoiceraider-origin-proto";
const HOST_HEADER = "x-invoiceraider-origin-host";

let origin = null;
if (process.env.ORIGIN) {
  const url = new URL(process.env.ORIGIN);
  origin = { proto: url.protocol.slice(0, -1), host: url.host };
  // Must be set before the handler module is loaded: it reads them on import.
  process.env.PROTOCOL_HEADER = PROTO_HEADER;
  process.env.HOST_HEADER = HOST_HEADER;
  delete process.env.PORT_HEADER;
}

const { handler } = await import("./build/handler.js");

const server = http.createServer((req, res) => {
  if (origin) {
    // Always overwrite, so clients cannot inject their own values.
    req.headers[PROTO_HEADER] = origin.proto;
    req.headers[HOST_HEADER] = origin.host;
  }
  handler(req, res, () => {
    res.statusCode = 404;
    res.end("Not found");
  });
});

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  // Don't hang on keep-alive connections.
  server.closeIdleConnections?.();
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
