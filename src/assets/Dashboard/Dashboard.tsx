import { useCallback, useEffect, useState } from "react";
import axios from "axios";

// ----- Types -----
type Summary = {
  pvEnergy: number;
  loadEnergy: number;
  batCharge: number;
  batDischarge: number;
  gridImport: number;
  gridExport: number;
};

type Social = {
  co2Reduced: number;
  ktoe: number;
};

// ===== axios instance (สำคัญ) =====
// backend ของคุณคือ /api/summary
const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// ----- helpers -----
const toNumber = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatNumber = (
  v: number | null | undefined,
  digits = 1,
  fallback = "--"
): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return fallback;
  return v.toFixed(digits);
};

// ===== Component =====
function DashboardSummary() {
  const [summary, setSummary] = useState<Summary>({
    pvEnergy: 0,
    loadEnergy: 0,
    batCharge: 0,
    batDischarge: 0,
    gridImport: 0,
    gridExport: 0,
  });

  const [outputFreq, setOutputFreq] = useState<number | null>(null);
  const [social, setSocial] = useState<Social>({ co2Reduced: 0, ktoe: 0 });
  const [irradiance, setIrradiance] = useState<number | null>(null);
  const [backplaneTemp, setBackplaneTemp] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ===== FETCH SUMMARY =====
  const fetchSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);

      // ⭐ เรียกสั้น ๆ พอ
      const res: any = await api.get("/summary", { signal });

      const payload = res.data ?? {};

      const pv = toNumber(payload.pvEnergy);
      const load = toNumber(payload.loadEnergy);
      const batCharge = toNumber(payload.batCharge);
      const batDischarge = toNumber(payload.batDischarge);
      const gridImport = toNumber(payload.gridImport);
      const gridExport = toNumber(payload.gridExport);

      setSummary({
        pvEnergy: pv,
        loadEnergy: load,
        batCharge,
        batDischarge,
        gridImport,
        gridExport,
      });

      setOutputFreq(
        payload.outputFreq !== undefined
          ? toNumber(payload.outputFreq)
          : null
      );

      setIrradiance(
        payload.irradiance !== undefined
          ? toNumber(payload.irradiance)
          : null
      );

      setBackplaneTemp(
        payload.backplaneTemp !== undefined
          ? toNumber(payload.backplaneTemp)
          : null
      );

      // social
      setSocial({
        co2Reduced: pv * 0.9,
        ktoe: pv / 11630,
      });
    } catch (err: any) {
      if (err?.name === "CanceledError") return;
      console.error("❌ fetch summary error:", err);
      setError("ไม่สามารถดึงข้อมูลได้");
    }
  }, []);

  // ===== AUTO REFRESH =====
  useEffect(() => {
    const controller = new AbortController();

    fetchSummary(controller.signal);

    const interval = setInterval(() => {
      fetchSummary(controller.signal);
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchSummary]);

  // ----- render helpers -----
  const pvDisplay = () => formatNumber(summary.pvEnergy);
  const loadDisplay = () => formatNumber(summary.loadEnergy);
  const batChargeDisplay = () => formatNumber(summary.batCharge);
  const batDischargeDisplay = () => formatNumber(summary.batDischarge);
  const gridImportDisplay = () => formatNumber(summary.gridImport);
  const gridExportDisplay = () => formatNumber(summary.gridExport);
  const outputFreqDisplay = () =>
    outputFreq !== null ? formatNumber(outputFreq, 2) : "--";
  const irradianceDisplay = () =>
    irradiance !== null ? formatNumber(irradiance, 1) : "--";
  const backTempDisplay = () =>
    backplaneTemp !== null ? formatNumber(backplaneTemp, 1) : "--";
  const co2Display = () => formatNumber(social.co2Reduced, 1);
  const ktoeDisplay = () => formatNumber(social.ktoe, 5);

  // ===== UI (เหมือนเดิม) =====
  return (
    <div className="flex px-[2%] mt-[3%]">
      {/* UI ของคุณใช้ต่อได้ทั้งหมด */}
      {/* ไม่มีการเปลี่ยน layout */}
      {/* error */}
      {error && (
        <p className="text-red-500 text-sm mt-2">
          เกิดข้อผิดพลาด: {error}
        </p>
      )}
    </div>
  );
}

export default DashboardSummary;
