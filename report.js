function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");
    let auditLog = [];
    let seenLCs = new Set();

    master.sigs.forEach(asset => {
        let name = getVal(asset, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(asset, ['Lat'])), sLg = conv(getVal(asset, ['Lng']));
        let speed = getAccurateSpd(sLt, sLg);
        if (speed === "N/A") return;

        let isLC = name.includes("L XING") || name.includes("LC");
        if (isLC) {
            let num = name.match(/\d+/);
            if (num && seenLCs.has(num[0])) return;
            if (num) seenLCs.add(num[0]);
        }

        auditLog.push({
            type: isLC ? "LC GATE" : (name.includes("NS")?"NS":"SIGNAL"),
            name: name,
            speed: parseFloat(speed),
            status: (isLC && parseFloat(speed) > 30) ? "VIOLATION" : "OK"
        });
    });

    const reportWin = window.open("", "_blank");
    reportWin.document.write(`<html><head><title>Report</title><style>table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:10px;} th{background:#002f6c;color:white;}</style></head>
        <body><h2>SECR Audit Report</h2><table><tr><th>Type</th><th>Location</th><th>Speed</th><th>Status</th></tr>
        ${auditLog.map(r=>`<tr><td>${r.type}</td><td>${r.name}</td><td>${r.speed}</td><td>${r.status}</td></tr>`).join('')}
        </table></body></html>`);
}
