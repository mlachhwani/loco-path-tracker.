/**
 * REPORT.JS - STAGE 02 FINAL
 * LOGIC: EXCEL DOWNLOAD + INTERACTIVE WEB SNAPSHOT
 */

function getProcessedAuditData() {
    if (rtis.length === 0) return null;
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    let startLg = conv(getVal(stnF,['Start_Lng'])), endLg = conv(getVal(stnT,['Start_Lng']));
    let minLg = Math.min(startLg, endLg), maxLg = Math.max(startLg, endLg);
    let activeDir = (endLg > startLg) ? "DN" : "UP";

    let auditLog = [];
    master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        
        // FILTERS: Dir, Bounds, NS/LC
        if (!sig.type.startsWith(activeDir) || name.includes("NS") || name.includes("NEU") || name.includes("LC") || sLg < minLg || sLg > maxLg) return;

        let pts = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (pts.length > 0) {
            pts.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            let best = pts[0];
            auditLog.push({ 
                name: name, speed: best.spd.toFixed(1), 
                time: getVal(best.raw, ['Logging Time', 'Time']) || "N/A", 
                lat: sLt, lng: sLg, seq: rtis.indexOf(best) 
            });
        }
    });
    auditLog.sort((a, b) => a.seq - b.seq);
    return { data: auditLog, dir: activeDir, from: stnF.Station_Name, to: stnT.Station_Name };
}

function downloadExcelAudit() {
    let audit = getProcessedAuditData();
    if (!audit) return alert("Pehle Map Generate Karein (Step 1)!");
    
    let csv = "Asset Type,Location Name,Crossing Speed(Kmph),Crossing Time\n" + 
              audit.data.map(r => `SIGNAL,${r.name},${r.speed},${r.time}`).join("\n");
    
    let blob = new Blob([csv], {type: 'text/csv'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SECR_Audit_${audit.from}_to_${audit.to}.csv`;
    a.click();
}

function saveInteractiveWebReport() {
    let audit = getProcessedAuditData();
    if (!audit) return alert("Pehle Map Generate Karein (Step 1)!");
    
    const rtisDataString = JSON.stringify(rtis.map(p => [p.lt, p.lg]));
    const markerDataString = JSON.stringify(audit.data);

    const reportContent = `
        <html><head><title>Interactive Report: ${audit.from}-${audit.to}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body{margin:0; font-family:sans-serif;} 
            #map{height:100vh; width:100%;} 
            .side-box{position:absolute; top:10px; right:10px; background:white; padding:15px; z-index:1000; border-radius:8px; box-shadow:0 0 15px rgba(0,0,0,0.3); max-height:85vh; overflow-y:auto; width:280px;}
            .sig-row:hover{background:#f0f0f0; cursor:pointer;}
        </style></head>
        <body>
            <div id="map"></div>
            <div class="side-box">
                <h3 style="margin-top:0; color:#002f6c;">${audit.from} to ${audit.to} Audit</h3>
                <p style="font-size:12px; color:#666;">Direction: ${audit.dir} | Signals: ${audit.data.length}</p><hr>
                ${audit.data.map(r => '<div class="sig-row" style="padding:8px 0; border-bottom:1px solid #eee;" onclick="map.setView(['+r.lat+','+r.lng+'],16)"><b>'+r.name+'</b><br><span style="color:red; font-weight:bold;">'+r.speed+' Kmph</span> | '+r.time+'</div>').join('')}
            </div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                const map = L.map('map').setView([${audit.data[0]?.lat}, ${audit.data[0]?.lng}], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.polyline(${rtisDataString}, {color: 'black', weight: 4}).addTo(map);
                ${markerDataString}.forEach(m => {
                    L.circleMarker([m.lat, m.lng], {radius: 7, color: 'blue', fillOpacity:1}).addTo(map).bindTooltip(m.name + " (" + m.speed + " Kmph)");
                });
            </script>
        </body></html>`;

    let blob = new Blob([reportContent], {type: 'text/html'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Interactive_Report_${audit.from}_to_${audit.to}.html`;
    a.click();
}
