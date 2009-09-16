/*****************************************************************************
 * Copyright (C) 2008, 2009 Bauke Conijn, Adriaan Tichler
 *
 * This is free software; you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 3 of the License, or (at your option) any later
 * version.
 *
 * This is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Public License for more details
 *
 * To obtain a copy of the GNU General Public License, please see
 * <http://www.gnu.org.licenses/>
 *****************************************************************************/

/****************************************
 * LINES (and circles)
 * [actually just MAP]
 ****************************************/

Feature.create("Map",new Error().lineNumber-22);

Map.s.enabled.description="Enable map enhacements";
Map.init=function(){
    Map.setting("remove_nav_pad", false, Settings.type.bool,undefined, "Remove the movemente joypad.");
    Map.setting("remove_border_buttons", true, Settings.type.bool,undefined, "Remove buttons at the border of the map.");
    Map.setting("remove_sectors", true, Settings.type.bool,undefined, "Remove the sector numbers at the top and right border of the map. Note that this numbering is not updated when dragging the map. Use the new-grid instead.");
    Map.setting("enable_dragging", true, Settings.type.bool,undefined, "Allow the map to be dragged. Note that this calls functions through GreaseMonkey's unsafeWindow.");
    Map.setting("enable_new_grid", true, Settings.type.bool,undefined, "Adds a grid to the map, to replace the original sector numbers. This grid is more accurate than the original sector numbering and works well with dragging enabled.");
    Map.setting("system_metadata", true, Settings.type.bool,undefined, "Add some extra data around a planet, like resources available on asteroids or debris.");
    Map.setting("rewire_send_troops", true, Settings.type.bool,undefined, "When clicking on a send troops button, the form is inserted into the page.");
    /*Map.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");*/
    /*Map.setting("categories", { /* <tag>: [ <color> , <drawline> ], * /
            none: ["",false], // ie. remove from 'locations'.
                owned: ["rgba(192,128,0,1.0)", true],
                ally: ["rgba(0,0,255,0.5)", true],
                allies: ["rgba(0,255,0,0.5)", true],
                naps: ["rgba(0,255,255,0.5)", false],
                enemies: ["rgba(255,0,0,0.5)", true],
                extra: ["rgba(128,128,128,1)", true],
                farms: ["rgba(255,255,255,1)", true],
                ban: ["rgba(0,0,0,0.5)", false],
                other: ["rgba(255,0,255,0.5)", true]
                }, Settings.type.object, undefined, "The different types of categories. The order of this list defines the order in which they are listed and drawn.");
    Map.setting("locations", {}, Settings.type.object, undefined, "List of special locations.");*/
    // A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
    // name is optional.
};

