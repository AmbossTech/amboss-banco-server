export const toWithError = async <T>(promise: Promise<T>) => {
  return promise
    .then((data) => [data, undefined] as [T, undefined])
    .catch((err) => [undefined, err] as [undefined, Error]);
};

export const toWithErrorSync = <T, E = Error>(func: () => T) => {
  try {
    const result = func();
    return [result, undefined] as [T, undefined];
  } catch (error) {
    return [undefined, error] as [undefined, E];
  }
};
