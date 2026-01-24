/**
 * STAGE-02: MAPPING & LIVE TRACKING
 * Handle: Signal mapping, LC/NS Icons, and Live Speed Hover
 */

let master = { stns: [], sigs: [] }, rtis = [];
const map = L.map('map').setView([21.15, 79.12], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function conv(v) {
    if(!v) return null;
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : Math.floor(n/100) + ((n%100)/60);
}

// Coordinate Repair Logic for Headers
function getVal(row, keys) {
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

// Load Master Data (Background)
window.onload = function() {
    const t = Date.now();
    Papa.parse("master/station.csv?v="+t, {download:true, header:true, complete: r => {
        master.stns = r.data;
        let h = r.data.map(s => `<option value="${getVal(s,['Station_Name'])}">${getVal(s,['Station_Name'])}</option>`).sort().join('');
        document.getElementById('s_from').innerHTML = h; document.getElementById('s_to').innerHTML = h;
    }});
    ['up_signals.csv', 'dn_signals.csv', 'up_mid_signals.csv', 'dn_mid_signals.csv'].forEach(f => {
        let type = f.includes('up') ? 'UP' : 'DN';
        Papa.parse("master/"+f+"?v="+t, {download:true, header:true, complete: r => {
            r.data.forEach(s => { s.clr = (f.includes('dn')?'blue':'green'); s.type = type; master.sigs.push(s); });
        }});
    });
};

// HIGH ACCURACY INTERPOLATION
function getAccurateSpd(sLt, sLg) {
    let radius = 0.002; // 200m
    let points = rtis.filter(p => Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < radius);
    if(points.length > 0) {
        points.sort((a,b) => Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)));
        return (points.length >= 2 ? (points[0].spd + points[1].spd)/2 : points[0].spd).toFixed(1);
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

        const journeyLine = L.polyline(pathArr, {color: '#222', weight: 5, opacity: 0.6}).addTo(map);
        map.fitBounds(pathArr);

        // LIVE HOVER TRACKING
        map.on('mousemove', function(e) {
            let minDist = 0.003, speed = "0.0";
            rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-e.latlng.lat, 2) + Math.pow(p.lg-e.latlng.lng, 2));
                if(d < minDist) { minDist = d; speed = p.spd.toFixed(1); }
            });
            document.getElementById('live-speed').innerText = speed;
        });

        // Unique LC Mapping & NS Separate Mapping
        let plottedLCs = new Set();
        master.sigs.forEach(sig => {
            let name = getVal(sig,['SIGNAL_NAME','SIGNAL_N']);
            let sLt = conv(getVal(sig,['Lat'])), sLg = conv(getVal(sig,['Lng']));
            if(!sLt) return;

            if(name.includes("L XING") || name.includes("LC")) {
                let lcNum = name.match(/\d+/);
                if(lcNum && plottedLCs.has(lcNum[0])) return;
                if(lcNum) plottedLCs.add(lcNum[0]);
                L.marker([sLt, sLg], {icon: L.divIcon({className:'lc-tag', html:'LC', iconSize:[20,20]})}).addTo(map).bindTooltip(name);
            } else {
                let spd = getAccurateSpd(sLt, sLg);
                L.circleMarker([sLt, sLg], {radius: 6, color: sig.clr}).addTo(map).bindTooltip(name + " | Spd: " + spd);
            }
        });
    }});
}