// Draws a line to the specified location
Map.touch=function(location) {
    var x = location[0]-Map.posx;
    var y = location[1]-Map.posy;
    if (x<-400) x+=800;
    if (x> 400) x-=800;
    if (y<-400) y+=800;
    if (y> 400) y-=800;
    var px = 1.83*(x+y)*20;
    var py = 1.00*(x-y)*20;
    px += py/50;

    // Get the location's category
    var category=Map.categories[location[2]];
    // Get the drawing context
    var g = Map.context;
    g.strokeStyle=category[0];
    if (category[1]) { // Draw lines only if enabled for category.
        g.beginPath();
        var px2 = px * Map.scale;
        var py2 = py * Map.scale;
        g.moveTo(px2,py2);
        g.lineTo(px,py);
        g.stroke();
        if (x!=0 || y!=0)
            g.fillRect(px2-2,py2-2,4,4);
    }

    // Always draw circle (when on map)
    if (x>=-3 && x<=3 && y>=-3 && y<=3) {
        if (x==0 && y==0)
            g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(px+20,py);
        g.arc(px,py,20,0,Math.PI*2,true);
        g.stroke();
        if (x==0 && y==0)
            g.lineWidth = 1;
    }
};
Map.text=function(s,x,y,clear) {
  var g = Map.context;
  g.save();
  var w=g.mozMeasureText(s);
  g.translate(x-w/2-1,y+4);
  if (clear) g.clearRect(-2,-10,w+4,12);
  g.mozDrawText(s);
  g.restore();
};
Map.res_x=0;
Map.res_y=0;
Map.draw_resource=function(stamp,amount) {
  if (amount<=0) return;
  var g = Map.context;
  var w = g.mozMeasureText(amount);
  Map.res_x+=w+10;
  if (Map.res_x>Map.quadrantWidth) {
    g.restore();
    g.translate(0,8);
    g.save();
    g.translate(16,0);
    g.fillStyle="lightgray";
    Map.res_x=w+26;
  }
  try{ // unfortunately the following line sometimes likes to throw an error.
    g.drawImage(stamp,2,-8,10,10); 
  }catch(e){}
  g.translate(10,0);
  g.mozDrawText(amount);
  g.translate(w,0);
};
Map.draw_object=function(name,r1,r2,r3) {
  var g = Map.context;
  g.save();
  g.mozDrawText(name);
  var w=g.mozMeasureText(name);
  Map.res_x=w;
  g.translate(w,0);
  if (r1==0 && r2==0 && r3==0) {
    g.fillStyle="gray";
    g.mozDrawText("[empty]");
  } else {
    g.fillStyle="lightgray";
    Map.draw_resource(Images.metal.stamp(),r1);
    Map.draw_resource(Images.crystal.stamp(),r2);
    Map.draw_resource(Images.hydrogen.stamp(),r3);
  }
  g.restore();
  g.translate(0,8);
};
Map.update=function() {
    if (!Map.canvas) return; // Check if canvas is enabled.

    // Due to the many ways the grid can require an update, we just look if an update is necessary.
    // (Especially keyup is a problem)
    setTimeout(Map.update,500);

    // Don't do an update when it's not necessary.
    try {
        var pos = Map.unsafeMap.center;
        if (Map.posx == pos.x && Map.posy == pos.y) return;
        Map.posx = pos.x - 0;
        Map.posy = pos.y - 0;
    } catch (e) {
        Map.exception("Map.update", e);
    }

    Map.canvas.css({
      left: (100*(Map.posx-Map.center.x)*Map.quadrantWidth /Map.map.width() )-100+"%",
      top:  (100*(Map.posy-Map.center.y)*Map.quadrantHeight/Map.map.height())-100+"%"
    });

    // Get the drawing context
    var g = Map.context;

    // Clear map
    g.clearRect(0,0,Map.canvas.width(),Map.canvas.height());
    g.save();
    
    if(Map.enable_new_grid) {
      g.fillStyle="cyan";
      g.strokeStyle="green";
      g.mozTextStyle = "8pt Monospace";
      for (var ix=1; ix<21; ix++) {
          g.beginPath();
          var px = ix*Map.quadrantWidth ;
          g.moveTo(px,0);
          g.lineTo(px,Map.canvas.height());
          g.stroke();
      }
      for (var iy=1; iy<15; iy++) {
          g.beginPath();
          var py = iy*Map.quadrantHeight;
          g.moveTo(0,py);
          g.lineTo(Map.canvas.width(),py);
          g.stroke();
          py=(iy+0.5)*Map.quadrantHeight;
          var ps=iy-7+Map.posy+"";
          var px=-Map.posx%5;
          for (var i=0; i<25; i+=5)
            Map.text(ps,(px+i)*Map.quadrantWidth,py,true);
      }
      for (var ix=1; ix<21; ix++) {
          var px = (ix+0.5)*Map.quadrantWidth;
          var ps=ix-10+Map.posx+"";
          var py=-Map.posy%5-2;
          for (var i=0; i<20; i+=5)
            Map.text(ps,px,(py+i)*Map.quadrantHeight,true);
      }
    }
    
    if (Map.system_metadata) {
      g.mozTextStyle = "6pt Monospace";
      for (id in unsafeWindow.mapData) {
        var pos = unsafeWindow.config.generator.getCoordsBySystemId(id);
        var px = (pos.x-Map.posx+10)*Map.quadrantWidth+1;
        var py = (pos.y-Map.posy+7)*Map.quadrantHeight+10;
        g.save();
        try {
          g.translate(px,py);
          var system=unsafeWindow.mapData[id];
          g.fillStyle="red";
          for (var i in system.comets) {
            var comet=system.comets[i];
            if (!comet.id) continue;
            Map.draw_object(comet.name,comet.r1,comet.r2,comet.r3);
          }
          g.fillStyle="yellow";
          for (var i in system.debris) {
            var debris=system.debris[i];
            if (!debris.planet_id) continue;
            Map.draw_object(system.planets[debris.planet_id].planet_name,debris.r1,debris.r2,0);
          }
          g.fillStyle="cyan";
          for (var i in system.asteroids) {
            var asteroid=system.asteroids[i];
            if (!asteroid.id) continue;
            Map.draw_object("["+asteroid.id+"]",asteroid.r1,asteroid.r2,asteroid.r3);
          }
        } catch (e) {
          Map.exception("Map.update() [metadata]",e);
        }
        g.restore();
      }
    }

    // Make sure the locations variable is up to date
    //Map.s.locations.read();

    // Draw lines
    //for (var l in Map.locations) {
    //  Map.touch(Map.locations[l]);
    //}

    // Reset render context
    g.restore();
}
// The event listener (used by tag_tool)
Map.tag_change=function(e) {
    Map.s.locations.read();
    var cat = e.target.value;
    var l = Map.posx+","+Map.posy;
    if (cat=="none") {
        delete Map.locations[l];
    } else {
        Map.locations[l]=[Map.posx,Map.posy,cat,Map.village_name];
    }
    Map.s.locations.write();
};
// add a "this location is special!" button to the map's village view. (if applicable)
Map.tag_tool=function() {
    if (location.href.indexOf("karte.php?d=")<=0) return;
    var x = document.evaluate( "//div[@id='content']/h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
    if (!x) return;
    var loc = x.textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
    var cat=Map.locations[loc[1]+","+loc[2]];
    cat=(cat==undefined)?cat="none":cat[2];

    var select=document.createElement("select");
    for (var c in Map.categories) {
        var opt=document.createElement("option");
        opt.value=c;
        if (c==cat) opt.selected=true;
        opt.innerHTML=c;
        select.appendChild(opt);
    }
    Map.posx=loc[1]-0;
    Map.posy=loc[2]-0;
    Map.village_name=x.firstChild.textContent;
    select.addEventListener('change',Map.tag_change,false);
    x.appendChild(select);
    x.parentNode.style.zIndex=5; // Otherwise it might end up under the "(Capital)" text element.
};

//=== Dragging ===
Map.next_move=0;
Map.mouse_distance=0;
Map.mousedown=function(e) {
  if ($("#mapSystem").css("visibility")=="visible") return; // Don't allow dragging when zoomed in to a solarsystem
  Map.start_x=e.screenX;
  Map.start_y=e.screenY;
  Map.mouse_distance=0;
  $("body").get(0).addEventListener("mousemove",Map.mousemove,false); // jquery's unbind did not work.
};
Map.is_dirty=false; // This is set when the previous update_systems did an update (and still might need to do another update).
Map.update_systems=function(pos) {
  var ix=Math.round(pos.left/Map.quadrantWidth );
  var iy=Math.round(pos.top /Map.quadrantHeight);
  try{
    Map.is_dirty=true;
    // imperion's scripts can't handle updates when requesting data. 
    // This following variable is set and cleared by the patch.
    if (!unsafeWindow.requesting_map_data) { 
      var targetx=Map.center.x-ix;
      var targety=Map.center.y-iy;
      var temp=Map.unsafeMap.fx.start;
      Map.unsafeMap.fx.start=nothing;
      /**/ if (Map.unsafeMap.center.x > targetx) { Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_LEFT ); }
      else if (Map.unsafeMap.center.x < targetx) { Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_RIGHT); }
      else if (Map.unsafeMap.center.y > targety) { Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_UP   ); }
      else if (Map.unsafeMap.center.y < targety) { Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_DOWN ); }
      else Map.is_dirty=false;
      Map.unsafeMap.fx.start=temp;
      Map.unsafeMap.positionLeft = (Map.center.x-Map.unsafeMap.center.x)*Map.quadrantWidth;
      Map.unsafeMap.positionTop  = (Map.center.y-Map.unsafeMap.center.y)*Map.quadrantHeight;
    }
  }catch(e){
    Map.exception("Map.update_systems",e);
  }
}
Map.mousemove=function(e) {
  var t=new Date().getTime();
  if (t<Map.next_move) return;
  Map.next_move=t+50; // mousemove events that happen whithin 50 ms of a previous one are dropped, to increase performance.

  var dx = -(e.screenX-Map.start_x);
  var dy = -(e.screenY-Map.start_y);
  if (Map.mouse_distance<15) {
    Map.mouse_distance=Math.sqrt(dx*dx+dy*dy);
    return; // Ignore small movements.
  }
  Map.start_x=e.screenX;
  Map.start_y=e.screenY;

  var map = $(Map.unsafeMap.output);
  var pos = map.position();
  pos.left-=dx;
  pos.top -=dy;
  map.css({left: (pos.left)+"px",
           top:  (pos.top )+"px"});
  
  Map.update_systems(pos);
  
  for (var i=0; i<Map.starLayerCount; i++) {
    var layer = Map.unsafeMap.starLayers[i];
    var factor= Math.pow(Map.starBasis, layer.layerNr-(-1)); // '--' is used to ensure it's a number
    layer.positionLeft-=dx*factor; // same idea here
    layer.positionTop -=dy*factor; // same idea here
    $(layer.output).css({left: layer.positionLeft+"px",
                         top:  layer.positionTop +"px"});
    layer._setStarPositions(-dy*factor,-dx*factor);
  }
};
Map.clean_dirty = function() {
  if (Map.start_x != undefined) return; // clean_dirty is only needed when no drag is being performed.
  if (!Map.is_dirty) return; // and when the map is dirty.
  
  var map = $(Map.unsafeMap.output);
  var pos = map.position();
  Map.update_systems(pos);
  
  setTimeout(Map.clean_dirty, 50);
};
Map.end_drag = function(e) {
  if (Map.start_x == undefined) return;
  $("body").get(0).removeEventListener("mousemove",Map.mousemove,false); // jquery's unbind did not work.
  Map.last_move=0; 
  Map.mousemove(e);
  Map.start_x=undefined;
  Map.start_y=undefined;
  Map.clean_dirty();
};

