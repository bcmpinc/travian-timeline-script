/*****************************************************************************
 * Copyright (C) 2008, 2009, 2010 Bauke Conijn, Adriaan Tichler
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
 * <http://www.gnu.org/licenses/>
 *****************************************************************************/

/****************************************
 * MAP
 ****************************************/

Feature.create("Map",new Error(21));

Map.s.enabled.description="Enable the map lines";
Map.init=function(){
    //Map.setting("update_owned", true, Settings.type.bool, undefined, "Automatically create and remove lines to your villages.");
    //Map.setting("update_ally", true, Settings.type.bool, undefined, "Automatically create and remove lines to ally members.");
    //Map.setting("update_allies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of allied alliances.");
    //Map.setting("update_naps", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of nap-alliances.");
    //Map.setting("update_enemies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of alliances, with which your ally is at war.");
    //Map.setting("update_crop", true, Settings.type.bool, undefined, "Automatically create and remove lines to 9- and 15-croppers.");
    Map.setting("list_extra_villages", true, Settings.type.bool, undefined, "Append villages in the 'extra' category to the villages list.");
    Map.setting("analyze_neighbourhood", true, Settings.type.bool, undefined, "Add links to travian analyzer on the map page, for analyzing the neighbourhood.");
    Map.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
    Map.setting("categories", { /* <tag>: [ <color> , <drawline> ], */
            none: ["",false], // ie. remove from 'locations'.
                owned:   ["rgba(128,255,  0,1.0)", true],
                ally:    ["rgba(  0,  0,255,0.5)", true],
                allies:  ["rgba(  0,255,  0,0.5)", true],
                naps:    ["rgba(  0,255,255,0.5)", false],
                enemies: ["rgba(255,  0,  0,0.5)", true],
                crop9:   ["rgba(255,128,  0,0.5)", true],
                crop15:  ["rgba(192,128,  0,1.0)", true],
                extra:   ["rgba(128,128,128,1.0)", true],
                farms:   ["rgba(255,255,255,1.0)", true],
                ban:     ["rgba(  0,  0,  0,0.5)", false],
                natar:   ["rgba(128, 64,  0,0.5)", false],
                other:   ["rgba(255,  0,255,0.5)", true]
                }, Settings.type.object, undefined, "The different types of categories. The order of this list defines the order in which they are listed and drawn.");
    Map.setting("locations", {}, Settings.type.object, undefined, "List of special locations.");
    // A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
    // name is optional.
};

Map.new_table_cell=function(c,innerhtml) {
    cell = document.createElement("td");
    cell.innerHTML = innerhtml;
    cell.className = c;
    return cell;
};
// Adds the location to the villages list.
Map.append_villages=function(){
    var color = Map.categories.extra[0];
    for (var l in Map.locations) {
        var location = Map.locations[l];
        if (location[2]=="extra") {
            var row = document.createElement("tr");
            row.appendChild(Map.new_table_cell("dot","&#x25CF;"));
            row.appendChild(Map.new_table_cell("text","<a style=\"color: "+color+";\">"+location[3]+"</a>"));
            row.appendChild(Map.new_table_cell("x","("+location[0]));
            row.appendChild(Map.new_table_cell(""," | "));
            row.appendChild(Map.new_table_cell("y",location[1]+")"));
            Map.outpost_list.appendChild(row);
        }
    }
};
// Adds a diff to the page below the map that can contain links to
// travian analyzer.
Map.create_analyzer_links=function(){
    var rdiv=document.createElement("div");
    rdiv.style.position = "absolute";
    rdiv.style.left = "315px";
    rdiv.style.top = "500px";
    rdiv.style.border = "solid 1px #000";
    rdiv.style.background = "#ffc";
    rdiv.style.zIndex = 16;
    rdiv.style.padding = "3px";
    rdiv.style.MozBorderRadius = "6px";
    document.body.appendChild(rdiv);
    Map.analyzer_links = rdiv;
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

    // Update the travian analyzer links:
    if (Map.analyzer_links) {
        var linkstart = "<a href=\"http://travian.ws/analyser.pl?s="+Settings.server+"&q="+Map.posx+","+Map.posy;
        Map.analyzer_links.innerHTML = "<b>Analyze neighbourhood:</b><br/>Radius: " +
            linkstart+",5\" > 5</a>, "+
            linkstart+",10\">10</a>, "+
            linkstart+",15\">15</a>, "+
            linkstart+",20\">20</a>, "+
            linkstart+",25\">25</a>";
    }
}
// The event listener (used by tag_tool)
Map.tag_change=function(e) {
    Map.s.locations.read();
    var cat = e.target.value;
    var l = Map.posx+","+Map.posy;
    if (cat=="none") {
        delete Map.locations[l];
    } else {
        Map.locations[l]=[Map.posx,Map.posy,cat,Map.outpost_name];
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
    Map.outpost_name=x.firstChild.textContent;
    select.addEventListener('change',Map.tag_change,false);
    x.appendChild(select);
    x.parentNode.style.zIndex=5; // Otherwise it might end up under the "(Capital)" text element.
};
Map.run=function() {
    if (Map.list_extra_villages) {
        var vlist=document.getElementById("vlist");
        if (vlist) {
            Map.outpost_list = vlist.childNodes[1];
            if (Map.outpost_list) {
                Map.append_villages();
            } else {
                this.warning("Could not find village list.");
            }
        }
    }

    var x = document.getElementById("map");
    if (x != null) { // If this page has a map ...
        if (Map.analyze_neighbourhood)
            Map.create_analyzer_links();
        Map.create_canvas(x);
        Map.update();
        document.addEventListener('click', Map.delayed_update,true);
        document.addEventListener('keydown',Map.delayed_update,true);
        document.addEventListener('keyup', Map.delayed_update,true);
    }

    Map.tag_tool();
};

Map.call('init', true);
$(function(){Map.call('run',true);});
