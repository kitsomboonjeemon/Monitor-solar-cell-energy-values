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

type PVPoint = {
  time: number;
  Power: number;
  Voltage: number;
  Current: number;
};

type RangeValue = [Dayjs, Dayjs];

// convert any timestamp to ms epoch
const parseTime = (t: any): number => {
  if (!t) return 0;

  // numeric (string or number)
  const n = Number(t);
  if (!isNaN(n)) {
    if (n < 1e12) return n * 1000; // seconds → ms
    return n; // ms already
  }

  // date string
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.getTime();

  return 0;
};

// pick first numeric field
const pick = (...vals: any[]) => {
  for (const v of vals) {
    const n = Number(v);
    if (!isNaN(n)) return n;
  }
  return 0;
};

const PLANT_INSTALL_DATE = dayjs("2024-06-04");

export default function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangePV, setRangePV] = useState<RangeValue>([
    PLANT_INSTALL_DATE,
    dayjs().endOf("day"),
  ]);

  const fetchPV = useCallback(
    async (signal?: AbortSignal, start?: string, end?: string) => {
      setLoading(true);
      try {
        const res = await api.get("/api/hps/history", {
          signal,
          params: {
            deviceSn,
            type: isStringType ? "string" : "central",
            startDate: start ?? rangePV[0].format("YYYY-MM-DD"),
            endDate: end ?? rangePV[1].format("YYYY-MM-DD"),
          },
        });

        const arr = res.data?.data ?? [];

        const mapped = arr
          .map((item: any): PVPoint => {
            const time = parseTime(
              item.time ||
                item.timestamp ||
                item.ts ||
                item.recordTime ||
                item.date
            );

            return {
              time,
              Power: pick(item.pvPower, item.ppv1, item.ppv, item.power),
              Voltage: pick(item.pvVoltage, item.vpv),
              Current: pick(
                item.pvCurrent,
                item.ipv,
                (item.ipva || 0) + (item.ipvb || 0) + (item.ipvc || 0)
              ),
            };
          })
          .filter((x: PVPoint) => x.time > 0)
          .sort((a, b) => a.time - b.time);

        setHistoryPV(mapped);
      } catch (err) {
        console.error("fetchPV failed:", err);
        setHistoryPV([]);
      } finally {
        setLoading(false);
      }
    },
    [rangePV]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPV(controller.signal);
    return () => controller.abort();
  }, [fetchPV]);

  const disableFuture = (c: Dayjs) => c > dayjs().endOf("day");

  return (
    <div className="flex justify-center items-center w-full mt-[2%] mb-[2%]">
      <div className="bg-white p-[2%] rounded-[20px] shadow w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>

          <Space direction="vertical">
            <DatePicker.RangePicker
              value={rangePV}
              format="YYYY-MM-DD"
              allowClear={false}
              disabledDate={disableFuture}
              onChange={(v) => {
                if (v && v[0] && v[1]) {
                  setRangePV(v as RangeValue);
                  const s = v[0].format("YYYY-MM-DD");
                  const e = v[1].format("YYYY-MM-DD");
                  const ctrl = new AbortController();
                  fetchPV(ctrl.signal, s, e);
                }
              }}
            />
          </Space>
        </div>

        {loading && historyPV.length === 0 ? (
          <div className="text-center text-gray-400">Loading…</div>
        ) : historyPV.length === 0 ? (
          <div className="text-center text-gray-400">
            ไม่มีข้อมูลในช่วงนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={historyPV}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => dayjs(v).format("HH:mm")}
              />

              <YAxis />

              <Tooltip
                labelFormatter={(v) =>
                  dayjs(v).format("YYYY-MM-DD HH:mm:ss")
                }
              />
              <Legend />

              <Line
                dataKey="Power"
                stroke="#B4BA06"
                name="PV Power"
                dot={false}
              />
              <Line
                dataKey="Voltage"
                stroke="#06BABA"
                name="Voltage"
                dot={false}
              />
              <Line
                dataKey="Current"
                stroke="#BA6006"
                name="Current"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
