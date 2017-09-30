//used in generateveroniforeverything()
function createTriangle(geometry, a, b, c) {
    var offset = geometry.vertices.length;

    geometry.vertices.push(
        a, b, c
    );

    geometry.faces.push(new THREE.Face3(offset, offset + 1, offset + 2));
}

//used in generateveroniforeverything()
function getLayerColor(layer) {
    hex = '#ffffff';
    var key = '';
    // generates a key for the colors.json based on the contents of the layer
    if (layer.silt)
        key += 'silt';
    if (layer.clay)
        key += 'clay';
    if (layer.sand)
        key += 'sand';
    if (layer.loam)
        key += 'loam';

    if (key != '')
        hex = colors[key];
    return new THREE.Color(hex);
}

function getLayerColorUCS(layer) {
    var color = new THREE.Color(0, 1, 0);
    color.lerp(new THREE.Color(1, 0, 0), (layer.ucs - minUcs) / (maxUcs - minUcs));
    return color;
}

//used in generateveroniforeverything()
function line(point1, point2, color = new THREE.Color(1, 1, 1), bringToFront = false) {
    var material = new THREE.LineBasicMaterial({
        color: color
    });

    var geometry = new THREE.Geometry();
    geometry.vertices.push(point1);
    geometry.vertices.push(point2);

    var line = new THREE.Line(geometry, material);
    if (bringToFront)
        scene2.add(line);
    else
        scene.add(line);

    return line;
}

//used in generateveroniforeverything()
function getLogTotalDepth(log) {
    if (log.soilTypes.length == 0) {
        console.warn(`Log ${log.uniqueId} has no soil types in array`);
        return 0;
    } else
        return log.soilTypes[log.soilTypes.length - 1].bottom;
}

//used in generateveroniforeverything()
// Returns if two numbers are nearly equal. Default epsilon is 1 inch if the units are feet.
function nearlyEqual(a, b, epsilon = 0.083333) {
    return Math.abs(a - b) <= epsilon;
}

//used in calcangle()
function radiansToDegrees(angle) {
    return angle * (180 / Math.PI);
}
//used in calcdistance() and calcangle()
function degreesToRadians(angle) {
    return angle * (Math.PI / 180);
}

//used in calcdistance()
function metersToFeet(meters) {
    return meters * 3.2808399;
}

