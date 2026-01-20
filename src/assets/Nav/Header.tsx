function Header() {
  return (
    <div className="w-full flex items-center justify-center shadow-sm ">
      
      <div className="
        font-bold bg-[#ffffff] rounded-[20px] shadow 
        w-full max-w-[1400px]
        text-center text-[#000000]
      ">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Logo"
          className="
            w-full max-w-[450px] 
            h-auto 
            mx-auto 
            mb-4
          "
        />

        {/* Title */}
        <h2 >
          งานจ้างก่อสร้างระบบผลิตไฟฟ้าแบบผสมผสานพลังงานแสงอาทิตย์กับพลังน้ำ
        </h2>

        <h2 >
          โครงการไฟฟ้าพลังงานน้ำแม่ฮ่องสอน ตำบลผาบ่อง อำเภอเมืองแม่ฮ่องสอน จังหวัดแม่ฮ่องสอน 1 แห่ง
        </h2>
      </div>

    </div>
  );
}

export default Header;
