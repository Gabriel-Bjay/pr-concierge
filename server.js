// Vercel entrypoint. Vercel detects the first app/index/server file at the project root and
// type-checks it if it's TypeScript, which fails with TypeScript 7. This plain JavaScript file
// avoids that and loads the compiled server that `npm run build` writes to dist/.
import "./dist/server.js";
