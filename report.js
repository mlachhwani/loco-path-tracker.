/**
 * STAGE-02 FINAL: CHRONOLOGICAL SIGNAL AUDIT REPORT
 */

function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");

    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    let isDN = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng'])));
    let activeDir = isDN ? "DN" : "UP";

    let auditLog = [];

    // 1. Filter only relevant signals for the direction
    let relevantSignals = master.sigs.filter(s => s.type.startsWith(activeDir));

    relevantSignals.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        
        // Point 2: Skip LC and NS (Only Signals)
        if (name.includes("LC") || name.includes("L XING") || name.includes("NS") || name.includes("NEUTRAL")) return;

        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        
        // Logic to find crossing time and speed
        let radius = 0.002; 
        let ptsInRange = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < radius);

        if (ptsInRange.length > 0) {
            // Sort by proximity to get the most accurate point
            ptsInRange.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            
            let bestMatch = ptsInRange[0];
            
            auditLog.push({
                type: "SIGNAL",
                name: name,
                speed: bestMatch.spd.toFixed(1),
                time: getVal(bestMatch.raw, ['Time', 'IST_Time']) || "N/A", // Crossing Time
                // Sequence help: Using index from RTIS to know when it occurred
                seq: rtis.indexOf(bestMatch) 
            });
        }
    });

    // Point 4: Sequence sorting based on train movement
    auditLog.sort((a, b) => a.seq - b.seq);

    displayEnhancedReport(auditLog, activeDir);
}

function displayEnhancedReport(data, dir) {
    const reportWin = window.open("", "_blank");
    
    // Excel Download Function
    const csvContent = "Asset Type,Location Name,Crossing Speed,Crossing Time\n" 
        + data.map(r => `${r.type},${r.name},${r.speed},${r.time}`).join("\n");

    reportWin.document.write(`
        <html><head><title>Signal Audit Report</title>
        <style>
            body { font-family: 'Segoe UI', Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #aaa; padding: 10px; text-align: left; }
            th { background: #002f6c; color: white; }
            tr:nth-child(even) { background: #f2f2f2; }
            .btn-dl { background: #217346; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; cursor: pointer; border: none; font-weight: bold; }
        </style></head>
        <body>
            <h2>SECR Signal Audit: Chronological Report (${dir})</h2>
            <button class="btn-dl" onclick="downloadExcel()">💾 DOWNLOAD EXCEL</button>
            <table id="auditTable">
                <tr><th>Asset Type</th><th>Location Name</th><th>Crossing Speed (Kmph)</th><th>Crossing Time</th></tr>
                ${data.map(r => `<tr><td>${r.type}</td><td>${r.name}</td><td><b>${r.speed}</b></td><td>${r.time}</td></tr>`).join('')}
            </table>
            <script>
                function downloadExcel() {
                    const blob = new Blob([\`${csvContent}\`], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', 'Signal_Audit_Report.csv');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            <\/script>
        </body></html>
    `);
}
