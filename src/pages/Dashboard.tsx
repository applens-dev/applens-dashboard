import { useState, useEffect } from "react";
import { Temporal } from "@js-temporal/polyfill"; 

import Header from "../components/Header";
import liveInventory from "../assets/inventory.png";

export default function Dashboard({loggedIn = false, toggleLogin}: {loggedIn?: boolean, toggleLogin?: () => void}) {
  const [riskScore, setRiskScore] = useState(0);
  
  type Vulnerability = {
    color: string, cveId: string, discoveredAt: string, severity?: string; 
  }

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
      setRiskScore(calculateRiskScore(data));
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

  const calculateRiskScore = (vulnerabilities: Vulnerability[]) => {
    const riskScores = vulnerabilities.map((vulnerability) => {
      if (vulnerability.severity == "Critical") {
        return 90;
      }
      else if (vulnerability.severity == "High") {
        return 70;
      }
      else if (vulnerability.severity == "Medium") {
        return 50;
      }
      else if (vulnerability.severity == "Low") {
        return 20;
      }
      else {
        return 0;
      }
    });
    let total = 0;
    for (var i = 0; i < riskScores.length; i++) {
      total += riskScores[i];
    }
    return Math.round(total / riskScores.length);
  }

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header loggedIn={loggedIn} toggleLogin={toggleLogin} title="Dashboard"/>
      <section
        className={`dashboard relative min-h-screen flex flex-col items-start ${edgePadding} overflow-hidden`}
      > 
        <h1 className="text-5xl font-bold mb-4">Welcome, {name}</h1>
        <p className="vulnerability-message"> There are currently {vulnerabilityList.length} vulnerabilities you should take a look at.</p>
        <div className="column-parent">
          <div className="left-column">
            <div className={`risk-score-container ${riskScoreColor(riskScore)}`}>
              <div className="risk-score">
                <h2>Risk score</h2>
                <p>{riskScore}</p>
              </div>
            </div>
            <h3 className="vulnerability-text">Active Vulnerabilities</h3>
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
            <p className="image-title">
              <button>Live Inventory/SBOM</button>
            </p>
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