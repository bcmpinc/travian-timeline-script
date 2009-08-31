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
 ****************************************/

Feature.create("Lines",new Error().lineNumber-21);

Lines.s.enabled.description="Enable map enhacements";
Lines.init=function(){
    Lines.setting("hide_buttons", true, Settings.type.boolean,undefined, "Hide the movemente buttons and sector numbers on the system map.");
    Lines.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
    Lines.setting("categories", { /* <tag>: [ <color> , <drawline> ], */
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
    Lines.setting("locations", {}, Settings.type.object, undefined, "List of special locations.");
    // A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
    // name is optional.
};

// Creates the canvas for drawing the lines.
Lines.create_canvas=function(x){
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
    Lines.context = g;
    Lines.pos = pos;
};
// Draws a line to the specified location
Lines.touch=function(location) {
    var x = location[0]-Lines.posx;
    var y = location[1]-Lines.posy;
    if (x<-400) x+=800;
    if (x> 400) x-=800;
    if (y<-400) y+=800;
    if (y> 400) y-=800;
    var px = 1.83*(x+y)*20;
    var py = 1.00*(x-y)*20;
    px += py/50;

    // Get the location's category
    var category=Lines.categories[location[2]];
    // Get the drawing context
    var g = Lines.context;
    g.strokeStyle=category[0];
    if (category[1]) { // Draw lines only if enabled for category.
        g.beginPath();
        var px2 = px * Lines.scale;
        var py2 = py * Lines.scale;
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
Lines.delayed_update=function() {
    setTimeout(Lines.update,10);
}
Lines.update=function() {
    // But don't do an update when it's not necessary.
    try {
        z = unsafeWindow.m_c.z;
        if (z == null) return;
        if (Lines.posx == z.x && Lines.posy == z.y) return;
        Lines.posx = z.x - 0;
        Lines.posy = z.y - 0;
    } catch (e) {
        this.exception("Lines.update", e);
    }
    // Make sure the locations variable is up to date
    Lines.s.locations.read();

    // Get the drawing context
    var g = Lines.context;

    // Clear map
    g.clearRect(0,0,Lines.pos[2],Lines.pos[3]);
    g.save()

    // Initialize render context
    g.translate(Lines.pos[2]/2-1,Lines.pos[3]/2 + 5.5);
    g.fillStyle = "rgba(128,128,128,0.8)";

    // Draw lines
    for (var l in Lines.locations) {
        Lines.touch(Lines.locations[l]);
    }

    // Reset render context
    g.restore();
}
// The event listener (used by tag_tool)
Lines.tag_change=function(e) {
    Lines.s.locations.read();
    var cat = e.target.value;
    var l = Lines.posx+","+Lines.posy;
    if (cat=="none") {
        delete Lines.locations[l];
    } else {
        Lines.locations[l]=[Lines.posx,Lines.posy,cat,Lines.village_name];
    }
    Lines.s.locations.write();
};
// add a "this location is special!" button to the map's village view. (if applicable)
Lines.tag_tool=function() {
    if (location.href.indexOf("karte.php?d=")<=0) return;
    var x = document.evaluate( "//div[@id='content']/h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
    if (!x) return;
    var loc = x.textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
    var cat=Lines.locations[loc[1]+","+loc[2]];
    cat=(cat==undefined)?cat="none":cat[2];

    var select=document.createElement("select");
    for (var c in Lines.categories) {
        var opt=document.createElement("option");
        opt.value=c;
        if (c==cat) opt.selected=true;
        opt.innerHTML=c;
        select.appendChild(opt);
    }
    Lines.posx=loc[1]-0;
    Lines.posy=loc[2]-0;
    Lines.village_name=x.firstChild.textContent;
    select.addEventListener('change',Lines.tag_change,false);
    x.appendChild(select);
    x.parentNode.style.zIndex=5; // Otherwise it might end up under the "(Capital)" text element.
};
Lines.next_move=0;
Lines.mousemove=function(e) {
  var t=new Date().getTime();
  if (t<Lines.next_move) return;
  Lines.next_move=t+50; // mousemove events that happen whithin 50 ms of a previous one are dropped, to increase performance.
  var map = $("#mapGalaxy");
  var pos = map.position();
  var dx = -(e.screenX-Lines.start_x);
  var dy = -(e.screenY-Lines.start_y);
  Lines.unsafeMap.positionLeft-=dx;
  Lines.unsafeMap.positionTop -=dy;
  map.css({left: (Lines.unsafeMap.positionLeft)+"px",
           top:  (Lines.unsafeMap.positionTop )+"px"});
  Lines.unsafeMap.center.x = Lines.center.x+Math.round(Lines.unsafeMap.positionLeft/Lines.quadrantWidth );
  Lines.unsafeMap.center.y = Lines.center.y+Math.round(Lines.unsafeMap.positionTop /Lines.quadrantHeight);
  
  for (var i=0; i<Lines.starLayerCount; i++) {
    var layer = Lines.unsafeMap.starLayers[i];
    var factor= Math.pow(Lines.starBasis, layer.layerNr-(-1)); // '--' is used to ensure it's a number
    Lines.debug(factor);
    layer.positionLeft-=dx*factor; // same idea here
    layer.positionTop -=dy*factor; // same idea here
    $(layer.output).css({left: layer.positionLeft+"px",
                         top:  layer.positionTop +"px"});
  }
  Lines.start_x=e.screenX;
  Lines.start_y=e.screenY;
};
Lines.mousedown=function(e) {
  Lines.start_x=e.screenX;
  Lines.start_y=e.screenY;
  $("body").get(0).addEventListener("mousemove",Lines.mousemove,false); // jquery's unbind did not work.
};
Lines.end_drag = function(e) {
  if (Lines.start_x == undefined) return;
  $("body").get(0).removeEventListener("mousemove",Lines.mousemove,false); // jquery's unbind did not work.
  Lines.last_move=0; 
  Lines.mousemove(e);
  Lines.start_x=undefined;
  Lines.start_y=undefined;
};

Lines.run=function() {
  
  var x = $("#mapContent");
  if (x.size()>0) { // If this page has a map ...
    if (Lines.hide_buttons)
      GM_addStyle("#gridX, #gridY, #gridCorner, #mapNaviSmall, #mapNaviBig {display: none !important;} #mapContent, #mapContent #mapGalaxy {cursor: move;} #mapContent img {cursor: pointer;} #mapContent * {cursor: normal};");

    // These come from imperion's 'config.js'
    Lines.starBasis = 1.0 / (unsafeWindow.config.performance.starBasis-0); // this is intentionally 1.0 devided by the original value
    Lines.starLayerCount = unsafeWindow.config.performance.starLayerCount-0; 
    Lines.quadrantWidth  = unsafeWindow.config.display.quadrantWidth -0;
    Lines.quadrantHeight = unsafeWindow.config.display.quadrantHeight-0;
    Lines.unsafeMap = unsafeWindow.config.registry.currentObject; // This is supposed to be the central instance of imperion's Map class.
    Lines.center={x: Lines.unsafeMap.center.x-0,
                  y: Lines.unsafeMap.center.y-0};
    

    y=$("body");
    y.mouseleave(Lines.end_drag);
    y.mouseup(Lines.end_drag);
    x.mousedown(Lines.mousedown);
  }

  //Lines.tag_tool();
};

Lines.call('init', true);
$(function(){Lines.call('run',true);});
