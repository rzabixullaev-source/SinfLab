import { ObjectId } from "mongodb";
import { HttpError } from "./errors.js";

export function parseObjectId(value) {
  if (!/^[a-f0-9]{24}$/.test(value ?? "")) {
    throw new HttpError(400, "INVALID_ID", "Invalid identifier");
  }
  return new ObjectId(value);
}
