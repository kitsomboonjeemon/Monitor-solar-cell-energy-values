import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div className="w-full bg-[#bbbbbb0] flex items-center justify-end px-[2%] shadow-sm h-[50px]">
      
      <div className="flex justify-end items-center pr-[5%]">
        <Link
          to="https://enerclo-atesspower.com/#/sys/login"
          className="no-underline"
        >
          <button className="flex items-center gap-1 bg-[#c70039] text-[#ffffff] text-[14px] px-[15px] py-[10px] rounded-full font-medium border-none hover:bg-[#ffffff] hover:text-[#c70039] transition ml-[1%]">
            Atess
          </button>
        </Link>

        <Link
          to="https://intl.fusionsolar.huawei.com/pvmswebsite/login/build/index.html#/LOGIN"
          className="no-underline"
        >
          <button className="flex items-center gap-1 bg-[#1134a6] text-[#ffffff] text-[14px] px-[15px] py-[10px] rounded-full whitespace-nowrap font-medium border-none hover:bg-[#c70039] hover:text-[#ffffff] transition ml-[5%]">
            พลังงานน้ำ
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
