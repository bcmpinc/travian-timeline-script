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

try{

/****************************************
 * LINES (and circles)
 ****************************************/

Feature.create("Lines");
Lines.init=function(){
    Lines.setting("enabled", true, Settings.type.bool, undefined, "Enable the map lines");
    //Lines.setting("update_owned", true, Settings.type.bool, undefined, "Automatically create and remove lines to your villages.");
    //Lines.setting("update_ally", true, Settings.type.bool, undefined, "Automatically create and remove lines to ally members.");
    //Lines.setting("update_allies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of allied alliances.");
    //Lines.setting("update_naps", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of nap-alliances.");
    //Lines.setting("update_enemies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of alliances, with which your ally is at war.");
    //Lines.setting("update_crop", true, Settings.type.bool, undefined, "Automatically create and remove lines to 9- and 15-croppers.");
    Lines.setting("list_extra_villages", true, Settings.type.bool, undefined, "Append villages in the 'extra' category to the villages list.");
    Lines.setting("analyze_neighbourhood", true, Settings.type.bool, undefined, "Add links to travian analyzer on the map page, for analyzing the neighbourhood.");
    Lines.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
    Lines.persist("categories", { /* <tag>: [ <color> , <drawline> ], */
            none: ["",false], // ie. remove from 'locations'.
                owned: ["rgba(192,128,0,1.0)", true],
                ally: ["rgba(0,0,255,0.5)", true],
                allies: ["rgba(0,255,0,0.5)", true],
                naps: ["rgba(0,255,255,0.5)", false],
                enemies: ["rgba(255,0,0,0.5)", true],
                crop9: ["rgba(255,128,0.5)", true],
                crop15: ["rgba(255,128,1.0)", true],
                extra: ["rgba(128,128,128,1)", true],
                farms: ["rgba(255,255,255,1)", true],
                ban: ["rgba(0,0,0,0.5)", false],
                natar: ["rgba(128,64,0,0.5)", false],
                other: ["rgba(255,0,255,0.5)", true]
                });
    Lines.persist("locations", {});
    // A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
    // name is optional.
};

Lines.new_table_cell=function(c,innerhtml) {
    cell = document.createElement("td");
    cell.innerHTML = innerhtml;
    cell.className = c;
    return cell;
};
// Adds the location to the villages list.
Lines.append_villages=function(){
    var color = Lines.categories.extra[0];
    for (var l in Lines.locations) {
        var location = Lines.locations[l];
        if (location[2]=="extra") {
            var row = document.createElement("tr");
            row.appendChild(Lines.new_table_cell("dot","&#x25CF;"));
            row.appendChild(Lines.new_table_cell("text","<a style=\"color: "+color+";\">"+location[3]+"</a>"));
            row.appendChild(Lines.new_table_cell("x","("+location[0]));
            row.appendChild(Lines.new_table_cell(""," | "));
            row.appendChild(Lines.new_table_cell("y",location[1]+")"));
            Lines.village_list.appendChild(row);
        }
    }
};
// Adds a diff to the page below the map that can contain links to
// travian analyzer.
Lines.create_analyzer_links=function(){
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
    Lines.analyzer_links = rdiv;
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
        Debug.exception("Lines.update", e);
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

    // Update the travian analyzer links:
    if (Lines.analyzer_links) {
        var linkstart = "<a href=\"http://travian.ws/analyser.pl?s="+Settings.server+"&q="+Lines.posx+","+Lines.posy;
        Lines.analyzer_links.innerHTML = "<b>Analyze neighbourhood:</b><br/>Radius: " +
            linkstart+",5\" > 5</a>, "+
            linkstart+",10\">10</a>, "+
            linkstart+",15\">15</a>, "+
            linkstart+",20\">20</a>, "+
            linkstart+",25\">25</a>";
    }
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
Lines.run=function() {
    if (Lines.list_extra_villages) {
        var vlist=document.getElementById("vlist");
        if (vlist) {
            Lines.village_list = vlist.childNodes[1];
            if (Lines.village_list) {
                Lines.append_villages();
            } else {
                Debug.warning("Could not find village list.");
            }
        }
    }

    var x = document.getElementById("map");
    if (x != null) { // If this page has a map ...
        if (Lines.analyze_neighbourhood)
            Lines.create_analyzer_links();
        Lines.create_canvas(x);
        Lines.update();
        document.addEventListener('click', Lines.delayed_update,true);
        document.addEventListener('keydown',Lines.delayed_update,true);
        document.addEventListener('keyup', Lines.delayed_update,true);
    }

    Lines.tag_tool();
};

}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}