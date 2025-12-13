import { useCallback, useEffect, useState } from "react";
import axios from "axios";

// ================= TYPES =================
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

// ================= AXIOS =================
// .env example:
// VITE_API_URL=/api
// Final endpoint => /api/summary
const api = axios.create({
  baseURL: (import.meta.env as any).VITE_API_URL || "/api",
  timeout: 15000,
});

// ================= HELPERS =================
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

// ================= COMPONENT =================
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
  const [irradiance, setIrradiance] = useState<number | null>(null);
  const [backplaneTemp, setBackplaneTemp] = useState<number | null>(null);
  const [social, setSocial] = useState<Social>({ co2Reduced: 0, ktoe: 0 });

  const [, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ================= FETCH SUMMARY =================
 const fetchSummary = useCallback(async (signal?: AbortSignal) => {
  try {
    setLoading(true);
    setError(null);

    const res = await api.get("/summary", { signal });

    const payload: SummaryApiResponse = res.data ?? {};

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
      payload.outputFreq != null ? toNumber(payload.outputFreq) : null
    );

    setIrradiance(
      payload.irradiance != null ? toNumber(payload.irradiance) : null
    );

    setBackplaneTemp(
      payload.backplaneTemp != null
        ? toNumber(payload.backplaneTemp)
        : null
    );

    setSocial({
      co2Reduced: pv * 0.9,
      ktoe: pv / 11630,
    });
  } catch (err: any) {
    if (err?.name === "CanceledError" || err?.name === "AbortError") return;
    console.error("❌ fetch summary error:", err);
    setError("ไม่สามารถดึงข้อมูลได้");
  } finally {
    setLoading(false);
  }
}, []);


  // ================= AUTO REFRESH =================
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

  // ================= DISPLAY HELPERS =================
  const pvDisplay = () => formatNumber(summary.pvEnergy, 1);
  const loadDisplay = () => formatNumber(summary.loadEnergy, 1);
  const batChargeDisplay = () => formatNumber(summary.batCharge, 1);
  const batDischargeDisplay = () => formatNumber(summary.batDischarge, 1);
  const gridImportDisplay = () => formatNumber(summary.gridImport, 1);
  const gridExportDisplay = () => formatNumber(summary.gridExport, 1);
  const outputFreqDisplay = () =>
    outputFreq !== null ? formatNumber(outputFreq, 2) : "--";
  const irradianceDisplay = () =>
    irradiance !== null ? formatNumber(irradiance, 1) : "--";
  const backTempDisplay = () =>
    backplaneTemp !== null ? formatNumber(backplaneTemp, 1) : "--";
  const co2Display = () => formatNumber(social.co2Reduced, 1);
  const ktoeDisplay = () => formatNumber(social.ktoe, 5);

  // ================= UI (ของเดิม) =================
  return (
    <div className="flex px-[2%] mt-[3%]">
      {/* ===== LEFT ===== */}
      <div className="w-[50%] bg-white mt-[2%] rounded-[20px] p-[2%]">
        <div className="grid grid-cols-3 gap-[2%]">
          {/* PV */}
          <div className="text-center">
            <img src="/pv.png" className="w-10 mx-auto" />
            <div className="text-[#FFCC00] font-bold text-[30px]">
              {pvDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Generated energy of PV</p>
          </div>

          {/* Load */}
          <div className="text-center">
            <img src="/Load.png" className="w-10 mx-auto" />
            <div className="text-[#06BABA] font-bold text-[30px]">
              {loadDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Consumption of Load</p>
          </div>

          {/* Battery Charge */}
          <div className="text-center">
            <img src="/bat1.png" className="w-10 mx-auto" />
            <div className="text-[#06BA2D] font-bold text-[30px]">
              {batChargeDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Battery Charge</p>
          </div>

          {/* Battery Discharge */}
          <div className="text-center">
            <img src="/bat2.png" className="w-10 mx-auto" />
            <div className="text-[#336600] font-bold text-[30px]">
              {batDischargeDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Battery Discharge</p>
          </div>

          {/* Grid Import */}
          <div className="text-center">
            <img src="/grid1.png" className="w-10 mx-auto" />
            <div className="text-[#BA6006] font-bold text-[30px]">
              {gridImportDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Import from grid</p>
          </div>

          {/* Grid Export */}
          <div className="text-center">
            <img src="/grid2.png" className="w-10 mx-auto" />
            <div className="text-[#660033] font-bold text-[30px]">
              {gridExportDisplay()} <span className="text-[18px]">kWh</span>
            </div>
            <p className="text-gray-400 text-sm">Export to grid</p>
          </div>
        </div>
      </div>

      {/* ===== RIGHT ===== */}
      <div className="w-[50%] bg-white mt-[2%] ml-[1%] rounded-[20px] p-[2%]">
        <h2 className="text-lg text-center">Output Freq (Hz)</h2>
        <div className="text-center text-[#c70039] font-bold text-[30px]">
          {outputFreqDisplay()} Hz
        </div>

        <div className="mt-6 grid grid-cols-2 text-center">
          <div>
            <div className="text-[#FFCC00] font-bold text-[30px]">
              {irradianceDisplay()} W/㎡
            </div>
            <p className="text-gray-400">PV radiation</p>
          </div>
          <div>
            <div className="text-[#FFCC00] font-bold text-[30px]">
              {backTempDisplay()} °C
            </div>
            <p className="text-gray-400">Backplane temp</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl mb-2">Social Contribution</h2>
          <p className="text-[#146c94] font-bold text-[26px]">
            {co2Display()} kgCO₂
          </p>
          <p className="text-[#146494] font-bold text-[26px]">
            {ktoeDisplay()} ktoe
          </p>

          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
