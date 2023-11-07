import { renderToNodeStream, renderToPipeableStream } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { globSync } from "glob";
import { createRouter } from "radix3";
import { H3Event, EventHandlerRequest } from "h3";

export const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  plugins: [react()],
});

type RouteData = {
  Component: any;
  bootstrapModules: string[];
  bootstrapScriptContent: string;
};

export default defineNitroPlugin(async (nitroApp) => {
  // Find and prep all the client and server files
  const clientPages = globSync("client/**/page.{js,jsx,ts,tsx}");
  const router = createRouter<RouteData>();
  for (const clientPage of clientPages) {
    const { default: Component } = await vite.ssrLoadModule(clientPage);
    let path = clientPage.replace("client", "").replace(/\/page\.[jt]sx?$/, "");
    if (path === "") path = "/";
    const html = await vite.transformIndexHtml(
      path,
      `<script type="module" src="${clientPage}"></script>`,
    );
    router.insert(path, {
      Component,
      bootstrapModules: Array.from(
        html.matchAll(/<script type="module" src="(.*)"><\/script>/g),
      ).map((m) => m[1]),
      bootstrapScriptContent: `import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true`,
    });
  }

  // SSR render and serve the client page for the route
  async function renderRoute(
    event: H3Event<EventHandlerRequest>,
    route: ReturnType<typeof router.lookup>,
    data?: any,
  ) {
    try {
      const { pipe } = renderToPipeableStream(route.Component({ data }), {
        bootstrapModules: route.bootstrapModules,
        bootstrapScriptContent: route.bootstrapScriptContent,
      });
      event.node.res.setHeader("Content-Type", "text/html");
      event.node.res.statusCode = 200;
      pipe(event.node.res);
    } catch (error) {
      event.node.res.statusCode = 500;
      vite.ssrFixStacktrace(error);
      console.error(error);
      event.node.res.end(error.message);
    }
  }

  // Handle routes with no data loaders
  nitroApp.router.use(
    "/*",
    eventHandler(async (event) => {
      if (!event.handled) {
        const route = router.lookup(event.path);
        if (route) await renderRoute(event, route);
      }
    }),
  );

  // Handle routes with data loaders
  nitroApp.hooks.hook("beforeResponse", async (event, response) => {
    const route = router.lookup(event.path);
    if (route) await renderRoute(event, route, response.body);
  });
});
