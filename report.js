/**
 * REPORT.JS - FINAL REPORTING FIX
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
    a.download = `Audit_${stnF}_to_${stnT}.csv`;
    a.click();
};

// Button 3: Web Snapshot
window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    
    let stnF = document.getElementById('s_from').value;
    let stnT = document.getElementById('s_to').value;
    
    const html = `<html><body style="font-family:sans-serif; text-align:center;">
        <h2>SECR Interactive Audit: ${stnF} to ${stnT}</h2>
        <p>Snapshot Saved. Use main tool for live tracking.</p>
        <button onclick="window.print()">Print Report</button>
    </body></html>`;
    
    let blob = new Blob([html], {type: 'text/html'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `WebReport_${stnF}.html`;
    a.click();
};
