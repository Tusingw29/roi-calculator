import React, { useEffect, useMemo, useRef, useState } from "react";

// =============================
// ROI + Quote Calculator (Casegoods & Tubs) - Enhanced Version
// =============================

export default function App() {
  // --- BRAND COLORS ---
  const CANDY_BLUE = "#00D5FD";
  const CANDY_PINK = "#FB72C0";
  const CANDY_GOLD = "#FFC301";

  // Helpers
  const gradBP = { backgroundImage: `linear-gradient(90deg, ${CANDY_BLUE}, ${CANDY_PINK})` };
  const gradBPG = { backgroundImage: `linear-gradient(90deg, ${CANDY_BLUE}, ${CANDY_PINK}, ${CANDY_GOLD})` };
  const tint = (hex, alpha = 0.12) => {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16) || 0;
    const g = parseInt(h.substring(2,4),16) || 0;
    const b = parseInt(h.substring(4,6),16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // --- PRICING (editable in Advanced) ---
  const [casegoodsReplaceAvg, setCasegoodsReplaceAvg] = useState(6000);
  const [tubReplaceAvg, setTubReplaceAvg] = useState(5680);

  // Service SKUs & defaults
  const FURNITURE_PRICE = 125;
  const TUB_PRICE = 300;
  const BUNDLE_PRICE = 375;
  const DEPOSIT_PCT = 35;

  // --- FORM STATE ---
  const [service, setService] = useState("bundle");
  const [rooms, setRooms] = useState(100);
  const [tubs, setTubs] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [adr, setAdr] = useState("");
  const [name, setName] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [formError, setFormError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Refs for focusing first invalid field
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const companyRef = useRef(null);

  // --- INPUT VALIDATION HELPERS ---
  const validateNumericInput = (value, min = 0, max = 999999) => {
    const num = parseInt(value || "0", 10);
    return Math.max(min, Math.min(max, num));
  };

  const validateADR = (value) => {
    const num = parseFloat(value || "0");
    return Math.max(0, Math.min(9999, num));
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  // --- DERIVED CALCS ---
  const {
    quoteTotal, replaceBaseline, savings, savingsPct, roiMultiple, deposit, remainder,
    scopeText, unitPrice, unitLabel, serviceLabel, paybackNights
  } = useMemo(() => {
    let qTotal = 0;
    let baseline = 0;
    let scope = "";

    if (service === "furniture") {
      qTotal = rooms * FURNITURE_PRICE;
      baseline = rooms * casegoodsReplaceAvg;
      scope = `${rooms} room(s)`;
    }

    if (service === "tubs") {
      qTotal = tubs * TUB_PRICE;
      baseline = tubs * tubReplaceAvg;
      scope = `${tubs} tub(s)`;
    }

    if (service === "bundle") {
      qTotal = rooms * BUNDLE_PRICE;
      baseline = rooms * (casegoodsReplaceAvg + tubReplaceAvg);
      scope = `${rooms} room(s) (both)`;
    }

    const sav = Math.max(baseline - qTotal, 0);
    const savPct = baseline > 0 ? sav / baseline : 0;
    const roi = qTotal > 0 ? sav / qTotal : 0;

    const depAccurate = (qTotal * DEPOSIT_PCT) / 100;
    const rem = qTotal - depAccurate;

    const sLabel = service === "furniture" ? "Furniture (Casegoods) Only" : service === "tubs" ? "Tubs Only" : "Bundle: Furniture + Tub";
    const uPrice = service === "furniture" ? FURNITURE_PRICE : service === "tubs" ? TUB_PRICE : BUNDLE_PRICE;
    const uLabel = service === "furniture" ? "/room" : service === "tubs" ? "/tub" : "/room (both)";

    let payback = null;
    const adrNum = parseFloat(adr);
    if (!Number.isNaN(adrNum) && adrNum > 0) {
      payback = uPrice / adrNum;
    }

    return {
      quoteTotal: qTotal,
      replaceBaseline: baseline,
      savings: sav,
      savingsPct: savPct,
      roiMultiple: roi,
      deposit: depAccurate,
      remainder: rem,
      scopeText: scope,
      unitPrice: uPrice,
      unitLabel: uLabel,
      serviceLabel: sLabel,
      paybackNights: payback,
    };
  }, [service, rooms, tubs, casegoodsReplaceAvg, tubReplaceAvg, adr]);

  // --- HELPERS ---
  const money0 = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const money2 = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const pct = (x) => `${(x * 100).toFixed(1)}%`;

  const FREE_EMAILS = new Set([
    "gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","me.com","msn.com","live.com","proton.me","protonmail.com","yandex.com","gmx.com","zoho.com","mail.com"
  ]);

  const isBusinessEmail = (email) => {
    const m = email.trim().match(/^([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})$/i);
    if (!m) return false;
    const domain = m[2].toLowerCase();
    return !FREE_EMAILS.has(domain);
  };

  const validateForm = () => {
    if (!name.trim()) return { err: "Name is required", focusRef: nameRef };
    if (!bizEmail.trim()) return { err: "Business email is required", focusRef: emailRef };
    if (!isBusinessEmail(bizEmail)) return { err: "Please enter a business email (no free email domains)", focusRef: emailRef };
    if (!phone.trim()) return { err: "Phone is required", focusRef: phoneRef };
    if (!company.trim()) return { err: "Company is required", focusRef: companyRef };
    return { err: null };
  };

  const joinLines = (lines) => lines.join("\n");

  const composeEmail = () => {
    const subject = `Quote — ${serviceLabel} — ${scopeText} — ${company}`;
    const bodyLines = [
      `Hi ${name},`,
      "",
      `Here's your quote for ${company}:`,
      "",
      `Service: ${serviceLabel}`,
      `Scope: ${scopeText}`,
      `Unit Price: ${money0(unitPrice)} ${unitLabel}`,
      `Service Total: ${money0(quoteTotal)}`,
      `Deposit (${DEPOSIT_PCT}%): ${money2(deposit)}`,
      `Final on completion: ${money2(remainder)}`,
      "",
      "ROI vs Replacement:",
      `• Replacement Baseline: ${money0(replaceBaseline)}`,
      `• Savings: ${money0(savings)} (${pct(savingsPct)})`,
      `• ROI Multiple: ${roiMultiple.toFixed(2)}x (Savings / Your Spend)`,
      ...(paybackNights != null ? [
        "",
        "Payback (optional):",
        `• Nights to pay back per unit at ADR ${money0(parseFloat(adr))}: ${paybackNights.toFixed(1)} night(s)`
      ] : []),
      "",
      "Assumptions:",
      `• Casegoods replacement baseline: ${money0(casegoodsReplaceAvg)} per room`,
      `• Tub replacement baseline: ${money0(tubReplaceAvg)} per tub`,
      `• Pricing: Furniture $125/room · Tub $300/tub · Bundle $375/room · Deposit ${DEPOSIT_PCT}%`,
      "",
      "Notes:",
      "• In-room service, minimal downtime, no freight/haul-away.",
      "• Quote valid 30 days. Taxes, parking, and unusual conditions not included.",
      "",
      "Thanks,",
      "Candy Restoration"
    ];

    const body = joinLines(bodyLines);
    const mailto = `mailto:${encodeURIComponent(bizEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { subject, body, mailto };
  };

  // --- Email helpers ---
  const BOOK_LINK = "https://calendly.com/adam-candyrestoration/15min";
  const SALES_CC = "";

  const buildMailto = (to, subject, body) => {
    const params = new URLSearchParams({ subject, body });
    if (SALES_CC) params.append("cc", SALES_CC);
    return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  };

  const buildEmlContent = (to, cc, subject, body) => {
    const CRLF = "\r\n";
    const headers = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
    ].filter(Boolean).join(CRLF);
    return headers + CRLF + CRLF + body.replace(/\n/g, CRLF);
  };

  const downloadEML = (to, subject, body) => {
    const eml = buildEmlContent(to, SALES_CC || null, subject, body);
    const blob = new Blob([eml], { type: "message/rfc822" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Candy-Restoration-Quote.eml";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const downloadPDFReport = () => {
    // Generate comprehensive PDF report content
    const reportContent = `
CANDY RESTORATION - ROI ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service Type: ${serviceLabel}
Project Scope: ${scopeText}
Total Investment: ${money0(quoteTotal)}
Total Savings vs. Replacement: ${money0(savings)} (${pct(savingsPct)})
ROI Multiple: ${roiMultiple.toFixed(2)}x

FINANCIAL BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFINISHING COSTS (CANDY RESTORATION):
- Unit Price: ${money0(unitPrice)} ${unitLabel}
- Total Service Cost: ${money0(quoteTotal)}
- Deposit (${DEPOSIT_PCT}%): ${money2(deposit)}
- Final Payment: ${money2(remainder)}

REPLACEMENT BASELINE COMPARISON:
- Casegoods Replacement Cost: ${money0(casegoodsReplaceAvg)} per room
- Tub Replacement Cost: ${money0(tubReplaceAvg)} per tub
- Total Replacement Cost: ${money0(replaceBaseline)}
- Cost Savings: ${money0(savings)}
- Percentage Saved: ${pct(savingsPct)}

${paybackNights ? `PAYBACK ANALYSIS:
- Average Daily Rate (ADR): ${money0(parseFloat(adr))}
- Nights to Break Even: ${paybackNights.toFixed(1)} nights per unit
- Monthly Payback (assuming 70% occupancy): ${(paybackNights / 21).toFixed(1)} months` : ''}

OPERATIONAL ADVANTAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ ZERO ROOM DOWNTIME
  • In-room refinishing process
  • Rooms remain revenue-generating during service
  • No displacement of guests

✓ NO FREIGHT OR HAUL-AWAY COSTS
  • Eliminates furniture delivery logistics
  • Reduces disposal fees and environmental impact
  • Streamlined project management

✓ IMMEDIATE CASH FLOW BENEFITS
  • ${pct(savingsPct)} cost reduction vs. replacement
  • ${roiMultiple.toFixed(2)}x return on investment
  • Preserve capital for other strategic initiatives

RISK MITIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Proven refinishing process with quality guarantees
- Minimal operational disruption
- Faster project completion vs. full replacement
- Professional liability coverage included

RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on this analysis, refinishing presents a compelling alternative to 
replacement that delivers:

1. Substantial cost savings (${money0(savings)})
2. Zero operational downtime
3. Improved cash flow and ROI
4. Reduced environmental impact
5. Enhanced guest experience continuity

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Schedule site assessment and detailed proposal
- Review specific property requirements
- Finalize project timeline and logistics
- Execute service agreement and schedule start date

CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Candy Restoration
Email: sales@candyrestoration.com
Calendar: ${BOOK_LINK}

This analysis is valid for 30 days from generation date.
Terms and conditions may apply based on site-specific requirements.

Generated for: ${company}
Contact: ${name} (${bizEmail})
`;

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Candy-Restoration-ROI-Report-${company.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const emailQuote = () => {
    const { err, focusRef } = validateForm();
    if (err) { 
      setFormError(err); 
      focusRef?.current?.focus(); 
      setShowSuccess(false);
      return; 
    }
    
    setFormError(null);
    setShowSuccess(true);
    
    const { subject, body } = composeEmail();
    downloadEML(bizEmail, subject, body);
    const mailto = buildMailto(bizEmail, subject, body);
    window.location.href = mailto;

    // Hide success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const bookCallAndEmail = () => {
    const { err, focusRef } = validateForm();
    if (err) { 
      setFormError(err); 
      focusRef?.current?.focus(); 
      setShowSuccess(false);
      return; 
    }
    
    setFormError(null);
    setShowSuccess(true);
    
    const { subject, body } = composeEmail();
    
    // Download email and PDF report
    downloadEML(bizEmail, subject, body);
    downloadPDFReport();
    
    // Build Calendly URL with pre-filled information based on actual form structure
    const cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits for Calendly
    
    const calendlyParams = new URLSearchParams({
      name: name,
      email: bizEmail,
      a1: serviceLabel, // "Which service(s) are you interested in?" dropdown
      a2: `${service === "tubs" ? tubs : rooms}`, // "How many Rooms" field
      a3: cleanPhone   // "Send text messages to" field - try clean digits only
    });
    
    // Try multiple phone parameter formats with both formatted and clean versions
    calendlyParams.append('phone', cleanPhone);
    calendlyParams.append('phone_number', cleanPhone);
    calendlyParams.append('answer_1', cleanPhone);
    // Also try formatted version
    calendlyParams.append('phone_formatted', phone);
    
    const calendlyUrl = `${BOOK_LINK}?${calendlyParams.toString()}`;
    
    // Open pre-filled Calendly link
    window.open(calendlyUrl, "_blank", "noopener");
    
    // Open email client
    const mailto = buildMailto(bizEmail, subject, body);
    window.location.href = mailto;

    // Hide success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          emailQuote();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [name, bizEmail, phone, company]);

  // --- UI ---
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Replace Nothing. Save Everything.
          </h1>
          <p className="text-neutral-300 mx-auto max-w-3xl text-lg leading-relaxed">
            Why Smart Companies Refinish Instead of Replace
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <section className="lg:col-span-2 space-y-6">
          {/* Service picker */}
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400">Service</div>
                <div className="text-xl font-semibold">{serviceLabel}</div>
                <div className="text-neutral-400 text-sm">Unit price: <span className="font-extrabold" style={{color: CANDY_BLUE}}>{money0(unitPrice)}</span> {unitLabel}</div>
              </div>

              <div className="flex rounded-xl p-1 bg-neutral-800" role="tablist" aria-label="Service selection">
                {([
                  { key: "furniture", label: "Furniture" },
                  { key: "tubs", label: "Tubs" },
                  { key: "bundle", label: "Bundle" },
                ]).map(o => (
                  <button
                    key={o.key}
                    onClick={() => setService(o.key)}
                    role="tab"
                    aria-selected={service === o.key}
                    tabIndex={service === o.key ? 0 : -1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${service === o.key ? "text-black shadow-lg" : "text-neutral-300 hover:text-white hover:bg-neutral-700"}`}
                    style={service === o.key ? gradBP : undefined}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rooms input - show for furniture and bundle */}
              {(service === "furniture" || service === "bundle") && (
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                  <label className="block text-sm text-neutral-400 mb-2" htmlFor="rooms-input">
                    Rooms
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setRooms(v => validateNumericInput(v - 1, 1))} 
                      aria-label="Decrease rooms" 
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 active:scale-95"
                    >
                      −
                    </button>
                    <input 
                      id="rooms-input"
                      type="number" 
                      min={1} 
                      step={1} 
                      value={rooms} 
                      onChange={e => setRooms(validateNumericInput(e.target.value, 1))} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      aria-describedby="rooms-help"
                    />
                    <button 
                      onClick={() => setRooms(v => validateNumericInput(v + 1, 1))} 
                      aria-label="Increase rooms" 
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <p id="rooms-help" className="text-xs text-neutral-500 mt-2">
                    {service === "furniture" ? "Number of rooms for furniture refinishing." : "Used for furniture and tub refinishing."}
                  </p>
                </div>
              )}

              {/* Tubs input - show for tubs only */}
              {service === "tubs" && (
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                  <label className="block text-sm text-neutral-400 mb-2" htmlFor="tubs-input">
                    Tubs
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTubs(v => validateNumericInput(v - 1, 1))} 
                      aria-label="Decrease tubs" 
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 active:scale-95"
                    >
                      −
                    </button>
                    <input 
                      id="tubs-input"
                      type="number" 
                      min={1} 
                      step={1} 
                      value={tubs} 
                      onChange={e => setTubs(validateNumericInput(e.target.value, 1))} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      aria-describedby="tubs-help"
                    />
                    <button 
                      onClick={() => setTubs(v => validateNumericInput(v + 1, 1))} 
                      aria-label="Increase tubs" 
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <p id="tubs-help" className="text-xs text-neutral-500 mt-2">Number of tubs for refinishing.</p>
                </div>
              )}

              {/* Payment schedule */}
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <div className="text-sm text-neutral-400">Payment Schedule</div>
                <div className="mt-2 rounded-2xl bg-white border border-neutral-300 p-4 text-neutral-900">
                  <div className="flex items-center justify-between"> 
                    <div className="text-sm font-medium" style={{color: CANDY_BLUE}}>On Scheduling (Deposit {DEPOSIT_PCT}%)</div>
                    <div className="text-xl font-extrabold transition-all duration-300" style={{color: CANDY_PINK}}>{money2(deposit)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm font-medium text-neutral-700">On Completion</div>
                    <div className="text-xl font-extrabold text-neutral-900 transition-all duration-300">{money2(remainder)}</div>
                  </div>

                  {/* Animated Progress bar */}
                  <div className="mt-4 h-3 w-full rounded-full bg-neutral-200 overflow-hidden" aria-label="Payment progress">
                    <div 
                      className="h-3 rounded-full transition-all duration-500 ease-out" 
                      style={{ 
                        width: `${DEPOSIT_PCT}%`, 
                        backgroundColor: CANDY_GOLD,
                        transform: 'translateX(0%)'
                      }} 
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">Gold portion shows deposit ({DEPOSIT_PCT}%).</div>
                </div>
                <p className="text-xs text-neutral-500 mt-2">35% deposit on scheduling. Final balance on completion.</p>
              </div>
            </div>
          </div>

          {/* Performance (optional) */}
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400">Performance (optional)</div>
                <div className="text-xl font-semibold">Payback Helper</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <label className="block text-sm text-neutral-400 mb-2" htmlFor="adr-input">ADR (Average Daily Rate)</label>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">$</span>
                  <input 
                    id="adr-input"
                    type="number" 
                    min={0} 
                    max={9999}
                    step={1} 
                    value={adr} 
                    onChange={e => setAdr(e.target.value ? validateADR(e.target.value).toString() : "")} 
                    placeholder="e.g., 150" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    aria-describedby="adr-help"
                  />
                </div>
                <p id="adr-help" className="text-xs text-neutral-500 mt-1">Used to estimate nights to pay back per unit.</p>
              </div>
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4 flex flex-col justify-center">
                <div className="text-sm" style={{ color: CANDY_BLUE }}>Payback (per unit)</div>
                <div className="text-xl font-extrabold mt-1 transition-all duration-300" style={{ color: CANDY_BLUE }}>
                  {paybackNights != null ? `${paybackNights.toFixed(1)} night(s)` : "—"}
                </div>
                <div className="text-xs text-neutral-500">Based on unit price and ADR (all modes).</div>
              </div>
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4 flex flex-col justify-center">
                <div className="text-sm" style={{ color: CANDY_GOLD }}>Savings % vs Replace</div>
                <div className="text-xl font-extrabold mt-1 transition-all duration-300" style={{ color: CANDY_GOLD }}>{pct(savingsPct)}</div>
                <div className="text-xs text-neutral-500">Auto-updates with your assumptions.</div>
              </div>
            </div>
          </div>

          {/* Send Quote (Email) */}
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400">Email the Quote</div>
                <div className="text-xl font-semibold">Prospect Details</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" aria-live="polite">
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <label className="block text-sm text-neutral-300 mb-2" htmlFor="name-input">
                  Name<span style={{ color: CANDY_PINK }} aria-label="required">*</span>
                </label>
                <input 
                  id="name-input"
                  ref={nameRef} 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Full name" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  aria-required="true"
                />
              </div>
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <label className="block text-sm text-neutral-300 mb-2" htmlFor="email-input">
                  Business Email<span style={{ color: CANDY_PINK }} aria-label="required">*</span>
                </label>
                <input 
                  id="email-input"
                  ref={emailRef} 
                  type="email"
                  value={bizEmail} 
                  onChange={e => setBizEmail(e.target.value)} 
                  placeholder="name@company.com" 
                  className="w-full bg-neutral-950 border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-colors"
                  style={(bizEmail && !isBusinessEmail(bizEmail)) ? 
                    { borderColor: CANDY_PINK, focusBorderColor: CANDY_PINK, focusRingColor: CANDY_PINK } : 
                    { borderColor: "#1f2937" }} 
                  aria-required="true"
                  aria-describedby="email-help"
                />
                <p id="email-help" className="text-xs mt-2" style={(bizEmail && !isBusinessEmail(bizEmail)) ? { color: CANDY_PINK } : { color: "#9ca3af" }}>
                  No free email domains (gmail, yahoo, etc.).
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <label className="block text-sm text-neutral-300 mb-2" htmlFor="phone-input">
                  Phone<span style={{ color: CANDY_PINK }} aria-label="required">*</span>
                </label>
                <input 
                  id="phone-input"
                  ref={phoneRef} 
                  type="tel"
                  value={phone} 
                  onChange={e => setPhone(formatPhone(e.target.value))} 
                  placeholder="(555) 123-4567" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  aria-required="true"
                />
              </div>
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                <label className="block text-sm text-neutral-300 mb-2" htmlFor="company-input">
                  Company<span style={{ color: CANDY_PINK }} aria-label="required">*</span>
                </label>
                <input 
                  id="company-input"
                  ref={companyRef} 
                  value={company} 
                  onChange={e => setCompany(e.target.value)} 
                  placeholder="Hotel / Group" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  aria-required="true"
                />
              </div>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl px-4 py-3 text-sm animate-pulse" style={{ border: `1px solid ${CANDY_PINK}`, backgroundColor: tint(CANDY_PINK, 0.1), color: CANDY_PINK }}>
                {formError}
              </div>
            )}

            {showSuccess && (
              <div className="mt-3 rounded-xl px-4 py-3 text-sm animate-pulse" style={{ border: `1px solid ${CANDY_BLUE}`, backgroundColor: tint(CANDY_BLUE, 0.1), color: CANDY_BLUE }}>
                ✓ Quote generated successfully! Check your email client and downloads folder for your ROI report.
              </div>
            )}

            {/* CTAs with keyboard shortcut hint */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button 
                onClick={emailQuote} 
                className="rounded-2xl text-black font-semibold px-5 py-3 hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95" 
                style={gradBP}
                title="Keyboard shortcut: Ctrl/Cmd + Enter"
              >
                Email Quote
              </button>
              <button 
                onClick={bookCallAndEmail} 
                className="rounded-2xl text-white font-semibold px-5 py-3 hover:opacity-90 hover:bg-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95" 
                style={{ backgroundColor: "#1f2937" }}
              >
                Book a Call + Get ROI Report
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">💡 Tip: Press Ctrl/Cmd + Enter to quickly email quote</p>
          </div>

          {/* Advanced Assumptions */}
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400">Advanced (assumptions)</div>
                <div className="text-xl font-semibold">Replacement Baselines</div>
              </div>
              <button 
                onClick={() => setShowAdvanced(s => !s)} 
                className="px-4 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400" 
                style={{ backgroundColor: "#1f2937" }}
                aria-expanded={showAdvanced}
                aria-controls="advanced-settings"
              >
                {showAdvanced ? "Hide" : "Edit"}
              </button>
            </div>

            {showAdvanced && (
              <div id="advanced-settings" className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                  <label className="block text-sm text-neutral-400 mb-2" htmlFor="casegoods-input">
                    Avg. Casegoods Replacement (per room)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">$</span>
                    <input 
                      id="casegoods-input"
                      type="number" 
                      min={0} 
                      value={casegoodsReplaceAvg} 
                      onChange={e => setCasegoodsReplaceAvg(validateNumericInput(e.target.value, 0))} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Default $6,000 based on casegoods-only replacement per key.</p>
                </div>
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                  <label className="block text-sm text-neutral-400 mb-2" htmlFor="tub-replacement-input">
                    Avg. Tub Replacement (per tub)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">$</span>
                    <input 
                      id="tub-replacement-input"
                      type="number" 
                      min={0} 
                      value={tubReplaceAvg} 
                      onChange={e => setTubReplaceAvg(validateNumericInput(e.target.value, 0))} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Default $5,680 (avg national full replacement incl. labor).</p>
                </div>
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
                  <div className="text-sm text-neutral-400 mb-2">Notes</div>
                  <p className="text-xs text-neutral-500">Adjust baselines for your market. ROI uses these for savings.</p>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-neutral-500">
              Prices: <span style={{ color: CANDY_BLUE }} className="font-semibold">$125/room</span> · <span style={{ color: CANDY_PINK }} className="font-semibold">$300/tub</span> · <span style={{ color: CANDY_BLUE }} className="font-semibold">$375/room (bundle)</span> · Deposit <span style={{ color: CANDY_GOLD }} className="font-semibold">35%</span>.
            </div>
          </div>
        </section>

        {/* Right: Summary Card */}
        <aside className="space-y-6">
          <div className="rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] sticky top-6" style={{ background: "linear-gradient(180deg, #ffffff, #f5f5f5)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="uppercase tracking-wide" style={{ color: CANDY_BLUE, fontSize: '0.95rem', fontWeight: 700 }}>Quote Summary</div>
                <div className="text-2xl font-semibold mt-1 text-neutral-900">{serviceLabel}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: CANDY_BLUE, color: "#001015" }}>Live</span>
            </div>

            {/* KEY NUMBERS STRIP */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 transition-all duration-300 hover:shadow-md" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
                <div className="text-xs font-medium" style={{ color: CANDY_BLUE }}>Unit Price</div>
                <div className="text-2xl font-extrabold mt-1 transition-all duration-300" style={{ color: CANDY_BLUE }}>{money0(unitPrice)}</div>
                <div className="text-xs" style={{ color: '#374151' }}>{unitLabel}</div>
              </div>
              <div className="rounded-2xl p-4 transition-all duration-300 hover:shadow-md" style={{ backgroundColor: tint(CANDY_GOLD, 0.18), border: `1px solid ${tint(CANDY_GOLD, 0.5)}` }}>
                <div className="text-xs font-medium" style={{ color: CANDY_GOLD }}>Savings vs Replace</div>
                <div className="text-2xl font-extrabold mt-1 transition-all duration-300" style={{ color: CANDY_GOLD }}>{money0(savings)}</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>Baseline: {money0(replaceBaseline)} · {pct(savingsPct)}</div>
              </div>
              <div className="rounded-2xl p-4 transition-all duration-300 hover:shadow-md" style={{ backgroundColor: tint(CANDY_PINK, 0.16), border: `1px solid ${tint(CANDY_PINK, 0.5)}` }}>
                <div className="text-xs font-medium" style={{ color: CANDY_PINK }}>ROI Multiple</div>
                <div className="text-2xl font-extrabold mt-1 transition-all duration-300" style={{ color: CANDY_PINK }}>{roiMultiple.toFixed(2)}×</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>Savings / Your Spend</div>
              </div>
            </div>

            {/* Scope */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white border border-neutral-300 p-3 transition-all duration-300 hover:shadow-md">
                <div className="text-sm font-medium" style={{ color: CANDY_BLUE }}>Scope</div>
                <div className="font-semibold mt-1 text-neutral-900 transition-all duration-300">{scopeText}</div>
              </div>
              <div className="rounded-2xl bg-white border border-neutral-300 p-3 transition-all duration-300 hover:shadow-md">
                <div className="text-sm font-medium" style={{ color: CANDY_GOLD }}>Your Spend</div>
                <div className="font-extrabold mt-1 text-neutral-900 transition-all duration-300">{money0(quoteTotal)}</div>
              </div>
            </div>

            {/* Payment Plan (right) */}
            <div className="mt-3 rounded-2xl bg-white border border-neutral-300 p-4 transition-all duration-300 hover:shadow-md">
              <div className="text-sm font-medium" style={{ color: CANDY_BLUE }}>Payment</div>
              <ul className="mt-2 space-y-1">
                <li className="flex items-center justify-between">
                  <span className="font-medium text-neutral-900">Deposit (due at scheduling)</span>
                  <span className="text-xl font-extrabold transition-all duration-300" style={{ color: CANDY_PINK }}>{money2(deposit)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-neutral-700">Final on completion</span>
                  <span className="text-xl font-extrabold text-neutral-900 transition-all duration-300">{money2(remainder)}</span>
                </li>
              </ul>
            </div>

            {/* Mini badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs transition-all duration-200 hover:opacity-80" style={{ backgroundColor: CANDY_BLUE, color: "#001015" }}>In-room service</span>
              <span className="px-3 py-1 rounded-full text-xs transition-all duration-200 hover:opacity-80" style={gradBP}>Zero freight</span>
              <span className="px-3 py-1 rounded-full text-xs transition-all duration-200 hover:opacity-80" style={{ backgroundColor: CANDY_GOLD, color: "#1c1400" }}>Minimal downtime</span>
            </div>
          </div>

          {/* Footer actions (right column) */}
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-5">
            <div className="flex flex-col gap-3">
              <button 
                onClick={emailQuote} 
                className="w-full rounded-2xl text-black font-semibold py-3 hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95" 
                style={gradBP}
              >
                Email Quote
              </button>
              <button 
                onClick={bookCallAndEmail} 
                className="w-full rounded-2xl text-white font-semibold py-3 hover:opacity-90 hover:bg-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95" 
                style={{ backgroundColor: "#1f2937" }}
              >
                Book a Call + Get ROI Report
              </button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-16 text-neutral-500 text-xs">
        <div className="opacity-80">Notes: Edit replacement assumptions in Advanced. ROI compares your quote against typical replacement baselines for hotels.</div>
      </footer>
    </div>
  );
}