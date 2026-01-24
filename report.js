/**
 * STAGE-02 FINAL: CHRONOLOGICAL REPORT + WEB SHARING
 */

function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");
    
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    let isDN = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng'])));
    let activeDir = isDN ? "DN" : "UP";

    let auditLog = [];
    master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(activeDir) || name.includes("NS") || name.includes("LC")) return;

        let pts = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (pts.length > 0) {
            pts.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            let best = pts[0];
            auditLog.push({
                name: name,
                speed: best.spd.toFixed(1),
                time: getVal(best.raw, ['Logging Time', 'Time']) || "N/A",
                lat: sLt, lng: sLg,
                seq: rtis.indexOf(best)
            });
        }
    });

    auditLog.sort((a, b) => a.seq - b.seq);
    openAdvancedReport(auditLog, activeDir, stnF.Station_Name, stnT.Station_Name);
}

function openAdvancedReport(data, dir, from, to) {
    const reportWin = window.open("", "_blank");
    
    // JSON data for the interactive sharing feature
    const rtisDataString = JSON.stringify(rtis.map(p => [p.lt, p.lg]));
    const markerDataString = JSON.stringify(data);

    reportWin.document.write(`
        <html><head><title>SECR Audit: ${from}-${to}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { font-family: Segoe UI, sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; }
            .header { background: #002f6c; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
            .content { display: flex; flex-grow: 1; overflow: hidden; }
            #mini-map { width: 40%; height: 100%; background: #ddd; }
            .table-container { width: 60%; overflow-y: auto; padding: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #004085; color: white; position: sticky; top: 0; }
            tr:hover { background: #f1f1f1; cursor: pointer; }
            .btn-share { background: #ffc107; color: black; padding: 8px 15px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
        </style></head>
        <body>
            <div class="header">
                <div><b>SECR AUDIT:</b> ${from} to ${to} (${dir})</div>
                <button class="btn-share" onclick="exportFullHTML()">💾 SAVE INTERACTIVE REPORT (HTML)</button>
            </div>
            <div class="content">
                <div id="mini-map"></div>
                <div class="table-container">
                    <table>
                        <tr><th>Signal Name</th><th>Speed (Kmph)</th><th>Time</th></tr>
                        ${data.map((r, i) => `<tr onclick="focusSig(${r.lat}, ${r.lng})"><td><b>${r.name}</b></td><td style="color:red"><b>${r.speed}</b></td><td>${r.time}</td></tr>`).join('')}
                    </table>
                </div>
            </div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                const map = L.map('mini-map').setView([${data[0]?.lat || 0}, ${data[0]?.lng || 0}], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                const path = L.polyline(${rtisDataString}, {color: 'black', weight: 3}).addTo(map);
                const markers = ${markerDataString};
                markers.forEach(m => {
                    L.circleMarker([m.lat, m.lng], {radius: 6, color: 'blue'}).addTo(map).bindTooltip(m.name + " (" + m.speed + " Kmph)");
                });
                function focusSig(lt, lg) { map.setView([lt, lg], 15); }
                
                function exportFullHTML() {
                    const htmlContent = document.documentElement.outerHTML;
                    const blob = new Blob([htmlContent], {type: 'text/html'});
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = "Audit_Experience_${from}_${to}.html";
                    a.click();
                }
            </script>
        </body></html>
    `);
}
