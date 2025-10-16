import { useEffect, useState } from "react";
import axios from "axios";
import { DatePicker, Space } from "antd";
import dayjs from "dayjs";
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

function Dashboard2() {
  const [historyPV, setHistoryPV] = useState([]);

  const [rangePV, setRangePV] = useState([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const fetchDataPV = async () => {
    try {
      const res = await axios.get("http://localhost:3001/api/hps/history", {
        params: {
          deviceSn,
          type: isStringType ? "string" : "central",
          startDate: rangePV[0].format("YYYY-MM-DD 00:00:00"),
          endDate: rangePV[1].format("YYYY-MM-DD 23:59:59"),
          pageNo: 1,
          pageSize: 2000,
        },
      });

      const data = res.data?.data || [];
      const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

      const transformed = sorted.map((item) => ({
        time: new Date(item.time).getTime(),
        Power: parseFloat(item.ppv1 || item.ppv || 0),
        Voltage: parseFloat(item.vpv || 0),
        Current: parseFloat(item.ipv || 0),
      }));

      setHistoryPV(transformed);
    } catch (err) {
      console.error("❌ Error fetching PV data:", err);
      setHistoryPV([]);
    }
  };

  // 📌 รีเฟรช PV ทุก 6 นาที
  useEffect(() => {
    fetchDataPV();

    const interval = setInterval(() => {
      fetchDataPV();
    }, 6 * 60 * 1000);

    return () => clearInterval(interval);
  }, [rangePV]);

 return (
  <div className="flex justify-center items-center w-full mt-[2%] mb-[2%]">
    <div className="bg-[#ffffff] p-[2%] rounded-[20px] shadow  w-[90%] ">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🌞 PV Historical Graph</h2>
        <div className="hover:ring hover:ring-[#c70039] rounded-[10px]">
          <Space direction="vertical">
            <DatePicker.RangePicker
              value={rangePV}
              onChange={(val) => {
                if (val) setRangePV(val);
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
            <Tooltip labelFormatter={(value) => dayjs(value).format("YYYY-MM-DD HH:mm:ss")} />
            <Legend />
            <Line xAxisId="main" type="monotone" dataKey="Power" stroke="#B4BA06" name="PV Power (kW)" />
            <Line xAxisId="main" type="monotone" dataKey="Voltage" stroke="#06BABA" name="Voltage (V)" />
            <Line xAxisId="main" type="monotone" dataKey="Current" stroke="#BA6006" name="Current (A)" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

}

export default Dashboard2;
