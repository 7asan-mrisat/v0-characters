// tiny helper for NUI <-> client Lua
export async function fetchNui<T = any>(eventName: string, data?: any): Promise<T> {
  const resource = (window as any).GetParentResourceName
    ? (window as any).GetParentResourceName()
    : "v0-characters";
  const res = await fetch(`https://${resource}/${eventName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(data ?? {})
  });
  if (!res.ok) throw new Error(`NUI fetch failed: ${eventName}`);
  return (await res.json()) as T;
}
