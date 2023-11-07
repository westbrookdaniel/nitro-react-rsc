import { useState } from "react";
import type { Data } from "../routes";

export default function Home({ data }: { data: Data }) {
  const [count, setCount] = useState(0);

  return (
    <html>
      <head></head>
      <body>
        <h1>Hello {data.hello}</h1>
        <p> Count: {count} </p>
        <button onClick={() => setCount((c) => c++)}>+</button>
      </body>
    </html>
  );
}
