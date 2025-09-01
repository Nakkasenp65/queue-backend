import { ObjectId } from "mongodb";

export default function toObjectIdSafe(id) {
  if (!id) return null;
  try {
    return typeof id === "string" ? new ObjectId(id) : id;
  } catch {
    return null;
  }
}
