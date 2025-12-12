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
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

import api from "../../api/axios";

const deviceSn = "YKD0F1022A";
const INSTALL_DATE = dayjs("2024-06-04").startOf("day");

type PV = {
  time: number;
  pvPower: number;
  pvVoltage: number;
  pvCurrent: number;
};

type DateRange = [Dayjs, Dayjs];

export default function Dashboard2() {
  const [range, setRange] = useState<DateRange>([
    INSTALL_DATE,
    dayjs().endOf("day"),
  ]);
  const [data, setData] = useState<PV[]>([]);
  const [loading, setLoading] = useState(false);

  const parseNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeTime = (t: any) => {
    if (!t) return 0;
    const n = Number(t);
    if (Number.isFinite(n)) {
      if (n < 1e12) return n * 1000; // seconds → ms
      return n;
    }
    const d = new Date(t);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  /** โหลดข้อมูลย้อนหลัง */
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);

      const start = range[0].format("YYYY-MM-DD");
      const end = range[1].format("YYYY-MM-DD");

      const res = await api.get("/api/hps/history", {
        params: {
          deviceSn,
          type: "central",
          startDate: start,
          endDate: end,
        },
      });

      const arr = Array.isArray(res.data?.data) ? res.data.data : [];

      const mapped: PV[] = arr.map((item: any) => ({
        time: normalizeTime(item.time),
        pvPower: parseNumber(item.pvPower ?? item.ppv1 ?? item.ppv),
        pvVoltage: parseNumber(item.pvVoltage ?? item.vpv),
        pvCurrent:
          parseNumber(item.ipv) ||
          parseNumber(item.ipva) +
            parseNumber(item.ipvb) +
            parseNumber(item.ipvc),
      }));

      setData(mapped.sort((a, b) => a.time - b.time));
    } finally {
      setLoading(false);
    }
  }, [range]);

  /** โหลดข้อมูล real-time และ merge เข้ากราฟ */
  const fetchRealtime = useCallback(async () => {
    try {
      const res = await api.get("/api/hps", {
        params: { deviceSn },
      });

      const t = Date.now();

      const point: PV = {
        time: t,
        pvPower: parseNumber(res.data?.pvPower),
        pvVoltage: parseNumber(res.data?.pvVoltage),
        pvCurrent: parseNumber(res.data?.pvCurrent),
      };

      setData((prev) =>
        [...prev, point].sort((a, b) => a.time - b.time)
      );
    } catch {}
  }, []);

  /** โหลดย้อนหลังครั้งแรก */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /** โหลด realtime ทุก 6 นาที */
  useEffect(() => {
    fetchRealtime();

    const timer = setInterval(() => {
      fetchRealtime();
    }, 6 * 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-[2%] bg-white rounded-xl shadow w-[90%] mx-auto mt-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>

        <Space>
          <DatePicker.RangePicker
            value={range}
            allowClear={false}
            format="YYYY-MM-DD"
            onChange={(val) => {
              if (val) {
                setRange(val as DateRange);
                fetchHistory();
              }
            }}
          />
        </Space>
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Loading…</div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-400">
          ไม่มีข้อมูลในช่วงที่เลือก
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => dayjs(v).format("DD/MM HH:mm")}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(v) =>
                dayjs(v).format("YYYY-MM-DD HH:mm:ss")
              }
            />
            <Legend />

            <Line
              type="monotone"
              dataKey="pvPower"
              name="PV Power (kW)"
              stroke="#B4BA06"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pvVoltage"
              name="PV Voltage (V)"
              stroke="#06BABA"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pvCurrent"
              name="PV Current (A)"
              stroke="#BA6006"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
