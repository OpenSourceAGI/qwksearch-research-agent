declare module "memoize-one" {
  type EqualityFn = (a: any, b: any) => boolean;

  function memoizeOne<T extends (...args: any[]) => any>(
    fn: T,
    isEqual?: EqualityFn
  ): T;

  export default memoizeOne;
}
