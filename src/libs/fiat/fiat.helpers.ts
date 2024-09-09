export const mapDayPricesResult = (dates: Date[], result: number[][]) => {
  const maxDiff = 30 * 60 * 1000;
  const mapped = dates.map(
    (date) =>
      result.find((res) => Math.abs(res[0] - date.getTime()) < maxDiff) || null,
  );

  return mapped.map((f) => (f ? f[1] : undefined));
};
