import "server-only";
import { gaConfigured, gaErrorHint, getGaLive, type GaLive } from "./ga";
import { getLiveSales, type LiveSales } from "./orders";
import { devices } from "./shop";

export type LiveSnapshot = {
  at: string;
  ga: GaLive | null;
  gaError: string | null;
  gaConfigured: boolean;
  sales: LiveSales;
};

/** Everything the live panel shows, in one object (server render and the 30-second refresh use the same code) */
export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const [ga, sales] = await Promise.all([
    gaConfigured
      ? getGaLive().then(
          (d) => ({ data: d, error: null }),
          (e: Error) => ({ data: null, error: gaErrorHint(e.message) })
        )
      : Promise.resolve({ data: null, error: null }),
    getLiveSales(),
  ]);
  const label = (id: string) => devices.find((d) => d.id === id)?.label ?? id;
  return {
    at: new Date().toISOString(),
    ga: ga.data,
    gaError: ga.error,
    gaConfigured,
    sales: { ...sales, latest: sales.latest.map((o) => ({ ...o, device: label(o.device) })) },
  };
}
