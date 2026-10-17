import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const x = z.number().finite().min(0).max(1000);
const y = z.number().finite().min(0).max(600);
const common = { id, color };

const rect = z.object({ ...common, type: z.enum(["rect", "ellipse"]), x, y, w: z.number().finite().min(4).max(1000), h: z.number().finite().min(4).max(600) }).strict();
const line = z.object({ ...common, type: z.literal("line"), x, y, x2: x, y2: y }).strict();
const pen = z.object({ ...common, type: z.literal("pen"), points: z.array(z.tuple([x, y])).min(2).max(300) }).strict();
const text = z.object({ ...common, type: z.literal("text"), x, y, text: z.string().trim().min(1).max(200) }).strict();

export const boardElementsSchema = z.array(z.union([rect, line, pen, text])).max(120)
  .refine((elements) => new Set(elements.map((element) => element.id)).size === elements.length,
    "Board element IDs must be unique");
