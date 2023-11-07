export type Data = { hello: string };

export default eventHandler<Data>(() => {
  return { hello: "world" };
});
