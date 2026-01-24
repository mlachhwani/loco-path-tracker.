/**
 * REPORT.JS - FINAL INTERACTIVE FIX
 * Purpose: Generates a FULL map snapshot in Button 3
 */

// Button 2: Excel (As is, working fine)
window.downloadExcelAudit = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    let stnF = document.getElementById('s_from').value;
    let stnT = document.getElementById('s_to').value;
    let masterF = window.master.stns.find(s => getVal(s,['Station_Name']) === stnF);
    let masterT = window.master.stns.find(s => getVal(s,['Station_Name']) === stnT);
    let lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    let dir = (lg2 > lg1) ? "DN" : "UP";
    let minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

    let csv = "Asset Type,Location Name,Crossing Speed,Crossing Time\n";
    let log = [];
    window.master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        let match = window.rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (match.length > 0) {
            match.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            log.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", seq: window.rtis.indexOf(match[0]) });
        }
    });
    log.sort((a,b) => a.seq - b.seq).forEach(r => { csv += `SIGNAL,${r.n},${r.s},${r.t}\n`; });
    let blob = new Blob([csv], {type: 'text/csv'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Audit_Excel_${stnF}_to_${stnT}.csv`;
    a.click();
};

// Button 3: FIXED FULL INTERACTIVE REPORT
window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    
    let stnF = document.getElementById('s_from').value;
    let stnT = document.getElementById('s_to').value;
    let masterF = window.master.stns.find(s => getVal(s,['Station_Name']) === stnF);
    let masterT = window.master.stns.find(s => getVal(s,['Station_Name']) === stnT);
    let lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    let dir = (lg2 > lg1) ? "DN" : "UP";
    let minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

    // Collect all plotted signals for the report
    let reportSigs = [];
    window.master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        let match = window.rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (match.length > 0) {
            match.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            reportSigs.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", lt: sLt, lg: sLg, seq: window.rtis.indexOf(match[0]) });
        }
    });
    reportSigs.sort((a,b) => a.seq - b.seq);

    const pathData = JSON.stringify(window.rtis.map(p => [p.lt, p.lg]));
    const sigData = JSON.stringify(reportSigs);

    const htmlContent = `
    <html>
    <head>
        <title>SECR AUDIT: ${stnF} to ${stnT}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin:0; display:flex; font-family: sans-serif; height:100vh; }
            #sidebar { width:350px; background:#002f6c; color:white; overflow-y:auto; padding:15px; }
            #map { flex-grow:1; }
            .item { background:rgba(255,255,255,0.1); padding:10px; margin-bottom:5px; border-radius:4px; cursor:pointer; border-left:4px solid #ffc107; }
            .item:hover { background:rgba(255,255,255,0.2); }
            .spd { color:#00ff00; font-weight:bold; float:right; }
        </style>
    </head>
    <body>
        <div id="sidebar">
            <h3>${stnF} to ${stnT} (${dir})</h3>
            <p>Total Signals: ${reportSigs.length}</p><hr>
            ${reportSigs.map(r => `
                <div class="item" onclick="m.setView([${r.lt},${r.lg}], 16)">
                    <span>${r.n}</span>
                    <span class="spd">${r.s} Kmph</span><br>
                    <small style="color:#ccc">${r.t}</small>
                </div>`).join('')}
        </div>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            const m = L.map('map').setView([${reportSigs[0]?.lt || 21.1}, ${reportSigs[0]?.lg || 79.1}], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
            const path = L.polyline(${pathData}, {color:'black', weight:3}).addTo(m);
            m.fitBounds(path.getBounds());
            const sigs = ${sigData};
            sigs.forEach(s => {
                L.circleMarker([s.lt, s.lg], {radius:7, color:'blue', fillOpacity:0.8}).addTo(m)
                .bindTooltip("<b>"+s.n+"</b><br>Speed: "+s.s+" Kmph");
            });
        </script>
    </body>
    </html>`;

    let blob = new Blob([htmlContent], {type: 'text/html'});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Interactive_Report_${stnF}_to_${stnT}.html`;
    link.click();
};
