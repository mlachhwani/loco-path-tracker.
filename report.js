/**
 * STAGE-02: REPORT GENERATOR
 * Logic: Only captures Assets in the direction of travel.
 */

function generateAuditReport() {
    if (rtis.length === 0) return alert("Pehle Map Generate Karein!");

    // Direction Determination for Report
    let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
    let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
    let isDN = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng'])));
    let activeDir = isDN ? "DN" : "UP";

    let auditLog = [];
    let seenLCs = new Set();

    master.sigs.forEach(asset => {
        let name = getVal(asset, ['SIGNAL_NAME', 'SIGNAL_N']);
        let sLt = conv(getVal(asset, ['Lat'])), sLg = conv(getVal(asset, ['Lng']));
        
        // DIRECTION LOCK: Report me bhi wahi signals jo train ne dekhe
        if (!asset.type.startsWith(activeDir)) return;

        let speed = getAccurateSpd(sLt, sLg);
        if (speed === "N/A") return;

        // Unique LC Filter
        if (name.includes("LC") || name.includes("L XING")) {
            let num = name.match(/\d+/);
            if (num && seenLCs.has(num[0])) return;
            if (num) seenLCs.add(num[0]);
        }

        auditLog.push({
            type: (name.includes("LC") || name.includes("L XING")) ? "LC GATE" : (name.includes("NS") ? "NEUTRAL SEC" : "SIGNAL"),
            name: name,
            speed: parseFloat(speed),
            status: (name.includes("LC") && parseFloat(speed) > 30) ? "VIOLATION" : "NORMAL"
        });
    });

    const reportWin = window.open("", "_blank");
    reportWin.document.write(`
        <html><head><title>Audit Report: ${activeDir}</title>
        <style>
            table { width: 100%; border-collapse: collapse; font-family: Segoe UI, sans-serif; }
            th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
            th { background: #002f6c; color: white; }
            tr:nth-child(even) { background: #f9f9f9; }
            .violation { color: red; font-weight: bold; background: #ffebeb; }
        </style></head>
        <body>
            <h2>SECR Audit Report (${activeDir} Journey)</h2>
            <p>From: ${stnF.Station_Name} | To: ${stnT.Station_Name}</p>
            <table>
                <tr><th>Asset Type</th><th>Location Name</th><th>Crossing Speed</th><th>Status</th></tr>
                ${auditLog.map(r => `
                    <tr class="${r.status==='VIOLATION'?'violation':''}">
                        <td>${r.type}</td><td>${r.name}</td><td>${r.speed} Kmph</td><td>${r.status}</td>
                    </tr>`).join('')}
            </table>
        </body></html>
    `);
}
