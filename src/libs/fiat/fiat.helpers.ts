export const mapDayPricesResult = (dates: Date[], result: number[][]) => {
  const mapped = dates.map(
    (date) => result.find((res) => res[0] === date.getTime()) || null,
  );

  return mapped.map((f) => (f ? f[1] : undefined));
};
