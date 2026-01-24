/**
 * STAGE-02 FINAL: CHRONOLOGICAL SIGNAL AUDIT REPORT
 * Logic: Movement-based sequence + Time Sync + Excel Export
 */

function generateAuditReport() {
    // 1. Check if RTIS data exists
    if (rtis.length === 0) {
        return alert("Pehle Map Generate Karein! RTIS data nahi mila.");
    }

    // 2. Identify Journey Direction
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    
    if(!stnF || !stnT) return alert("Station select karein!");
    
    let isDN = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng'])));
    let activeDir = isDN ? "DN" : "UP";

    let auditLog = [];

    // 3. Process Signals based on Direction
    master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        
        // Skip LC and NS as per Mukesh Ji's instructions (Only Signals in Report)
        if (name.includes("LC") || name.includes("L XING") || name.includes("NS") || name.includes("NEUTRAL")) return;

        // Skip signals not in the active direction
        if (!sig.type.startsWith(activeDir)) return;

        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        
        // Find train's proximity to this signal
        let radius = 0.002; // Approx 200m
        let ptsInRange = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < radius);

        if (ptsInRange.length > 0) {
            // Sort by proximity to find the most accurate crossing point
            ptsInRange.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            
            let bestMatch = ptsInRange[0];
            let crossingTime = getVal(bestMatch.raw, ['Time', 'IST_Time', 'IST Time', 'timestamp']);

            auditLog.push({
                type: "SIGNAL",
                name: name,
                speed: bestMatch.spd.toFixed(1),
                time: crossingTime || "N/A", 
                seq: rtis.indexOf(bestMatch) // This index ensures chronological order
            });
        }
    });

    // 4. SORT BY SEQUENCE (Train Movement Order)
    auditLog.sort((a, b) => a.seq - b.seq);

    // 5. Generate and Open Report Window
    displayFinalReportWindow(auditLog, activeDir, stnF.Station_Name, stnT.Station_Name);
}

function displayFinalReportWindow(data, dir, from, to) {
    const reportWin = window.open("", "_blank");
    
    // CSV Content for Excel
    const csvHeader = "Asset Type,Location Name,Crossing Speed (Kmph),Crossing Time\n";
    const csvRows = data.map(r => `${r.type},${r.name},${r.speed},${r.time}`).join("\n");
    const fullCsv = csvHeader + csvRows;

    reportWin.document.write(`
        <html>
        <head>
            <title>SECR Audit Report - ${dir}</title>
            <style>
                body { font-family: 'Segoe UI', Arial; padding: 25px; background: #f4f7f6; }
                .header { background: #002f6c; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #004085; color: white; position: sticky; top: 0; }
                tr:nth-child(even) { background: #f9f9f9; }
                tr:hover { background: #f1f1f1; }
                .btn-excel { background: #217346; color: white; padding: 12px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 15px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin:0;">SECR SIGNAL AUDIT REPORT</h1>
                <p style="margin:5px 0 0 0;">Route: ${from} to ${to} | Direction: ${dir} | Signals Detected: ${data.length}</p>
            </div>

            <button class="btn-excel" onclick="downloadCSV()">💾 DOWNLOAD EXCEL (.CSV)</button>

            <table>
                <thead>
                    <tr>
                        <th>Asset Type</th>
                        <th>Location Name</th>
                        <th>Crossing Speed (Kmph)</th>
                        <th>Crossing Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(r => `
                        <tr>
                            <td>${r.type}</td>
                            <td><b>${r.name}</b></td>
                            <td style="color: #d32f2f; font-weight: bold;">${r.speed}</td>
                            <td>${r.time}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <script>
                function downloadCSV() {
                    const blob = new Blob([\`${fullCsv}\`], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", "SECR_Audit_Report_${dir}.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            <\/script>
        </body>
        </html>
    `);
}
