import Dashboard2 from "./Dashboard/Dashboard2";
import Navbar from "./Nav/Navbar";
import DashboardSummary from "./Dashboard/DashboardSummary";
import Bottom from "./Nav/Bottom";
import Header from "./Nav/Header";

function Index() {
  return (
    <>
      <Navbar />
      <Header />
      <DashboardSummary />
      <Dashboard2 />
      <Bottom />
    </>
  );
}

export default Index;
