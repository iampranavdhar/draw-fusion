export const capitalize = (s: string) => {
  return s?.replace(/\b\w/g, function (match: string) {
    return match.toUpperCase();
  });
};
