import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill"; 

import Header from "../components/Header";
import liveInventory from "../assets/inventory.png";

export default function Dashboard({loggedIn, toggleLogin}: {loggedIn: boolean, toggleLogin: () => void}) {
  const riskScore = 50;

  type Vulnerability = {
    color: string, name: string, detectedAt: string; 
  }

  const vulnerabilities = [
    { color: "green", name: "CVE-34678", detectedAt: "2025-10-20" },
    { color: "yellow", name: "CVE-43456", detectedAt: "2026-01-20" },
    { color: "red", name: "CVE-89890", detectedAt: "2026-02-10" },
  ];

  const [currentVulnerability, setVulnerability] = useState(0);

  const updateVulnerability = (vulnerability: Vulnerability) => {
    setVulnerability(vulnerabilities.indexOf(vulnerability));
  }

  const edgePadding = "pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20";

  const formatDate = (dateString: string) => {
    const date = Temporal.PlainDate.from(dateString);
    return date.toLocaleString();
  } 

  const name = "User";

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
      <Header loggedIn={loggedIn} toggleLogin={toggleLogin} title="Dashboard"/>
      <section
        className={`dashboard relative min-h-screen flex flex-col items-start ${edgePadding} overflow-hidden`}
      > 
        <h1 className="text-2xl font-bold">Welcome, {name}</h1>
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
                <li className="vulnerability-row" onClick={() => updateVulnerability(vulnerability)}>
                  {vulnerability.name} 
                  <span className={`${vulnerability.color}-badge`}></span>
                  <span className="icon">→</span>
                </li>
              ))}    
            </ol>
          </div>
          <div className="right-column">
            <p className="image-title">Live Inventory/SBOM</p>
            <img src={liveInventory} />
            <div className="timeline">
              <p>{formatDate(vulnerabilities[currentVulnerability].detectedAt)}</p>
              <div className="timeline-bar">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div> 
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}