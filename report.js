/**
 * STAGE-02: AUDIT REPORT GENERATOR
 */

function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");

    let auditLog = [];
    let seenLCs = new Set();

    master.sigs.forEach(asset => {
        let name = getVal(asset, ['SIGNAL_NAME', 'SIGNAL_N']);
        let lat = conv(getVal(asset, ['Lat']));
        let lng = conv(getVal(asset, ['Lng']));
        let speed = getAccurateSpd(lat, lng);

        if (speed === "N/A") return;

        let isLC = name.includes("L XING") || name.includes("LC");
        let isNS = name.includes("NS") || name.includes("NEUTRAL");

        // LC Unique Filter
        if (isLC) {
            let num = name.match(/\d+/);
            if (num && seenLCs.has(num[0])) return;
            if (num) seenLCs.add(num[0]);
        }

        auditLog.push({
            type: isLC ? "LC GATE" : (isNS ? "NEUTRAL SEC" : "SIGNAL"),
            name: name,
            speed: parseFloat(speed),
            status: (isLC && parseFloat(speed) > 30) ? "CHECK" : "OK"
        });
    });

    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(`
        <html><head><title>Audit Report</title>
        <style>
            table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            th { background-color: #002f6c; color: white; }
            .violation { color: red; font-weight: bold; }
        </style></head>
        <body>
            <h2>SECR Audit Report: ${document.getElementById('s_from').value} to ${document.getElementById('s_to').value}</h2>
            <table>
                <tr><th>Asset Type</th><th>Location Name</th><th>Speed (Kmph)</th><th>Status</th></tr>
                ${auditLog.map(r => `<tr><td>${r.type}</td><td>${r.name}</td><td>${r.speed}</td><td class="${r.status==='CHECK'?'violation':''}">${r.status}</td></tr>`).join('')}
            </table>
        </body></html>
    `);
}
