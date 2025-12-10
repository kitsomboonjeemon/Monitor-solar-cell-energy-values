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

// ----- axios instance -----
const apiBase = import.meta.env.VITE_API_BASE_URL || "/";
const api = axios.create({
  baseURL: apiBase,
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
  if (v === null || v === undefined || Number.isNaN(v)) return fallback;
  if (!Number.isFinite(v)) return fallback;
  return v.toFixed(digits);
};

// ----- Component -----
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

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
      
        const res = await api.get("/api/summary", { signal });

        // safety parse
        const pv = toNumber(res.data?.pvEnergy, 0);
        const irradianceVal = toNumber(res.data?.irradiance, 0);
        const backTemp = toNumber(res.data?.backplaneTemp, 0);

        // social calc (example)
        const co2ReducedKg = pv * 0.9;
        const ktoe = pv / 11630;

        setSummary({
          pvEnergy: pv,
          loadEnergy: toNumber(res.data?.loadEnergy, 0),
          batCharge: toNumber(res.data?.batCharge, 0),
          batDischarge: toNumber(res.data?.batDischarge, 0),
          gridImport: toNumber(res.data?.gridImport, 0),
          gridExport: toNumber(res.data?.gridExport, 0),
        });

        setOutputFreq(
          res.data?.outputFreq !== undefined && res.data?.outputFreq !== null
            ? toNumber(res.data.outputFreq, 0)
            : null
        );
        setSocial({ co2Reduced: co2ReducedKg, ktoe: ktoe });
        setIrradiance(irradianceVal);
        setBackplaneTemp(backTemp);

        setLoading(false);
      } catch (err: any) {
        if (err.name === "CanceledError" || err.name === "AbortError") {
          // request aborted -> ignore
          return;
        }
        console.error("❌ Failed to fetch summary:", err);
        setError("ไม่สามารถดึงข้อมูลได้");
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    // initial fetch
    fetchSummary(controller.signal);

    // interval fetch every 6 minutes
    const interval = setInterval(() => {
      fetchSummary(controller.signal);
    }, 6 * 60 * 1000);

    return () => {
      // cleanup: abort outstanding requests and clear interval
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchSummary]);

  // rendering helpers
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

  return (
    <div className="flex px-[2%] mt-[3%]">
      <div className="w-[50%] h-full bg-[#ffffff] mt-[2%] rounded-[20px] p-[2%] ">
        <div className="grid grid-cols-3 gap-[2%] justify-center items-center">
          <div className="text-center flex flex-col items-center leading-none">
            <div className="flex items-center justify-center">
              <img
                src="/pv.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="pv"
              />
              <h2 className="text-right ml-[2%]">PV</h2>
            </div>
            <div className="text-[#FFCC00] font-bold text-[30px] leading-none">
              <span>{pvDisplay()}</span>
              <span className="text-[18px] font-light"> kWh</span>
            </div>
            <p className="text-[#b7b7b7] text-sm leading-none">
              Generated energy of PV
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <img
                src="/Load.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="load"
              />
              <h2 className="text-gray-500 ml-[2%]">Load</h2>
            </div>
            <div className="flex items-baseline justify-center">
              <span className="text-[#06BABA] font-bold text-[30px] leading-none">
                {loadDisplay()}
              </span>
              <span className="text-[18px] text-[#06BABA] font-light ml-1">
                kWh
              </span>
            </div>
            <p className="text-[#b7b7b7] text-sm">Consumption of Load</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <img
                src="/bat1.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="bat"
              />
              <h2 className="text-gray-500 mb-1 ml-[2%]">BAT</h2>
            </div>
            <div className="flex items-baseline justify-center">
              <span className="text-[#06BA2D] font-bold text-[30px] leading-none">
                {batChargeDisplay()}
              </span>
              <span className="text-[#06BA2D] text-sm ml-1"> kWh </span>
            </div>
            <p className="text-[#b7b7b7] text-sm">Battery charge</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <img
                src="/bat2.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="bat"
              />
              <h2 className="text-gray-500 mb-1 ml-[2%]">BAT</h2>
            </div>
            <div className="flex items-baseline justify-center">
              <span className="text-[#336600] font-bold text-[30px] leading-none">
                {batDischargeDisplay()}
              </span>
              <span className="text-[#336600] text-sm ml-1"> kWh</span>
            </div>
            <p className="text-[#b7b7b7] text-sm">Battery Discharge</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <img
                src="/grid1.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="grid"
              />
              <h2 className="text-gray-500 mb-1 ml-[2%]">Grid</h2>
            </div>
            <div className="flex items-baseline justify-center">
              <span className="text-[#BA6006] font-bold text-[30px] leading-none">
                {gridImportDisplay()}
              </span>
              <span className="text-[#BA6006] text-sm ml-1"> kWh</span>
            </div>
            <p className="text-[#b7b7b7] text-sm">Import from grid</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <img
                src="/grid2.png"
                className="w-[40px] h-[40px] mb-[5px] rounded-full"
                alt="grid"
              />
              <h2 className="text-gray-500 mb-1 ml-[2%]">Grid</h2>
            </div>
            <div className="flex items-baseline justify-center">
              <span className="text-[#660033] font-bold text-[30px] leading-none">
                {gridExportDisplay()}
              </span>
              <span className="text-[#660033] text-sm ml-1"> kWh</span>
            </div>
            <p className="text-[#b7b7b7] text-sm">Export to grid</p>
          </div>
        </div>
      </div>

      <div className="w-[50%] h-full bg-[#ffffff] mt-[2%] ml-[1%] justify-start rounded-[20px] p-[2%]">
        <div className="grid grid-cols-2 gap-[2%]">
          <div className="text-center">
            <h2 className="text-[#000000] text-[18px]">Output Freq (Hz)</h2>
            <div className="flex items-baseline justify-center">
              <span className="text-[#c70039] font-bold text-[30px] leading-none">
                {outputFreqDisplay()}
              </span>
              <span className="text-[#c70039] text-[18px] ml-2">Hz</span>
            </div>
            <p className="text-[#000000] text-[16px]">ความถี่ (Hz)</p>

            <div className="mt-[5%]">
              <h2 className="text-[#000000] text-[24px]">Shine master</h2>
              <div className="flex gap-[10%] justify-center">
                <div className="text-center">
                  <div className="flex items-baseline justify-center">
                    <span className="text-[#FFCC00] font-bold text-[30px] leading-none">
                      {irradianceDisplay()}
                    </span>
                    <span className="text-[#FFCC00] text-[18px] ml-1">
                      {" "}
                      W/㎡
                    </span>
                  </div>
                  <p className="text-[#b7b7b7] text-[16px]">PV radiation</p>
                </div>
                <div className="text-center">
                  <div className="flex items-baseline justify-center">
                    <span className="text-[#FFCC00] font-bold text-[30px] leading-none">
                      {backTempDisplay()}
                    </span>
                    <span className="text-[#FFCC00] text-[18px] ml-1">
                      {" "}
                      °C
                    </span>
                  </div>
                  <p className="text-[#b7b7b7] text-[16px]">Backplane temp</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[#000000] text-[24px]">Social Contribution</h2>
            <div>
              <div className="flex items-center mb-[10px]">
                <img
                  src="/Co.png"
                  alt="co2"
                  className="w-[60px] h-[60px] rounded-full"
                />
                <div className="ml-[2%]">
                  <span className="text-[#146c94] font-bold text-[30px] leading-none">
                    {co2Display()}
                    <span className="text-[#146c94] text-[18px]"> kgCO₂</span>
                  </span>
                  <p>Co₂ Reduced</p>
                </div>
              </div>

              <div className="flex items-center">
                <img
                  src="/oil1.png"
                  alt="oil"
                  className="w-[60px] h-[60px] rounded-full"
                />
                <div className="ml-[2%]">
                  <span className="text-[#146494] font-bold text-[30px] leading-none">
                    {ktoeDisplay()}
                    <span className="text-[#146494] text-[18px]"> ktoe</span>
                  </span>
                  <p>Tonne of oil equivalent</p>
                </div>
              </div>

              {error && (
                <p className="text-red-500 mt-2 text-sm">
                  เกิดข้อผิดพลาด: {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
