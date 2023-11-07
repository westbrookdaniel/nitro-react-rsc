import { isValidElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { createServer as createViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

export default defineNitroPlugin(async (nitroApp) => {
  const viteDevServer = await createViteDevServer({
    plugins: [react()],
    server: { middlewareMode: true },
  });

  nitroApp.hooks.hook("beforeResponse", (event, response) => {
    if (event.headers.get("accept").includes("text/x-component")) {
      // TODO?
    } else {
      if (isValidElement(response.body)) {
        response.body = renderToPipeableStream(response.body);
        event.node.req.headers["content-type"] = "text/html";
      }
    }
  });
});
