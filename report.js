/**
 * REPORT.JS - FINAL FIXED VERSION
 * logic: No Backticks, No Template Literals to avoid rendering error
 */

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
    var dir = (lg2 > lg1) ? "DN" : "UP";
    var minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

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

    var pathData = JSON.stringify(window.rtis.map(function(p) { return [p.lt, p.lg]; }));
    var sigData = JSON.stringify(reportSigs);

    // Sidebar Content Logic
    var listHtml = "";
    reportSigs.forEach(function(r) {
        listHtml += '<div class="item" onclick="flyToSig(' + r.lt + ',' + r.lg + ')">' +
                    '<span style="font-weight:bold;">' + r.n + '</span>' +
                    '<span class="spd">' + r.s + ' Kmph</span><br>' +
                    '<small style="color:#acc6e6;">' + r.t + '</small></div>';
    });

    // Final HTML Building using simple concatenation
    var h = '<!DOCTYPE html><html><head><title>SECR REPORT</title>';
    h += '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />';
    h += '<style>body{margin:0;display:flex;font-family:sans-serif;height:100vh;}';
    h += '#sidebar{width:320px;background:#002f6c;color:white;overflow-y:auto;padding:15px;}';
    h += '#map{flex-grow:1;} .item{background:rgba(255,255,255,0.1);padding:12px;margin-bottom:8px;border-radius:5px;cursor:pointer;border-left:5px solid #ffc107;}';
    h += '.spd{color:#00ff00;font-weight:bold;float:right;}</style></head><body>';
    h += '<div id="sidebar"><h2>SECR AUDIT</h2><div>' + stnF + ' to ' + stnT + ' (' + dir + ')</div><hr>' + listHtml + '</div>';
    h += '<div id="map"></div>';
    h += '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>';
    h += '<script>';
    h += 'var m = L.map("map").setView([' + (reportSigs[0] ? reportSigs[0].lt : 21.1) + ',' + (reportSigs[0] ? reportSigs[0].lg : 79.1) + '], 13);';
    h += 'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);';
    h += 'var pathArr = ' + pathData + ';';
    h += 'var pLine = L.polyline(pathArr, {color:"#333", weight:4}).addTo(m);';
    h += 'if(pathArr.length > 0) m.fitBounds(pLine.getBounds());';
    h += 'var sigs = ' + sigData + ';';
    h += 'sigs.forEach(function(s){';
    h += 'L.circleMarker([s.lt, s.lg], {radius:7, color:"blue", fillOpacity:0.9}).addTo(m).bindTooltip("<b>"+s.n+"</b><br>Speed: "+s.s+" Kmph");';
    h += '});';
    h += 'function flyToSig(lt, lg) { m.setView([lt, lg], 16); }';
    h += '</script></body></html>';

    var blob = new Blob([h], {type: 'text/html'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "SECR_Report_" + stnF + ".html";
    link.click();
};
