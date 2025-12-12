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

const toNumber = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const PLANT_INSTALL_DATE = dayjs("2024-06-04").startOf("day");

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);

  const [rangePV, setRangePV] = useState<RangeValue>([
    PLANT_INSTALL_DATE,
    dayjs().endOf("day"),
  ]);

  const safeGetTime = (t: any) => {
    if (!t) return 0;

    const num = Number(t);
    if (Number.isFinite(num)) {
      if (num > 0 && num < 1e12) return num * 1000;
      return num;
    }

    const attempt = new Date(String(t).replace(" ", "T"));
    if (!isNaN(attempt.getTime())) return attempt.getTime();

    return 0;
  };

  const normalize = (d: any): any[] => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.data?.data)) return d.data.data;
    return [];
  };

  const fetchDataPV = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/hps/history", {
        params: {
          deviceSn,
          type: isStringType ? "string" : "central",
          startDate: rangePV[0].format("YYYY-MM-DD"),
          endDate: rangePV[1].format("YYYY-MM-DD"),
        },
      });

      setRawResponse(res.data);

      const arr = normalize(res.data);

      const mapped = arr
        .map((item: any) => ({
          time: safeGetTime(
            item.time ??
              item.ts ??
              item.timestamp ??
              item.datetime ??
              item.date ??
              0
          ),
          Power: toNumber(item.pvPower ?? item.ppv ?? item.ppv1),
          Voltage: toNumber(item.vpv ?? item.pvVoltage),
          Current: toNumber(item.ipv ?? item.pvCurrent),
        }))
        .filter((x: PVPoint) => x.time > 0)
        .sort((a: PVPoint, b: PVPoint) => a.time - b.time);

      setHistoryPV(mapped);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setHistoryPV([]);
    } finally {
      setLoading(false);
    }
  }, [rangePV]);

  useEffect(() => {
    fetchDataPV();
  }, [fetchDataPV]);

  const disableFuture = (c: Dayjs) => c && c > dayjs().endOf("day");

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
              onChange={(val) => {
                if (val && val[0] && val[1]) {
                  setRangePV(val as RangeValue);
                }
              }}
            />
          </Space>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading…</div>
        ) : historyPV.length === 0 ? (
          <>
            <div className="text-center text-gray-500">
              ไม่มีข้อมูลในช่วงที่เลือก
            </div>
            <pre className="text-xs text-gray-600 mt-3 bg-gray-100 p-2 rounded">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={historyPV}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                tickFormatter={(v) => dayjs(v).format("HH:mm")}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(v) =>
                  dayjs(v).format("YYYY-MM-DD HH:mm:ss")
                }
              />
              <Legend />
              <Line dataKey="Power" stroke="#B4BA06" dot={false} />
              <Line dataKey="Voltage" stroke="#06BABA" dot={false} />
              <Line dataKey="Current" stroke="#BA6006" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Dashboard2;
