import type { Data } from "../routes";

export default function Home(data: Data) {
  return <h1>Hello {data.hello}</h1>;
};
