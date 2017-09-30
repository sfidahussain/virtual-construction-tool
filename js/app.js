/* === To-Do List (low priority tasks) ===
    - Check lithology data as it's read from the database for null depths/bottoms/etc
    - Build in special case for showing only one boring log (no voronoi)
    - Detect when latitudes/longitudes being added to the database don't have minute/seconds markings ex. N40? 48 31.9 and throw an error (OR figure out a nice way to parse them)
    - Make sure latitudes/longitudes are postive/negative respectively (for peoria)
    - Parse Location column before adding to database when latitude/longitude information not available
    - When creating cylinder mask, use max soil elevation and min soil elevation for all boring logs to ensure no issues
*/
// npm dependencies
window.$ = window.jQuery = require('jquery'); // set up jQuery so we can use the $ notation correctly
var THREE = require('three');
var OrbitControls = require('three-orbit-controls')(THREE);
var THREECSG = require('three-js-csg')(THREE);
var Voronoi = require('voronoi');
var Stats = require('stats.js');
var fs = require('fs');
var newline = require('os').EOL;
var path = require('path');
var mysql = require('mysql');
var xlsx = require('node-xlsx');
var parseDMS = require('parse-dms');
var XMLWriter = require('xml-writer');
var Delaunay = require('delaunay-fast');

eval(fs.readFileSync('./js/Database functions.js').toString());
eval(fs.readFileSync('./js/Map and Soil functions.js').toString());
eval(fs.readFileSync('./js/Tabs.js').toString());

// When the window is resized, change the renderer size to match
$(window).resize(function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    $('#map_canvas').height(window.innerHeight);
});

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function handleNull(value) {
    if (value == '')
        return null;
    else
        return value;
}

function handleDate(date) {
    if (handleNull(date) == null)
        return null;
    else
        return new Date(1899, 12, date - 1);
}

function handleLatOrLong(value) {
    if (handleNull(value) == null)
        return null;
    else {
        try {
            var parsed = parseLatLong(value);
        } catch (err) {
            console.warn("Could not parse latitude and longitude.");
            return null;
        }

        if (parsed.lat != null && !isNaN(parsed.lat))
            return parsed.lat;
        else if (parsed.lon != null && !isNaN(parsed.lon))
            return parsed.lon;
        else if (!isNaN(parsed))
            return parsed;
        else
            return null;
    }
}

function handleNumber(str) {
    if (handleNull(str) == null)
        return null;
    else {
        var float = parseFloat(str);
        if (isNaN(float))
            return null;
        else
            return float;
    }
}

function getBoringLogsByProjectId(projectId) {
    return boringLogs.filter(log => {
        return log.projectId == projectId;
    });
}

// Called once, sets up the scene
function start() {
    // read in options from JSON file (__dirname is the folder app.js is running in)
    options = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'options.json'), 'utf8'));

    // read in colors from JSON file
    colors = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'colors.json'), 'utf8'));

    // Google Maps API Key: AIzaSyCII_530pWLEpYcl7IymE-UB1AvCRjozf0
    initMap();

    if (options.showStats) {
        // set up fps, ms, and mb stat windows
        stats = new Stats();
        $(document.body).append(stats.dom);
    }

    if (options.showVersions) {
        // show version information
        var div = $(`<div id="about" class="text">
            Node.js ${process.versions.node}<br>
            Chromium ${process.versions.chrome}<br>
            Electron ${process.versions.electron}<br>
            </div>`);
        $(document.body).append(div);
    }

    // Unit tests for latitude and longitude
    /*
    parseLatLong('40? 48\' 7.4"N');
    parseLatLong('N40?49?20.7??');
    parseLatLong('40? 42? 11.36??');
    parseLatLong('40? 44\' 28" N');
    parseLatLong('N40? 48\' 45.5"');
    parseLatLong('40.597578?');
    parseLatLong('N40? 48\' 31.9"');
    parseLatLong('40? 34\' 52.9" N 89? 41\' 39.6" W');
    */


    connectToDatabase();
    var logsNotInDbPath = path.resolve(__dirname, '../logs/not in db/');
    var logsInDbPath = path.resolve(__dirname, '../logs/in db experimental/');
    var files = fs.readdirSync(logsNotInDbPath);
    var moveFiles = true
    files.forEach(filename => {
        addSpreadsheetToDatabase(path.resolve(logsNotInDbPath, filename), function(error) {
            if (error) {
                console.log(path.resolve(logsNotInDbPath, filename));
                console.error(error);
            } else if (moveFiles)
                fs.rename(path.resolve(logsNotInDbPath, filename), path.resolve(logsInDbPath, filename));
        });
    });

    // read from db
    readFromDatabase(10);

    // scenes
    scene = new THREE.Scene(); // scene for boring logs
    scene2 = new THREE.Scene(); // scene for 3d ui

    // set up renderer and add it to DOM
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true
    });
    renderer.autoClear = false;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000);
    controls = new OrbitControls(camera, renderer.domElement);

    // lighting
    var directionalLight = new THREE.DirectionalLight('#ffffff', 0.5);
    directionalLight.position.set(-1, 2, 1);
    scene.add(directionalLight);

    var ambient = new THREE.AmbientLight('#7f7f7f');
    scene.add(ambient);

    update();
}

