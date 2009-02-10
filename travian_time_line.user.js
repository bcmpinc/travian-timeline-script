// ==UserScript==
// @name           Travian Time Line
// @namespace      TravianTL
// @version        0.30
// @description    Adds a time line on the right of each page to show events that have happened or will happen soon. Also adds a few other minor functions. Like: custom sidebar; resources per minute; ally lines; add to the villages list; colored marketplace.

// @include        http://*.travian*.*/*.php*
// @exclude        http://forum.travian*.*
// @exclude        http://board.travian*.*
// @exclude        http://shop.travian*.*
// @exclude        http://help.travian*.*
// @exclude        http://*.travian*.*/manual.php*

// @author         bcmpinc
// @author         arandia
// @license        GPL 3 or any later version
// ==/UserScript==

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


// This script improves the information provided by Travian. For example: by adding 
// a timeline that shows different events like completion of build tasks and the 
// arrival of armies. It does this by modify the html of the page.
//
// This script is completely passive, so it does not click links automatically or 
// send http requests. This means that for certain data to be collected you have to 
// read your reports and watch your ally page and allies profiles.
// 
// This script can be combined with other scripts:
//  - If you have the 'Travian Task Queue'-script, you can click on the timeline to 
//    automatically enter the schedule time.
//  - If you have the 'Travian Beyond'-script, additional villages will also get an 
//    attack and a merchant link button. (Currently you have to add these additional 
//    villages in the scripts source code.)

/*****************************************************************************/

/****************************************
 *  JAVASCRIPT ENHANCEMENTS
 ****************************************/

// Make the global variable global, such that global variables can be created 
// at local scope and the use of global variables at local scope can be made 
// explicit.
var global = this;

// Remove a DOM element
function remove(el) {
    el.parentNode.removeChild(el);
}

// Concatenates the original string n times.
String.prototype.repeat = function(n) {
    var s = "";
    while (--n >= 0) {
        s += this;
    }
    return s;
}

// Add spaces (or s) to make the string have a length of at least n
// s must have length 1.
String.prototype.pad = function(n,s) {
    if (s==undefined) s=" ";
    n = n-this.length;
    if (n<=0) return this;
    return this+s.repeat(n);
}

// Functions missing in Math
Math.sinh = function(x) { 
    return .5*(Math.exp(x)-Math.exp(-x));
}
Math.cosh = function(x) { 
    return .5*(Math.exp(x)+Math.exp(-x));
}
Math.arsinh = function(x) { 
    return Math.log(x+Math.sqrt(x*x+1));
}
Math.arcosh = function(x) { 
    return Math.log(x+Math.sqrt(x*x-1));
}

function tl_date(){
    this.date = new Date();
    this.date.setTime(this.date.getTime() + Timeline.time_differnece*3600000);
    this.date.setMilliseconds(0);
    this.start_time = this.date.getTime();

    this.set_time = function(time){
        // This takes time as [string, hours, minutes, seconds (optional), 'am' or 'pm' or '' (optional)].
        Debug.debug('Setting the time: '+time);

        // Can't understand why people use am/pm, it's so confusing..??
        if (time[time.length - 1] == 'am' || time[time.length - 1] == 'pm')
            if (time[1]==12) time[1]=0;
        if (time[time.length - 1] == 'pm') time[1] -= -12;
        
        this.date.setHours(time[1], time[2], (time[3] != undefined && time[3].match('\\d')) ? time[3] : 0);

        return this.date.getTime();
    }

    this.set_day = function(day){
        // day is [day, month, year (optional)]. Month is 1-12.
        Debug.debug('Setting the day: '+day);

        this.date.setFullYear(day[2] == undefined ? this.date.getFullYear() : '20'+day[2], day[1] - 1, day[0]);

        return this.date.getTime();
    }

    this.adjust_day = function(duration){
        // The idea with this is to compare a duration value with the current day/time, and adjust the day for every 24 hours in duration.
        // duration is of type [string, hours, ....].
        Debug.debug('Adjusting the day by: '+duration);

        this.date.setDate(this.date.getDate() + Math.floor(duration[1]/24));

        // Cover the wrap-around cases. If an event has a duration, then it must be in the future. Hence, if the time we've set for it
        // is in the past, we've done something wrong and it's probably a midnight error.
        if (this.date.getTime() < this.start_time) this.date.setDate(this.date.getDate() + 1);

        return this.date.getTime();
    }
}

function nothing(){}

/****************************************
 *  FEATURE
 ****************************************/

