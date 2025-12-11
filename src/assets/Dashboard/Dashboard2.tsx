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
  time: number;
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

  const [rangePV, setRangePV] = useState<RangeValue>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const fetchDataPV = useCallback(
    async (signal?: AbortSignal) => {
      try {
        // <-- ใช้ generic any เพื่อให้ TS ยอมรับโครงสร้างที่มาจาก server
        const res = await api.get<any>("/api/hps/history", {
          // axios + AbortSignal บางเวอร์ชันมี typing mismatch -> cast as any
          signal: (signal as unknown) as any,
          params: {
            deviceSn,
            type: isStringType ? "string" : "central",
            startDate: rangePV[0].format("YYYY-MM-DD 00:00:00"),
            endDate: rangePV[1].format("YYYY-MM-DD 23:59:59"),
            pageNo: 1,
            pageSize: 2000,
          },
        });

        // server อาจจะคืน data ใน res.data หรือ res.data.data ขึ้นกับ backend
        const data = res.data?.data ?? res.data ?? [];

        // sort โดยแปลง time ให้เป็น timestamp ก่อน (รองรับ string / number)
        const safeGetTime = (t: any) => {
          if (typeof t === "number") return t;
          if (typeof t === "string") {
            const n = Number(t);
            if (Number.isFinite(n)) return n;
            const d = new Date(t);
            if (!isNaN(d.getTime())) return d.getTime();
            return 0;
          }
          if (t instanceof Date) return t.getTime();
          return 0;
        };

        const sorted = [...data].sort(
          (a: any, b: any) => safeGetTime(a.time) - safeGetTime(b.time)
        );

        const transformed: PVPoint[] = sorted.map((item: any) => {
          const timestamp = safeGetTime(item.time);
          return {
            time: timestamp,
            // บาง API ใช้ชื่อฟิลด์ต่างกัน: ppv1 หรือ ppv
            Power: toNumber(item.ppv1 ?? item.ppv ?? item.power ?? item.PV ?? 0, 0),
            Voltage: toNumber(item.vpv ?? item.voltage ?? item.Voltage ?? 0, 0),
            Current: toNumber(item.ipv ?? item.current ?? item.Current ?? 0, 0),
          };
        });

        setHistoryPV(transformed);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("❌ Error fetching PV data:", err);
        setHistoryPV([]);
      }
    },
    [rangePV]
  );

  // 📌 รีเฟรช PV ทุก 6 นาที
  useEffect(() => {
    const controller = new AbortController();

    fetchDataPV(controller.signal);

    const interval = setInterval(() => {
      fetchDataPV(controller.signal);
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
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
              />
            </Space>
          </div>
        </div>

        {historyPV.length === 0 ? (
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
                domain={["auto", "auto"]}
                tickFormatter={(value) => dayjs(value).format("HH:mm")}
                height={30}
              />
              <XAxis
                dataKey="time"
                xAxisId="day"
                orientation="bottom"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
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
