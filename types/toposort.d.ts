declare module "toposort" {
  function toposort<T = unknown>(edges: ReadonlyArray<[T, T]> | ReadonlyArray<T[]>): T[]
  namespace toposort {
    function array<T = unknown>(nodes: ReadonlyArray<T>, edges: ReadonlyArray<[T, T]> | ReadonlyArray<T[]>): T[]
  }
  export default toposort
}
