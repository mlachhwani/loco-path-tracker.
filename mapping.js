/**
 * MAPPING.JS - STAGE 02 FINAL
 * LOGIC: COORDINATE CONVERSION + LIVE SYNC + DEEP ZOOM
 */

let master = { stns: [], sigs: [] }, rtis = [];
const map = L.map('map').setView([21.15, 79.12], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function conv(v) {
    if(!v) return null;
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : Math.floor(n/100) + ((n%100)/60);
}

function getVal(row, keys) {
    if(!row) return null;
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

// Data loading logic
window.onload = function() {
    const t = Date.now();
    Papa.parse("master/station.csv?v="+t, {download:true, header:true, complete: r => {
        master.stns = r.data;
        let h = r.data.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    
    const sFiles = [
        {f:'up_signals.csv', t:'UP', c:'green'},
        {f:'dn_signals.csv', t:'DN', c:'blue'},
        {f:'up_mid_signals.csv', t:'UP_MID', c:'purple'},
        {f:'dn_mid_signals.csv', t:'DN_MID', c:'red'}
    ];

    sFiles.forEach(cfg => {
        Papa.parse("master/"+cfg.f+"?v="+t, {download:true, header:true, complete: r => {
            r.data.forEach(s => { 
                s.clr = cfg.c; 
                s.type = cfg.t; 
                master.sigs.push(s); 
            });
        }});
    });
};

function getAccurateSpd(sLt, sLg) {
    let radius = 0.002; 
    let pts = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < radius);
    if(pts.length > 0) {
        pts.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
        return (pts.length >= 2 ? (pts[0].spd + pts[1].spd)/2 : pts[0].spd).toFixed(1);
    }
    return "N/A";
}

function generateLiveMap() {
    const file = document.getElementById('csv_file').files[0];
    if(!file) return alert("Select RTIS CSV!");
    
    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        rtis = []; let pathArr = [];
        res.data.forEach(row => {
            let lt = parseFloat(getVal(row,['Latitude','Lat'])), lg = parseFloat(getVal(row,['Longitude','Lng']));
            if(!isNaN(lt)) { 
                rtis.push({lt, lg, spd: parseFloat(getVal(row,['Speed','Spd'])), raw: row}); 
                pathArr.push([lt, lg]); 
            }
        });

        // Drawing path on map
        L.polyline(pathArr, {color: '#333', weight: 4, opacity: 0.8}).addTo(map);
        
        // BETTER ZOOM Logic (Mukesh Ji's Request)
        map.fitBounds(pathArr, {padding: [30, 30]});
        setTimeout(() => { if(map.getZoom() < 14) map.setZoom(14); }, 800);

        // LIVE Tracking on Mousemove
        map.on('mousemove', function(e) {
            let minDist = 0.003, speed = "0.0", time = "--:--:--";
            rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-e.latlng.lat, 2) + Math.pow(p.lg-e.latlng.lng, 2));
                if(d < minDist) { 
                    minDist = d; speed = p.spd.toFixed(1); 
                    let fullTime = getVal(p.raw, ['Logging Time', 'Time', 'IST_Time']) || "--:--:--";
                    time = fullTime.includes(' ') ? fullTime.split(' ')[1] : fullTime;
                }
            });
            document.getElementById('live-speed').innerText = speed;
            document.getElementById('live-time').innerText = time;
        });

        // Directional Signal Detection
        let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
        let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
        let activeDir = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng']))) ? "DN" : "UP";
        document.getElementById('log').innerHTML = `<b>Mode:</b> ${activeDir} Detected.`;

        master.sigs.forEach(sig => {
            let name = getVal(sig,['SIGNAL_NAME','SIGNAL_N']);
            let sLt = conv(getVal(sig,['Lat'])), sLg = conv(getVal(sig,['Lng']));
            if(!sLt || !sig.type.startsWith(activeDir)) return;
            
            let spd = getAccurateSpd(sLt, sLg);
            L.circleMarker([sLt, sLg], {radius: 6, color: sig.clr}).addTo(map).bindTooltip(name + " | Spd: " + spd);
            if(spd !== "N/A") {
                L.marker([sLt-0.0004, sLg], {icon: L.divIcon({className:'speed-tag', html:Math.round(spd), iconSize:[26,14]})}).addTo(map);
            }
        });
    }});
}
