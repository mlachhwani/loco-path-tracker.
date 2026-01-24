/**
 * REPORT.JS - STAGE 02 FINAL
 * FIX: ACCESSING GLOBAL WINDOW DATA
 */

function downloadExcelAudit() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");

    let stnF = window.master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = window.master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    
    let startLg = conv(getVal(stnF, ['Start_Lng']));
    let endLg = conv(getVal(stnT, ['Start_Lng']));
    let activeDir = (endLg > startLg) ? "DN" : "UP";
    let minLg = Math.min(startLg, endLg), maxLg = Math.max(startLg, endLg);

    let csvContent = "Asset Type,Location Name,Crossing Speed (Kmph),Crossing Time\n";
    let log = [];

    window.master.sigs.forEach(sig => {
        let name = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(activeDir) || sLg < minLg || sLg > maxLg || name.includes("NS") || name.includes("LC")) return;

        let match = window.rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (match.length > 0) {
            match.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            log.push({ name: name, speed: match[0].spd.toFixed(1), time: getVal(match[0].raw, ['Logging Time', 'Time']) || "N/A", seq: window.rtis.indexOf(match[0]) });
        }
    });

    log.sort((a,b) => a.seq - b.seq).forEach(r => {
        csvContent += `SIGNAL,${r.name},${r.speed},${r.time}\n`;
    });

    let b = new Blob([csvContent], {type: 'text/csv'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `SECR_Audit_${stnF.Station_Name}_to_${stnT.Station_Name}.csv`;
    a.click();
}

function saveInteractiveWebReport() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");

    let stnF = window.master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = window.master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    let activeDir = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng']))) ? "DN" : "UP";

    let sigData = [];
    window.master.sigs.forEach(sig => {
        let sLt = conv(getVal(sig,['Lat'])), sLg = conv(getVal(sig,['Lng']));
        if (!sig.type.startsWith(activeDir)) return;
        let match = window.rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002);
        if (match.length > 0) {
            match.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
            sigData.push({ name: getVal(sig,['SIGNAL_NAME']), spd: match[0].spd.toFixed(1), time: getVal(match[0].raw, ['Logging Time', 'Time']) || "N/A", lt: sLt, lg: sLg, seq: window.rtis.indexOf(match[0]) });
        }
    });
    sigData.sort((a,b) => a.seq - b.seq);

    const pathStr = JSON.stringify(window.rtis.map(p => [p.lt, p.lg]));
    const sigStr = JSON.stringify(sigData);

    const html = `
        <html><head><title>SECR Interactive Report</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>body{margin:0; font-family:sans-serif; display:flex;} #map{height:100vh; flex-grow:1;} .panel{width:300px; padding:15px; overflow-y:auto; background:white; box-shadow:-2px 0 10px rgba(0,0,0,0.1);}</style></head>
        <body><div id="map"></div><div class="panel"><h3>${stnF.Station_Name} to ${stnT.Station_Name}</h3><hr>${sigData.map(r => `<div onclick="m.setView([${r.lt},${r.lg}],16)" style="cursor:pointer; padding:8px; border-bottom:1px solid #eee;"><b>${r.name}</b><br><span style="color:red">${r.spd} Kmph</span> | ${r.time}</div>`).join('')}</div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>const m=L.map('map').setView([${sigData[0]?.lt},${sigData[0]?.lg}],14); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m); L.polyline(${pathStr},{color:'black'}).addTo(m); ${sigStr}.forEach(s=>{L.circleMarker([s.lt,s.lg],{radius:7,color:'blue'}).addTo(m).bindTooltip(s.name+' ('+s.spd+')')});</script></body></html>`;

    let b = new Blob([html], {type: 'text/html'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `SECR_Interactive_Report_${stnF.Station_Name}.html`;
    a.click();
}
