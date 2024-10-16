export const coerceBoolean = (
  value: string | boolean | undefined,
): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  } else if (typeof value === 'string') {
    return value !== '' && value !== 'false' && value !== '0';
  }

  return undefined;
};
