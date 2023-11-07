import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { globSync } from "glob";
import { createRouter } from "radix3";

const templateMap: Record<string, string> = {};
const buildTemplate = (clientSrc: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nitro + React</title>
  </head>
  <body>
    <!--ssr-outlet-->
    <script type="module" src="${clientSrc}"></script>
  </body>
</html>`;

export default defineNitroPlugin(async (nitroApp) => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    plugins: [react()],
  });

  // Vite middleware
  nitroApp.router.use("/*", fromNodeMiddleware(vite.middlewares));
  nitroApp.hooks.hook("error", (error) => vite.ssrFixStacktrace(error));

  // Find and prep all the client and server files
  const clientPages = globSync("client/**/page.{js,jsx,ts,tsx}");
  const router = createRouter<{ Component: any }>();
  for (const clientPage of clientPages) {
    const { default: Component } = await vite.ssrLoadModule(clientPage);
    let path = clientPage.replace("client", "").replace(/\/page\.[jt]sx?$/, "");
    if (path === "") path = "/";
    router.insert(path, { Component });
    templateMap[path] = await vite.transformIndexHtml(
      path,
      buildTemplate(clientPage),
    );
  }

  // SSR render and serve the client page for the route
  function renderRoute(
    path: string,
    route: ReturnType<typeof router.lookup>,
    data?: any,
  ) {
    let html = renderToString(route.Component(data));
    html = templateMap[path].replace("<!--ssr-outlet-->", html);
    return new Response(html, {
      headers: { "content-type": "text/html" },
    });
  }

  // Handle routes with no data loaders
  nitroApp.router.use(
    "/*",
    eventHandler(async (event) => {
      if (!event.handled) {
        const route = router.lookup(event.path);
        if (route) event.respondWith(renderRoute(event.path, route));
      }
    }),
  );

  // Handle routes with data loaders
  nitroApp.hooks.hook("beforeResponse", async (event, response) => {
    const route = router.lookup(event.path);
    if (route) event.respondWith(renderRoute(event.path, route, response.body));
  });
});
