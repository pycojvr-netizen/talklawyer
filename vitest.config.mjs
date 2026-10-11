// Native loading avoids Windows child-process restrictions during config bundling.
import { fileURLToPath } from "node:url";
export default {
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)) } },
  test: { pool: "threads", maxWorkers: 1, testTimeout: 30000 },
};
