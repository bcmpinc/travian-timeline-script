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
    Map.setting("remove_nav_pad", true, Settings.type.boolean,undefined, "Remove the movemente joypad.");
    Map.setting("remove_border_buttons", true, Settings.type.boolean,undefined, "Remove buttons at the border of the map.");
    Map.setting("remove_sectors", true, Settings.type.boolean,undefined, "Remove the sector numbers at the top and right border of the map. Note that this numbering is not updated when dragging.");
    Map.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
    Map.setting("categories", { /* <tag>: [ <color> , <drawline> ], */
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
    Map.setting("locations", {}, Settings.type.object, undefined, "List of special locations.");
    // A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
    // name is optional.
};

// Creates the canvas for drawing the lines.
Map.create_canvas=function(x){
    var pos = [x.offsetLeft, x.offsetTop, x.offsetWidth, x.offsetHeight];

    var canvas=document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = pos[0]+"px";
    canvas.style.top = pos[1]+"px";
    canvas.style.zIndex = 14;
    canvas.width = pos[2];
    canvas.height = pos[3];
    
    x.parentNode.insertBefore(canvas, x.nextSibling);

    var g = canvas.getContext("2d");
    Map.context = g;
    Map.pos = pos;
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
Map.delayed_update=function() {
    setTimeout(Map.update,10);
}
Map.update=function() {
    // But don't do an update when it's not necessary.
    try {
        z = unsafeWindow.m_c.z;
        if (z == null) return;
        if (Map.posx == z.x && Map.posy == z.y) return;
        Map.posx = z.x - 0;
        Map.posy = z.y - 0;
    } catch (e) {
        this.exception("Map.update", e);
    }
    // Make sure the locations variable is up to date
    Map.s.locations.read();

    // Get the drawing context
    var g = Map.context;

    // Clear map
    g.clearRect(0,0,Map.pos[2],Map.pos[3]);
    g.save()

    // Initialize render context
    g.translate(Map.pos[2]/2-1,Map.pos[3]/2 + 5.5);
    g.fillStyle = "rgba(128,128,128,0.8)";

    // Draw lines
    for (var l in Map.locations) {
        Map.touch(Map.locations[l]);
    }

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
Map.next_move=0;
Map.mouse_distance=0;
Map.mousedown=function(e) {
  if ($("#mapSystem").css("visibility")=="visible") return; // Don't allow dragging when zoomed in to a solarsystem
  Map.start_x=e.screenX;
  Map.start_y=e.screenY;
  Map.mouse_distance=0;
  $("body").get(0).addEventListener("mousemove",Map.mousemove,false); // jquery's unbind did not work.
};
Map.mousemove=function(e) {
  var t=new Date().getTime();
  if (t<Map.next_move) return;
  var dx = -(e.screenX-Map.start_x);
  var dy = -(e.screenY-Map.start_y);
  if (Map.mouse_distance<15) {
    Map.mouse_distance=Math.sqrt(dx*dx+dy*dy);
    return; // Ignore small movements.
  }
  Map.start_x=e.screenX;
  Map.start_y=e.screenY;

  Map.next_move=t+50; // mousemove events that happen whithin 50 ms of a previous one are dropped, to increase performance.
  var map = $(Map.unsafeMap.output)
  var pos = map.position();
  pos.left-=dx;
  pos.top -=dy;
  map.css({left: (pos.left)+"px",
           top:  (pos.top )+"px"});
  
  var ix=Math.round(pos.left/Map.quadrantWidth );
  var iy=Math.round(pos.top /Map.quadrantHeight);
  try{
    // imperion's scripts can't handle updates when requesting data. 
    // This following variable is set and cleared by the patch.
    if (!unsafeWindow.requesting_map_data) { 
      var targetx=Map.center.x-ix;
      var targety=Map.center.y-iy;
      var temp=Map.unsafeMap.fx.start;
      Map.unsafeMap.fx.start=nothing;
      if (Map.unsafeMap.center.x > targetx) Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_LEFT );
      if (Map.unsafeMap.center.x < targetx) Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_RIGHT);
      if (Map.unsafeMap.center.y > targety) Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_UP   );
      if (Map.unsafeMap.center.y < targety) Map.unsafeMap._move.call(Map.unsafeMap, unsafeWindow.DIRECTION_DOWN );
      Map.unsafeMap.fx.start=temp;
      positionLeft = ix*Map.quadrantWidth;
      positionTop  = iy*Map.quadrantHeight;
    }
  }catch(e){
    unsafeWindow.console.dir(e);
  }
  
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
Map.end_drag = function(e) {
  if (Map.start_x == undefined) return;
  $("body").get(0).removeEventListener("mousemove",Map.mousemove,false); // jquery's unbind did not work.
  Map.last_move=0; 
  Map.mousemove(e);
  Map.start_x=undefined;
  Map.start_y=undefined;
};

// Patch some sloppy coded functions in imperion's map.js. Detect when a request for new data is pending and deny new request until it's finished.
Map.patch_map=function() {
  var s = $.new("script"); // We need to use a script element, because a bug in GM causes the prototype variable to be unaccessible.
  s.attr({type: "application/javascript"});
  s.html("\
  (function() {\
    var IMap = Map.prototype;\
    var oldPreloadData = IMap.preloadData;\
    var oldSetMapData  = IMap.setMapData;\
    IMap.preloadData=function(galaxy, direction) {\
      console.debug(\"request\"); \
      try{\
        if (!this.loadSystemIds) {\
          window.requesting_map_data=true;\
          oldPreloadData.call(this, galaxy, direction); \
          console.debug(\"receiving:\"+this.loadSystemIds); \
        }\
      }catch(e){\
        console.dir(e);\
      }\
    };\
    IMap.setMapData =function(reqData) {\
      if (console) console.debug(\"handling\"); \
      try{\
        oldSetMapData.call(this, reqData); \
        this.loadSystemIds=null;\
        window.requesting_map_data=false;\
      }catch(e){\
        console.dir(e);\
      }\
    };\
    if (console) console.info(\"Applied patch\");\
  })();");
  $("body").append(s);
}

Map.run=function() {
  
  var x = $("#mapContent");
  if (x.size()>0) { // If this page has a map ...
    var style="#mapContent, #mapContent #mapGalaxy {cursor: move;} #mapContent img {cursor: pointer;} #mapContent * {cursor: normal;} ";
    if (Map.remove_nav_pad)        style+="#mapNaviSmall {display: none !important;} ";
    if (Map.remove_border_buttons) style+="#mapNaviBig {display: none !important;} ";
    if (Map.remove_sectors)        style+="#gridX, #gridY, #gridCorner {display: none !important;} ";

    GM_addStyle(style);
    
    // These come from imperion's 'config.js'
    Map.starBasis = 1.0 / (unsafeWindow.config.performance.starBasis-0); // this is intentionally 1.0 devided by the original value
    Map.starLayerCount = unsafeWindow.config.performance.starLayerCount-0; 
    Map.quadrantWidth  = unsafeWindow.config.display.quadrantWidth -0;
    Map.quadrantHeight = unsafeWindow.config.display.quadrantHeight-0;
    Map.unsafeMap = unsafeWindow.config.registry.currentObject; // This is supposed to be the central instance of imperion's Map class.
    Map.center={x: Map.unsafeMap.center.x-0,
                y: Map.unsafeMap.center.y-0};
    Map.patch_map();
                
    y=$("body");
    y.mouseleave(Map.end_drag);
    y.mouseup(Map.end_drag);
    x.mousedown(Map.mousedown);
  }

  //Map.tag_tool();
};

Map.call('init', true);
$(function(){Map.call('run',true);});