try{

Feature=new Object();
Feature.list=[];
Feature.init=nothing;
Feature.run =nothing;
Feature.setting=function(name, def_val, type, typedata, description) {
    var s = new Object();
    if (type==undefined) type=Settings.type.none;
    s.__proto__   = Settings;
    s.fullname    = Settings.server+'.'+this.name+'.'+name;
    s.parent      = this;
    s.name        = name;
    this[name]    = def_val;
    s.type        = type;
    s.typedata    = typedata;
    s.description = description;
    s.read();
    this.s[name]  = s;
    return s;
};
Feature.create=function(name){
    var x=new Object();
    x.__proto__=Feature;
    x.name = name;
    x.s=new Object();
    Feature.list[name]=x;
    global[name]=x;
    return x;
};
// Executes the function specified by fn_name
// wrapped by a try..catch block and stores
// the start and endtime of execution.
// If (once), this function can't be called
// anymore in the future.
Feature.call=function(fn_name, once) {
    if (once==undefined) once=false;
    if (!this.start) this.start=new Object();
    this.start[fn_name] = new Date().getTime();
    try {
        this[fn_name]();
    } catch (e) {
        Debug.exception("call "+this.name+'.'+fn_name, e);
    }
    if (once) this[fn_name]=nothing;
    if (!this.end) this.end=new Object();
    this.end[fn_name] = new Date().getTime();
    // TODO: make this timing info visible somewhere.
};
// Executes (using Feature.call) the function specified by fn_name for all _enabled_ 
// Features created with Feature.create() in the order they have been created.
// A feature is enabled iff it doesn't have an enabled field or its enabled field is not
// exactly equal to false.
Feature.forall=function(fn_name, once) {
    for (var n in this.list) {
        if (this.list[n].enabled!==false)
            this.list[n].call(fn_name, once);
    }
};

/****************************************
 *  SETTINGS
 ****************************************/

Feature.create("Settings");
Settings.type = {none: 0, string: 1, integer: 2, enumeration: 3, object: 4, bool: 5};
Settings.server=function(){
    // This should give the server id as used by travian analyzer.
    var url = location.href.match("//([a-zA-Z]+)([0-9]*)\\.travian(?:\\.com?)?\\.(\\w+)/");
    var a=url[2];
    if (url[1]=='speed')  a='x';
    if (url[1]=='speed2') a='y';
    return url[3]+a;
}();
// Get the value of this setting.
// Note that (for example) 
// "var u = Settings.username;" and "var u = Settings.s.username.get();" have the same effect.
Settings.get=function() {
    return this.parent[this.name];
}

// Set the value of this setting.
// Note that (for example) 
// "Settings.username = u;" and "Settings.s.username.set(u);" have the same effect.
Settings.set=function(value) {
    this.parent[this.name]=value;
}

// Retrieves the value from the GM persistent storage database aka about:config
// Settings are not automatically updated. 
// Call this if the value might have changed and you want it's latest value.
Settings.read=function() {
    try {
        switch (this.type) {
            case Settings.type.none:
            break;

            case Settings.type.string:
            var x = GM_getValue(this.fullname);
            if (x!==undefined && x!=="") 
                this.set(x);
            break;

            case Settings.type.integer:
            case Settings.type.enumeration:
            var x = GM_getValue(this.fullname);
            if (x!==undefined && x!=="") 
                this.set(x-0);
            break;

            case Settings.type.object:
            var x = GM_getValue(this.fullname);
            if (x!==undefined && x!=="") 
                this.set(eval(x));
            break;

            case Settings.type.bool:
            var x = GM_getValue(this.fullname);
            if (x!==undefined && x!=="") 
                this.set(x==true);
            break;
        }
    } catch (e) {
        if (Debug&&Debug.exception)
            Debug.exception("Settings.read", e);
        else 
            GM_log("FATAL:"+e);
    }
};

// Stores the value in the GM persistent storage database aka about:config 
Settings.write=function() {
    try {
        switch (this.type) {
            case Settings.type.none:
            Debug.warning("This setting ("+this.fullname+") has no type and can't be stored!");
            break;

            case Settings.type.string:
            case Settings.type.integer:
            case Settings.type.enumeration:
            case Settings.type.bool:
            GM_setValue(this.fullname, this.get());
            break;

            case Settings.type.object:
            GM_setValue(this.fullname, uneval(this.get()));
            break;
        }
    } catch (e) {
        if (Debug&&Debug.exception)
            Debug.exception("Settings.read", e);
        else 
            GM_log("FATAL:"+e);
    }
};

// Appends a DOM element to parent_element that can be used to modify this setting.
Settings.config=function(parent_element) {
    try {
        var s = document.createElement("span");
        var setting = this;
        var settingsname = this.name.replace(/_/g," ").pad(22);
        var hint="";

        // Add tooltip with a description (if available)
        if (this.description) {
            s.title = this.description;
            var h = this.description.match("\\(([-a-zA-Z0-9.,_ ]+)\\)$");
            if (h)
                hint = " "+h[1];
        }

        // Create the input element.
        switch (this.type) {
            case Settings.type.none: {
                s.innerHTML = settingsname+": "+this.get()+hint+"\n";
                break;
            }

            case Settings.type.string:
            case Settings.type.integer: {
                {
                    var input = '<input value="'+this.get()+'"/>';
                    s.innerHTML = settingsname+": "+input+hint+"\n";
                }
                s.childNodes[1].addEventListener("change",function (e) {
                    var val=e.target.value;
                    if (setting.type==Settings.type.integer) val-=0;
                    setting.set(val);
                    setting.write();
                },false);
                break;
            }

            case Settings.type.enumeration: {
                {
                    var select='<select>';
                    var j = this.get();
                    for (var i in this.typedata) {
                        select+='<option value="'+i+'"';
                        if (i==j) select+='selected="" ';
                        select+='>'+this.typedata[i]+'</option>';
                    }
                    select+='</select>';                
                    s.innerHTML = settingsname+": "+select+hint+"\n";
                }
                s.childNodes[1].addEventListener("change",function (e) {
                    var val=e.target.value-0;
                    setting.set(val);
                    setting.write();
                },false);
                break;
            }
            
            case Settings.type.object: {
                // TODO: have some more info for this object in some special cases.
                s.innerHTML = settingsname+": (Object)"+hint+"\n";
                break;
            }
            
            case Settings.type.bool: {
                s.style.cursor = "pointer";
                s.style.color  = this.get()?'green':'red';
                s.innerHTML = settingsname+": <u>"+this.get()+"</u>"+hint+"\n";
                s.addEventListener("click",function (e) {
                    var val=!setting.get();
                    s.style.color  = val?'green':'red';
                    s.childNodes[1].innerHTML = val;
                    setting.set(val);
                    setting.write();
                },false);
                break;
            }
        }
        // Insert the element.
        parent_element.appendChild(s);
    } catch (e) {
        GM_log(e);
    }
};
Settings.setting("username","someone", Settings.type.string, undefined, "The name you use to log in into your account.");
Settings.setting("race",0, Settings.type.enumeration, ["Romans","Teutons","Gauls"]);
Settings.run=function() {
    // Create link for opening the settings menu.
    var div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "2";
    var right = Timeline.width;
    if (Timeline.collapse) right = Timeline.collapse_width;
    if (!Timeline.enabled) right = 0;
    right+=5;
    div.style.right = right+"px";
    div.style.top = "-5px";
    div.style.MozBorderRadius = "6px";
    div.style.padding = "3px";
    div.style.border = "1px solid #999";
    div.style.background = "#ccc";
    div.innerHTML = "<a href=\"#\" style=\"color: blue; font-size: 12px;\">Travian Time Line Settings</a>";
    document.body.appendChild(div);
    var link = div.firstChild;
    link.style.cursor="pointer";
    link.addEventListener("click",Settings.show,false);    

    // Extract the active village
    // These values below are sufficient to keep things working when only 1 village exists.
    Settings.village_name = ""; 
    Settings.village_id   = 0;
    try {
        var village_link = document.evaluate('//a[@class="active_vl"]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
        Settings.village_name = village_link.textContent;
        Settings.village_id=village_link.href.match("newdid=(\\d+)")[1]-0;
    } catch (e) {
        // If this fails, there probably is only 1 village. 
        // Having the name in the timeline isn't really usefull then.
    }
    Debug.debug("The active village is "+Settings.village_id+": "+Settings.village_name);
};
Settings.show=function() {
    var w = document.createElement("div");
    w.style.position = "fixed";
    w.style.zIndex = "250";
    w.style.left = "0px";
    w.style.top = "0px";
    w.style.right = "0px";
    w.style.bottom = "0px";
    w.style.background = "rgba(192,192,192,0.8)";
    w.innerHTML = '<div style="position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; cursor: pointer;"></div>'+
        '<div style="position: absolute; left: 50%; top: 50%;">'+
        '<pre style="position: absolute; left: -300px; top: -250px; width: 600px; height: 450px;'+
        ' border: 3px solid #000; background: #fff; overflow: auto; padding: 8px;">'+
        '</pre></div>';
    document.body.appendChild(w);
    Settings.window = w;
    try {
        var p = w.childNodes[1].childNodes[0];
        function add_el(type) {
            var el=document.createElement(type);
            p.appendChild(el);
            return el;
        }
        var title = add_el('div');
        title.innerHTML="Travian Time Line Settings";
        title.style.fontWeight="bold";
        title.style.textAlign="center";
        for (var n in Feature.list) {
            var f = Feature.list[n];
            if (f.s!=undefined) {
                add_el('hr');
                var head = add_el("div");
                head.innerHTML=f.name+':';
                head.style.fontWeight="bold";
                var body = add_el("div");
                for (var i in f.s) {
                    f.s[i].read();       // Make sure that we have the most accurate value.
                    f.s[i].config(body); // Add the configuration element.
                }
            }
        }
        add_el('hr');
        var notice = add_el('div');
        notice.innerHTML="Copyright (C) 2008, 2009 Bauke Conijn, Adriaan Tichler\n"+
            "GNU General Public License as published by the Free Software Foundation;\n"+
            "either version 3 of the License, or (at your option) any later version.\n"+
            "This program comes with ABSOLUTELY NO WARRANTY!\n\n";
        notice.style.color="lightgray";
        notice.style.fontStyle="italic";
    } catch (e) {
        Debug.exception("Settings.show", e);
    }    
    w.firstChild.addEventListener("click",Settings.close,false);
};
Settings.close=function(){
    remove(Settings.window);
};

// TODO: remove following BWC (backwards compatability code)
function prefix(s) {
    return "speed.nl."+s;
}



/****************************************
 *  DEBUG
 ****************************************/

Feature.create("Debug");
// These categories are in order from extremely severe to extremely verbose and
// are converted to functions in the Debug namespace using the specified name. 
// Example: Debug.warning("This shouldn't have happend!");
// Using the index is also allowed: Debug[1]("This shouldn't have happend!");
// has the same effect as the previous example.
Debug.categories=["none","fatal","error","warning","info","debug","all"];
Debug.methods=["console","firebug"];
Debug.setting("level",  0, Settings.type.enumeration, Debug.categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Debug.setting("output", 0, Settings.type.enumeration, Debug.methods,    "Where should the debug output be send to.");
Debug.print  =GM_log;
Debug.exception=function(fn_name, e) {
    // The 347 is to correct the linenumber shift caused by greasemonkey.
    var msg = fn_name+' ('+(e.lineNumber-347)+'): '+e;
    try {
        Debug.error(msg);
    } catch (ee) {
        GM_log(msg);
    }
};
Debug.init   =function() {
    switch (Debug.output) {
    case 0:
        for (var i in Debug.categories) {
            Debug[i]=Debug[Debug.categories[i]]=(i <= this.level)?this.print:nothing;
        }
        break;
    case 1:
        var console = unsafeWindow.console;
        if (!console) {
            Debug.print("Firebug not found! Using console for this page!");
            Debug.output=0;
            Debug.init();
            return;
        }
        var fns=[console.error,console.error,console.error,console.warn,console.info,console.debug,console.debug];
        for (var i in Debug.categories) {
            Debug[i]=Debug[Debug.categories[i]]=(i <= this.level)?fns[i]:nothing;
        }
        break;
    }
};
Debug.call("init",true); // Runs init once.
Debug.info("Running on server: "+Settings.server);



/****************************************
 *  LINES (and circles)
 ****************************************/

Feature.create("Lines");
Lines.setting("enabled",               true, Settings.type.bool,   undefined, "Enable the map lines"); 
Lines.setting("update_owned",          true, Settings.type.bool,   undefined, "Automatically create and remove lines to your villages."); 
Lines.setting("update_ally",           true, Settings.type.bool,   undefined, "Automatically create and remove lines to ally members."); 
Lines.setting("update_allies",         true, Settings.type.bool,   undefined, "Automatically create and remove lines to members of allied alliances."); 
Lines.setting("update_naps",           true, Settings.type.bool,   undefined, "Automatically create and remove lines to members of nap-alliances."); 
Lines.setting("update_enemies",        true, Settings.type.bool,   undefined, "Automatically create and remove lines to members of alliances, with which your ally is at war.");
Lines.setting("update_crop",           true, Settings.type.bool,   undefined, "Automatically create and remove lines to 9- and 15-croppers.");
Lines.setting("list_extra_villages",   true, Settings.type.bool,   undefined, "Append villages in the 'extra' category to the villages list."); 
Lines.setting("analyze_neighbourhood", true, Settings.type.bool,   undefined, "Add links to travian analyzer on the map page, for analyzing the neighbourhood.");
Lines.setting("scale",                 .05,  Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
Lines.setting("categories",     { /* <tag>:  [ <color>             , <drawline> ], */ 
                                    none:    ["",false], // ie. remove from 'locations'.
                                    owned:   ["rgba(192,128,0,1.0)",   true],
                                    ally:    ["rgba(0,0,255,0.5)",     true],
                                    allies:  ["rgba(0,255,0,0.5)",     true],
                                    naps:    ["rgba(0,255,255,0.5)",   false],
                                    enemies: ["rgba(255,0,0,0.5)",     true],
                                    crop9:   ["rgba(255,128,0.5)",     true],
                                    crop15:  ["rgba(255,128,1.0)",     true],
                                    extra:   ["rgba(128,128,128,0.5)", true],
                                    farms:   ["rgba(255,255,255,0.5)", true],
                                    ban:     ["rgba(0,0,0,0.5)",       false],
                                    other:   ["rgba(255,0,255,0.5)",   true]
                                },    Settings.type.object, undefined, "The different types of categories. The order of this list defines the order in which they are listed and drawn.");
Lines.setting("locations",      {},   Settings.type.object, undefined, "List of special locations.");
// A location is of the form [x,y,category,(name)]. Example: [-85,149,"ally"] or [12,-3,"extra","WW 1"]
// name is optional.

Lines.new_table_cell=function(innerhtml) {
    cell = document.createElement("td");
    cell.innerHTML = innerhtml;
    cell.className = "nbr";
    return cell;
};
// Adds the location to the villages list.
Lines.append_villages=function(){
    for (var l in Lines.locations) {
        var location = Lines.locations[l];
        if (location[2]=="extra") {
            var row = document.createElement("tr");
            row.appendChild(newcell("<span>• </span> "+location[3]));
            row.appendChild(newcell("<table cellspacing=\"0\" cellpadding=\"0\" class=\"dtbl\">\n<tbody><tr>\n<td class=\"right dlist1\">("+location[0]+"</td>\n<td class=\"center dlist2\">|</td>\n<td class=\"left dlist3\">"+location[1]+")</td>\n</tr>\n</tbody></table>"));
            tab.appendChild(row);
        }
    }
};
Lines.create_analyzer_links=function(){
    var rdiv=document.createElement("div");
    rdiv.style.position = "absolute";
    rdiv.style.left = "315px";
    rdiv.style.top  = "500px";
    rdiv.style.border = "solid 1px #000";
    rdiv.style.background = "#ffc";
    rdiv.style.zIndex = 16;
    rdiv.style.padding = "3px";
    rdiv.style.MozBorderRadius = "6px";
    document.body.appendChild(rdiv);
    Lines.analyzer_links = rdiv;
};
Lines.create_canvas=function(x){
    var pos = [x.offsetLeft, x.offsetTop, x.offsetWidth, x.offsetHeight];

    var canvas=document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = pos[0]+"px";
    canvas.style.top  = pos[1]+"px";
    canvas.style.zIndex = 14;
    canvas.width  = pos[2];
    canvas.height = pos[3];
        
    x.parentNode.insertBefore(canvas, x.nextSibling);

    var g = canvas.getContext("2d");
    Lines.context = g;
    Lines.pos = pos;
};
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
    // Lines.update is so kind to check whether an update is really necessary.
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
    g.fillStyle   = "rgba(128,128,128,0.8)";

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
        Lines.locations[l]=[Lines.posx,Lines.posy,cat];
    }
    Lines.s.locations.write();
};
// add a "this location is special!" button to the map's village view. (if applicable)
Lines.tag_tool=function() {  
    if (location.href.indexOf("karte.php?d=")<=0) return;
    var x = document.evaluate( "//div[@id='lmid2']//h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
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
    select.addEventListener('change',Lines.tag_change,false);
    x.appendChild(select);
    x.parentNode.style.zIndex=5; // Otherwise it might end up under the "(Capital)" text element.
};
Lines.run=function() {
    if (Lines.list_extra_villages) {
        Lines.village_list = document.evaluate( "//div[@id='lright1']/table/tbody", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
        if (Lines.village_list) {
            Lines.append_villages();
        } else {
            Debug.warning("Could not find village list.");
        }
    }
    
    var x = document.evaluate( "//img[@usemap='#karte']", document, null, XPathResult. ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
    if (x != null) { // If this page has a map ...
        if (Lines.analyze_neighbourhood) 
            Lines.create_analyzer_links();
        Lines.create_canvas(x);
        Lines.update();
        document.addEventListener('click',  Lines.delayed_update,true);
        document.addEventListener('keydown',Lines.delayed_update,true);
        document.addEventListener('keyup',  Lines.delayed_update,true);
    }

    Lines.tag_tool();
};


/****************************************
 * SIDEBAR
 ****************************************/

Feature.create("Sidebar");
Sidebar.setting("enabled",             true, Settings.type.bool, undefined, "Cutomize the sidebar"); 
Sidebar.setting("use_hr",              true, Settings.type.bool, undefined, "Use <hr> to seperate sidebar sections instead of <br>");
Sidebar.setting("remove_plus_button",  true, Settings.type.bool, undefined, "Removes the Plus button");
Sidebar.setting("remove_plus_color",   true, Settings.type.bool, undefined, "De-colors the Plus link");
Sidebar.setting("remove_target_blank", true, Settings.type.bool, undefined, "Removes target=\"_blank\", such that all sidebar links open in the same window.");
Sidebar.setting("remove_home_link",    true, Settings.type.bool, undefined, "Redirects travian image to current page instead of travian homepage.");


// Numbers for original sidebar links
//-1: -- break --
// 0: Home
// 1: Instructions
// 2: Profile
// 3: Log out
// 4: Forum
// 5: Chat
// 6: Travian Plus
// 7: Support

// Original sidebar links
// Sidebar.links = [0,1,2,3,-1,4,5,-1,6,7];
// TODO: make configureable?
Sidebar.setting("links",      
            [
                1,
                ["FAQ", "http://help.travian.nl/"],
                ["Travian Forum", "http://forum.travian.nl"],
                ["Wiki","http://wiki.travianteam.com/mediawiki/index.php/"],
                -1,
                2,
                ["Alliance Forum", "/allianz.php?s=2"],
                //["Alliantie Forum", "http://www.external-travian-forum.com/"],
                ["Alliance Overview", "allianz.php"],
                -1,
                ["Barracks", "/build.php?gid=19"],
                ["Stable", "/build.php?gid=20"],
                ["Workshop", "/build.php?gid=21"],
                ["Marketplace", "/build.php?gid=17"],
                ["Rally Point", "/build.php?gid=16"],
                -1,
                6,
                7 
            ]
        , Settings.type.object, undefined, "The links of the sidebar."); 
        
Sidebar.add=function(text, target) {
    var el;
    if (target=="") {
        el=document.createElement("b");  // Create a bold header
    } else {
        el=document.createElement("a");  // Create a normal link
        el.href=target;
    }
    el.innerHTML = text;
    Sidebar.navi.appendChild(el);
};
Sidebar.add_break=function() {
    if (Sidebar.use_hr) {
        Sidebar.navi.appendChild(document.createElement("hr"));
    } else {
        Sidebar.navi.appendChild(document.createElement("br"));
        Sidebar.navi.appendChild(document.createElement("br"));
    }
};
Sidebar.run=function() {
    if (Sidebar.remove_plus_button) {
        var plus = document.getElementById("lplus1");
        if (plus) {
            plus.parentNode.style.visibility="hidden";
        } else {
            Debug.info("Couldn't find the plus button.");
        }
    }

    var navi_table = document.getElementById("navi_table");
    if (!navi_table) return;
    
    if (Sidebar.remove_home_link)
        navi_table.parentNode.childNodes[1].href=location.href;
            
    Sidebar.navi = navi_table.childNodes[1].childNodes[0].childNodes[1];
        
    // Make copy of links
    Sidebar.oldnavi = [];
    for (var i = 0; i < Sidebar.navi.childNodes.length; i++)
        if (Sidebar.navi.childNodes[i].tagName=="A")
            Sidebar.oldnavi.push(Sidebar.navi.childNodes[i]);

    // Remove all links
    for (var i = Sidebar.navi.childNodes.length - 1; i>=0; i--) 
        Sidebar.navi.removeChild(Sidebar.navi.childNodes[i]);
        
    // Add new links
    for (var i = 0; i < Sidebar.links.length; i++) {
        var x = Sidebar.links[i];
        if (x.constructor == Array) {
            Sidebar.add(x[0], x[1]);
        } else if (x.constructor == String) {
            Sidebar.add(x, "");
        } else if (x<0) {
            Sidebar.add_break();
        } else {
            var el = Sidebar.oldnavi[x];
            if (Sidebar.remove_target_blank)
                el.removeAttribute("target"); // Force all links to open in the current page.
            if (Sidebar.remove_plus_color)
                el.innerHTML=el.textContent;  // Remove color from Plus link.
            Sidebar.navi.appendChild(el);
        }
    }
};
        

/****************************************
 *  RESOURCES
 ****************************************/
        
Feature.create("Resources");
Resources.setting("enabled",            true, Settings.type.bool,   undefined, "Add resource/minute and resources on market information to the resource bar.");
Resources.setting("market",               {}, Settings.type.object, undefined, "An array of length 4 containing the amount of resources currently available for sale on the marketplace. Might often be inaccurate.");
Resources.setting("production",           {}, Settings.type.object, undefined, "An array of length 4 containing the production rates of resp. wood, clay, iron and grain. (amount produced per hour)");

Resources.show=function() {
    var head = document.getElementById("lres0");
    if (head!=null) {
        head = head.childNodes[1].childNodes[0];
        
        var mkt  = Resources.market [Settings.village_id];
        var prod = Resources.production[Settings.village_id];
        mkt  = (mkt ==undefined)?[0,0,0,0]:mkt;
        prod = (prod==undefined)?['?','?','?','?']:prod;
        
        cur = head.textContent.split("\n").filter(function(x) {return x[0]>='0' && x[0]<='9'; });
    
        var a="";
        for (var i=0; i < 4; i++) {
            var c=(mkt[i]>0)?("+"+mkt[i]+" "):("");
            var p=(prod[i]=='?')?'?':((prod[i]>0?"+":"")+Math.round(prod[i]/6)/10.0);
            a+="<td></td><td>"+c+p+"/m</td>";
        }
        a+="<td></td><td></td>";
        
        var tr = document.createElement("tr");
        head.appendChild(tr);
        tr.innerHTML = a;
    }
};
Resources.update=function() {
    // Store info about resources put on the market if availbale
    var x = document.getElementById("lmid2");
    if (x!=null && x.innerHTML.indexOf("\"dname\"")>0) {
        var res = document.evaluate( "//table[@class='f10']/tbody/tr[@bgcolor='#ffffff']/td[2]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );

        var mkt = new Array(0,0,0,0);
        for ( var i=0 ; i < res.snapshotLength; i++ ){
            var c = res.snapshotItem(i).textContent - 0;
            var t = res.snapshotItem(i).firstChild.src.match("\\d") - 1;
            mkt[t] += c;
        }
        Debug.debug("This is on the market: "+mkt);
        Resources.market[Settings.village_id]=mkt;
        Resources.s.market.write();
    }

    // Store info about production rate if available
    if (location.href.indexOf("dorf1")>0) {
        var res = document.evaluate( "//div[@id='lrpr']/table/tbody/tr", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
        var prod = new Array(0,0,0,0);

        for ( var i=0 ; i < res.snapshotLength; i++ ){
            var c = res.snapshotItem(i).childNodes[4].firstChild.textContent.match("-?\\d+") - 0;
            var t = res.snapshotItem(i).childNodes[1].innerHTML.match("\\d")[0] - 1;
            prod[t] += c;
        }
        Debug.debug("This is produced: "+prod);
        Resources.production[Settings.village_id]=prod;
        Resources.s.production.write();
    }
};


Resources.run=function(){
    Resources.update();
    Resources.show();
};


/****************************************
 *  MARKET
 ****************************************/

Feature.create("Market");
Market.setting("enabled",            true, Settings.type.bool,   undefined, "Color the market offers to quickly determine their value.");

Market.update_colors=true;  // tells whether the next call to colorify should recolor the table.

Market.colorify=function() { 
    // Run this function twice each second.
    setTimeout(Market.colorify,500); 
    // But don't do an update when it's not necessary.
    if (!Market.update_colors) return;
    Market.update_colors=false;
    
    var res = document.evaluate( "//table[@class='tbg']/tbody/tr[not(@class) and not(@bgcolor)]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );

    for ( var i=0 ; i < res.snapshotLength; i++ ) {
        x = res.snapshotItem(i);
        if (x.childNodes[6]!=undefined && x.childNodes[6].textContent>0) {
            a = x.childNodes[2].textContent-0;
            b = x.childNodes[6].textContent-0;
            r = a/b;
            if (r>1.5)
                color="#ddffdd";
            else if (r>1.001)
                color = "#eeffdd";
            else if (r>0.999)
                color = "#ffffdd";
            else if (r>0.501)
                color = "#ffeedd";
            else
                color = "#ffdddd";

            x.style.backgroundColor = color;
        }
    }
};
Market.attribute_changed=function(e) {
    // Tell that something changed and that an update might be necessary
    Market.update_colors=true;
};
Market.run=function(){
    x = document.getElementById("lmid2");
    // TODO: find out why this also matches reports.
    if (x!=null && x.innerHTML.indexOf("</tr><tr class=\"cbg1\">")>0) {
        Market.colorify();
        document.addEventListener('DOMAttrModified',Market.attribute_changed,false);
    }
};



/****************************************
 *  TIMELINE
 ****************************************/

// WIP
 
Feature.create("Timeline");
Timeline.setting("enabled",          true,  Settings.type.bool, undefined, "Enable the timeline"); 
Timeline.setting("collapse",         false, Settings.type.bool, undefined, "Make the timeline very small by default and expand it when the mouse hovers above it.");
Timeline.setting("report_info",      true,  Settings.type.bool, undefined, "Show the size of the army, the losses and the amount of resources stolen");
Timeline.setting("position_fixed",   false, Settings.type.bool, undefined, "Keep timeline on the same position when scrolling the page.");
Timeline.setting("keep_updated",     true,  Settings.type.bool, undefined, "Update the timeline every 'Timeline.update_interval' msec.");
Timeline.setting("scale_warp",       false, Settings.type.bool, undefined, "Use cubic transformation on the timeline to make events close to 'now' have more space than events far away.");
Timeline.setting("use_server_time",  false, Settings.type.bool, undefined, "Use the server time instead of the local clock. Requires a 24 hours clock.");

Timeline.setting("color", "rgba(255, 255, 204, 0.5)", Settings.type.string, undefined, "Background color of the timeline");
Timeline.setting("width",              400, Settings.type.integer, undefined, "Width of the timeline (in pixels)");
Timeline.setting("height",               5, Settings.type.integer, undefined, "Height of one minute (in pixels)");
Timeline.setting("history",             90, Settings.type.integer, undefined, "The length of the history, that's visible (in minutes)");
Timeline.setting("future",              90, Settings.type.integer, undefined, "The length of the future, that's visible (in minutes)");
Timeline.setting("collapse_width",      60, Settings.type.integer, undefined, "Width of the timeline when collapsed (in pixels)");
Timeline.setting("collapse_speed",    1500, Settings.type.integer, undefined, "Collapse fade speed (in pixels per second)");
Timeline.setting("collapse_rate",       50, Settings.type.integer, undefined, "Update rate of the collapse fading (per second)");
Timeline.setting("distance_history",   270, Settings.type.integer, undefined, "The distance that can be scrolled backwards in history (from 0). (in minutes)");
Timeline.setting("update_interval",  30000, Settings.type.integer, undefined, "Interval between timeline updates. (in milliseconds)");
Timeline.setting("time_difference",      0, Settings.type.integer, undefined, "If you didn't configure your timezone correctly. (server time - local time) (in hours)");
Timeline.setting("full_height",          0, Settings.type.none,    undefined, "The calculated height of the timeline. (in pixels)");

Timeline.scroll_offset=0;

TYPE_BUILDING=0; TYPE_ATTACK=1; TYPE_REPORT=2; TYPE_MARKET=3; TYPE_RESEARCH=4; TYPE_PARTY=5; // The types of events
TIMELINE_EVENT_COLORS     = ['rgb(0,0,0)', 'rgb(255,0,0)', 'rgb(155,0,155)', 'rgb(0,155,0)', 'rgb(0,0,255)', 'rgb(255,155,155)'];


/****************************************
 *  CURRENT END OF REDESING ATTEMPT
 ****************************************/


    //////////////////////////////////////////
    //  COLLECT SOME INFO                   //
    //////////////////////////////////////////

    function storeInfo(){
        // Meaning of GM Values: (Some of the variable names are in dutch, to stay compatible with older scripts) 
        // 
        // ALLIANCE:
        //      dictionary (map) mapping the names of your ally's members to a list of it's villages. 

        // Load ally data
        //function captureAllianceData(){
        try {
            ally = eval(GM_getValue(prefix("ALLIANCE"), "{}"));
            if (ally==undefined) ally = {};
        } catch (e) {
            alert(e);
            ally = { };
        }    
        if (ally==undefined) ally2={};

        // Store list of your alliance members.
        if (location.href.indexOf("allianz")>0 && location.href.indexOf("s=")<0) {
            var res = document.evaluate( "//td[@class='s7']/a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
            if (res.snapshotLength>0) {
                ally2= ally;
                ally = {}
                for ( var i=0 ; i < res.snapshotLength; i++ ){
                    x    = res.snapshotItem(i);
                    name = x.textContent;
                    id   = x.href.match("\\d+")[0];
                    cnt  = x.parentNode.parentNode.childNodes[5].textContent;
                    if (ally2[name] != undefined) {
                        y = ally2[name];
                        y[0] = id;
                        y[1] = cnt;
                        ally[name] = y;
                    } else {
                        // [id, pop, {city1: [city1,x,y],city2: [city2,x,y],...} ]
                        ally[name] = [id, cnt, {}];
                    }
                }
                GM_setValue(prefix("ALLIANCE"), uneval(ally));
            }
        } 

        // Get alliance member data
        if (location.href.indexOf("spieler")>0) {
            who = document.body.innerHTML.match("<td class=\"rbg\" colspan=\"3\">[A-Z][a-z]+ ([^<]+)</td>");
            if (who) {
                who = who[1];
                if (ally[who] != undefined || who == Settings.username) {
                    var res = document.evaluate( "//td[@class='s7']/a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
                    cities = {};
                    for ( var i=0 ; i < res.snapshotLength; i++ ){
                        x    = res.snapshotItem(i);
                        name = x.textContent;
                        y    = x.parentNode.parentNode.childNodes[4].textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
                        y[0] = name;none = "0,0,0,0";

                        y[1] -= 0;
                        y[2] -= 0;
                        cities[name] = y;
                    }
                    if (ally[who]==undefined) ally[who]=[0,0,{}];
                    ally[who][2] = cities;
                    GM_setValue(prefix("ALLIANCE"), uneval(ally));
                }
            }
        }
    }

    //////////////////////////////////////////
    //  TIMELINE                            //
    //////////////////////////////////////////

    function tl_main(){
        tp1 = document.getElementById("tp1");
        if (!tp1) return;
        //if (Timeline.enabled && tp1) {
        /*  A timeline-data-packet torn apart:
            Example: {'1225753710000':[0, 0, 0, 0, 189, 0, 0, 0, 0, 0, 0, 0, "Keert terug van 2. Nador", 0, 0, 0, 0]}
        
            '1225753710000':       ## ~ The time at which this event occure(s|d).      
            [0,                     0 ~ Type of event (0=building, 1=attack, 2=report, 3=market, 4=research, 5=party)
            0,                      1 ~ Amount of farm-men involved 
            0,                      2 ~ Amount of defense-men involved
            0,                      3 ~ Amount of attack-men involved 
            189,                    4 ~ Amount of scouts  involved 
            0,                      5 ~ Amount of defense-horses involved 
            0,                      6 ~ Amount of attack-horses involved 
            0,                      7 ~ Amount of rams involved 
            0,                      8 ~ Amount of trebuchets involved 
            0,                      9 ~ Amount of leaders involved 
            0,                     10 ~ Amount of settlers involved 
            0,                     11 ~ Amount of heros involved 
            "Keert terug van 2. ", 12 ~ Event message.
            0,                     13 ~ Amount of wood involved
            0,                     14 ~ Amount of clay involved
            0,                     15 ~ Amount of iron involved
            0,                     16 ~ Amount of grain involved
            "1."]                  17 ~ Issuing city
             
            Instead of a number, the fields 1 to 11 and 13 to 16 are also allowed to be a tuple (list).
            In this case the first field is the original amount and the second field is the amount by which the amount has decreased.             
        */

        ///////////////////////////////////
        // Start Timeline Data collector //
        ///////////////////////////////////
    
        function tl_update_data() {
            try {
                events = eval(GM_getValue(prefix("TIMELINE"),"{}"));
                if (events==undefined) events = {};
            } catch (e) {
                alert(e);
                events = { };
            }
        }
        tl_update_data();
    
        // Added a third optional parameter to fix a bug with event overwriting. The event would be encountered,
        // this function wouldn't change it and return right away, and then the code following it would
        // be executed corrupting the event. This is a quick fix, but it really doesn't solve the problem.
        function tl_get_event(t, msg, name) {
            if (name == undefined) name = '';
            e = events[t];
            if (e == undefined) {
                e = [0,0,0,0,0,0,0,0,0,0,0,0,msg,0,0,0,0,name];
                events[t]=e;
            } else {
                Debug.info("An event already exists at this time!");
                throw "ERR_EVENT_OVERWRITE";
            }
            return e;
        }

        // Get the active village
        // TODO: replace in code.
        var active_vil = Settings.village_name;

        // Travelling armies (rally point)
        x = document.getElementById("lmid2");
        if (x!=null && x.innerHTML.indexOf("warsim.php")>0) {
    
            var res = document.evaluate( "//table[@class='tbg']/tbody", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
        
            for ( var i=0 ; i < res.snapshotLength; i++ )
                {
                    x = res.snapshotItem(i);
                    what = x.childNodes[3].childNodes[0].innerHTML;
                    // if (what == "Aankomst") {
                    // Instead of checking if this is the correct line, just act as if it's correct
                    // If it isn't this will certainly fail.
                    try {
                        d = new tl_date();
                        d.set_time(x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[3].textContent.match("(\\d\\d?)\\:(\\d\\d)\\:(\\d\\d)"));
                        t = d.adjust_day(x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[1].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));
                        where = x.childNodes[0].childNodes[2].textContent;
                
                        try {
                            e = tl_get_event(t, where, active_vil);
                        }
                        catch(er){
                            if (er == "ERR_EVENT_OVERWRITE") continue;
                            throw er;
                        }
                        for (var j = 1; j<12; j++) {
                            y = x.childNodes[2].childNodes[j];
                            if (y!=undefined)
                                e[j] = y.textContent - 0;
                        }

                        e[0] = TYPE_ATTACK;
                    } catch (e) {
                        // So it probably wasn't the correct line.
                    }
                }
        }
    
        // Reports 
        if (location.href.indexOf("berichte.php?id")>0) {
            try {
                res = document.evaluate( "//table[@class='tbg']/tbody", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
                x = res.singleNodeValue;
                if (x != undefined) {
                    if (x.innerHTML.indexOf("\n<tbody><tr class=\"cbg1\">\n")>0) {
                        d = new tl_date();

                        time = x.childNodes[2].childNodes[3].textContent.match("(\\d\\d?)[/.](\\d\\d)[/.](\\d\\d) [ a-zA-Z]+ (\\d\\d?):(\\d\\d):(\\d\\d)");
                        d.set_time(time.slice(3, 7)); // The first element in the array passed is ignored...
                        t = d.set_day(time.slice(1, 4));
                        where = x.childNodes[0].childNodes[3].innerHTML;
                
                        e = tl_get_event(t,where);
                        e[12] = where;
                
                        // army composition + losses
                        x = x.childNodes[6].childNodes[1];
                        dualrow=false;
                        if (x.childNodes[2]==undefined) {
                            x = x.childNodes[1].childNodes[1]; 
                        } else {
                            x = x.childNodes[2].childNodes[1]; 
                            dualrow=true;
                        }

                        for (var j = 1; j<12; j++) {
                            y1 = x.childNodes[3].childNodes[j];
                            if (dualrow) y2 = x.childNodes[4].childNodes[j];
                            if (y1!=undefined) {
                                if (dualrow && y2.textContent>0)
                                    e[j] = [y1.textContent - 0, y2.textContent - 0];
                                else
                                    e[j] = y1.textContent - 0;
                            }
                        }
                
                        // profit
                        if (dualrow) {
                            if (x.childNodes[5].childNodes[3] != undefined) {
                                y = x.childNodes[5].childNodes[3].textContent.split(" ");                
                                for (var j = 1; j<5; j++) {
                                    e[j + 12] = y[j - 1] - 0;
                                }
                            }
                        } else {
                            if (x.childNodes[4].childNodes[3] != undefined) {
                                y = x.childNodes[4].childNodes[3].textContent.split(" ");                
                                e[16] = 0-y[0];
                            }
                        }
                        e[0] = TYPE_REPORT;
                    }
                }
            } catch (er){
                if (er != "ERR_EVENT_OVERWRITE") throw er;
            }
        } else if (location.href.indexOf("dorf")>0) { // building build task:
            bouw = document.getElementById("lbau1");
            if (bouw == undefined)
                bouw = document.getElementById("lbau2");
            if (bouw != undefined) {
                y = bouw.childNodes[1].childNodes[0];
                for (nn in y.childNodes) {
                    x = y.childNodes[nn];

                    where = x.childNodes[1].textContent;

                    d = new tl_date();
                    d.set_time(x.childNodes[3].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
                    t = d.adjust_day(x.childNodes[2].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));

                    res = document.evaluate( "//div[@class='dname']/h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );

                    // What's the point of this again??
                    var h = 0;
                    for(var i = 0; i < x.length; i ++) {
                        h*=13;
                        h+=i;
                        h%=127;
                    }
                    t+=h*2;
                    try {
                        e = tl_get_event(t, where, active_vil);
                    } catch (er){
                        if (er == "ERR_EVENT_OVERWRITE") continue;
                        throw er;
                    }
                    e[0] = TYPE_BUILDING;
                }
            }
        } else if (location.href.indexOf('build.php')>0){ // If we're on an individual building page
            // Market Deliveries
            if (document.forms[0] != undefined &&
                document.forms[0].innerHTML.indexOf('/b/ok1.gif" onmousedown="btm1(')>0){ // And there is a OK button
                // Then this must be the market! (in a language-insensitive manner :D)

                var shipment = document.evaluate('//table[@class="tbg"]/tbody', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var i=0; i < shipment.snapshotLength; i++){
                    x = shipment.snapshotItem(i);
                    d = new tl_date();

                    // Extract the arrival time
                    d.set_time(x.childNodes[2].childNodes[2].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));

                    // Extract and adjust by the duration of the shipment
                    t = d.adjust_day(x.childNodes[2].childNodes[1].textContent.match('(\\d\\d?):(\\d\\d):(\\d\\d)'));

                    // Extract the value of the shipment
                    res = x.childNodes[4].childNodes[1].textContent.split(' | ');
                    Debug.debug("Merchant carrying "+res);
                
                    // Check if merchant is returning
                    ret = x.childNodes[4].childNodes[1].childNodes[0].className[0]=='c';
                    if (ret) Debug.debug("Merchant is returning");

                    // Extract the action type
                    type = x.childNodes[0].childNodes[3].textContent;
                    
                    try {
                        e = tl_get_event(t, type, active_vil);
                    } catch (er){
                        if (er == "ERR_EVENT_OVERWRITE") continue;
                        throw er;
                    }

                    e[0] = TYPE_MARKET;

                    // Add resource pictures and amounts (if sending)
                    if (!ret)
                        for (j=0; j<4; j++)
                            e[13+j]=res[j];
                }
            }

            // Party events! Still a building...
            // The theory here is "look for a table who's second td has an explicit width of 25% and is not a header".
            // This should be exclusive for Town Halls.
            x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class="cbg1")]/td[(position()=2) and (@width="25%")]',
                                  document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            if (x.snapshotLength == 1){
                x = x.snapshotItem(0).parentNode;
                d = new tl_date();

                Debug.info("Found a party event!");

                d.set_time(x.childNodes[5].textContent.match('(\\d\\d?):(\\d\\d) ([a-z]*)'));
                t = d.adjust_day(x.childNodes[3].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));

                msg = x.childNodes[1].textContent;
                Debug.debug('Type = '+msg);

                try {
                    e = tl_get_event(t, msg, active_vil);
                    e[0] = TYPE_PARTY;
                } catch (er){
                    if (er != 'ERR_EVENT_OVERWRITE') throw er;
                    Debug.info('An event already exists at this time!');
                }
            }
            
            // Research Events
            // Ok, the idea here is to look for a building with a table of class 'tbg' that has its first
            // td with width=6%. For a baracks training troops, it would be 5%. Markets et al don't
            // explicitly specify a width. It's a bit of a hack, but the simplest I can come up with...
            // This is still inside the if(building) statement
            try {
                x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class)]/td[(@width="6%") and (position()<2)]',
                                      document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
                if (x.snapshotLength == 1){
                    x = x.snapshotItem(0).parentNode;
                    d = new tl_date();

                    d.set_time(x.childNodes[7].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
                    t = d.adjust_day(x.childNodes[5].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));

                    // Extract the unit being upgraded
                    type = x.childNodes[3].textContent;
                    Debug.debug("Upgrading "+type);

                    // Extract the name of the building where the upgrade is occuring
                    // y is the table above the research-in-progress table
                    y = x.parentNode.parentNode.previousSibling.previousSibling.childNodes[1];
                    building = y.childNodes[0].childNodes[1].textContent;
                    Debug.debug("Upgrading at the "+building);

                    // Extract the level upgrading to - not for the acadamy!
                    // We can't go far into these <td>s, because Beyond changes its guts (a lot!). Messing too much around
                    // in there could create compatibility problems... so keep it remote with textContent.
                    for (var i=0; i < y.childNodes.length; i++){
                        level = y.childNodes[i].childNodes[1].textContent.match(type+' ([(][A-Z][a-z]* )(\\d\\d?)([)])');
                        if (level){
                            level[2] -= -1; // It's upgrading to one more than its current value. Don't use '+'.
                            level = level[1]+level[2]+level[3];
                            Debug.debug("Upgrading to "+level);
                            break;
                        }
                    }

                    // And now throw all of this information into an event
                    // Don't throw in the level information if we're  researching a new unit at the acadamy... because there isn't any!
                    e = tl_get_event(t, building+': '+type+(level ? ' '+level : ''), active_vil);
                    e[0] = TYPE_RESEARCH;

                } else if (x.snapshotLength > 1) alert ("Something's wrong. Found "+x.snapshotLength+" matches for xpath search");
            } catch (er){
                if (er != "ERR_EVENT_OVERWRITE") throw er;
            }
        }

        /////////////////////////////////
        // End Timeline Data collector //
        /////////////////////////////////


        Timeline.full_height  = (Timeline.history+Timeline.future)*Timeline.height; // pixels

        // Create timeline canvas + container
        tl = document.createElement("canvas");
        tlc = document.createElement("div");
        if (Timeline.position_fixed)
            tlc.style.position = "fixed";
        else
            tlc.style.position = "absolute";
        tlc.style.top      = "0px";
        tlc.style.right    = "0px";
        tlc.style.width    = (Timeline.collapse?Timeline.collapse_width:Timeline.width) + "px";
        tlc.style.height   = Timeline.full_height + "px";
        tlc.style.zIndex   = "20";
        tlc.style.backgroundColor=Timeline.color;
        tlc.style.visibility = GM_getValue(prefix("TL_VISIBLE"), "visible");
        tlc.style.overflow = "hidden";
        tl.id = "tl";
        tl.width  = Timeline.width;
        tl.height = Timeline.full_height;
        tl.style.position = "relative";
        tl.style.left = (Timeline.collapse?Timeline.collapse_width-Timeline.width:0)+"px";
        tlc.appendChild(tl);
        document.body.appendChild(tlc);
    
        // Code for expanding/collapsing the timeline.
        if (Timeline.collapse) {
            tl_col_cur = Timeline.collapse_width;
            tl_col_tar = Timeline.collapse_width;
            tl_col_run = false;
            tl_col_prev = 0;
            function tlc_fade() {
                tl_col_next = new Date().getTime();
                diff = (tl_col_next - tl_col_prev) / 1000.0;
                tl_col_prev = tl_col_next;
                tl_col_run = true;
                if (tl_col_cur==tl_col_tar) {
                    tl_col_run = false;
                    return;
                }
                if (tl_col_cur<tl_col_tar) {
                    tl_col_cur+=Timeline.collapse_speed*diff;
                    if (tl_col_cur>tl_col_tar)
                        tl_col_cur=tl_col_tar;
                }
                if (tl_col_cur>tl_col_tar) {
                    tl_col_cur-=Timeline.collapse_speed*diff;
                    if (tl_col_cur<tl_col_tar)
                        tl_col_cur=tl_col_tar;
                }
                tlc.style.width = tl_col_cur + "px";
                tlc.firstChild.style.left = (tl_col_cur-Timeline.width)+"px";
                setTimeout(tlc_fade, 1000/Timeline.collapse_rate);
            }
            function tlc_expand(e) {
                tl_col_tar = Timeline.width;
                tl_col_prev = new Date().getTime();
                if (!tl_col_run) tlc_fade();
            }
            function tlc_collapse(e) {
                tl_col_tar = Timeline.collapse_width;
                tl_col_prev = new Date().getTime();
                if (!tl_col_run) tlc_fade();
            }
            tlc.addEventListener('mouseover',tlc_expand,false);
            tlc.addEventListener('mouseout',tlc_collapse,false);
        }
    
        // Show/hide timeline (click-event listener)
        function toggle_tl(e) {
            tlc.style.visibility=tlc.style.visibility!='hidden'?'hidden':'visible';
            GM_setValue(prefix("TL_VISIBLE"), tlc.style.visibility);
        }
    
        button = document.createElement("div");
        button.style.position = tlc.style.position;
        button.style.backgroundColor = "rgba(0,0,128,0.5)";
        button.style.right = "0px";
        button.style.top = "-2px";
        button.style.width  = "60px";
        button.style.height = "21px";
        button.style.zIndex = "20";
        button.style.textAlign = "center";
        button.style.color = "#fff";
        button.style.fontWeight = "bold";
        button.style.MozBorderRadiusBottomleft = "6px";    
        button.style.cursor = "pointer";
        button.addEventListener('click',toggle_tl,true);
        button.innerHTML = "timeline";
        document.body.appendChild(button);

        function determine_now() {
            // d = time corresponding to the top of the timeline
            // n = current time. (with time difference applied)
        
            // get server time
            server_time = tp1.textContent.split(":");
            
            // determine 'now'
            d = new Date();
            d.setTime(d.getTime()+Timeline.time_difference*3600000); // Adjust local time to server time.
            if (Timeline.use_server_time) {
                t = d.getTime();
                d.setHours(server_time[0]);
                d.setMinutes(server_time[1]);
                d.setSeconds(server_time[2]);
                d.setMilliseconds(0);
                if (d.getTime()<t-60000)
                    d.setDate(d.getDate()+1);
            }

            n = new Date();
            n.setTime(d.getTime());
        
            d.setMilliseconds(0);
            d.setSeconds(0);
            if (d.getMinutes()<15) {
                d.setMinutes(0);
            } else if (d.getMinutes()<45) {
                d.setMinutes(30);
            } else {
                d.setMinutes(60);    
            }
        
            tl_warp_now = (n.getTime() - d.getTime())/1000/60 + Timeline.history;
            tl_warp_now/=Timeline.history+Timeline.future;
        }

        // Delete events older than Timeline.distance_history
        determine_now();
        list = { };
        old = d.getTime()-Timeline.distance_history*60000;
        for (e in events) {
            if (e>old) {
                list[e] = events[e];            
                // room for updates: (for migration to new versions of this script)
            }
        }
        events=list;
        GM_setValue(prefix("TIMELINE"),uneval(events));

        // warp helper function
        function tl_warp_deform(y) {
            return y - y*(y-tl_warp_now)*(y-1);
        }
    
        // transforms the y coordinate if Timeline.scale_warp is in use.
        function tl_warp(y) {
            if (!Timeline.scale_warp) return y*Timeline.height;
            y+=Timeline.history;
            y/=Timeline.history+Timeline.future;
        
            y = tl_warp_deform(tl_warp_deform(y));
        
            y*=Timeline.history+Timeline.future;
            y-=Timeline.history;
            return y*Timeline.height;
        }

        // Wrapped timeline drawing code in a function such that it can be called once every minute.
        function update_timeline(once) {
            if (once == undefined) once = false;
            determine_now();
            tl_update_data();
        
            // Get context
            var g = tl.getContext("2d");
            g.clearRect(0,0,Timeline.width,Timeline.full_height);
            g.save();
                
            // Draw bar
            g.translate(Timeline.width - 9.5, Timeline.history * Timeline.height + .5);
        
            g.strokeStyle = "rgb(0,0,0)";
            g.beginPath();
            g.moveTo(0,-Timeline.history * Timeline.height);
            g.lineTo(0, Timeline.future  * Timeline.height);
            g.stroke();
            for (var i=-Timeline.history - Timeline.scroll_offset; i<=Timeline.future - Timeline.scroll_offset; i+=1) {
                g.beginPath();
                l = -2;
                ll = 0;
                if (i%5 == 0) l-=2;
                if (i%15 == 0) l-=2;
                if ((i + d.getMinutes())%60 == 0) ll+=8;
                g.moveTo(l, tl_warp(i + Timeline.scroll_offset));
                g.lineTo(ll,  tl_warp(i + Timeline.scroll_offset));    
                g.stroke();
            }

            // Draw times
            g.mozTextStyle = "8pt Monospace";
            function round15(i){ return Math.floor(i/15)*15;}
            function drawtime(i, t) {
                h = t.getHours()+"";
                m = t.getMinutes()+"";
                if (m.length==1) m = "0" + m;
                x = h+":"+m;

                g.save();
                g.translate(-g.mozMeasureText(x) - 10, 4 + tl_warp(i + Timeline.scroll_offset));
                g.mozDrawText(x);    
                g.restore();    
            }
            for (var i=round15(-Timeline.history - Timeline.scroll_offset);
                 i <= round15(Timeline.future - Timeline.scroll_offset); i+=15) {
                t = new Date(d);
                t.setMinutes(t.getMinutes() + i);
                drawtime(i, t);
            }

            // Draw current time
            g.strokeStyle = "rgb(0,0,255)";
            g.beginPath();
            diff = (n.getTime() - d.getTime()) / 1000 / 60;
            y = tl_warp(diff + Timeline.scroll_offset);
            g.moveTo(-8, y);
            g.lineTo( 4, y);    
            g.lineTo( 6, y-2);    
            g.lineTo( 8, y);    
            g.lineTo( 6, y+2);    
            g.lineTo( 4, y);    
            g.stroke();

            g.fillStyle = "rgb(0,0,255)";
            drawtime(diff, n);

            // Highlight the 'elapsed time since last refresh'
            if (global.script_start==undefined) global.script_start = new Date().getTime();
            diff2 = (global.script_start - d.getTime()) / 1000 / 60;
            y2 = tl_warp(diff2 + Timeline.scroll_offset);
            g.fillStyle = "rgba(0,128,255,0.1)";
            g.fillRect(9-Timeline.width, y,Timeline.width+1, y2-y);

            unit = new Array(17);
            for (i=1; i<12; i++) {
                unit[i] = new Image();
                if (i==11)
                    unit[i].src = "img/un/u/hero.gif";
                else
                    unit[i].src = "img/un/u/"+(Settings.race*10+i)+".gif";
            }

            for (i=13; i<17; i++) {
                unit[i] = new Image();
                unit[i].src = "img/un/r/"+(i-12)+".gif";
            }


            function left(q) {
                if (q.constructor == Array)
                    return q[0]-q[1];
                else
                    return q-0;
            }

            // Draw data
            for (e in events) {
                p = events[e];
                diff = (e - d.getTime()) / 1000 / 60 + Timeline.scroll_offset;
                if (diff<-Timeline.history || diff>Timeline.future) continue;
                y = tl_warp(diff);
                y = Math.round(y);
                g.strokeStyle = TIMELINE_EVENT_COLORS[p[0]];
                g.beginPath();
                g.moveTo(-10, y);
                g.lineTo(-50, y);    
                g.stroke();
            
                g.fillStyle = "rgb(0,128,0)";
                var cap = 60*left(p[1])+40*left(p[2])+110*left(p[5]) - ((p[13]-0)+(p[14]-0)+(p[15]-0)+(p[16]-0));
                cap = (cap<=0)?"*":"";
                g.save();
                g.translate(20 - Timeline.width - g.mozMeasureText(cap), y+4);
                g.mozDrawText(cap + p[12]);
                g.restore();

                if (p[17]) {
                    g.fillStyle = "rgb(0,0,128)";
                    g.save();
                    g.translate(20 - Timeline.width, y-5);
                    g.mozDrawText(p[17]);
                    g.restore();
                }

                if (Timeline.report_info) {
                    g.fillStyle = "rgb(64,192,64)";
                    g.save();
                    g.translate(-40, y+4+12); // Move this below the message.
                    for (i = 16; i>0; i--) {
                        if (i==12)
                            g.fillStyle = "rgb(0,0,255)";
                        else if (p[i]) {
                            try {
                                g.translate(-unit[i].width - 8, 0);
                                g.drawImage(unit[i], -0.5, Math.round(-unit[i].height*0.7) -0.5);
                            } catch (e) {
                                // This might fail if the image is not yet or can't be loaded.
                                // Ignoring this exception prevents the script from terminating to early.
                                var fs = g.fillStyle;
                                g.fillStyle = "rgb(128,128,128)";
                                g.translate(-24,0);
                                g.mozDrawText("??");
                                g.fillStyle = fs;
                            }
                            if (p[i].constructor == Array) {
                                g.fillStyle = "rgb(192,0,0)";
                                g.translate(-g.mozMeasureText(-p[i][1]) - 2, 0);
                                g.mozDrawText(-p[i][1]);
                                g.fillStyle = "rgb(0,0,255)";
                                g.translate(-g.mozMeasureText(p[i][0]), 0);
                                g.mozDrawText(p[i][0]);
                            } else {
                                g.translate(-g.mozMeasureText(p[i]) - 2, 0);
                                g.mozDrawText(p[i]);
                            }
                        }
                    }
                }
                g.restore();
            }
            g.restore();
            if (Timeline.keep_updated && once) {
                setTimeout(update_timeline,Timeline.update_interval);
            }
        }
    
        update_timeline();
        
        // For displaying time properly.
        function pad2(x) {
            if (x<10) return "0"+x;
            else return x;
        }
    
        // To keep the link with the 'travian task queue'-script working properly, we also need to be able 
        // to undo the warping. I'm using a simple binairy search for that.
        function tl_unwarp(y) {
            y-=Timeline.history*Timeline.height;
            if (!Timeline.scale_warp) return y/Timeline.height;
            var b_l = -Timeline.history;
            var b_h =  Timeline.future;
            for (i=0; i<32; i++) {
                b_m = (b_l+b_h)/2;
                if (y<tl_warp(b_m)) {
                    b_h=b_m;
                } else {
                    b_l=b_m;
                }
            }
            return (b_l+b_h)/2;
        }
    
        // The click event listener for the link  with the 'travian task queue'-script.
        function setAt(e) {
            var at = document.getElementById("at");
            if (at) {
                // d = 'top of the timeline time'        
                var n = new Date();
                n.setTime(d.getTime() + (tl_unwarp(e.pageY - tl_scroll_offset*TIMELINE_SIZES_HEIGHT)) *60*1000);
                s=(n.getFullYear())+"/"+(n.getMonth()+1)+"/"+n.getDate()+" "+n.getHours()+":"+pad2(n.getMinutes())+":"+pad2(n.getSeconds());
                at.value=s;
            }
        }
    
        tlc.addEventListener("click",setAt,false);

        // TODO: This might be useful for displaying only the events from *some* villages, not all at once
        // Could maybe have the basic canvas with just the timeline and no events, and then layer
        // canvases on top with events from just one village? That way can turn them on/off at will.
        // It would also be best to save the point of rotation as a GM_value...
        // Mouse Scroll Wheel
        function tl_mouse_wheel(e){
            if (Timeline.scroll_offset - e.detail * Timeline.height >= Timeline.distance_history - Timeline.history) return;

            e.stopPropagation(); // Kill the event to the standard window...
            e.preventDefault();
            Timeline.scroll_offset -= e.detail * Timeline.height; // Timeline.scroll_offset is in minutes...
            update_timeline(true); // We don't want this call to start its own series of display updates...
        }

        // Could scroll backwards and forwards on the timeline
        // We also probably want to stop the mouse scrolling from propegating in this case...
        tlc.addEventListener('DOMMouseScroll', tl_mouse_wheel, false);
    
    } /* Timeline.enabled */

    script_duration = 0;

}catch(e){alert(e);}

Feature.forall('init',true);

function main(){
    storeInfo();
    if (Timeline.enabled) tl_main();
    Feature.forall('run',true);
}

window.addEventListener('load', main, false); // Run everything after the DOM loads!
//main();
