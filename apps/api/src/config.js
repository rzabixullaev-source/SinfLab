import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  BIND_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("sinflab"),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  ZOOM_VIDEO_SDK_KEY: z.string().optional(),
  ZOOM_VIDEO_SDK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).max(100).default(20),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(100).max(1000).default(500),
});

export function loadConfig(env = process.env) {
  const defaultCorsOrigin = env.NODE_ENV === "production"
    ? "https://sinf-lab.vercel.app"
    : "http://localhost:5173";
  return environmentSchema.parse({
    CORS_ORIGIN: defaultCorsOrigin,
    BIND_HOST: env.RAILWAY_PROJECT_ID ? "0.0.0.0" : "127.0.0.1",
    ...env,
  });
}