// Patch some sloppy coded functions in imperion's map.js. Detect when a request for new data is pending and deny new request until it's finished.
Map.patch_map=function() {
  if (!Map.enable_dragging) return; // Not really necessary, but prevents coding mistakes from injecting the patch unwanted.
  var s = $.new("script"); // We need to use a script element, because a bug in GM causes the prototype variable to be unaccessible.
  s.attr({type: "application/javascript"});
  s.html("\
  (function() {\
    var IMap = Map.prototype;\
    var oldPreloadData = IMap.preloadData;\
    var oldSetMapData  = IMap.setMapData;\
    IMap.preloadData=function(galaxy, direction) {\
      /*console.debug(\"request\"); \
      try{*/\
        if (!this.loadSystemIds) {\
          window.requesting_map_data=true;\
          oldPreloadData.call(this, galaxy, direction); \
          /*console.debug(\"receiving:\"+this.loadSystemIds);*/ \
        }\
      /*}catch(e){\
        console.dir(e);\
      }*/\
    };\
    IMap.setMapData =function(reqData) {\
      /*console.debug(\"handling\"); \
      try{*/\
        oldSetMapData.call(this, reqData); \
        this.loadSystemIds=null;\
        window.requesting_map_data=false;\
      /*}catch(e){\
        console.dir(e);\
      }*/\
    };\
    var oldMoveLeft  = config.registry.currentObject.moveLeft; \
    config.registry.currentObject.moveLeft =function(){if (!window.requesting_map_data) oldMoveLeft.call(this);}; \
    var oldMoveRight = config.registry.currentObject.moveRight; \
    config.registry.currentObject.moveRight=function(){if (!window.requesting_map_data) oldMoveRight.call(this);}; \
    var oldMoveUp    = config.registry.currentObject.moveUp; \
    config.registry.currentObject.moveUp   =function(){if (!window.requesting_map_data) oldMoveUp.call(this);}; \
    var oldMoveDown  = config.registry.currentObject.moveDown; \
    config.registry.currentObject.moveDown =function(){if (!window.requesting_map_data) oldMoveDown.call(this);}; \
    if (console) console.info(\"Applied imperion map patch\");\
  })();");
  $("body").append(s);
}

