export function businessMapQuery(address: string) {
  // Campus buildings may share the same postal address. Use the building name
  // for map searches, leaving the floor in the on-page address.
  const building = address.match(/,\s*(.+?)\s+(?:지하\s*)?\d+\s*층\s*$/)?.[1];
  return building ?? address.trim();
}
