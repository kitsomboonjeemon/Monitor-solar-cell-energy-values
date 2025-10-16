import { useEffect, useState } from "react";
import axios from "axios";

function DashboardSummary() {
  const [summary, setSummary] = useState({
    pvEnergy: 0,
    loadEnergy: 0,
    batCharge: 0,
    batDischarge: 0,
    gridImport: 0,
    gridExport: 0,
  });

  const [outputFreq, setOutputFreq] = useState<number | null>(null);
  const [social, setSocial] = useState({
    co2Reduced: 0,
    ktoe: 0,
  });

  const [irradiance, setIrradiance] = useState(0);
  const [backplaneTemp, setBackplaneTemp] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/summary");

        const pv = res.data.pvEnergy ?? 0;
        const irradianceVal = res.data.irradiance ?? 0;
        const backTemp = res.data.backplaneTemp ?? 0;

        const co2ReducedKg = pv * 0.9;
        const ktoe = pv / 11630;

        setSummary({
          pvEnergy: pv,
          loadEnergy: res.data.loadEnergy ?? 0,
          batCharge: res.data.batCharge ?? 0,
          batDischarge: res.data.batDischarge ?? 0,
          gridImport: res.data.gridImport ?? 0,
          gridExport: res.data.gridExport ?? 0,
        });

        setOutputFreq(res.data.outputFreq ?? null);
        setSocial({ co2Reduced: co2ReducedKg, ktoe: ktoe });
        setIrradiance(irradianceVal);
        setBackplaneTemp(backTemp);
      } catch (error) {
        console.error("❌ Failed to fetch summary:", error);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 6 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
              <span>{summary.pvEnergy.toFixed(1)}</span>
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
            <span className="text-[#06BABA] font-bold text-[30px] leading-none">
              {summary.loadEnergy.toFixed(1)}
            </span>
            <span className="text-[18px] text-[#06BABA] font-light"> kWh</span>
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
            <span className="text-[#06BA2D] font-bold text-[30px] leading-none">
              {summary.batCharge.toFixed(1)}
            </span>
            <span className="text-[#06BA2D] text-sm"> kWh </span>
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
            <span className="text-[#336600] font-bold text-[30px] leading-none ml-2">
              {summary.batDischarge.toFixed(1)}
            </span>
            <span className="text-[#336600] text-sm"> kWh</span>
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
            <span className="text-[#BA6006] font-bold text-[30px] leading-none">
              {summary.gridImport.toFixed(1)}
            </span>
            <span className="text-[#BA6006] text-sm"> kWh</span>
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
            <span className="text-[#660033] font-bold text-[30px] leading-none ml-2">
              {summary.gridExport.toFixed(1)}
            </span>
            <span className="text-[#660033] text-sm"> kWh</span>
            <p className="text-[#b7b7b7] text-sm">Export to grid</p>
          </div>
        </div>
      </div>

      <div className="w-[50%] h-full bg-[#ffffff] mt-[2%] ml-[1%] justify-start rounded-[20px] p-[2%]">
        <div className="grid grid-cols-2 gap-[2%]">
          <div className="text-center">
            <h2 className="text-[#000000] text-[18px]">Output Freq (Hz)</h2>
            <span className="text-[#c70039] font-bold text-[30px] leading-none">
              {outputFreq !== null ? outputFreq.toFixed(2) : "--"}{" "}
              <span className="text-[#c70039] text-[18px]">Hz</span>
            </span>
            <p className="text-[#000000] text-[16px]">ความถี่ (Hz)</p>

            <div className="mt-[5%]">
              <h2 className="text-[#000000] text-[24px]">Shine master</h2>
              <div className="flex gap-[10%] justify-center">
                <div className="text-center">
                  <span className="text-[#FFCC00] font-bold text-[30px] leading-none">
                    {irradiance.toFixed(1)}
                    <span className="text-[#FFCC00] text-[18px]"> W/㎡</span>
                  </span>
                  <p className="text-[#b7b7b7] text-[16px]">PV radiation</p>
                </div>
                <div className="text-center">
                  <span className="text-[#FFCC00] font-bold text-[30px] leading-none">
                    {backplaneTemp.toFixed(1)}
                    <span className="text-[#FFCC00] text-[18px]"> °C</span>
                  </span>
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
                    {social.co2Reduced.toFixed(1)}
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
                    {social.ktoe.toFixed(5)}
                    <span className="text-[#146494] text-[18px]"> ktoe</span>
                  </span>
                  <p>Tonne of oil equivalent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
