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

const toNumber = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangePV, setRangePV] = useState<RangeValue>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

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

  const fetchDataPV = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const config: any = {
          signal,
          params: {
            deviceSn,
            type: isStringType ? "string" : "central",
            // send YYYY-MM-DD; backend normalizes
            startDate: rangePV[0].format("YYYY-MM-DD"),
            endDate: rangePV[1].format("YYYY-MM-DD"),
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

        // possible shapes: res.data, res.data.data, res.data.data.data
        let data = res?.data ?? [];
        if (res?.data?.data) data = res.data.data;
        if (res?.data?.data?.data) data = res.data.data.data;

        if (!Array.isArray(data)) {
          // maybe server returned object with single item? attempt to normalize
          console.warn("history: unexpected data shape, normalized to array", data);
          data = Array.isArray(data) ? data : [];
        }

        const mapped: PVPoint[] = (data as any[])
          .map((item: any) => {
            const timestamp = safeGetTime(
              item.time ?? item.timestamp ?? item.ts ?? item.date ?? item.Time
            );

            // candidate keys for metrics
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
                const n = Number(v);
                if (Number.isFinite(n)) return n;
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
    [rangePV]
  );

  // initial + interval refresh (6 minutes)
  useEffect(() => {
    const controller = new AbortController();
    fetchDataPV(controller.signal);

    const id = setInterval(() => {
      // create a fresh controller for each request to let previous abort if needed
      const c = new AbortController();
      fetchDataPV(c.signal).catch(() => {
        /* ignore */
      });
      // no need to store c here (we rely on GC + request lifecycle)
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [fetchDataPV]);

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
                  }
                }}
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Space>
          </div>
        </div>

        {loading && historyPV.length === 0 ? (
          <div className="text-center text-gray-400">Loading…</div>
        ) : historyPV.length === 0 ? (
          <div className="text-center text-gray-400">ไม่มีข้อมูล PV</div>
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
