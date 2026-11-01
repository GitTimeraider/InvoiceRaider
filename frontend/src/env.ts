import { defineEnvVars } from "@sveltejs/kit/env";

// Server-side environment variables, read at runtime (not inlined at build time).
// Import them from `$app/env/private`. All are optional; defaults are applied where used.
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
  BACKEND_URL: {
    description: "URL of the backend API (default: http://localhost:3000)",
    schema: optional,
  },
  OIDC_ENABLED: {
    description: 'Set to "true" to enable OIDC login',
    schema: optional,
  },
  SMTP_HOST: {
    description: "SMTP host used for the environment-level email fallback",
    schema: optional,
  },
  EMAIL_FROM_ADDRESS: {
    description: "Sender address used for the environment-level email fallback",
    schema: optional,
  },
});
