/**
 * STAGE-02 FINAL: CHRONOLOGICAL SIGNAL AUDIT REPORT
 * Features: Route Boundary Filter, Neutral Section Block, CSV Export
 */

function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");

    let stnFrom = document.getElementById('s_from').value;
    let stnTo = document.getElementById('s_to').value;
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === stnFrom);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === stnTo);
    
    // Boundary coordinates (NGP hatane ke liye)
    let startLg = conv(getVal(stnF,['Start_Lng']));
    let endLg = conv(getVal(stnT,['Start_Lng']));
    let minLg = Math.min(startLg, endLg);
    let maxLg = Math.max(startLg, endLg);

    let isDN = (endLg > startLg);
    let activeDir = isDN ? "DN" : "UP";

    let auditLog = [];

    master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));

        // --- STRICT FILTERS ---
        // 1. Only current direction
        if (!sig.type.startsWith(activeDir)) return;
        // 2. Block Neutral Sections and LC Gates (Mukesh Ji's instruction)
        if (name.includes("NS") || name.includes("NEU") || name.includes("LC") || name.includes("L XING")) return;
        // 3. Route Filter: Only between selected stations (Removes NGP if route is DURG-BSP)
        if (sLg < minLg || sLg > maxLg) return;

        let pts = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (pts.length > 0) {
            pts.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            let best = pts[0];
            
            // "Logging Time" from 37734.csv
            let logTime = getVal(best.raw, ['Logging Time', 'Time', 'IST_Time']) || "N/A";

            auditLog.push({
                type: "SIGNAL",
                name: name,
                speed: best.spd.toFixed(1),
                time: logTime,
                seq: rtis.indexOf(best)
            });
        }
    });

    // Sort by sequence of train movement
    auditLog.sort((a, b) => a.seq - b.seq);

    openDetailedWindow(auditLog, activeDir, stnFrom, stnTo);
}

function openDetailedWindow(data, dir, from, to) {
    const reportWin = window.open("", "_blank");
    const csvHeader = "Asset Type,Location Name,Crossing Speed (Kmph),Crossing Time\n";
    const csvRows = data.map(r => `${r.type},${r.name},${r.speed},${r.time}`).join("\n");

    reportWin.document.write(`
        <html>
        <head>
            <title>SECR Audit Report</title>
            <style>
                body { font-family: 'Segoe UI', Arial; padding: 20px; background: #f0f2f5; }
                .report-header { background: #002f6c; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; background: white; }
                th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                th { background: #004085; color: white; position: sticky; top: 0; }
                tr:nth-child(even) { background: #f9f9f9; }
                .dl-btn { background: #217346; color: white; padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h2>SECR SIGNAL AUDIT REPORT</h2>
                <p>Route: ${from} to ${to} | Direction: ${dir} | Signals Detected: ${data.length}</p>
            </div>
            <button class="dl-btn" onclick="downloadCSV()">💾 DOWNLOAD EXCEL</button>
            <table>
                <thead>
                    <tr><th>Asset Type</th><th>Location Name</th><th>Crossing Speed (Kmph)</th><th>Crossing Time</th></tr>
                </thead>
                <tbody>
                    ${data.map(r => `<tr><td>${r.type}</td><td><b>${r.name}</b></td><td>${r.speed}</td><td>${r.time}</td></tr>`).join('')}
                </tbody>
            </table>
            <script>
                function downloadCSV() {
                    let blob = new Blob([\`${csvHeader + csvRows}\`], {type: 'text/csv'});
                    let a = document.body.appendChild(document.createElement("a"));
                    a.href = URL.createObjectURL(blob);
                    a.download = "Audit_Report_${from}_${to}.csv";
                    a.click();
                    a.remove();
                }
            </script>
        </body>
        </html>
    `);
}
