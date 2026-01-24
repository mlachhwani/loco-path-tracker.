/**
 * REPORT.JS - STAGE 02 FINAL
 * ACTIONS: EXCEL DOWNLOAD & WEB SNAPSHOT
 */

function getProcessedAuditData() {
    if (rtis.length === 0) {
        alert("Pehle '1. Generate Map' button dabayein!");
        return null;
    }
    
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    
    let startLg = conv(getVal(stnF, ['Start_Lng']));
    let endLg = conv(getVal(stnT, ['Start_Lng']));
    
    let minLg = Math.min(startLg, endLg);
    let maxLg = Math.max(startLg, endLg);
    let activeDir = (endLg > startLg) ? "DN" : "UP";

    let finalLog = [];

    master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLat = conv(getVal(sig, ['Lat']));
        let sLng = conv(getVal(sig, ['Lng']));
        
        // Direction Filter
        if (!sig.type.startsWith(activeDir)) return;
        // Boundary Filter (Removes NGP if route is DURG-BSP)
        if (sLng < minLg || sLng > maxLg) return;
        // Exclusion Filter
        if (name.includes("NS") || name.includes("NEU") || name.includes("LC")) return;

        let radius = 0.002;
        let matchPoints = rtis.filter(p => Math.sqrt(Math.pow(p.lt - sLat, 2) + Math.pow(p.lg - sLng, 2)) < radius);

        if (matchPoints.length > 0) {
            matchPoints.sort((a, b) => {
                let distA = Math.sqrt(Math.pow(a.lt - sLat, 2) + Math.pow(a.lg - sLng, 2));
                let distB = Math.sqrt(Math.pow(b.lt - sLat, 2) + Math.pow(b.lg - sLng, 2));
                return distA - distB;
            });
            
            let bestMatch = matchPoints[0];
            finalLog.push({
                name: name,
                speed: bestMatch.spd.toFixed(1),
                time: getVal(bestMatch.raw, ['Logging Time', 'Time', 'IST_Time']) || "N/A",
                lat: sLat,
                lng: sLng,
                seq: rtis.indexOf(bestMatch)
            });
        }
    });

    // Chronological Sorting (Train movement sequence)
    finalLog.sort((a, b) => a.seq - b.seq);
    
    return { 
        data: finalLog, 
        dir: activeDir, 
        from: stnF.Station_Name, 
        to: stnT.Station_Name 
    };
}

// Button 2: Excel Download
function downloadExcelAudit() {
    let audit = getProcessedAuditData();
    if (!audit) return;

    let csvContent = "Asset Type,Location Name,Crossing Speed (Kmph),Crossing Time\n";
    audit.data.forEach(row => {
        csvContent += `SIGNAL,${row.name},${row.speed},${row.time}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `SECR_Excel_Audit_${audit.from}_to_${audit.to}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Button 3: Interactive Web Snapshot
function saveInteractiveWebReport() {
    let audit = getProcessedAuditData();
    if (!audit) return;
    
    const rtisPath = JSON.stringify(rtis.map(p => [p.lt, p.lg]));
    const signalsData = JSON.stringify(audit.data);

    const htmlContent = `
        <html><head><title>Interactive Report: ${audit.from}-${audit.to}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body{margin:0; font-family: 'Segoe UI', Arial; display: flex;} 
            #map{height:100vh; flex-grow: 1;} 
            .info-panel{width: 300px; background:white; padding:15px; box-shadow:-2px 0 10px rgba(0,0,0,0.1); overflow-y:auto;}
            .sig-card{padding:10px; border-bottom:1px solid #eee; cursor:pointer;}
            .sig-card:hover{background:#f9f9f9;}
            .spd-val{color:red; font-weight:bold; font-size:18px;}
        </style></head>
        <body>
            <div id="map"></div>
            <div class="info-panel">
                <h3 style="color:#002f6c; margin-top:0;">${audit.from} to ${audit.to}</h3>
                <p>Direction: ${audit.dir} | Signals: ${audit.data.length}</p><hr>
                ${audit.data.map(r => \`
                    <div class="sig-card" onclick="focusSig(\${r.lat}, \${r.lng})">
                        <b>\${r.name}</b><br>
                        <span class="spd-val">\${r.speed}</span> Kmph<br>
                        <small>\${r.time}</small>
                    </div>\`).join('')}
            </div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                const map = L.map('map').setView([\${audit.data[0]?.lat}, \${audit.data[0]?.lng}], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.polyline(\${rtisPath}, {color: 'black', weight: 4}).addTo(map);
                
                const sigs = \${signalsData};
                sigs.forEach(s => {
                    L.circleMarker([s.lat, s.lng], {radius: 7, color: 'blue', fillOpacity:1}).addTo(map).bindTooltip(s.name + " (" + s.speed + " Kmph)");
                });
                
                function focusSig(lt, lg) { map.setView([lt, lg], 16); }
            </script>
        </body></html>`;

    let blob = new Blob([htmlContent], { type: 'text/html' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SECR_Interactive_Report_${audit.from}_to_${audit.to}.html`;
    link.click();
}
