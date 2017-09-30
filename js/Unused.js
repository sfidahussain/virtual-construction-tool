function generateMeshesForProject(project) {
    var logsInProject = getBoringLogsByProjectId(project.id);

    logsInProject.forEach(log => {
        log.position = latLongToVector3(project.avgLatitude, project.avgLongitude, log.latitude, log.longitude).add(new THREE.Vector3(0, log.elevation - project.avgElevation, 0));
    });
    // Generate "mask" mesh for CSG operation by combining cylinders
    /*
    var cylinderCsg = null;
    logsInProject.forEach(log => {
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
    */
    // Create mesh for each boring log layer
    logsInProject.forEach(log => {
        var div = $(`<div class="text">${log.uniqueId}</div>`);
        div.hide();
        div.click(function() {
            changeSelectedLog(log);
        });
        $(document.body).append(div);
        log.ui = {
            text: div
        };
        //line(log.position, log.position.clone().add(new THREE.Vector3(0, -getLogTotalDepth(log), 0)), new THREE.Color(0, 0, 0), true);
        /*
        var n = log.voronoiCell.halfedges.length;
        for (var h = 0; h < n; h++) {
            var edge = log.voronoiCell.halfedges[h].edge;
            var p1 = new THREE.Vector3(edge.va.x, log.position.y, edge.va.y);
            var p2 = new THREE.Vector3(edge.vb.x, log.position.y, edge.vb.y);
            var p3 = log.position;
            line(p1, p2);
            line(p1, p3);
            line(p3, p2);
        }
        */
        log.soilTypes.forEach(layer => {
            if (layer.description == null) {
                layer.description = '';
                if (layer.sand)
                    layer.description += 'sand';
                if (layer.silt)
                    layer.description += (layer.description != '' ? ' ' : '') + 'silt';
                if (layer.clay)
                    layer.description += (layer.description != '' ? ' ' : '') + 'clay';
                if (layer.loam)
                    layer.description += (layer.description != '' ? ' ' : '') + 'loam';
            }
            var div = $(`<div class="text">${layer.description}</div>`);
            $(document.body).append(div);
            layer.ui = {
                text: div
            };

            /*
            var geometry = new THREE.Geometry();
            var n = log.voronoiCell.halfedges.length;
            for (var h = 0; h < n; h++) {
                var edge = log.voronoiCell.halfedges[h].edge;
                var nextEdge = log.voronoiCell.halfedges[h + 1 < n ? h + 1 : 0].edge; // wraps around to the start of the array if index is too big
                var prevEdge = log.voronoiCell.halfedges[h - 1 >= 0 ? h - 1 : n - 1].edge; // wraps around to the end of the array if the index is too small

                var flip = edge.va == nextEdge.va || edge.vb == prevEdge.vb;

                var start = log.position.clone().add(new THREE.Vector3(0, -layer.depth, 0));
                var end = log.position.clone().add(new THREE.Vector3(0, -layer.bottom, 0));
                var point1 = new THREE.Vector3(flip ? edge.vb.x : edge.va.x, log.position.y - layer.depth, flip ? edge.vb.y : edge.va.y);
                var point2 = new THREE.Vector3(flip ? edge.va.x : edge.vb.x, log.position.y -layer.depth, flip ? edge.va.y : edge.vb.y);
                var point1bottom = new THREE.Vector3(flip ? edge.vb.x : edge.va.x, log.position.y - layer.bottom, flip ? edge.vb.y : edge.va.y);
                var point2bottom = new THREE.Vector3(flip ? edge.va.x : edge.vb.x, log.position.y - layer.bottom, flip ? edge.va.y : edge.vb.y);

                // top faces
                triangle(geometry, start, point1, point2);

                // side faces
                triangle(geometry, point2bottom, point2, point1);
                triangle(geometry, point1bottom, point2bottom, point1);

                // bottom faces
                triangle(geometry, point2bottom, point1bottom, end);
            }
            var mesh = new THREE.Mesh(geometry);
            */
            var geometry = new THREE.CylinderGeometry(options.circleOfInfluenceRadius, options.circleOfInfluenceRadius, layer.bottom - layer.depth, options.circleOfInfluenceSteps);
            geometry.translate(log.position.x, log.position.y - (layer.depth + (layer.bottom - layer.depth) / 2), log.position.z);
            layer.mesh = new THREE.Mesh(geometry);

            var soilMat = new THREE.MeshPhongMaterial({
                color: getLayerColor(layer)
            });

            layer.mesh.material = soilMat;
            scene.add(layer.mesh);
            layer.mesh.visible = false;

            layer.circle = circle(log.position.clone().add(new THREE.Vector3(0, -layer.depth, 0)), options.circleOfInfluenceRadius, options.circleOfInfluenceSteps, new THREE.Color(0, 0, 0));
            layer.circle.visible = false;
            /*
            var csg = new THREECSG(mesh);
            var result = cylinderCsg.intersect(csg);
            var newMesh = result.toMesh();
            newMesh.material = soilMat;
            scene.add(newMesh);
            */
        });
    });
}



function layer(depth, bottom, color) {
    var extents = 20;
    var geometry = new THREE.BoxGeometry(extents, (bottom - depth) - 0.1, extents);
    var material = new THREE.MeshPhongMaterial({
        color: color,
        shading: THREE.FlatShading,
        overdraw: 0.5,
        shininess: 0
    });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.y = -(depth + (bottom - depth) / 2);
}

function getLayerColorAverage(layer) {
    var average = new THREE.Color(0, 0, 0);
    var numColors = 0;

    if (layer.silt) {
        average.add(siltColor);
        numColors++;
    }
    if (layer.sand) {
        average.add(sandColor);
        numColors++;
    }
    if (layer.clay) {
        average.add(clayColor);
        numColors++;
    }
    if (layer.loam) {
        average.add(loamColor);
        numColors++;
    }

    if (numColors == 0)
        return average;

    return average.multiplyScalar(1 / numColors);
}

/*
 function boringLogs.forEach(callback) {
     for (var log in boringLogs) {
         // skip iteration if the property is from prototype
         if (!boringLogs.hasOwnProperty(log))
             continue;
         
         callback(boringLogs[log]);
     }
 }
*/
// Modifies point such that it lies within or on the circle described by center and radius, returns true if on circle
function constrainToRadius(point, center, radius, alwaysOnCircle = false) {
    if (!alwaysOnCircle)
        var dist = point.distanceTo(center);

    if (alwaysOnCircle || dist > radius) {
        var direction = point.clone().sub(center).normalize();
        direction.multiplyScalar(radius);
        point.copy(center.clone().add(direction));
        return true;
    } else if (dist == radius)
        return true;
    else
        return false;
}

function unique(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

// Hide/Show Mesh
/*this.$btn.find('#btn').on('click', function() {
    scene.traverse( function ( object ) { object.visible = false; } ); // hides mesh
});
*/