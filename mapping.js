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
    if(isNaN(n)) return null;
    let degrees = Math.floor(n / 100);
    let minutes = (n % 100) / 60;
    return degrees + minutes;
}

function getVal(row, keys) {
    if(!row) return null;
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

// Loading Station and Signal Master Data
window.onload = function() {
    const timestamp = Date.now();
    
    // Load Stations
    Papa.parse("master/station.csv?v="+timestamp, {
        download: true, 
        header: true, 
        complete: function(results) {
            master.stns = results.data;
            let options = results.data.map(s => {
                let name = getVal(s, ['Station_Name']);
                return `<option value="${name}">${name}</option>`;
            }).sort().join('');
            document.getElementById('s_from').innerHTML = options;
            document.getElementById('s_to').innerHTML = options;
        }
    });
    
    // Load All Signal Files
    const signalConfigs = [
        {file: 'up_signals.csv', type: 'UP', color: 'green'},
        {file: 'dn_signals.csv', type: 'DN', color: 'blue'},
        {file: 'up_mid_signals.csv', type: 'UP_MID', color: 'purple'},
        {file: 'dn_mid_signals.csv', type: 'DN_MID', color: 'red'}
    ];

    signalConfigs.forEach(config => {
        Papa.parse("master/" + config.file + "?v=" + timestamp, {
            download: true, 
            header: true, 
            complete: function(results) {
                results.data.forEach(signal => { 
                    signal.clr = config.color; 
                    signal.type = config.type; 
                    master.sigs.push(signal); 
                });
            }
        });
    });
};

function getAccurateSpd(sigLat, sigLng) {
    let radius = 0.002; 
    let pointsNear = rtis.filter(p => {
        let dist = Math.sqrt(Math.pow(p.lt - sigLat, 2) + Math.pow(p.lg - sigLng, 2));
        return dist < radius;
    });

    if(pointsNear.length > 0) {
        pointsNear.sort((a, b) => {
            let distA = Math.sqrt(Math.pow(a.lt - sigLat, 2) + Math.pow(a.lg - sigLng, 2));
            let distB = Math.sqrt(Math.pow(b.lt - sigLat, 2) + Math.pow(b.lg - sigLng, 2));
            return distA - distB;
        });
        if(pointsNear.length >= 2) {
            return ((pointsNear[0].spd + pointsNear[1].spd) / 2).toFixed(1);
        }
        return pointsNear[0].spd.toFixed(1);
    }
    return "N/A";
}

function generateLiveMap() {
    const fileInput = document.getElementById('csv_file');
    const file = fileInput.files[0];
    if(!file) return alert("Pehle RTIS CSV Select karein!");
    
    Papa.parse(file, {
        header: true, 
        skipEmptyLines: true, 
        complete: function(res) {
            rtis = []; 
            let pathPoints = [];
            
            res.data.forEach(row => {
                let lt = parseFloat(getVal(row, ['Latitude', 'Lat']));
                let lg = parseFloat(getVal(row, ['Longitude', 'Lng']));
                let speed = parseFloat(getVal(row, ['Speed', 'Spd']));
                
                if(!isNaN(lt) && !isNaN(lg)) { 
                    rtis.push({lt: lt, lg: lg, spd: speed, raw: row}); 
                    pathPoints.push([lt, lg]); 
                }
            });

            // Map Rendering
            L.polyline(pathPoints, {color: '#333', weight: 4, opacity: 0.8}).addTo(map);
            
            // ZOOM IMPROVEMENT: Step-by-Step Focus
            map.fitBounds(pathPoints, {padding: [30, 30]});
            setTimeout(() => { 
                if(map.getZoom() < 14) map.setZoom(14); 
            }, 1000);

            // Hover Tracking Logic
            map.on('mousemove', function(e) {
                let minDist = 0.003;
                let currentSpeed = "0.0";
                let currentTime = "--:--:--";
                
                rtis.forEach(point => {
                    let d = Math.sqrt(Math.pow(point.lt - e.latlng.lat, 2) + Math.pow(point.lg - e.latlng.lng, 2));
                    if(d < minDist) { 
                        minDist = d; 
                        currentSpeed = point.spd.toFixed(1); 
                        let logTime = getVal(point.raw, ['Logging Time', 'Time', 'IST_Time']) || "--:--:--";
                        currentTime = logTime.includes(' ') ? logTime.split(' ')[1] : logTime;
                    }
                });
                document.getElementById('live-speed').innerText = currentSpeed;
                document.getElementById('live-time').innerText = currentTime;
            });

            // Direction and Signal Plotting
            let stnF = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_from').value);
            let stnT = master.stns.find(s => getVal(s, ['Station_Name']) === document.getElementById('s_to').value);
            let activeDir = (conv(getVal(stnT,['Start_Lng'])) > conv(getVal(stnF,['Start_Lng']))) ? "DN" : "UP";
            
            document.getElementById('log').innerHTML = `<b>Mode:</b> ${activeDir} Running.`;

            master.sigs.forEach(sig => {
                let sigName = getVal(sig, ['SIGNAL_NAME', 'SIGNAL_N']);
                let sLat = conv(getVal(sig, ['Lat']));
                let sLng = conv(getVal(sig, ['Lng']));
                
                if(!sLat || !sig.type.startsWith(activeDir)) return;
                
                let signalSpeed = getAccurateSpd(sLat, sLng);
                L.circleMarker([sLat, sLng], {radius: 6, color: sig.clr}).addTo(map).bindTooltip(sigName + " | Spd: " + signalSpeed);
                
                if(signalSpeed !== "N/A") {
                    L.marker([sLat-0.0004, sLng], {
                        icon: L.divIcon({className: 'speed-tag', html: Math.round(signalSpeed), iconSize: [26, 14]})
                    }).addTo(map);
                }
            });
        }
    });
}
