import { isValidElement } from "react";
import { renderToPipeableStream } from "react-dom/server";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (_event, response) => {
    if (isValidElement(response.body)) {
      response.body = renderToPipeableStream(response.body);
    }
  });
});
