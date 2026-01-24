/**
 * MAPPING.JS - STAGE 02 FINAL
 * LOGIC: GLOBAL DATA STORAGE + MAP ZOOM
 */

// Global access ke liye window object ka use
window.master = { stns: [], sigs: [] };
window.rtis = [];

const map = L.map('map').setView([21.15, 79.12], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function conv(v) {
    if(!v) return null;
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, ''));
    if(isNaN(n)) return null;
    return Math.floor(n / 100) + ((n % 100) / 60);
}

function getVal(row, keys) {
    if(!row) return null;
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

// Master Data Loading
window.onload = function() {
    const ts = Date.now();
    Papa.parse("master/station.csv?v="+ts, {
        download: true, header: true, 
        complete: function(r) {
            window.master.stns = r.data;
            let opt = r.data.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
            document.getElementById('s_from').innerHTML = opt;
            document.getElementById('s_to').innerHTML = opt;
        }
    });
    
    const sigFiles = [
        {f:'up_signals.csv', t:'UP', c:'green'}, {f:'dn_signals.csv', t:'DN', c:'blue'},
        {f:'up_mid_signals.csv', t:'UP_MID', c:'purple'}, {f:'dn_mid_signals.csv', t:'DN_MID', c:'red'}
    ];

    sigFiles.forEach(cfg => {
        Papa.parse("master/"+cfg.f+"?v="+ts, {
            download: true, header: true, 
            complete: function(r) {
                r.data.forEach(s => { s.clr = cfg.c; s.type = cfg.t; window.master.sigs.push(s); });
            }
        });
    });
};

function getAccurateSpd(sLt, sLg) {
    let radius = 0.002;
    let pts = window.rtis.filter(p => Math.sqrt(Math.pow(p.lt - sLt, 2) + Math.pow(p.lg - sLg, 2)) < radius);
    if(pts.length > 0) {
        pts.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
        return (pts.length >= 2 ? (pts[0].spd + pts[1].spd)/2 : pts[0].spd).toFixed(1);
    }
    return "N/A";
}

function generateLiveMap() {
    const f = document.getElementById('csv_file').files[0];
    if(!f) return alert("Select RTIS CSV!");
    
    Papa.parse(f, {
        header: true, skipEmptyLines: true, 
        complete: function(res) {
            window.rtis = []; 
            let path = [];
            res.data.forEach(row => {
                let lt = parseFloat(getVal(row,['Latitude','Lat'])), lg = parseFloat(getVal(row,['Longitude','Lng']));
                if(!isNaN(lt)) { 
                    window.rtis.push({lt, lg, spd: parseFloat(getVal(row,['Speed','Spd'])), raw: row}); 
                    path.push([lt, lg]); 
                }
            });

            L.polyline(path, {color: '#333', weight: 4}).addTo(map);
            map.fitBounds(path);
            setTimeout(() => { if(map.getZoom() < 14) map.setZoom(14); }, 1000);

            map.on('mousemove', function(e) {
                let minDist = 0.003, speed = "0.0", time = "--:--:--";
                window.rtis.forEach(p => {
                    let d = Math.sqrt(Math.pow(p.lt-e.latlng.lat, 2) + Math.pow(p.lg-e.latlng.lng, 2));
                    if(d < minDist) { 
                        minDist = d; speed = p.spd.toFixed(1); 
                        let t = getVal(p.raw, ['Logging Time', 'Time']) || "--:--:--";
                        time = t.includes(' ') ? t.split(' ')[1] : t;
                    }
                });
                document.getElementById('live-speed').innerText = speed;
                document.getElementById('live-time').innerText = time;
            });

            let stnF = window.master.stns.find(s => getVal(s,['Station_Name']) === document.getElementById('s_from').value);
            let stnT = window.master.stns.find(s => getVal(s,['Station_Name']) === document.getElementById('s_to').value);
            let activeDir = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng']))) ? "DN" : "UP";
            document.getElementById('log').innerHTML = `<b>Mode:</b> ${activeDir} Running.`;

            window.master.sigs.forEach(sig => {
                let sLt = conv(getVal(sig,['Lat'])), sLg = conv(getVal(sig,['Lng']));
                if(!sLt || !sig.type.startsWith(activeDir)) return;
                let spd = getAccurateSpd(sLt, sLg);
                L.circleMarker([sLt, sLg], {radius: 6, color: sig.clr}).addTo(map).bindTooltip(getVal(sig,['SIGNAL_NAME'])+" | Spd: "+spd);
                if(spd !== "N/A") L.marker([sLt-0.0004, sLg], {icon: L.divIcon({className:'speed-tag', html:Math.round(spd), iconSize:[26,14]})}).addTo(map);
            });
        }
    });
}
