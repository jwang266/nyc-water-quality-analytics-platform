import app from "./app.js";
import { disconnectDB } from "./config/mongoConnection.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    console.log("Shutting down...");
    await disconnectDB();
    process.exit(0);
  });
}