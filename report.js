/**
 * REPORT.JS - STAGE 02 FINAL (HEAVY-DUTY)
 * Fixes: 1KB file error & Missing Map data
 */

// Button 2: Excel Download
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

// Button 3: FIXED - FULL INTERACTIVE OFFLINE REPORT
window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    
    let stnF = document.getElementById('s_from').value;
    let stnT = document.getElementById('s_to').value;
    let masterF = window.master.stns.find(s => getVal(s,['Station_Name']) === stnF);
    let masterT = window.master.stns.find(s => getVal(s,['Station_Name']) === stnT);
    let lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    let dir = (lg2 > lg1) ? "DN" : "UP";
    let minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

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

    // Ye data ab file ke andar jayega (No more 1KB file)
    const pathData = JSON.stringify(window.rtis.map(p => [p.lt, p.lg]));
    const sigData = JSON.stringify(reportSigs);

    const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
        <title>SECR REPORT: ${stnF}-${stnT}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin:0; display:flex; font-family: 'Segoe UI', Arial; height:100vh; }
            #sidebar { width:320px; background:#002f6c; color:white; overflow-y:auto; padding:15px; box-shadow: 2px 0 5px rgba(0,0,0,0.3); }
            #map { flex-grow:1; }
            .item { background:rgba(255,255,255,0.1); padding:12px; margin-bottom:8px; border-radius:5px; cursor:pointer; border-left:5px solid #ffc107; transition:0.2s; }
            .item:hover { background:rgba(255,255,255,0.2); transform: translateX(5px); }
            .spd { color:#00ff00; font-weight:bold; font-size:16px; float:right; }
            hr { border: 0; border-top: 1px solid rgba(255,255,255,0.2); }
        </style>
    </head>
    <body>
        <div id="sidebar">
            <h2 style="color:#ffc107; margin-bottom:5px;">SECR AUDIT</h2>
            <div style="font-size:14px; margin-bottom:15px;">\${stnF} to \${stnT} (\${dir})</div>
            <p style="font-size:12px;">Signals Detected: \${reportSigs.length}</p><hr>
            \${reportSigs.map(r => \`
                <div class="item" onclick="flyToSig(\${r.lt}, \${r.lg})">
                    <span style="font-weight:bold;">\${r.n}</span>
                    <span class="spd">\${r.s}</span><br>
                    <small style="color:#acc6e6;">\${r.t}</small>
                </div>\`).join('')}
        </div>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            const m = L.map('map').setView([\${reportSigs[0]?.lt || 21.1}, \${reportSigs[0]?.lg || 79.1}], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
            const pathArr = \${pathData};
            const path = L.polyline(pathArr, {color:'#333', weight:4, opacity:0.7}).addTo(m);
            if(pathArr.length > 0) m.fitBounds(path.getBounds());
            
            const sigs = \${sigData};
            sigs.forEach(s => {
                L.circleMarker([s.lt, s.lg], {radius:7, color:'blue', fillOpacity:0.9, weight:2}).addTo(m)
                .bindTooltip("<b>"+s.n+"</b><br>Speed: "+s.s+" Kmph<br>Time: "+s.t);
            });
            function flyToSig(lt, lg) { m.setView([lt, lg], 16); }
        </script>
    </body>
    </html>`;

    let blob = new Blob([htmlContent], {type: 'text/html'});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SECR_Interactive_Report_\${stnF}.html`;
    link.click();
};
