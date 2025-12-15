import { useEffect, useState } from "react";
import axios from "axios";
import { DatePicker, Space } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
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

const deviceSn = "YKD0F1022A";
const isStringType = false;

// ✅ ใช้ env ให้ตรงกับ .env
const API_BASE = import.meta.env.VITE_API_BASE_URL;

type PVHistory = {
  time: number;
  Power: number;
  Voltage: number;
  Current: number;
};

// ✅ response type จาก backend
type HistoryApiResponse = {
  data?: {
    time: string;
    pvPower?: number;
    pvVoltage?: number;
    pvCurrent?: number;
  }[];
};

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVHistory[]>([]);
  const [rangePV, setRangePV] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const fetchDataPV = async () => {
    try {
      const res = await axios.get<HistoryApiResponse>(
        `${API_BASE}/api/hps/history`,
        {
          params: {
            deviceSn,
            type: isStringType ? "string" : "central",
            startDate: rangePV[0].format("YYYY-MM-DD 00:00:00"),
            endDate: rangePV[1].format("YYYY-MM-DD 23:59:59"),
          },
        }
      );

      const rawData = res.data?.data ?? [];

      const transformed: PVHistory[] = rawData
        .slice()
        .sort(
          (a, b) =>
            new Date(a.time).getTime() - new Date(b.time).getTime()
        )
        .map((item) => ({
          time: new Date(item.time).getTime(),
          Power: Number(item.pvPower ?? 0),
          Voltage: Number(item.pvVoltage ?? 0),
          Current: Number(item.pvCurrent ?? 0),
        }));

      setHistoryPV(transformed);
    } catch (err) {
      console.error("❌ Error fetching PV history:", err);
      setHistoryPV([]);
    }
  };

  useEffect(() => {
    fetchDataPV();
    const interval = setInterval(fetchDataPV, 6 * 60 * 1000);
    return () => clearInterval(interval);
  }, [rangePV]);

  // ✅ แก้ RangePicker type ให้ TS ไม่ error
  const onRangeChange: RangePickerProps["onChange"] = (val) => {
    if (val && val[0] && val[1]) {
      setRangePV([val[0], val[1]]);
    }
  };

  return (
    <div className="flex justify-center items-center w-full mt-[2%] mb-[2%]">
      <div className="bg-white p-[2%] rounded-[20px] shadow w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>
          <Space>
            <DatePicker.RangePicker
              value={rangePV}
              onChange={onRangeChange}
              format="YYYY-MM-DD"
            />
          </Space>
        </div>

        {historyPV.length === 0 ? (
          <div className="text-center text-gray-400">ไม่มีข้อมูล</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={historyPV}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
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
                type="monotone"
                dataKey="Power"
                stroke="#B4BA06"
                name="PV Power (kW)"
              />
              <Line
                type="monotone"
                dataKey="Voltage"
                stroke="#06BABA"
                name="Voltage (V)"
              />
              <Line
                type="monotone"
                dataKey="Current"
                stroke="#BA6006"
                name="Current (A)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Dashboard2;
