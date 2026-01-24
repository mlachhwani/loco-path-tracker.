window.downloadExcelAudit = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    var masterF = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnF; });
    var masterT = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnT; });
    var lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    var dir = (lg2 > lg1) ? "DN" : "UP";
    var minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

    var csv = "Asset Type,Location Name,Crossing Speed,Crossing Time\n";
    var log = [];
    window.master.sigs.forEach(function(sig) {
        var name = getVal(sig, ['SIGNAL_NAME']);
        var sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        var match = window.rtis.filter(function(p) { return Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002; });
        if (match.length > 0) {
            match.sort(function(a,b) { return Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)); });
            log.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", seq: window.rtis.indexOf(match[0]) });
        }
    });
    log.sort(function(a,b) { return a.seq - b.seq; }).forEach(function(r) { csv += "SIGNAL," + r.n + "," + r.s + "," + r.t + "\n"; });
    var blob = new Blob([csv], {type: 'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Audit_Excel_" + stnF + ".csv";
    a.click();
};

window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    var masterF = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnF; });
    var masterT = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnT; });
    var lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    var minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);
    var dir = (lg2 > lg1) ? "DN" : "UP";

    var reportSigs = [];
    window.master.sigs.forEach(function(sig) {
        var name = getVal(sig, ['SIGNAL_NAME']);
        var sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        var match = window.rtis.filter(function(p) { return Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002; });
        if (match.length > 0) {
            match.sort(function(a,b) { return Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)); });
            reportSigs.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", lt: sLt, lg: sLg, seq: window.rtis.indexOf(match[0]) });
        }
    });
    reportSigs.sort(function(a,b) { return a.seq - b.seq; });

    var pathData = JSON.stringify(window.rtis.map(function(p) { return {lt: p.lt, lg: p.lg, s: p.spd.toFixed(1), t: (getVal(p.raw,['Logging Time','Time'])||"")}; }));
    var listHtml = "";
    reportSigs.forEach(function(r) {
        listHtml += '<div class="item" onclick="flyToSig(' + r.lt + ',' + r.lg + ')"><b>' + r.n + '</b><span class="spd">' + r.s + ' Kmph</span><br><small>' + r.t + '</small></div>';
    });

    var h = '<!DOCTYPE html><html><head><title>Audit Report</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />';
    h += '<style>body{margin:0;display:flex;font-family:sans-serif;height:100vh;} #sidebar{width:320px;background:#002f6c;color:white;overflow-y:auto;padding:15px;} #map{flex-grow:1;} .item{background:rgba(255,255,255,0.1);padding:10px;margin-bottom:5px;border-radius:4px;cursor:pointer;border-left:4px solid #ffc107;} .spd{color:#00ff00;font-weight:bold;float:right;}</style></head><body>';
    h += '<div id="sidebar"><h3>Audit: ' + stnF + ' - ' + stnT + '</h3><hr>' + listHtml + '</div><div id="map"></div>';
    h += '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>';
    h += 'var m = L.map("map").setView([' + (reportSigs[0]?reportSigs[0].lt:21.1) + ',' + (reportSigs[0]?reportSigs[0].lg:79.1) + '], 13); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);';
    h += 'var fullPath = ' + pathData + '; var pLine = L.polyline(fullPath.map(function(d){return [d.lt,d.lg]}), {color:"#333", weight:4}).addTo(m); if(fullPath.length > 0) m.fitBounds(pLine.getBounds());';
    h += 'm.on("click", function(e){ var minDist=0.0005, p=null; fullPath.forEach(function(pt){ var d=Math.sqrt(Math.pow(pt.lt-e.latlng.lat,2)+Math.pow(pt.lg-e.latlng.lng,2)); if(d<minDist){minDist=d;p=pt;} }); if(p){ L.popup().setLatLng(e.latlng).setContent("Speed: "+p.s+" Kmph<br>Time: "+p.t).openOn(m); } });';
    h += 'var sigs = ' + JSON.stringify(reportSigs) + '; sigs.forEach(function(s){ L.circleMarker([s.lt, s.lg], {radius:7, color:"blue"}).addTo(m).bindTooltip(s.n+" ("+s.s+" Kmph)"); }); function flyToSig(lt, lg) { m.setView([lt, lg], 16); }</script></body></html>';

    var blob = new Blob([h], {type: 'text/html'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Audit_" + stnF + ".html";
    link.click();
};
