import { useEffect, useState } from "react";
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

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState<PVPoint[]>([]);

  const [rangePV, setRangePV] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const fetchDataPV = async () => {
    try {
      // ⭐ จุดสำคัญ: cast เป็น any
      const res = (await api.get("/api/hps/history", {
        params: {
          deviceSn,
          type: isStringType ? "string" : "central",
          startDate: rangePV[0].format("YYYY-MM-DD"),
          endDate: rangePV[1].format("YYYY-MM-DD"),
        },
      })) as any;

      const data = Array.isArray(res?.data?.data) ? res.data.data : [];

      const transformed: PVPoint[] = data
        .map((item: any) => {
          const t = new Date(item.time).getTime();
          if (!t) return null;

          return {
            time: t,
            Power: Number(item.pvPower ?? item.ppv1 ?? item.ppv ?? 0),
            Voltage: Number(item.pvVoltage ?? item.vpv ?? 0),
            Current: Number(
              item.pvCurrent ??
                item.ipv ??
                (Number(item.ipva || 0) +
                  Number(item.ipvb || 0) +
                  Number(item.ipvc || 0))
            ),
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.time - b.time);

      setHistoryPV(transformed);
    } catch (err) {
      console.error("❌ Error fetching PV data:", err);
      setHistoryPV([]);
    }
  };

  // 🔄 โหลด + รีเฟรชทุก 6 นาที
  useEffect(() => {
    fetchDataPV();
    const interval = setInterval(fetchDataPV, 6 * 60 * 1000);
    return () => clearInterval(interval);
  }, [rangePV]);

  return (
    <div className="flex justify-center items-center w-full mt-[2%] mb-[2%]">
      <div className="bg-white p-[2%] rounded-[20px] shadow w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>

          <Space>
            <DatePicker.RangePicker
              value={rangePV}
              format="YYYY-MM-DD"
              allowClear={false}
              onChange={(val) => {
                if (val) setRangePV(val as [Dayjs, Dayjs]);
              }}
            />
          </Space>
        </div>

        {historyPV.length === 0 ? (
          <div className="text-center text-gray-400">
            ไม่มีข้อมูล PV ในช่วงวันที่เลือก
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
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                orientation="bottom"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => dayjs(v).format("D MMM YYYY")}
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
                name="PV Power (kW)"
                stroke="#B4BA06"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Voltage"
                name="Voltage (V)"
                stroke="#06BABA"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Current"
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
