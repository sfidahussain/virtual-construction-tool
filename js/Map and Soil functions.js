// globals
var scene, controls, camera, renderer;
var selectedLog, selectedProject;
var origin;
var diagram, bbox;
var stats;
var options;
var connection; // database connection
var boringLogs;
var projects;
var numLithologyQueriesCompleted;
var numLithologyQueriesExpected;
var map;
var boringLogs, projects; // local storage of boring logs and projects
var numLithologyQueriesCompleted, numLithologyQueriesExpected; // used to determine if all the boring logs have been loaded yet
var hex;
var locations;
var maxUcs, minUcs;
var topography;

function initMap() {
    map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: new google.maps.LatLng(40.6936, -89.5890),
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    goToMapView();

    //   $("#btn").hide();

    $("#btn").click(function() {
        if ($('.text').is(':visible')) {         
            goToMapView();
        } else {
            goToSoilView();
        }
    });

    $("#topo_btn").click(function() {
        $("#save_btn").show();
        showTopographicalMesh();
    });
    
    $("#soil_btn").click(function() {
        $("#save_btn").hide();
        showSoilMesh();
    });

    $("#ucs_btn").click(function() {
        $("#save_btn").hide();
        showUCSMesh();
    });

    $("#save_btn").click(function() {
        save("soil.ifc");
    });


    $('#scaleSlider').on('input', function(event) {
        if (boringLogs) {
            boringLogs.forEach(log => {
                scaleMeshes(log, this.value);
            });
        }

        if (topography)
            topography.scale.set(1, this.value, 1);
    });
};

    function goToMapView() {
    $('#map_canvas').height(window.innerHeight);
    $("#btn").text('SHOW SOIL');
    $("#soil_btn").text('SOIL');
    $("#topo_btn").text('TOPO');
    $("#ucs_btn").text('UCS');
    $("#save_btn").text('SAVE');
    $(".text").hide();
    $("#slideOut").hide();
    $("#scaleSlider").hide();
    $("#soil_btn").hide();
    $("#topo_btn").hide();
    $("#ucs_btn").hide();
    $("#save_btn").hide();
};

function goToSoilView() {
    $("#btn").text('HIDE SOIL');
    $("#soil_btn").show();
    $("#topo_btn").show();
    $("#ucs_btn").show();
    $("#save_btn").hide();
    $(".text").show();
    $("#slideOut").show();
    $("#scaleSlider").show();
    $("#map_canvas").animate({
        height:"200px",
    }, 500 );
    setCameraTarget(boringLogs[9]);
    //changeSelectedLog(selectedLog); // show the text elements for only the selected project
};

function toScreenPosition(point) {
    var width = window.innerWidth,
        height = window.innerHeight;
    var widthHalf = width / 2,
        heightHalf = height / 2;

    var pos = point.clone();
    pos.project(camera);
    pos.x = (pos.x * widthHalf) + widthHalf;
    pos.y = -(pos.y * heightHalf) + heightHalf;
    return pos;
};

function changeSelectedLog(newLog) {
    /*
    if (selectedLog) {
        selectedLog.soilTypes.forEach(layer => {
            //log.ui.text.hide();
        });
    } 
    if (newLog) {
        newLog.soilTypes.forEach(layer => {
            if (layer.ui != null)
                layer.ui.text.show();
        });
        */

        $("#slideOut").addClass('showSlideOut');
        Update_SlideOut(newLog);

    selectedLog = newLog;
};

function changeSelectedProject(newProject) {
    if (selectedProject) {
        var logsInSelectedProject = getBoringLogsByProjectId(selectedProject.id);
        logsInSelectedProject.forEach(log => {
            if (log.ui && log.ui.text) {
                log.ui.text.hide();
            }
            log.soilTypes.forEach(layer => {
                if (layer.mesh)
                    layer.mesh.visible = false;
                if (layer.circle)
                    layer.circle.visible = false;
            });
            if (log.debugLines) {
                log.debugLines.forEach(line => {
                    line.visible = false;
                });
            }
        });

        if (logsInSelectedProject.length > 0) {
            var target = logsInSelectedProject[0].position;
            controls.reset();
            controls.target = target;
            camera.position.set(target.x + 500, target.y + 500, target.z + 500);
            camera.lookAt(target);
        } else {
            console.warn(`No logs in project ${logsInSelectedProject.id}`);
        }
    }
    if (newProject) {
        var logsInNewProject = getBoringLogsByProjectId(newProject.id);
        logsInNewProject.forEach(log => {
            if (log.ui && log.ui.text) {
                log.ui.text.show();
            }
            log.soilTypes.forEach(layer => {
                if (layer.mesh)
                    layer.mesh.visible = true;
                if (layer.circle)
                    layer.circle.visible = true;
            });
            if (log.debugLines) {
                log.debugLines.forEach(line => {
                    line.visible = true;
                });
            }
        });
    }

    selectedProject = newProject;
    changeSelectedLog(null);
};
