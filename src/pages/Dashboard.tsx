import { useState, useEffect } from "react";
import { Temporal } from "@js-temporal/polyfill"; 

import Header from "../components/Header";
import liveInventory from "../assets/inventory.png";

export default function Dashboard({loggedIn = false, toggleLogin}: {loggedIn?: boolean, toggleLogin?: () => void}) {
  const riskScore = 50;
  
  type Vulnerability = {
    color: string, cveId: string, discoveredAt: string, severity?: string; 
  }

  // const vulnerabilities = [
  //   { color: "green", name: "CVE-34678", detectedAt: "2025-10-20" },
  //   { color: "yellow", name: "CVE-43456", detectedAt: "2026-01-20" },
  //   { color: "red", name: "CVE-89890", detectedAt: "2026-02-10" },
  // ];

  const [currentVulnerability, setVulnerability] = useState(0);

  const [vulnerabilityList, setVulnerabilityList] = useState<Vulnerability[]>([]);

  const updateVulnerability = (index: number) => {
    setVulnerability(index);
  }

  const severityColor = (severity?: string) => {
    if (severity == "Critical") {
       return "red";
    }
    else if (severity == "High") {
      return "orange";
    }
    else if (severity == "Medium") {
      return "yellow";
    }
    else if (severity == null) {
      return "blue";
    }
    else {
      return "green";
    }
  }

  const edgePadding = "pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20";

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Loading...";
    const time = Temporal.PlainDateTime.from(dateString);
    return time.toLocaleString();
  } 
  
  const fetchVulnerabilities = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/vulnerabilities");
      const data = await response.json();
      data.reverse();
      setVulnerabilityList(data);
      console.log(data);
    } catch (error) {
      console.error("Failed to fetch vulnerabilities", error);
    }
  }

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

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
        <p> There are currently {vulnerabilityList.length} vulnerabilities you should take a look at.</p>
        <div className="column-parent">
          <div className="left-column">
            <div className={`risk-score-container ${riskScoreColor(riskScore)}`}>
              <div className="risk-score">
                <h2>Risk score</h2>
                <p>{riskScore}</p>
              </div>
            </div>
            <ol className="vulnerability-list"> 
              {vulnerabilityList.map((vulnerability, index) => (
                <li className="vulnerability-row" onClick={() => updateVulnerability(index)}>
                  {vulnerability.cveId} 
                  <span className={`${severityColor(vulnerability.severity)}-badge`}></span>
                  <span className="icon">→</span>
                </li>
              ))}    
            </ol>
          </div>
          <div className="right-column">
            <p className="image-title">Live Inventory/SBOM</p>
            <img src={liveInventory} />
            <div className="timeline">
              <p>{formatDate(vulnerabilityList[currentVulnerability]?.discoveredAt)}</p>
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