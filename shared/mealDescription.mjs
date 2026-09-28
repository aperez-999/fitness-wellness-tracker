// Lightweight checks, not a food classifier or a complete personal-data filter.
export function mealDescriptionError(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Enter a food or meal to estimate.';
  if (value.trim().length > 120) return 'Keep the food or meal to 120 characters or fewer.';
  if (/https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+/i.test(value)) {
    return 'Use a food description without links or email addresses.';
  }
  if (/[\u0000-\u001f\u007f]|<\/?[a-z][^>]*>/i.test(value) || !/\p{L}/u.test(value)) {
    return 'Describe the food in words, with portions if you know them.';
  }
  return '';
}