// === run ===
Map.run=function() {
  
  Map.map = $("#mapContent");
  if (Map.map.size()>0) { // If this page has a map ...
    var y=$("body");
    var style="";
    if (Map.remove_nav_pad)        style+="#mapNaviSmall {display: none !important;} ";
    if (Map.remove_border_buttons) style+="#mapNaviBig {display: none !important;} ";
    if (Map.remove_sectors)        style+="#gridX, #gridY, #gridCorner {display: none !important;} ";
    if (Map.system_metadata)       style+="#mapGalaxy>img {opacity: 0.5;} #mapSystem {background: black; z-index: 2;}";

    Map.quadrantWidth  = unsafeWindow.config.display.quadrantWidth -0;
    Map.quadrantHeight = unsafeWindow.config.display.quadrantHeight-0;
    Map.starBasis = 1.0 / (unsafeWindow.config.performance.starBasis-0); // this is intentionally 1.0 devided by the original value
    Map.starLayerCount = unsafeWindow.config.performance.starLayerCount-0; 
    Map.unsafeMap = unsafeWindow.config.registry.currentObject; // This is supposed to be the central instance of imperion's Map class.
    Map.galaxy=$("#mapGalaxy");
    
    if (Map.enable_dragging) {
      style+="#mapContent, #mapContent #mapGalaxy {cursor: move;} #mapContent img {cursor: pointer;} #mapContent * {cursor: normal;} ";
      // These come from imperion's 'config.js'
      Map.center={x: Map.unsafeMap.center.x-0,
                  y: Map.unsafeMap.center.y-0};
      Map.patch_map();
                  
      y.mouseleave(Map.end_drag);
      y.mouseup(Map.end_drag);
      Map.map.mousedown(Map.mousedown);
    }
    if(Map.enable_new_grid || Map.system_metadata) {
      Map.canvas=$.new("canvas");
      Map.canvas.attr({
        width:  Map.map.width()*3,
        height: Map.map.height()*3
      }).css({
        position: "absolute",
        width: "300%",
        height: "300%"
      });
      Map.galaxy.prepend(Map.canvas);
      Map.context=Map.canvas.get(0).getContext("2d");
      Map.update();
    }

    GM_addStyle(style);
  }
  if (Map.rewire_send_troops) {
    var buttons=$("#recycle,#colonize,#sendFleet");
    buttons.click(Map.rewire);
  }

  //Map.tag_tool();
};

