import { ObjectId } from "mongodb";

// แปลงเป็น mongo ObjectId สำหรับ v2 route
// (ถ้าไม่มี id ให้คืนค่า null สำหรับ field ที่ไม่จำเป็นต้องมีก็ได้)
export default function toObjectIdSafe(id) {
  if (!id) return null;
  try {
    return typeof id === "string" ? new ObjectId(id) : id;
  } catch {
    return null;
  }
}
