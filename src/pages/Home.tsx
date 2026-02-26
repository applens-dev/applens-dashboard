import { useState, type ChangeEvent, type FormEvent } from "react";
import Header from "../components/Header";

export default function Home({ loggedIn, toggleLogin }: { loggedIn: boolean, toggleLogin: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Message sent! We will get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const edgePadding = "pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20";
  const contentWidth = "max-w-4xl";

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header loggedIn={loggedIn} toggleLogin={toggleLogin} />
      <section
        className={`relative min-h-screen flex items-start pt-20 sm:pt-28 ${edgePadding} overflow-hidden`}
      >
        <div
          className="hero-pattern absolute inset-y-0 right-0 w-[55%] max-w-[900px] pointer-events-none"
          aria-hidden
        />
        <div className={`relative z-10 w-full ${contentWidth}`}>
          <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
            Security for cloud-native systems
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold mb-6 leading-[1.15] text-(--text-primary) max-w-2xl">
            The automated defense system for your cloud environment
          </h2>

          <p className="text-base sm:text-lg font-light text-(--text-secondary) mb-10 max-w-xl leading-[1.7]">
            Automate threat modeling, correlate vulnerabilities to deployed
            components, and generate actionable mitigations in controlled cloud
            environments.
          </p>

          <ul className="flex flex-wrap gap-2 mb-12 text-[13px] font-light text-(--text-secondary)">
            <li className="px-3 py-1.5 rounded-sm border border-(--border) bg-white/2">
              Threat modeling
            </li>
            <li className="px-3 py-1.5 rounded-sm border border-(--border) bg-white/2">
              Risk correlation
            </li>
            <li className="px-3 py-1.5 rounded-sm border border-(--border) bg-white/2">
              Remediation guidance
            </li>
            <li className="px-3 py-1.5 rounded-sm border border-(--border) bg-white/2">
              Internal workflows only
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={scrollToContact}
              className="px-8 py-3.5 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
            >
              Request Access
            </button>
            <button
              onClick={scrollToContact}
              className="px-8 py-3.5 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 hover:opacity-100 opacity-90"
            >
              Contact
            </button>
          </div>
        </div>
      </section>

      <section className={`border-t border-(--border) ${edgePadding}`}>
        <div className="py-16 sm:py-20 lg:py-24 w-full">
          <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-10">
            Key Capabilities
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 w-full">
            <div className="border border-(--border) bg-white/2 rounded-sm px-6 py-8">
              <h3 className="text-sm font-medium tracking-[0.12em] text-(--text-primary) uppercase mb-3 opacity-90">
                Threat modeling
              </h3>
              <p className="text-sm font-light text-(--text-secondary) leading-[1.6]">
                Analyze IaC, architecture, and scan outputs to surface security
                risks before they reach production.
              </p>
            </div>
            <div className="border border-(--border) bg-white/2 rounded-sm px-6 py-8">
              <h3 className="text-sm font-medium tracking-[0.12em] text-(--text-primary) uppercase mb-3 opacity-90">
                Correlation & prioritization
              </h3>
              <p className="text-sm font-light text-(--text-secondary) leading-[1.6]">
                Map findings to deployed components and prioritize exposure so
                teams focus on what matters most.
              </p>
            </div>
            <div className="border border-(--border) bg-white/2 rounded-sm px-6 py-8">
              <h3 className="text-sm font-medium tracking-[0.12em] text-(--text-primary) uppercase mb-3 opacity-90">
                Remediation guidance
              </h3>
              <p className="text-sm font-light text-(--text-secondary) leading-[1.6]">
                Produce actionable mitigations and remediation steps tailored to
                your stack and workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`border-t border-(--border) ${edgePadding}`}>
        <div className={`pt-20 sm:pt-24 lg:pt-28 ${contentWidth}`}>
          <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-2">
            Learn more
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-(--text-primary) mb-16 lg:mb-20 max-w-xl">
            Built for internal security and platform teams.
          </h2>
        </div>
        <div
          className={`pb-20 sm:pb-24 lg:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 ${contentWidth}`}
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-6">
              What AppLens Does
            </p>
            <p className="text-lg sm:text-xl font-light text-(--text-secondary) leading-[1.65] max-w-xl">
              AppLens analyzes structured system metadata (such as
              infrastructure-as-code, architecture relationships, and security
              scan outputs) to identify security risks, prioritize exposure, and
              produce remediation guidance for development teams. It is designed
              for internal security workflows and does not process end-user
              personal data.
            </p>
          </div>

          <div id="contact">
            <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-6">
              Contact
            </p>
            <p className="text-(--text-secondary) font-light mb-8 text-sm leading-relaxed">
              For project inquiries or access requests, reach out below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <label
                  htmlFor="name"
                  className="block text-[11px] font-medium text-(--text-muted) mb-2 tracking-[0.12em] uppercase"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-0 py-3 bg-transparent border-b border-(--border) text-(--text-primary) font-light placeholder:text-(--text-muted) focus:outline-none focus:border-(--input-focus)"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium text-(--text-muted) mb-2 tracking-[0.12em] uppercase"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-0 py-3 bg-transparent border-b border-(--border) text-(--text-primary) font-light placeholder:text-(--text-muted) focus:outline-none focus:border-(--input-focus)"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-[11px] font-medium text-(--text-muted) mb-2 tracking-[0.12em] uppercase"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-0 py-3 bg-transparent border-b border-(--border) text-(--text-primary) font-light placeholder:text-(--text-muted) focus:outline-none focus:border-(--input-focus) resize-none"
                  placeholder="Tell us about your inquiry..."
                />
              </div>

              <button
                type="submit"
                className="mt-2 px-8 py-3.5 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className={`py-12 ${edgePadding} border-t border-(--border)`}>
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${contentWidth}`}
        >
          <p className="text-[11px] font-light tracking-widest text-(--text-muted)">
            © 2026 AppLens
          </p>
        </div>
      </footer>
    </div>
  ); 
}