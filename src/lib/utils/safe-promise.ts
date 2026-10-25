// Await a promise without try/catch: success resolves as [value, undefined],
// a rejection as [undefined, Error] (non-Error rejections are coerced).
export async function safePromise<T>(
  promise: Promise<T>,
): Promise<[T, undefined] | [undefined, Error]> {
  return promise.then(
    (value) => [value, undefined],
    (error) => [
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    ],
  );
}
