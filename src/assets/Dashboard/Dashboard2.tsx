import { useEffect, useState, useCallback } from "react";
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

type PVPoint = {
  time: number;
  pvPower: number;
  pvVoltage: number;
  pvCurrent: number;
};
type HistoryApiResponse = {
  data: PVPoint[];
};


function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);
  const [rangePV, setRangePV] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const fetchDataPV = useCallback(async () => {
  try {
    const res = await api.get<HistoryApiResponse>("/hps/history", {
      params: {
        deviceSn,
        startDate: rangePV[0].format("YYYY-MM-DD"),
        endDate: rangePV[1].format("YYYY-MM-DD"),
      },
    });

    const data: PVPoint[] = Array.isArray(res.data?.data)
      ? res.data.data
      : [];

    const transformed: PVPoint[] = data
      .map((item: PVPoint): PVPoint => ({
        time: Number(item.time),
        pvPower: Number(item.pvPower ?? 0),
        pvVoltage: Number(item.pvVoltage ?? 0),
        pvCurrent: Number(item.pvCurrent ?? 0),
      }))
      .filter((d: PVPoint) => Boolean(d.time))
      .sort((a: PVPoint, b: PVPoint) => a.time - b.time);

    setHistoryPV(transformed);
  } catch (err) {
    console.error("❌ Error fetching PV data:", err);
    setHistoryPV([]);
  }
}, [rangePV]);


  // โหลด + รีเฟรชทุก 6 นาที
  useEffect(() => {
    fetchDataPV();
    const interval = setInterval(fetchDataPV, 6 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDataPV]);

  return (
    <div className="flex justify-center w-full my-6">
      <div className="bg-white p-6 rounded-2xl shadow w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>

          <Space>
            <DatePicker.RangePicker
              value={rangePV}
              format="YYYY-MM-DD"
              allowClear={false}
              onChange={(val) => val && setRangePV(val as [Dayjs, Dayjs])}
            />
          </Space>
        </div>

        {historyPV.length === 0 ? (
          <div className="text-center text-gray-400">
            ไม่มีข้อมูล PV ในช่วงวันที่เลือก
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={historyPV}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  dayjs(v).format("DD/MM HH:mm")
                }
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
                name="Voltage (V)"
                stroke="#06BABA"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pvCurrent"
                name="Current (A)"
                stroke="#BA6006"
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
