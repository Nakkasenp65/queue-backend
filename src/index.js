import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import v1Routes from "./api/v1/index.js";
import v2Routes from "./api/v2/index.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.set("query parser", "extended");
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api/v1", v1Routes);
app.use("/api/v2", v2Routes);
app.get("/", (req, res) => res.json({ status: "ok" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
