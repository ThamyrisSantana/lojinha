/** Record ids: short, sortable by creation time and valid for the database (letters, digits, - and _). */
export const newId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
