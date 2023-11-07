//https://nitro.unjs.io/config
export default defineNitroConfig({
  esbuild: {
    options: {
      jsx: "automatic",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      jsxImportSource: "react",
      // Required for top level await (vite server)
      target: "es2022",
    },
  },
});
