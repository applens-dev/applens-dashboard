import Header from "../components/Header";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />

      <div className="px-10 sm:px-16 lg:px-20 pt-16 pb-20">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1">
            <h2 className="text-4xl sm:text-5xl font-semibold mb-2">
              Good morning, <span className="opacity-90">[NAME]</span>.
            </h2>
            <p className="text-sm text-(--text-secondary) font-light mb-10">
              There are currently _ vulnerabilities you should take a look at.
            </p>

            <div className="w-72 h-72 rounded-full border border-(--border) flex items-center justify-center bg-white/2">
              <div className="w-52 h-52 rounded-full border-4 border-white/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-(--text-muted) tracking-[0.2em] uppercase mb-1">
                    Risk Score
                  </div>
                  <div className="text-5xl font-semibold">0</div>
                </div>
              </div>
            </div>

            <h3 className="mt-12 text-xl font-semibold">Active vulnerabilities</h3>
            <div className="mt-4 border border-(--border) bg-white/2 rounded-xl overflow-hidden">
              {["CVE-XXXXX", "CVE-XXXXX", "CVE-XXXXX"].map((cve, idx) => (
                <div
                  key={idx}
                  className="px-5 py-4 border-b border-(--border) flex items-center justify-between"
                >
                  <span className="font-light">{idx + 1}. {cve}</span>
                  <span className="opacity-70">→</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-end mb-4">
              <button className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100">
                Live inventory/SBOM
              </button>
            </div>

            <div className="border border-(--border) bg-white/2 rounded-xl min-h-[520px] flex items-center justify-center text-(--text-muted)">
              Architecture / workflow diagram placeholder
            </div>

            <div className="mt-6 border border-(--border) bg-white/2 rounded-xl min-h-[140px] flex items-center justify-center text-(--text-muted)">
              Timeline placeholder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
