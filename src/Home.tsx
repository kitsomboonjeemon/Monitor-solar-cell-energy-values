import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";
function App() {
  useEffect(() => {
    AOS.init({ duration: 2000 });
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden flex">
      {/* พื้นหลัง */}
      <img
        src="/main1.jpg"
        className="object-cover w-full h-screen absolute top-0 left-0 z-0"
        alt="bg"
      />

      {/* Overlay และกล่อง Login */}
      <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-[#00000080] z-10">
        {/* กล่อง Solar */}
        <div
          data-aos="fade-down"
          className="w-[30%] h-[30%] flex flex-col justify-center items-center text-[24px] rounded-[20px]"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.89)" }}
        >
          ระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์
          <Link to="/home">
            <button
              className="bg-[#c70039] text-[#ffffff] text-[20px] px-[90px] py-[28px] rounded-full font-medium border-none 
            hover:bg-[#ffffff] hover:text-[#c70039] transition mt-[4%]"
            >
              Login
            </button>
          </Link>
        </div>

        {/* กล่อง Hydro */}
        <div
          data-aos="fade-up"
          className="w-[30%] h-[30%] flex flex-col justify-center items-center text-[24px] rounded-[20px] ml-[2%]"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.89)" }}
        >
          ระบบผลิตไฟฟ้าพลังงานน้ำ
          <Link to="https://intl.fusionsolar.huawei.com/pvmswebsite/login/build/index.html#/LOGIN">
            <button
              className="bg-[#1134a6] text-[#ffffff] text-[20px] px-[90px] py-[28px] rounded-full font-medium border-none 
            hover:bg-[#ffffff] hover:text-[#1134a6] transition mt-[4%]"
            >
              Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App;
