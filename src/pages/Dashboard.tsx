import Header from "../components/Header";
import liveInventory from "../assets/inventory.png";

export default function Dashboard({loggedIn, toggleLogin}: {loggedIn: boolean, toggleLogin: () => void}) {
  const riskScore = 50;
  const vulnerabilities = [
    { color: "green", name: "CVE-34678", detectedAt: "2025-10-20" },
    { color: "yellow", name: "CVE-43456", detectedAt: "2026-01-20" },
    { color: "red", name: "CVE-89890", detectedAt: "2026-02-10" },
  ];
  const edgePadding = "pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20";
  const riskScoreColor = (riskScore: number) => {
    if (riskScore >= 70) {
      return "red";
    }
    else if (riskScore >= 40) {
      return "yellow"; 
    }
    else {
      return "green";
    }
  }
  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header loggedIn={loggedIn} toggleLogin={toggleLogin} />
      <section
        className={`relative min-h-screen flex flex-col items-start pt-20 sm:pt-28 ${edgePadding} overflow-hidden`}
      > 
        <h1 className="text-2xl font-bold">AppLens Dashboard</h1>
        <p> There are currently {vulnerabilities.length} vulnerabilities you should take a look at.</p>
        <div className="column-parent">
          <div className="left-column">
            <div className={`risk-score-container ${riskScoreColor(riskScore)}`}>
              <div className="risk-score">
                <h2>Risk score</h2>
                <p>{riskScore}</p>
              </div>
            </div>
            <ol className="vulnerability-list"> 
              {vulnerabilities.map(vulnerability => (
                <li className="vulnerability-row">
                  {vulnerability.name} 
                  <span className={`${vulnerability.color}-badge`}></span>
                </li>
              ))}    
            </ol>
          </div>
          <div className="right-column">
            <p>Live Inventory/SBOM</p>
            <img src={liveInventory} />
          </div>
        </div>
      </section>
    </div>
  )
}