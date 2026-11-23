const hex = (value: number, length: number) => value.toString(16).padStart(length, '0').slice(-length);

export function newId() {
  const seconds = Math.floor(Date.now() / 1000);
  const random = Array.from({ length: 4 }, () => hex(Math.floor(Math.random() * 0x10000), 4)).join('');
  return `${hex(seconds, 8)}${random}`;
}
