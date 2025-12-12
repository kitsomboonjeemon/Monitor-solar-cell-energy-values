// src/pages/Dashboard2.tsx
import { useCallback, useEffect, useState } from "react";
import { DatePicker, Space } from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/th";
dayjs.locale("th");

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import api from "../../api/axios";

const deviceSn = "YKD0F1022A";
const isStringType = false;

// ---- types ----
type PVPoint = {
  time: number; // ms epoch
  Power: number;
  Voltage: number;
  Current: number;
};

type RangeValue = [Dayjs, Dayjs];

// safe conversion helper (ใช้จริง)
const toNumber = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// plant install date (ปรับได้ถ้าจำเป็น)
const PLANT_INSTALL_DATE = dayjs("2024-06-04").startOf("day");

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  // **DEFAULT**: ตั้งค่าเริ่มต้นเป็นตั้งแต่ติดตั้งจนถึงวันนี้
  const [rangePV, setRangePV] = useState<RangeValue>([
    PLANT_INSTALL_DATE,
    dayjs().endOf("day"),
  ]);
  const [warned, setWarned] = useState(false);

  // safe time parser: accepts seconds, ms, numeric strings, ISO, "YYYY-MM-DD HH:mm:ss"
  const safeGetTime = (t: any) => {
    if (t == null) return 0;

    if (typeof t === "number") {
      // seconds -> ms
      if (t > 0 && t < 1e12) return Math.round(t * 1000);
      return Math.round(t);
    }

    if (typeof t === "string") {
      // numeric string?
      const n = Number(t);
      if (Number.isFinite(n)) {
        if (n > 0 && n < 1e12) return Math.round(n * 1000);
        return Math.round(n);
      }
      // try treat "YYYY-MM-DD HH:mm:ss" -> to ISO by replacing first space with T
      const tryIso = new Date(t.replace(" ", "T"));
      if (!isNaN(tryIso.getTime())) return tryIso.getTime();
      // fallback parse
      const try2 = new Date(t);
      if (!isNaN(try2.getTime())) return try2.getTime();
      return 0;
    }

    if (t instanceof Date) return t.getTime();
    return 0;
  };

  const normalizeToArray = (resData: any) => {
    if (resData == null) return [];
    // If server returns wrapper { status: 200, data: [...] }
    if (resData.data !== undefined && Array.isArray(resData.data)) return resData.data;
    // If it's already array
    if (Array.isArray(resData)) return resData;
    if (resData.data && resData.data.data && Array.isArray(resData.data.data))
      return resData.data.data;
    if (resData.data && resData.data.datas && Array.isArray(resData.data.datas))
      return resData.data.datas;
    if (resData.data && resData.data.items && Array.isArray(resData.data.items))
      return resData.data.items;
    // Numeric-keyed object like { "0": {...}, "1": {...} }
    const numericKeysArray =
      typeof resData === "object" &&
      Object.keys(resData).length > 0 &&
      Object.keys(resData).every((k) => !isNaN(Number(k)))
        ? Object.values(resData)
        : null;
    if (Array.isArray(numericKeysArray)) return numericKeysArray;
    const firstArray = Object.values(resData).find((v) => Array.isArray(v));
    if (firstArray) return firstArray as any[];
    return [];
  };

  /**
   * fetchDataPV:
   * - signal: AbortSignal
   * - startOverride/endOverride: optional dayjs strings (YYYY-MM-DD) to avoid race with setState
   */
  const fetchDataPV = useCallback(
    async (
      signal?: AbortSignal,
      startOverride?: string,
      endOverride?: string
    ) => {
      setLoading(true);
      try {
        const startDateParam = startOverride ?? rangePV[0].format("YYYY-MM-DD");
        const endDateParam = endOverride ?? rangePV[1].format("YYYY-MM-DD");

        const config: any = {
          signal,
          params: {
            deviceSn,
            type: isStringType ? "string" : "central",
            startDate: startDateParam,
            endDate: endDateParam,
            pageNo: 1,
            pageSize: 2000,
          },
        };

        // build url with optional VITE_API_URL
        const envBase = (import.meta.env as any).VITE_API_URL ?? "";
        const base = String(envBase).replace(/\/$/, "");
        const path = "/api/hps/history";
        const url = base ? `${base}${path}` : path;

        const res: any = await api.get(url, config);

        // store raw for debugging (include status)
        const savedRaw = { status: res?.status ?? 200, data: res?.data ?? null };
        setRawResponse(savedRaw);
        console.log("history raw response:", savedRaw);

        // If server returned 204 No Content treat as empty array
        if (res.status === 204 || res.data == null) {
          if (!warned) {
            console.warn("history: server returned no content (204 or null)");
            setWarned(true);
          }
          setHistoryPV([]);
          setLoading(false);
          return;
        }

        let dataArray = normalizeToArray(res.data);

        if (!Array.isArray(dataArray) || dataArray.length === 0) {
          // still empty → try to convert single object to array (helpful for debugging)
          if (res.data && typeof res.data === "object") {
            const maybeArray = Object.keys(res.data).every((k) => !isNaN(Number(k)))
              ? Object.values(res.data)
              : null;
            if (Array.isArray(maybeArray)) dataArray = maybeArray;
          }
        }

        if (!Array.isArray(dataArray) || dataArray.length === 0) {
          if (!warned) {
            console.warn("history: unexpected data shape, normalized to array", res.data);
            setWarned(true);
          }
        }

        const mapped: PVPoint[] = (Array.isArray(dataArray) ? dataArray : [])
          .map((item: any) => {
            const timestamp = safeGetTime(
              item.time ?? item.timestamp ?? item.ts ?? item.date ?? item.Time ?? item.recordTime
            );

            // candidate keys for metrics (ใช้ toNumber เพื่อแปลงอย่างปลอดภัย)
            const powerCandidates = [
              item.pvPower,
              item.ppv1,
              item.ppv,
              item.power,
              item.Power,
              item.PV,
              item.pv,
            ];
            const voltageCandidates = [
              item.pvVoltage,
              item.vpv,
              item.voltage,
              item.Voltage,
              item.pvVolt,
              item.vpv1,
            ];
            const currentCandidates = [
              item.pvCurrent,
              item.ipv,
              item.current,
              item.Current,
              item.ipva,
            ];

            const pickFirstNumber = (cands: any[]) => {
              for (const v of cands) {
                const n = toNumber(v, NaN);
                if (!Number.isNaN(n)) return n;
              }
              return 0;
            };

            return {
              time: timestamp,
              Power: pickFirstNumber(powerCandidates),
              Voltage: pickFirstNumber(voltageCandidates),
              Current: pickFirstNumber(currentCandidates),
            } as PVPoint;
          })
          .filter((p) => p.time > 0); // remove invalid timestamps

        const sorted = mapped.sort((a, b) => a.time - b.time);
        setHistoryPV(sorted);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") {
          // aborted
          return;
        }
        console.error("❌ Error fetching PV data:", err);
        setHistoryPV([]);
      } finally {
        setLoading(false);
      }
    },
    // note: rangePV included because default path uses it when no overrides provided
    [rangePV, warned]
  );

  // initial + interval refresh (6 minutes)
  useEffect(() => {
    const controller = new AbortController();
    // initial fetch uses current rangePV (no overrides)
    fetchDataPV(controller.signal).catch(() => {});

    const id = setInterval(() => {
      const c = new AbortController();
      // use current rangePV
      fetchDataPV(c.signal).catch(() => {});
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [fetchDataPV]);

  // disable future dates
  const disableFuture = (current: Dayjs) => {
    return current && current > dayjs().endOf("day");
  };

  // fallback: set range to last 7 days and fetch (use overrides so fetch uses correct dates immediately)
  const fetchLatestFallback = async () => {
    const end = dayjs().endOf("day");
    const start = dayjs().subtract(7, "day").startOf("day");
    setRangePV([start, end]);
    const c = new AbortController();
    await fetchDataPV(c.signal, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
  };

  // fetch from install -> today (use override)
  const fetchFromStart = async () => {
    const end = dayjs().endOf("day");
    const start = PLANT_INSTALL_DATE;
    setRangePV([start, end]);
    const c = new AbortController();
    await fetchDataPV(c.signal, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
  };

  return (
    <div className="flex justify-center items-center w-full mt-[2%] mb-[2%]">
      <div className="bg-[#ffffff] p-[2%] rounded-[20px] shadow w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>
          <div className="hover:ring hover:ring-[#c70039] rounded-[10px]">
            <Space direction="vertical">
              <DatePicker.RangePicker
                value={rangePV}
                onChange={(val) => {
                  if (val && val[0] && val[1]) {
                    setRangePV(val as RangeValue);
                    // fetch immediately using the selected dates (use overrides to avoid race)
                    const start = (val as RangeValue)[0].format("YYYY-MM-DD");
                    const end = (val as RangeValue)[1].format("YYYY-MM-DD");
                    const c = new AbortController();
                    fetchDataPV(c.signal, start, end).catch(() => {});
                  }
                }}
                format="YYYY-MM-DD"
                allowClear={false}
                disabledDate={disableFuture}
              />
            </Space>
          </div>
        </div>

        {loading && historyPV.length === 0 ? (
          <div className="text-center text-gray-400">Loading…</div>
        ) : historyPV.length === 0 ? (
          <div className="text-center text-gray-400">
            ไม่มีข้อมูล PV ในช่วงวันที่{" "}
            <strong>{rangePV[0].format("YYYY-MM-DD")}</strong> –{" "}
            <strong>{rangePV[1].format("YYYY-MM-DD")}</strong>
            <div className="mt-2">
              <button
                onClick={() => fetchLatestFallback()}
                className="px-3 py-1 border rounded"
              >
                แสดงข้อมูลล่าสุดที่มี
              </button>
              <button
                onClick={() => {
                  const start = dayjs().subtract(7, "day").startOf("day");
                  const end = dayjs().endOf("day");
                  setRangePV([start, end]);
                  const c = new AbortController();
                  fetchDataPV(c.signal, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")).catch(() => {});
                }}
                className="ml-2 px-3 py-1 border rounded"
              >
                ลองย้อนหลัง 7 วัน
              </button>
              <button
                onClick={() => fetchFromStart()}
                className="ml-2 px-3 py-1 border rounded"
              >
                ย้อนหลังตั้งแต่เริ่ม
              </button>
            </div>

            {rawResponse ? (
              <div className="mt-4 text-left text-xs text-gray-600">
                <strong>Raw response (for debug):</strong>
                <pre style={{ maxHeight: 300, overflow: "auto" }}>
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={historyPV}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                xAxisId="main"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => dayjs(value).format("HH:mm")}
                height={30}
              />
              <XAxis
                dataKey="time"
                xAxisId="day"
                orientation="bottom"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => dayjs(value).format("D MMM YYYY")}
                height={30}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) =>
                  dayjs(value).format("YYYY-MM-DD HH:mm:ss")
                }
              />
              <Legend />
              <Line
                xAxisId="main"
                type="monotone"
                dataKey="Power"
                stroke="#B4BA06"
                name="PV Power (kW)"
                dot={false}
              />
              <Line
                xAxisId="main"
                type="monotone"
                dataKey="Voltage"
                stroke="#06BABA"
                name="Voltage (V)"
                dot={false}
              />
              <Line
                xAxisId="main"
                type="monotone"
                dataKey="Current"
                stroke="#BA6006"
                name="Current (A)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Dashboard2;