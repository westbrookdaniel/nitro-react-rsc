import { vite } from "../plugins/client";

export default defineEventHandler(fromNodeMiddleware(vite.middlewares));