function update() {
    if (options.showStats)
        stats.begin();

    // render the scene in three.js
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(scene2, camera);

    if (boringLogs != null) {
        boringLogs.forEach(log => {
            if (log.position != null && log.ui != null) {
                var pos = toScreenPosition(log.position);
                log.ui.text.css('left', pos.x + 'px');
                log.ui.text.css('top', pos.y + 'px');
            }
        });
    }

    if (selectedLog != null) {
        //update text
        //Update_SlideOut(selectedLog);
        /*
         var positions2d = [];
         var positions3d = [];

         diagram.cells[selectedLog.siteId].halfedges.forEach(halfEdge => {
             var edge = halfEdge.edge;
             var point1 = new THREE.Vector3(edge.va.x, selectedLog.position.y, edge.va.y);
             var point2 = new THREE.Vector3(edge.vb.x, selectedLog.position.y, edge.vb.y);
             positions3d.push(point1);
             positions3d.push(point2);
             positions2d.push(toScreenPosition(point1));
             positions2d.push(toScreenPosition(point2));
         });

         var pointId = 0;
         var biggestX = positions2d[pointId].x;

         // figure out which point is the furthest right
         for (var i = 1; i < positions2d.length; i++) {
             if (positions2d[i].x > biggestX) {
                 pointId = i;
                 biggestX = positions2d[pointId].x;
             }
         }
        
         selectedLog.soilTypes.forEach(layer => {
             pos = toScreenPosition(positions3d[pointId].clone().add(new THREE.Vector3(0, - (layer.depth + layer.bottom) / 2, 0)));
             layer.ui.text.css('left', pos.x + 'px');
             layer.ui.text.css('top', pos.y + 'px');
         });
         */
    }

    if (options.showStats)
        stats.end();

    // run this function every frame
    requestAnimationFrame(update);
}

// Replace all occurrences of search with replacement in the target string
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function parseLatLong(input) {
    input = input.replaceAll('??', '"'); //TODO: did this get rid of our unicode characters?
    input = input.replaceAll('?', '\'');

    //console.log(input, parseDMS(input));

    return parseDMS(input);
}

function circle(center, radius, segments, color = new THREE.Color(1, 1, 1)) {
    var material = new THREE.LineBasicMaterial({
        color: color
    });
    var geometry = new THREE.CircleGeometry(radius, segments);
    geometry.vertices.shift();

    var line = new THREE.Line(geometry, material);
    scene.add(line);
    line.position.add(center);
    line.rotateX(Math.PI / 2);
    return line;
}

this.$slideOut = $('#slideOut');
$("#slideOut").addClass('showSlideOut');

// Slideout show
this.$slideOut.find('.slideOutTab').on('click', function() {
    $("#slideOut").toggleClass('showSlideOut');
});

//Used to update 'Soil Contains' variables
function Update_SlideOut(log) {
    document.getElementById("Log ID").innerHTML = "<span class='top'><u>Log ID </u>" + log.uniqueId + "</span>";
    document.getElementById("Latitude").innerHTML = "<span class='label'><u>Latitude</u></span><br> " + "<span class='information'>" + log.latitude + "</span>";
    document.getElementById("Latitude_UCS").innerHTML = "<span class='label'><u>Latitude</u></span><br> " + "<span class='information'>" + log.latitude + "</span>";
    document.getElementById("Longitude").innerHTML = "<span class='label'><u>Longitude</u></span><br> " + "<span class='information'>" + log.longitude + "</span><hr>";
    document.getElementById("Longitude_UCS").innerHTML = "<span class='label'><u>Longitude</u></span><br> " + "<span class='information'>" + log.longitude + "</span><hr>";
    document.getElementById("Total Log Depth_UCS").innerHTML = "<span class='label'><u>Total Log Depth</u></span><br> " + "<span class='information'>" + getLogTotalDepth(log) + "</span>";
    document.getElementById("Elevation_UCS").innerHTML = "<span class='label'><u>Elevation</u></span><br>" + "<span class='information'>" + log.elevation + "</span>";
    document.getElementById("Log Information").innerHTML = "";
    document.getElementById("Log Information_UCS").innerHTML = "";
    document.getElementById("Total Log Depth").innerHTML = "<span class='label'><u>Total Log Depth</u></span><br> " + "<span class='information'>" + getLogTotalDepth(log) + "</span>";
    document.getElementById("Elevation").innerHTML = "<span class='label'><u>Elevation</u></span><br>" + "<span class='information'>" + log.elevation + "</span>";
    for (i = 0; i < log.soilTypes.length; i++) {
        //console.log(log.soilTypes[i].color);
        document.getElementById("Log Information").innerHTML += "<div class='box' style='background-color:#" + getLayerColor(log.soilTypes[i]).getHexString() + "'></div><div class='depth'><span class='depth'><u>Depth | </u>" + log.soilTypes[i].depth + "</span></div>";
        document.getElementById("Log Information").innerHTML += "<br><div class='soilInformation'>" + log.soilTypes[i].description + "</div><br>";
    }
    for (i = 0; i < log.samples.length; i++) {
        document.getElementById("Log Information_UCS").innerHTML += "<div class='box' style='background-color:#" +getLayerColorUCS(log.samples[i]).getHexString() + "'></div><div class='depth'><span class='depth'><u>Depth | </u>" + log.samples[i].depth + " ---- UCS | " + log.samples[i].ucs + "</span></div>";
        //document.getElementById("Log Information_UCS").innerHTML += "<br><div class='soilInformation'>" + log.samples[i].ucs + "</div><br>";
    }
}

start();
