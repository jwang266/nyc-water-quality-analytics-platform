import app from "./app.js";
import { disconnectDB } from "./config/mongoConnection.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await disconnectDB();
  process.exit(0);
});
