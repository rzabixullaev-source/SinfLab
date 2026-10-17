import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("sinflab"),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  ZOOM_VIDEO_SDK_KEY: z.string().optional(),
  ZOOM_VIDEO_SDK_SECRET: z.string().optional(),
});

export function loadConfig(env = process.env) {
  return environmentSchema.parse(env);
}
