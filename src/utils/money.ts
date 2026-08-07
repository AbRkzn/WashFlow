export function formatPesos(cents: number): string {
  const pesos = (cents / 100).toFixed(2);
  const [whole, decimal] = pesos.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₱${grouped}.${decimal}`;
}