Map.rewire = function(e) {
  e.preventDefault();
  var url = this.href;

  var form=$.new("div").attr({class: "metallContent fontCenter"}).text("Loading: "+url);
  if (Map.form) {
    Map.form.replaceWith(form);
  } else {
    $("#mapToolbar").after(
      $.new("div").attr({class: "textureCenter interface_content_building_center"}).append(
        $.new("div").attr({class: "frame"}).append(
          form)));
  }
  Map.form=form;
  
  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: Map.append_fleet_form
  });
};

Map.append_fleet_form = function(contents) {
  contents=$(contents.responseText);
  var form = contents.find(".frame>.metallContent");
  Map.form.replaceWith(form);
  Map.form=form;
  Map.relink_action_button();
};

Map.relink_action_button = function() {
  var link=$.new("a").attr({class: "buttonStd floatRight interface_forms_buttons_standart", href: "javascript:;"})
  var oldlink=Map.form.find("#sendFormSubmit");
  link.html(oldlink.html());
  oldlink.replaceWith(link);
  link.click(Map.send_fleet);
};

Map.send_fleet = function(e) {
  var f = Map.form.find("#sendForm").get(0);
  var data = post_data(f);
  Map.debug("posting data="+data);

  var form=$.new("div").attr({class: "metallContent fontCenter"}).text("Sending fleet");
  Map.form.replaceWith(form);
  Map.form=form;  

  GM_xmlhttpRequest({
    method: "POST",
    url: f.action,
    data: data,
    headers: {"Content-type": "application/x-www-form-urlencoded"},
    onload: Map.fleet_sent
  });
};

Map.fleet_sent = function(contents) {
  contents=$(contents.responseText);
  var form = contents.find(".frame>.metallContent");
  Map.form.replaceWith(form);
  Map.form=form;
  Map.relink_action_button();
  if (Events.enabled) Events.update_data();
};

Map.call('init', true);
$(function(){Map.call('run',true);});
