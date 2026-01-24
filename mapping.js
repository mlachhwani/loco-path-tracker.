/**
 * STAGE-02: MAPPING & LIVE TRACKING
 * Logic: Strict Direction Lock (UP/DN separation) & Unique LC Filter
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
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

// Initial Data Load
window.onload = function() {
    const t = Date.now();
    Papa.parse("master/station.csv?v="+t, {download:true, header:true, complete: r => {
        master.stns = r.data;
        let h = r.data.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    
    ['up_signals.csv', 'dn_signals.csv', 'up_mid_signals.csv', 'dn_mid_signals.csv'].forEach(f => {
        let type = f.includes('up') ? 'UP' : 'DN';
        if(f.includes('mid')) type += '_MID';
        Papa.parse("master/"+f+"?v="+t, {download:true, header:true, complete: r => {
            r.data.forEach(s => { 
                s.clr = (f.includes('dn') ? 'blue' : (f.includes('up') ? 'green' : 'purple')); 
                s.type = type; 
                master.sigs.push(s); 
            });
        }});
    });
};

// Accuracy Logic (Interpolation)
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
    if(!file) return alert("Select RTIS File!");

    Papa.parse(file, {header:true, skipEmptyLines:true, complete: function(res) {
        rtis = []; let pathArr = [];
        res.data.forEach(row => {
            let lt = parseFloat(getVal(row,['Latitude','Lat'])), lg = parseFloat(getVal(row,['Longitude','Lng']));
            if(!isNaN(lt)) { rtis.push({lt, lg, spd: parseFloat(getVal(row,['Speed','Spd']))}); pathArr.push([lt, lg]); }
        });

        L.polyline(pathArr, {color: '#222', weight: 4, opacity: 0.7}).addTo(map);
        map.fitBounds(pathArr);

        // DIRECTION CHECK (NGP -> JSG = DN)
        let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
        let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
        let isDN = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng'])));
        let activeDir = isDN ? "DN" : "UP";
        
        document.getElementById('log').innerHTML = `<b>Audit Mode:</b> ${activeDir} Journey Detected. Mapping Signals...`;

        // HOVER TRACKING
        map.on('mousemove', function(e) {
            let minDist = 0.003, speed = "0.0";
            rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-e.latlng.lat, 2) + Math.pow(p.lg-e.latlng.lng, 2));
                if(d < minDist) { minDist = d; speed = p.spd.toFixed(1); }
            });
            document.getElementById('live-speed').innerText = speed;
        });

        let plottedLCs = new Set();
        master.sigs.forEach(sig => {
            let name = getVal(sig,['SIGNAL_NAME','SIGNAL_N']);
            let sLt = conv(getVal(sig,['Lat'])), sLg = conv(getVal(sig,['Lng']));
            
            // STRICT DIRECTION LOCK: Skip signals not in journey direction
            if(!sLt || !sig.type.startsWith(activeDir)) return;

            if(name.includes("LC") || name.includes("L XING")) {
                let num = name.match(/\d+/);
                if(num && plottedLCs.has(num[0])) return; 
                if(num) plottedLCs.add(num[0]);
                L.circleMarker([sLt, sLg], {radius: 8, color: 'orange', fillOpacity: 0.8}).addTo(map).bindTooltip("LC GATE: " + name);
            } else {
                let spd = getAccurateSpd(sLt, sLg);
                L.circleMarker([sLt, sLg], {radius: 6, color: sig.clr}).addTo(map).bindTooltip(name + " | Speed: " + spd);
                if(spd !== "N/A") {
                    L.marker([sLt-0.0004, sLg], {icon: L.divIcon({className:'speed-tag', html:Math.round(spd), iconSize:[26,14]})}).addTo(map);
                }
            }
        });
    }});
}