//used in generateveroniforeverything()
// return the distance between two latitudes and longitudes in feet
function calcDistance(lat1, long1, lat2, long2) {
    lat1 = degreesToRadians(lat1);
    long1 = degreesToRadians(long1);
    lat2 = degreesToRadians(lat2);
    long2 = degreesToRadians(long2);

    var R = 6371e3; // radius of earth in meters

    var a = Math.sin((lat2 - lat1) / 2) * Math.sin((lat2 - lat1) / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin((long2 - long1) / 2) * Math.sin((long2 - long1) / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = metersToFeet(R * c);
    return d;
}

function setMeshVisibility(topo, soil, ucs) {
    topography.visible = topo;

    boringLogs.forEach(log => {
        log.soilTypes.forEach(layer => {
            if (layer.mesh)
                layer.mesh.visible = soil;
        });
        log.samples.forEach(layer => {
            if (layer.mesh)
                layer.mesh.visible = ucs;
        });
    });
}

function showTopographicalMesh() {
    setMeshVisibility(true, false, false);
}

function showSoilMesh() {
    setMeshVisibility(false, true, false);
}

function showUCSMesh() {
    setMeshVisibility(false, false, true);
}

//used in latLongToVector3()
// return the angle between two latitudes and longitudes in radians (-? to +?)
function calcAngle(lat1, long1, lat2, long2) {
    lat1 = degreesToRadians(lat1);
    long1 = degreesToRadians(long1);
    lat2 = degreesToRadians(lat2);
    long2 = degreesToRadians(long2);

    var y = Math.sin(long2 - long1) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(long2 - long1);
    var angle = Math.atan2(y, x);
    return angle; //(radiansToDegrees(angle) + 360) % 360; // convert angle into degrees (0? to 360?)
}

//used in generateveroniforeverything()
function latLongToVector3(lat1, long1, lat2, long2) {
    var angle = calcAngle(lat1, long1, lat2, long2);
    var dist = calcDistance(lat1, long1, lat2, long2);
    return new THREE.Vector3(dist * Math.cos(angle), 0, dist * Math.sin(angle));
}

// Save a mesh
function save(filename) {
    /*
    var writer = XMLWriter(true);
    writer.startDocument();
    writer.startElement('root');
    writer.writeAttribute('foo', 'value');
    writer.text('Some content');
    writer.endDocument();

    var data = writer.toString();
    
    console.log(boringLogs[0].soilTypes[0].mesh);
    var data =  "ISO-10303-21" + newline +
            "HEADER;" + newline + newline +
            "FILE_SCHEMA(('IFC2X3'));" + newline +
            "ENDSEC;" + newline + newline +
            "DATA;" + newline;
    // mesh data
    var num = 1;
    var startingNum;

    function cartesianPoint(vector) {
        var pointId = num;
        num++;

        data += `#${pointId}= IFCCARTESIANPOINT((` + vector.x + "," + vector.y + "," + vector.z + "));" + newline;
    }

    function face(face) {
        var aId = startingNum + face.a;
        var bId = startingNum + face.b;
        var cId = startingNum + face.c;

        var loopId = num;
        num++;
        var outerBoundId = num;
        num++;
        var faceId = num;
        num++;

        data += `#${loopId}= IFCPOLYLOOP((#${aId},#${bId},#${cId}));` + newline +
        `#${outerBoundId}= IFCFACEOUTERBOUND(#${loopId},.T.);` + newline +
        `#${faceId}= IFCFACE((#${outerBoundId}));` + newline;
    }

    startingNum = num;
    boringLogs[0].soilTypes[0].mesh.geometry.vertices.forEach(cartesianPoint);
    boringLogs[0].soilTypes[0].mesh.geometry.faces.forEach(face);

    data += "ENDSEC;" + newline + newline +
            "END-ISO-10303-21;"
    */
    console.log(topography.geometry);
    var top = fs.readFileSync(path.resolve(__dirname, '../template top.ifc'));
    var bottom = fs.readFileSync(path.resolve(__dirname, '../template bottom.ifc'));
    var data = top + newline;
    var faces = [];
    topography.geometry.faces.forEach(face => {
        var a = face.a + 1;
        var b = face.b + 1;
        var c = face.c + 1;
        faces.push(`(${a},${b},${c})`);
    });

    var points = [];
    topography.geometry.vertices.forEach(vertex => {
        var x = formatIFCNumber(vertex.x);
        var y = formatIFCNumber(-vertex.z);
        var z = formatIFCNumber(vertex.y);
        points.push(`(${x},${y},${z})`);
    });

    data += '#1021= IFCTRIANGULATEDFACESET(#1022,$,.T.,(' + faces.join(',') + '),$);' + newline;
    data += '#1022= IFCCARTESIANPOINTLIST3D((' + points.join(',') + '));' + newline;
    data += bottom;
    fs.writeFileSync(filename, data);
}

function formatIFCNumber(number) {
    var fraction = Math.abs(number % 1);
    if (fraction > 0)
        return number.toString();
    else
        return number.toString() + '.'; 
}

//generates all of the 3D modeling for soil view
function generateVoronoiForEverything() {
    // Calculate average latitude, longitude, and elevation of all boring logs
    var origin = {
        avgLatitude: 0,
        avgLongitude: 0,
        avgElevation: 0
    }

    boringLogs.forEach(log => {
        origin.avgLatitude += log.latitude;
        origin.avgLongitude += log.longitude;
        origin.avgElevation += log.elevation;
    });

    origin.avgLatitude /= boringLogs.length;
    origin.avgLongitude /= boringLogs.length;
    origin.avgElevation /= boringLogs.length;

    // Calculate approximate X,Y,Z of log in feet, relative to the origin point
    boringLogs.forEach(log => {
        log.position = latLongToVector3(origin.avgLatitude, origin.avgLongitude, log.latitude, log.longitude).add(new THREE.Vector3(0, log.elevation - origin.avgElevation, 0));
    });

    // Remove logs that have the same latitude and longitude as other logs
    var uniqueLogs = [];

    for (var i = 0; i < boringLogs.length; i++) {
        var valid = true;
        for (var j = 0; j < uniqueLogs.length; j++) {
            var logA = boringLogs[i];
            var logB = uniqueLogs[j];

            if (logA.uniqueId != logB.uniqueId) {
                if (nearlyEqual(logA.position.x, logB.position.x) && nearlyEqual(logA.position.z, logB.position.z)) {
                    valid = false;
                    // console.warn(`Log ${logA.uniqueId} has the same position as ${logB.uniqueId}, ignoring`);
                    break;
                }
            }
        }

        if (valid)
            uniqueLogs.push(boringLogs[i]);
    }

    boringLogs = uniqueLogs;

    if (options.voronoi) {
        // Compute voronoi diagram of boring log points
        var v = new Voronoi();
        bbox = {
            xl: 0,
            xr: 0,
            yt: 0,
            yb: 0
        }; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
        var sites = [];
        var bboxPadding = options.circleOfInfluenceRadius + 1;

        boringLogs.forEach(log => {
            if (log.position.x < bbox.xl)
                bbox.xl = log.position.x;
            if (log.position.x > bbox.xr)
                bbox.xr = log.position.x;
            if (log.position.z < bbox.yt)
                bbox.yt = log.position.z;
            if (log.position.z > bbox.yb)
                bbox.yb = log.position.z;

            sites.push({
                x: log.position.x,
                y: log.position.z,
                logId: log.uniqueId
            });
        });

        bbox.xl -= bboxPadding;
        bbox.xr += bboxPadding;
        bbox.yt -= bboxPadding;
        bbox.yb += bboxPadding;

        diagram = v.compute(sites, bbox);
        console.log('Generated Voronoi Diagram', diagram);

        // Associate logs with voronoi cells
        diagram.cells.forEach(cell => {
            var log = getBoringLogByUniqueId(cell.site.logId);
            log.voronoiCell = cell;
        });

        /*
         if (options.voronoiCSG) {
         var cylinderCsg = null;
         boringLogs.forEach(log => {
         var geometry = new THREE.CylinderGeometry(options.circleOfInfluenceRadius, options.circleOfInfluenceRadius, 1000, options.circleOfInfluenceSteps);
         geometry.translate(log.position.x, log.position.y, log.position.z);
         var cylinder = new THREE.Mesh(geometry);
         
         if (cylinderCsg == null)
         cylinderCsg = new THREECSG(cylinder);
         else {
         var csg = new THREECSG(cylinder);
         cylinderCsg = cylinderCsg.union(csg);
         }
         });
         
         console.log('Generated CSG Mask');
         }
         */
    }

    // Calculate lowest and highest points
    if (boringLogs.length > 0) {
        minUcs = Infinity;
        maxUcs = 0;

        boringLogs.forEach(log => {
            log.samples.forEach(sample => {
                if (isValid(sample.ucs)) {
                    if (sample.ucs < minUcs)
                        minUcs = sample.ucs;
                    if (sample.ucs > maxUcs)
                        maxUcs = sample.ucs;
                }
            });
        });

        console.log(`min UCS = ${minUcs}`, `max UCS = ${maxUcs}`)

        var lowestElevation = boringLogs[0].elevation - getLogTotalDepth(boringLogs[0]);
        //var highestElevation = boringLogs[0].elevation;
        
        for (l = 1; l < boringLogs.length; l++) {
            var low = boringLogs[l].elevation - getLogTotalDepth(boringLogs[l]);
            //var high = boringLogs[l].elevation;

            if (low < lowestElevation)
                lowestElevation = low;
            //if (high > highestElevation)
            //    highestElevation = high;
        }

        var bedrockEnd = lowestElevation - 1000;

        boringLogs.forEach(log => {
            log.soilTypes.push({
                depth: getLogTotalDepth(log),
                bottom: log.elevation - bedrockEnd,
                description: 'Bedrock',
                silt: false,
                clay: false,
                loam: false,
                sand: false
            })
        });
    }

    // Draw voronoi diagram in 3d
    boringLogs.forEach(log => {

        var div = $(`<div class="text">${log.uniqueId}</div>`);
        div.hide();
        div.click(function() {
            changeSelectedLog(log);
            setCameraTarget(log);
        });
        $(document.body).append(div);
        log.ui = {
            text: div
        };

        log.group = new THREE.Group();
        scene.add(log.group);

        if (options.voronoi) {
            /*
             var r = 10;
             var h = 100;
             var geometry = new THREE.CylinderGeometry(r, r, h, 32);
             geometry.translate(log.position.x, log.position.y + h / 2, log.position.z);
             var mesh = new THREE.Mesh(geometry);
             mesh.material = new THREE.MeshBasicMaterial({
             color: new THREE.Color(1, 0, 0)
             })
             scene.add(mesh);
             */
            var n = log.voronoiCell.halfedges.length;
            var edges = [];

            // Sort edges so that they create triangles that face upwards (+Y axis)
            for (var h = 0; h < n; h++) {
                var edge = log.voronoiCell.halfedges[h].edge;
                var p1 = new THREE.Vector3(edge.va.x, log.position.y, edge.va.y);
                var p2 = new THREE.Vector3(edge.vb.x, log.position.y, edge.vb.y);
                var p3 = log.position;
                var constraints = 0;
                /*
                 if (options.voronoiCSG) {
                 if (constrainToRadius(p1, p3, options.circleOfInfluenceRadius))
                 constraints++;
                 if (constrainToRadius(p2, p3, options.circleOfInfluenceRadius))
                 constraints++;
                 }
                 */
                // Calculate triangle normal
                var triangle = new THREE.Triangle(p1, p2, p3);
                var normal = triangle.normal();

                var start = normal.y > 0 ? p1 : p2;
                var end = normal.y > 0 ? p2 : p1;

                //line(start, end, new THREE.Color(0, 0, 0), true);
                /*
                if (constraints == 2) {
                    var steps = options.circleOfInfluenceSteps;
                    for (s = 0; s < steps; s++) {
                        var start2 = start.clone().lerp(end, s / steps);
                        var end2 = start.clone().lerp(end, (s + 1) / steps);

                        constrainToRadius(start2, p3, options.circleOfInfluenceRadius, true);
                        constrainToRadius(end2, p3, options.circleOfInfluenceRadius, true);

                        edges.push({
                            start: start2,
                            end: end2
                        })
                    }
                } else {
                    */
                edges.push({
                    start: start,
                    end: end
                });
                //}
            }
        }



        createLayerMeshes(log, log.soilTypes, edges, getLayerColor);
        createLayerMeshes(log, log.samples, edges, getLayerColorUCS);

        scaleMeshes(log, $('#scaleSlider')[0].value);
    });

    createTopographicalMesh();
    
    showSoilMesh();

    console.log('Generated Mesh');
}

function isOnBoundingBox(x, y) {
    return (x == bbox.xl || x == bbox.xr || y == bbox.yt || y == bbox.yb);
}

function createTopographicalMesh() {
    var vertices = [];
    var positions = [];
    
    // Add boundary box edge points from voronoi diagram
    diagram.edges.forEach(edge => {
        if (!edge.rSite && edge.lSite) {
            var point = [edge.va.x, edge.va.y];
            vertices.push(point);
            positions.push(new THREE.Vector3(edge.va.x, 0, edge.va.y));
        }
    });
    
    // Add log points
    boringLogs.forEach(log => {
        var point = [log.position.x, log.position.z];
        vertices.push(point);
        positions.push(log.position);
    });

    var triangulation = Delaunay.triangulate(vertices);

    var geometry = new THREE.Geometry();

    for (var i = 0; i < triangulation.length; i += 3) {
        var a = triangulation[i];
        var b = triangulation[i + 1];
        var c = triangulation[i + 2];
        createTriangle(geometry, positions[a], positions[b], positions[c]);
    }

    geometry.computeFaceNormals(); // used for lighting

    topography = new THREE.Mesh(geometry);
    topography.material = new THREE.MeshPhongMaterial({
        color: '#376319'
    });
    scene.add(topography);
    topography.scale.set(1, $('#scaleSlider')[0].value, 1);
    /*
    var geometry = new THREE.Geometry();

    diagram.edges.forEach(edge => {
        if (edge.rSite && edge.lSite) {
            var log1 = getBoringLogByUniqueId(edge.rSite.logId);
            var log2 = getBoringLogByUniqueId(edge.lSite.logId);
            var p1 = log1.position;
            var p2 = log2.position;
            line(p1, p2, new THREE.Color(1, 0, 0), true);
        } else if (edge.lSite) {
            var log1 = getBoringLogByUniqueId(edge.lSite.logId);
            var p1 = new THREE.Vector3(edge.va.x, 0, edge.va.y);
            var p2 = new THREE.Vector3(edge.vb.x, 0, edge.vb.y);
            var p3 = log1.position;
            line(p1, p2, new THREE.Color(0, 0, 1), true);
            line(p2, p3, new THREE.Color(0, 0, 1), true);
            line(p3, p1, new THREE.Color(0, 0, 1), true);

            var triangle = new THREE.Triangle(p1, p2, p3);
            var normal = triangle.normal();

            // If the triangle faces up, make it, otherwise flip it and make it
            if (normal.y > 0)
                createTriangle(geometry, p1, p2, p3);
            else
                createTriangle(geometry, p1, p3, p2);
        }
    });

    geometry.computeFaceNormals(); // used for lighting

    var mesh = new THREE.Mesh(geometry);
    mesh.material = new THREE.MeshPhongMaterial({
        color: '#376319'
    });
    scene.add(mesh);
    */
}

function createLayerMeshes(log, layers, edges, colorCallback) {
    for (var l = 0; l < layers.length; l++) {
        var prevLayer = l - 1 >= 0 ? layers[l - 1] : null;
        var layer = layers[l];
        var nextLayer = l + 1 <= layers.length - 1 ? layers[l + 1] : null;

        var material = new THREE.MeshPhongMaterial({
            color: colorCallback(layer)
        });

        if (options.voronoi && edges) {
            var geometry = new THREE.Geometry();
            var topOffset = new THREE.Vector3(0, -layer.depth, 0);
            var bottomOffset = new THREE.Vector3(0, -layer.bottom, 0);

            edges.forEach(edge => {
                var p1t = edge.start.clone().add(topOffset);
                var p2t = edge.end.clone().add(topOffset);
                var p3t = log.position.clone().add(topOffset);

                var p1b = edge.start.clone().add(bottomOffset);
                var p2b = edge.end.clone().add(bottomOffset);
                var p3b = log.position.clone().add(bottomOffset);

                // Top face
                if (prevLayer == null || prevLayer.bottom != layer.depth)
                    createTriangle(geometry, p1t, p2t, p3t);

                // Side faces
                createTriangle(geometry, p1t, p2b, p2t);
                createTriangle(geometry, p1t, p1b, p2b);

                // Bottom face
                if (nextLayer == null || nextLayer.depth != layer.bottom)
                    createTriangle(geometry, p2b, p1b, p3b);
            });

            geometry.computeFaceNormals();
        } else {
            var r = options.circleOfInfluenceRadius;
            var segments = options.circleOfInfluenceSteps;
            var openEnded = true;

            if ((prevLayer == null || prevLayer.bottom != layer.depth) || (nextLayer == null || nextLayer.depth != layer.bottom))
                openEnded = false;

            var geometry = new THREE.CylinderGeometry(r, r, layer.bottom - layer.depth, segments, 1, openEnded);
            geometry.translate(log.position.x, log.position.y - (layer.depth + (layer.bottom - layer.depth) / 2), log.position.z);
        }

        layer.mesh = new THREE.Mesh(geometry);
        layer.mesh.material = material;
        log.group.add(layer.mesh);
    }
}

function connectToDatabase() {
    connection = mysql.createConnection({
        host: options.databaseHost,
        user: options.databaseUser,
        password: options.databasePassword,
        database: options.databaseName
    });

    connection.connect(function(err) {
        if (err) {
            console.error('error connecting to db: ' + err.stack);
            return;
        }

        console.log('connected to db as id ' + connection.threadId);
    });
};

function addSpreadsheetToDatabase(filename, callback) {
    // Parse the spreadsheet into an array of worksheets
    var data = xlsx.parse(filename);

    // Separate the data into 2d arrays
    var projectTable, pointTable, lithologyTable, sampleTable;
    data.forEach(table => {
        switch (table.name.toUpperCase()) {
            case 'PROJECT':
                projectTable = table.data;
                break;
            case 'POINT':
                pointTable = table.data;
                break;
            case 'LITHOLOGY':
                lithologyTable = table.data;
                break;
            case 'SAMPLE':
                sampleTable = table.data;
                break;
            default:
                //    console.warn('Ignored table ' + table.name);
                break;
        }
    });

    // Project Table Insert Query
    if (projectTable.length != 2) {
        console.warn(`PROJECT table has ${projectTable.length} rows instead of 2 rows`);
        return;
    }

    var projectData = [
        ['FileName'],
        [path.basename(filename)]
    ];

    for (var c = 0; c < projectTable[0].length; c++) {
        switch (projectTable[0][c]) {
            case 'County':
            case 'Coeff_of_Consol_Factor':
            case 'Project_Location':
                projectData[0].push(projectTable[0][c]);
                projectData[1].push(handleNull(projectTable[1][c]));
                break;
        }
    }

    var projectColumn;
    projectColumn = projectData.splice(0, 1);

    // Point Table Insert Query
    var pointData = [
        ['ProjectID'],
    ];

    for (var r = 1; r < pointTable.length; r++)
        pointData.push([null]);

    for (var c = 0; c < pointTable[0].length; c++) {
        switch (pointTable[0][c]) {
            case 'Water_Depth_First':
            case 'Water_Depth_Comp':
            case 'Elevation':
            case 'HoleDepth':
                pointData[0].push(pointTable[0][c]);
                for (var r = 1; r < pointTable.length; r++)
                    pointData[r].push(handleNumber(pointTable[r][c]));
                break;
            case 'Date':
                pointData[0].push(pointTable[0][c]);
                for (var r = 1; r < pointTable.length; r++)
                    pointData[r].push(handleDate(pointTable[r][c]));
                break;
            case 'Latitude':
            case 'Longitude':
                pointData[0].push(pointTable[0][c]);
                for (var r = 1; r < pointTable.length; r++)
                    pointData[r].push(handleLatOrLong(pointTable[r][c]));
                break;
            case 'PointID':
            case 'Location':
            case 'Boring_Type':
                pointData[0].push(pointTable[0][c]);
                for (var r = 1; r < pointTable.length; r++)
                    pointData[r].push(handleNull(pointTable[r][c]));
        }
    }

    var pointColumn;
    pointColumn = pointData.splice(0, 1);

    // Lithology Table Insert Query
    var lithologyPointIDColumnIndex;
    var lithologyData = [];

    for (var r = 0; r < lithologyTable.length; r++)
        lithologyData.push([]);

    for (var c = 0; c < lithologyTable[0].length; c++) {
        switch (lithologyTable[0][c]) {
            case 'PointID':
                lithologyPointIDColumnIndex = c;
                lithologyData[0].push('Unique_Point_ID');
                for (var r = 1; r < lithologyTable.length; r++)
                    lithologyData[r].push(handleNull(lithologyTable[r][c]));
                break;
            case 'Description':
            case 'Depth':
            case 'Bottom':
                lithologyData[0].push(lithologyTable[0][c]);
                for (var r = 1; r < lithologyTable.length; r++)
                    lithologyData[r].push(handleNull(lithologyTable[r][c]));
                break;
        }
    }

    var lithologyColumn;
    lithologyColumn = lithologyData.splice(0, 1);

    // Sample Table Insert Query
    var samplePointIDColumnIndex;
    var sampleData = [];

    for (var r = 0; r < sampleTable.length; r++)
        sampleData.push([]);

    for (var c = 0; c < sampleTable[0].length; c++) {
        switch (sampleTable[0][c]) {
            case 'PointID':
                samplePointIDColumnIndex = c;
                sampleData[0].push('Unique_Point_ID');
                for (var r = 1; r < sampleTable.length; r++)
                    sampleData[r].push(handleNull(sampleTable[r][c]));
                break;
            case 'Qu':
            case 'Moisture':
            case 'Depth':
            case 'Length':
            case 'Blows_2nd_6in':
            case 'Blows_3rd_6in':
                sampleData[0].push(sampleTable[0][c]);
                for (var r = 1; r < sampleTable.length; r++)
                    sampleData[r].push(handleNumber(sampleTable[r][c]));
                break;
        }
    }

    var sampleColumn;
    sampleColumn = sampleData.splice(0, 1);

    var projectQuery = connection.query('INSERT INTO project (??) VALUES ?', [projectColumn, projectData], function(error, result, fields) {
        if (error) {
            console.log(projectQuery.sql);
            callback(error);
        } else {
            // fill first column with project id foreign key
            var projectId = result.insertId;
            for (var r = 0; r < pointData.length; r++)
                pointData[r][0] = projectId;

            var pointQuery = connection.query('INSERT INTO point (??) VALUES ?', [pointColumn, pointData], function(error, result, fields) {
                if (error) {
                    console.log(pointQuery.sql);
                    callback(error);
                } else {
                    // get a list of pointId/projectId pairs so we can look up what the correct unique point id is
                    var idQuery = connection.query('SELECT PointID, Unique_Point_ID FROM point WHERE ProjectID = ?', [projectId], function(error, idQueryResults, fields) {
                        // Make a map of pointIds to uniquePointIds so we can easily translate them
                        var pointIdToUniquePointId = {};
                        idQueryResults.forEach(result => {
                            pointIdToUniquePointId[result.PointID.toString()] = result.Unique_Point_ID;
                        });

                        // Fill first column of data with uniquePointId foreign key
                        for (var r = 0; r < lithologyData.length; r++) {
                            var pointId = lithologyData[r][lithologyPointIDColumnIndex];
                            lithologyData[r][lithologyPointIDColumnIndex] = pointIdToUniquePointId[pointId];
                        }
                        var lithologyQuery = connection.query('INSERT INTO lithology (??) VALUES ?', [lithologyColumn, lithologyData], function(error, result, fields) {
                            if (error) {
                                console.log(lithologyQuery.sql);
                                callback(error);
                            } else {
                                // Fill first column of data with uniquePointId foreign key
                                for (var r = 0; r < sampleData.length; r++) {
                                    var pointId = sampleData[r][samplePointIDColumnIndex];
                                    sampleData[r][samplePointIDColumnIndex] = pointIdToUniquePointId[pointId];
                                }
                                var sampleQuery = connection.query('INSERT INTO sample (??) VALUES ?', [sampleColumn, sampleData], function(error, result, fields) {
                                    if (error) {
                                        console.log(sampleQuery.sql);
                                        callback(error);
                                    } else {
                                        callback(null);
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }
    });
};




//used in readfromdatabase()
function setCameraTarget(boringLog) {
    //controls.reset();
    var dist = 1000;
    camera.position.set(boringLog.position.x + dist, boringLog.position.y + dist, boringLog.position.z + dist);
    controls.target.copy(boringLog.position); // set the controls target (what it rotates around) to the boring log position
    controls.update();
}


//used in readfromdatabase()
function tryGeneratingMeshes() {
    numLithologyQueriesCompleted++;
    var percent = (numLithologyQueriesCompleted / numLithologyQueriesExpected) * 100;
    //printProgress(percent);
    if (numLithologyQueriesCompleted == numLithologyQueriesExpected) {
        //console.log("Projects:", projects);
        //console.log("Boring Logs:", boringLogs);
        generateVoronoiForEverything();
        /*
        projects.forEach(project => {
        generateMeshesForProject(project);
        });
        */
    }
}

function printProgress(progress) {
    console.log(progress.toFixed(2) + '%');
}

//used in readfromdatabase() and generateveroniforeverything()
function getBoringLogByUniqueId(uniqueId) {
    return boringLogs.find(log => {
        return log.uniqueId == uniqueId;
    });
}


function readFromDatabase(limit) {
    var limitStr = '';
    if (limit)
        limitStr = ' LIMIT ' + limit;

    var mapQuery = connection.query('SELECT ProjectID, AVG(Latitude) as Latitude, AVG(Longitude) as Longitude, AVG(Elevation) as Elevation FROM point WHERE Latitude IS NOT NULL AND Longitude IS NOT NULL AND Elevation IS NOT NULL GROUP BY (ProjectID)' + limitStr, function(error, mapResults, fields) {
        if (error) throw error;
        else {
            projects = [];

            // push stuff into projects var
            mapResults.forEach(mapResult => {
                projects.push({
                    id: mapResult.ProjectID,
                    avgLatitude: mapResult.Latitude,
                    avgLongitude: mapResult.Longitude,
                    avgElevation: mapResult.Elevation
                })
            });
            /*
             for (i = 0; i < projects.length; i++) {
             marker = new google.maps.Marker({
             position: new google.maps.LatLng(projects[i].avgLatitude, projects[i].avgLongitude),
             project: projects[i],
             map: map,
             //animation: google.maps.Animation.BOUNCE,
             });
             
             marker.addListener('click', function() {
             changeSelectedProject(this.project);
             goToSoilView();
             });
             }
             */
        }

        var pointQuery = connection.query('SELECT * FROM point WHERE Latitude IS NOT NULL AND Longitude IS NOT NULL AND Elevation IS NOT NULL' + limitStr, function(error, results, fields) {
            if (error) throw error;
            else {
                boringLogs = [];
                locations = [];
                numLithologyQueriesCompleted = 0;
                numLithologyQueriesExpected = results.length;

                results.forEach(result => {
                    var log = {
                        projectId: result.ProjectID,
                        uniqueId: result.Unique_Point_ID,
                        elevation: result.Elevation,
                        latitude: result.Latitude,
                        longitude: result.Longitude,
                        soilTypes: [],
                        samples: []
                    };

                    // Query the database for lithology and sample data
                    populateLogLithologyAndSample(log);

                    boringLogs.push(log);

                    locations.push({
                        lat: result.Latitude,
                        lng: result.Longitude
                    });
            });


                // Add markers to map
                var markers = locations.map(function(location, i) {
                    return new google.maps.Marker({
                        position: location,
                        label: results[i].Unique_Point_ID.toString(),
                        log: boringLogs[i]
                    });
                });
                markers.forEach(marker => {
                    marker.addListener('click', function() {
                        goToSoilView();                      
                        console.log('viewing ' + this.log.uniqueId);
                        console.log(this.position);
                        changeSelectedLog(this.log);
                        setCameraTarget(this.log);
                    })
                });

                var markerCluster = new MarkerClusterer(map, markers, {
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
                });
            }
        });
    });
};

function populateLogLithologyAndSample(log) {
    var lithologyQuery = connection.query('SELECT * FROM lithology WHERE Unique_Point_ID = ? ;', log.uniqueId, function(error, results, fields) {
        if (error) throw error;
        else {
            results.forEach(result => {
                var silt, clay, loam, sand;

                if (result.Description != null && result.Bottom != null) {
                    var description = result.Description.toLowerCase();
                    silt = description.includes("silt");
                    clay = description.includes("clay");
                    loam = description.includes("loam");
                    sand = description.includes("sand");

                    log.soilTypes.push({
                        depth: (result.Depth == null ? 0 : result.Depth),
                        bottom: result.Bottom,
                        description: result.Description,
                        silt: silt,
                        clay: clay,
                        loam: loam,
                        sand: sand
                    });

                }
            });

            tryGeneratingMeshes();
        }
    });

    var sampleQuery = connection.query('SELECT * FROM sample WHERE Unique_Point_ID = ? ;', log.uniqueId, function(error, results, fields) {
        if (error) throw error;
        else {
            results.forEach(result => {
                //console.log(result);
                if (isValid(result.Qu)) {
                    log.samples.push({
                        depth: result.Depth,
                        length: result.Length,
                        bottom: result.Depth + result.Length,
                        ucs: result.Qu
                    });
                }
            });
        }
    });
}

// scales the size of the meshes with input from a UI element eventually, right now it just takes an int/float
function scaleMeshes(log, scalarValue) {
    if (log.group)
        log.group.scale.set(1, scalarValue, 1);
    /*
    scene.traverse(function(node) {
        if (node instanceof THREE.Mesh) {
            node.scale.set(scalarValue, scalarValue, ScalarValue);
        }
    });
    */
}

// returns true if a value is not null and is not undefined
function isValid(value) {
    return !(value == null);
}
