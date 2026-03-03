import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// Prisma 7+ requires using defineConfig and moving the URL out of schema
// Only URL is needed in the config; provider comes from the schema.
export default defineConfig({
    datasource: {
        url: env("DATABASE_URL"),
    },
});
