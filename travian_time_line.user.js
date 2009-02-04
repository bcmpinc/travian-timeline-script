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

// Get relative position of a dom element
// Modified to work in the used situation.
// TODO consider removal of this function.
function getPos(obj) { 
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;
    var l = obj.offsetLeft;
    var t = obj.offsetTop;
    return [l,t,w,h];
}

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
        GM_log(this.name+'.'+fn_name+': '+e)
    }
    if (once) this[fn_name]=nothing;
    if (!this.end) this.end=new Object();
    this.end[fn_name] = new Date().getTime();
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
        GM_log(e);
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
        GM_log(e);
    }
};

// Appends a DOM element to parent_element that can be used to modify this setting.
Settings.config=function(parent_element) {
    try {
        var s = document.createElement("span");
        var setting = this;
        var settingsname = this.name.replace("_"," ").pad(20);
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
        GM_log(e.lineNumber-347+': '+e);
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
Debug.setting("level", 0, Settings.type.enumeration, Debug.categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Debug.print  =GM_log;
Debug.init   =function() {
    for (var i in Debug.categories) {
        Debug[i]=Debug[Debug.categories[i]]=(i <= this.level)?this.print:nothing;
    }
};
Debug.run("init",true);
//if (unsafeWindow.console) unsafeWindow.console.log(msg); // firebug logging


// TODO: remove following BWC:
var d_level=d_all;
var d_none=-1, d_highest=0, d_hi=1, d_med=2, d_low=3, d_lowest=4, d_all=4;
function debug(lvl, msg){
    Debug.print(msg);
}
dbg=Debug.print;



/****************************************
 *  LINES
 ****************************************/

Feature.create("Lines");
Lines.setting("enabled",        true, Settings.type.bool, undefined, "Enable the map lines"); 
Lines.setting("update_allies",  true, Settings.type.bool, undefined, "Automatically create and remove lines to ally members."); 



// TODO: remove following BWC:
USE_EXTRA_VILLAGE = true;           // Add additional vilages to the vilage list.

SPECIAL_LOCATIONS = []; // Draws lines to these locations on the map.
// SPECIAL_LOCATIONS = [[-85,149],[-80,146],[-300,-292],[-301,-292]]; 

// Idea is to add a special category to some category list here. 
// These will then also be added to the villages.

// These villages are added to the villages list 
// (without link, but travian beyond will recognize them and add attack and merchant links)

VILLAGES = [];  
// VILLAGES = [["WW 1", 25, -155],
//            ["WW 2", -170, 158]];


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
        navi_table.parentNode.childNodes[1].href="?";
            
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
 *  MARKET
 ****************************************/

Feature.create("Market");
Market.setting("enabled",            true,  Settings.type.bool, undefined, "Color the market offers to quickly determine their value.");
Market.setting("show_production",    true,  Settings.type.bool, undefined, "Add resource/minute and resources on market information to the resource bar.");



/****************************************
 *  TIMELINE
 ****************************************/
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



/****************************************
 *  CURRENT END OF REDESING ATTEMPT
 ****************************************/


    //////////////////////////////////////////
    //  COLLECT SOME INFO                   //
    //////////////////////////////////////////

    function storeInfo(){
        // Meaning of GM Values: (Some of the variable names are in dutch, to stay compatible with older scripts) 
        //
        // DORP (dutch for village): 
        //      id of the current active village. It's 0 when only 1 village is available and does not always accurate.
        // 
        // MARKT (dutch for market):
        //      an array of length 4 containing the amount of resources currently available for sale on the marketplace. (might often be inaccurate)
        //
        // PRODUCTIE (dutch for production):
        //      an array of length 4 containing the production rates of resp. wood, clay, iron and grain. (amount produced per hour)
        //
        // ALLIANCE:
        //      dictionary (map) mapping the names of your ally's members to a list of it's villages. 

        none = "0,0,0,0";

        // Keep track of current city id
        x = location.href.match("newdid=(\\d+)");
        if (x!=null) {
            dorp_id=x[1]-0;
            GM_setValue(prefix("DORP"),dorp_id);
        } else {
            dorp_id=GM_getValue(prefix("DORP"),0);
        }

        // Store info about resources put on the market if availbale
        x = document.getElementById("lmid2");
        if (x!=null && x.innerHTML.indexOf("\"dname\"")>0) {
            var res = document.evaluate( "//table[@class='f10']/tbody/tr[@bgcolor='#ffffff']/td[2]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
    
            var cnt = new Array(0,0,0,0);
    
            for ( var i=0 ; i < res.snapshotLength; i++ ){
                c = res.snapshotItem(i).textContent - 0;
                t = res.snapshotItem(i).firstChild.src.match("\\d") - 1;
                cnt[t] += c;
            }
            markt = eval(GM_getValue(prefix("MARKT"), "{}"));
            if (markt==undefined) markt={};
            markt[dorp_id]=cnt;
            GM_setValue(prefix("MARKT"), uneval(markt));
        }

        // Store info about production rate if available
        //function storeProductionRate(){
        if (location.href.indexOf("dorf1")>0) {
            var res = document.evaluate( "//div[@id='lrpr']/table/tbody/tr", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
            var prod = new Array(0,0,0,0);
    
            for ( var i=0 ; i < res.snapshotLength; i++ ){
                c = res.snapshotItem(i).childNodes[4].firstChild.textContent.match("-?\\d+") - 0;
                t = res.snapshotItem(i).childNodes[1].innerHTML.match("\\d")[0] - 1;
                prod[t] += c;
            }
            productie = eval(GM_getValue(prefix("PRODUCTIE"), "{}"));
            if (productie==undefined) productie={};
            productie[dorp_id]=prod;
            GM_setValue(prefix("PRODUCTIE"), uneval(productie));
        }

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
    //  ENHANCED RESOURCE INFO              //
    //////////////////////////////////////////

    // Enhance resource info
    function res_main(){
        //if (Market.show_production) {
        head = document.getElementById("lres0");
        if (head!=null) {
            a="";
            head = head.childNodes[1].childNodes[0];
        
            cnt  = eval(GM_getValue(prefix("MARKT"),     "{}"))
                prod = eval(GM_getValue(prefix("PRODUCTIE"), "{}"));
            if (cnt !=undefined) cnt  = cnt [dorp_id];
            if (prod!=undefined) prod = prod[dorp_id];
            if (cnt ==undefined) cnt =[0,0,0,0];
            if (prod==undefined) prod=[0,0,0,0];
        
            cur = head.textContent.split("\n").filter(function(x) {return x[0]>='0' && x[0]<='9'; });
        
            for ( var i=0 ; i < 4; i++ )
                {
                    if (cnt[i]>0)
                        c = "+" + cnt[i] + " ";
                    else
                        c = ""
                            p = (prod[i]>0?"+":"") + Math.round(prod[i]/6)/10.0;
                    a+="<td></td><td>"+c+p+"/m</td>";
                    cur[i] = cur[i].split("/")[0];
                }
            a+="<td></td><td></td>";
            
            tr = document.createElement("tr");
            head.appendChild(tr);
            tr.innerHTML = a;

        }
    }

    //////////////////////////////////////////
    //  MARKET COLORS                       //
    //////////////////////////////////////////

    //if (Market.enabled) {
    function mkt_main(){
        function colorify() { 
            x = document.getElementById("lmid2");
            if (x!=null && x.innerHTML.indexOf("</tr><tr class=\"cbg1\">")>0) {
                var res = document.evaluate( "//table[@class='tbg']/tbody/tr[not(@class) and not(@bgcolor)]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
            
                for ( var i=0 ; i < res.snapshotLength; i++ )
                    {
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
            }
        }
        for (i=1; i<=10; i++) 
            setTimeout(colorify,i*1000);
        colorify();
    } 

    //////////////////////////////////////////
    //  ALLY LINES                          //
    //////////////////////////////////////////

    // Show lines to allies and yourself
    //if (Lines.update_allies) {
    function al_main(){
        // <canvas width=200 height=200 style="position: absolute; left: 80px; top: 100px; z-index: 15;"/>
        var res = document.evaluate( "//img[@usemap='#karte']", document, null, XPathResult. ANY_UNORDERED_NODE_TYPE, null );
        x = res.singleNodeValue;
        if (x != null) {
            pos = getPos(x);
            canvas=document.createElement("canvas");
            canvas.style.position = "absolute";
            canvas.style.left = pos[0]+"px";
            canvas.style.top  = pos[1]+"px";
            canvas.style.zIndex = 14;
            canvas.width  = pos[2];
            canvas.height = pos[3];
        
            rdiv=document.createElement("div");
            rdiv.style.position = "absolute";
            rdiv.style.left = "315px";
            rdiv.style.top  = "500px";
            rdiv.style.border = "solid 1px #000";
            rdiv.style.background = "#ffc";
            rdiv.style.zIndex = 16;
            rdiv.style.padding = "3px";
            rdiv.style.MozBorderRadius = "6px";

            x.parentNode.insertBefore(canvas, x.nextSibling);
            document.body.appendChild(rdiv);
        
            var rx = document.evaluate( "//input[@name='xp']", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );   
            var ry = document.evaluate( "//input[@name='yp']", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );   

            posx = rx.singleNodeValue.value - 0;
            posy = ry.singleNodeValue.value - 0;

            function update() {
                x = GM_getValue(prefix("SPECIAL_LOCATIONS"));    
                if (x!==undefined && x!=="") {
                    SPECIAL_LOCATIONS = eval(x);
                }

                var g = canvas.getContext("2d");
                g.clearRect(0,0,pos[2],pos[3]);
                g.save()
                    g.translate(pos[2]/2-1,pos[3]/2 + 5.5);
                        
                function touch(x, y) {
                    x -= posx;
                    y -= posy;
                    if (x<-400) x+=800;
                    if (x> 400) x-=800;
                    if (y<-400) y+=800;
                    if (y> 400) y-=800;
                    g.beginPath();
                    px = 1.83*(x+y);
                    py = 1.00*(x-y);
                    px += py/50;
                    px2 = px * 20;
                    py2 = py * 20;
                    g.moveTo(px,py);
                    g.lineTo(px2,py2);
                    if (x!=0 || y!=0) 
                        g.fillRect(px-2,py-2,4,4);
                    g.stroke();

                    if (x>=-3 && x<=3 && y>=-3 && y<=3) {
                        if (x==0 && y==0) 
                            g.lineWidth = 2.5;
                        g.beginPath();
                        g.moveTo(px2+20,py2);
                        g.arc(px2,py2,20,0,Math.PI*2,true);
                        g.stroke();
                        if (x==0 && y==0) 
                            g.lineWidth = 1;
                    }
                }
            
                g.fillStyle   = "rgba(128,128,128,0.8)";
                for (a in ally) {
                    b = ally[a][2];
                    if (a == Settings.username) {
                        g.strokeStyle = "rgba(128,64,0,1.0)";
                    } else {
                        g.strokeStyle = "rgba(0,128,255,0.4)";
                    }
                
                    for (c in b) {
                        touch(b[c][1],b[c][2]);
                    }
                }

                g.strokeStyle = "rgba(255,0,128,0.8)";
                for (i=0; i<SPECIAL_LOCATIONS.length; i++) {
                    p=SPECIAL_LOCATIONS[i];
                    touch(p[0],p[1]);
                }                
                g.restore();
            
                wasc = Settings.server;
                rdiv.innerHTML = "<b>Analyze neighbourhood:</b><br/>Radius: " +
                    "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",5\" > 5</a>, "+
                    "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",10\">10</a>, "+
                    "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",15\">15</a>, "+
                    "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",20\">20</a>, "+
                    "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",25\">25</a>";
            }
        
            update();
        
            function upd() {
                setTimeout(upd2,50);
            }
        
            function upd2(){
                z = unsafeWindow.m_c.z;
                try {
                    if (z != null) {
                        if (posx != z.x || posy != z.y) {
                            posx  = z.x - 0;
                            posy  = z.y - 0;
                            update();
                        }
                    }
                } catch (e) {
                    alert(e);
                }
            }            

            document.addEventListener('click',upd,true);
            document.addEventListener('keydown',upd,true);
            document.addEventListener('keyup',upd,true);
        }
    
        // add a "this location is special!" button to the map's village view.
        if (location.href.indexOf("karte.php?d=")>0) {
            res = document.evaluate( "//div[@id='lmid2']//h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
            x = res.singleNodeValue;
            if (x) {
                l = x.textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
                insl = false;
                for (v in SPECIAL_LOCATIONS) {
                    if (SPECIAL_LOCATIONS[v][0]==l[1] &&
                        SPECIAL_LOCATIONS[v][1]==l[2]) {
                        insl=true;
                        break;
                    }
                }
                addspecial = document.createElement("a");
                addspecial.innerHTML = "s";
                addspecial.title = "[timeline] Toggle ("+l[1]+"|"+l[2]+") as special location.";
                addspecial.href="#";
                addspecial.style.color = insl?"#0f0":"#f00";
                addspecial.className=l[1]+","+l[2]+","+(insl?1:0);
                function addsl(e){
                    var el = e.target;
                    var l = el.className.split(",");
                    if (l[2]>0) {
                        last = SPECIAL_LOCATIONS.pop();
                        for (v in SPECIAL_LOCATIONS) {
                            if (SPECIAL_LOCATIONS[v][0]==l[2] &&
                                SPECIAL_LOCATIONS[v][1]==l[3]) {
                                SPECIAL_LOCATIONS[v]=last;
                                break;
                            }
                        }
                    } else {
                        SPECIAL_LOCATIONS.push([l[0]-0,l[1]-0]);
                    }
                    GM_setValue(prefix("SPECIAL_LOCATIONS"), uneval(SPECIAL_LOCATIONS));
                    el.style.color = l[2]<1?"#0f0":"#f00";
                    el.className=l[0]+","+l[1]+","+(1-l[2]);
                }
                addspecial.addEventListener('click',addsl,true);
                x.appendChild(addspecial); 
                x.parentNode.style.zIndex=5;
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
            [0,                     0 ~ Unused (used to be the type of event)
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
        function getevent(t, msg, name) {
            if (name == undefined) name = '';
            e = events[t];
            if (e == undefined) {
                e = [0,0,0,0,0,0,0,0,0,0,0,0,msg,0,0,0,0,name];
                events[t]=e;
            } else {
                debug(d_low, "An event already exists at this time!");
                throw "ERR_EVENT_OVERWRITE";
            }
            return e;
        }
    
        function parseTime(time, format, day){
            // time is interpreted as [hours, minutes, seconds (optional)]
            // format is either 'am', 'pm', or '' (optional).
            // day is [day, month, year (optional)]. (all optional)
            // TODO: support non-european date/time formats (orderings change...)
            // TODO: fix the 12pm bug?

            debug(d_med, 'Parsing capture time info!\ntime='+time.join(':')+' '+(format==undefined?'':format)+(day==undefined?'':(' day='+day.join('.'))));

            d = new Date();
            d.setTime(d.getTime()+Timeline.time_difference*3600000);
            time_now = d.getTime();

            // If we're given a date as well as a time... as in reports etc
            if (day != undefined){
                debug(d_low, 'Given date info to parse');
                d.setDate(day[0]);
                d.setMonth(day[1] - 1);
                if (day[2] != undefined) d.setYear('20'+day[2]);

                // The milliseconds are here so that a report doesn't prevent a build from being listed if they're at the same time.
                // This is a *bit* of a hack...
                d.setMilliseconds(0);
            } else {
                debug(d_low, 'Not given any date info for parsing');
                d.setMilliseconds(1);
            }

            if (format=='pm') time[0] -= -12; // We're potentially dealing with strings here, so we can't use the '+' operator...

            d.setHours(time[0]);
            d.setMinutes(time[1]);
            d.setSeconds(time[2] == undefined ? 0 : time[2]);

            if (day == undefined){
                // If we aren't explicitly given a day, we need to be careful of wrap-around midnights...
                if (d.getTime() < time_now - 60000){ // 60000 is arbitrary...
                    debug(d_lowest, 'Date rollover - this event occured too far in the past');
                    d.setDate(d.getDate()+1);
                }
            }

            debug(d_med, 'parseTime() returning '+d.getTime());

            return d;
        }

        // Extract the active village
        try {
            active_vil = document.evaluate('//a[@class="active_vl"]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue.textContent;
        } catch (e) {
            active_vil = 0;
        }
        debug(d_low, "The active village is: "+active_vil);

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
                        time = x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[3].textContent.match("(\\d\\d?)\\:(\\d\\d)\\:(\\d\\d)");
                        duration = x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[1].textContent.match('(\\d\\d?):\\d\\d:\\d\\d')[1]/24;
                        duration = Math.floor(duration);
                        where = x.childNodes[0].childNodes[2].textContent;
                
                        t = parseTime(time.slice(1, 4));
                        if (duration > 0){
                            debug(d_low, 'Duration is > 24 hours: '+duration);
                            t.setDate(t.getDate()+duration);
                        }
                        t = t.getTime();
                
                        try {
                            e = getevent(t, where, active_vil);
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
                    } catch (e) {
                        // So probably it wasn't the correct line.
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
                        time = x.childNodes[2].childNodes[3].textContent.match("(\\d\\d?).(\\d\\d).(\\d\\d) [ a-zA-Z]+ (\\d\\d?):(\\d\\d):(\\d\\d)");
                        where = x.childNodes[0].childNodes[3].innerHTML;
                
                        t = parseTime(time.slice(4, 7), '', time.slice(1, 4)).getTime();
                        e = getevent(t,where);
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
                    }
                }
            } catch (er){
                if (er != "ERR_EVENT_OVERWRITE") throw er;
            }
        }

        // building build task:
        if (location.href.indexOf("dorf")>0) {
            bouw = document.getElementById("lbau1");
            if (bouw == undefined)
                bouw = document.getElementById("lbau2");
            if (bouw != undefined) {
                y = bouw.childNodes[1].childNodes[0];
                for (nn in y.childNodes) {
                    x = y.childNodes[nn];
                    time = x.childNodes[3].textContent; 
                    time = time.match("(\\d\\d?):(\\d\\d) ?([a-z]*)");
                    duration = Math.floor(x.childNodes[2].textContent.match('(\\d\\d?):\\d\\d:\\d\\d')[1]/24);
                    where = x.childNodes[1].textContent;
                
                    t = parseTime(time.slice(1, 3), time[3]);
                    if (duration > 0){
                        debug(d_low, 'Duration is > 24 hours: '+duration);
                        t.setDate(t.getDate()+duration);
                    }
                    t = t.getTime();

                    res = document.evaluate( "//div[@class='dname']/h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );

                    var h = 0;
                    for(var i = 0; i < x.length; i ++) {
                        h*=13;
                        h+=i;
                        h%=127;
                    }
                    t+=h*2;
                    try {
                        e = getevent(t, where, active_vil);
                    } catch (er){
                        if (er == "ERR_EVENT_OVERWRITE") continue;
                        throw er;
                    }
                }
            }
        }

        // Market Deliveries
        if (location.href.indexOf('build.php')>0 && // If we're on a building page
            document.forms[0] != undefined &&
            document.forms[0].innerHTML.indexOf('/b/ok1.gif" onmousedown="btm1(')>0){ // And there is a OK button
            // Then this must be the market! (in a language-insensitive manner :D)

            var shipment = document.evaluate('//table[@class="tbg"]/tbody', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            for (var i=0; i < shipment.snapshotLength; i++){
                x = shipment.snapshotItem(i);

                // Extract the arrival time
                time = x.childNodes[2].childNodes[2].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)');
                debug(d_low, "Merchant arriving at "+time);

                // Extract the duration of the shipment
                duration = Math.floor(x.childNodes[2].childNodes[1].textContent.match('(\\d\\d?):\\d\\d:\\d\\d')[1]/24);

                // Extract the value of the shipment
                res = x.childNodes[4].childNodes[1].textContent.split(' | ');
                debug(d_low, "Merchant carrying "+res);
                
                // Check if merchant is returning
                ret = x.childNodes[4].childNodes[1].childNodes[0].className[0]=='c';
                if (ret) debug(d_low, "Merchant is returning");

                // Extract the action type
                type = x.childNodes[0].childNodes[3].textContent;

                // Parse time appropriately...
                t = parseTime(time.slice(1, 3), time[3]);
                if (duration > 0){
                    debug(d_low, 'Duration is > 24 hours: '+duration);
                    t.setDate(t.getDate()+duration);
                }
                t = t.getTime();

                try {
                    e = getevent(t, type, active_vil);
                } catch (er){
                    if (er == "ERR_EVENT_OVERWRITE") continue;
                    throw er;
                }

                // Add resource pictures and amounts (if sending)
                if (!ret)
                    for (j=0; j<4; j++)
                        e[13+j]=res[j]-0;
            }
        }

        // Research Events
        // Ok, the idea here is to look for a building with a table of class 'tbg' that has a
        // td with width=6%. For a baracks training troops, it would be 5%. Markets et al don't
        // explicitly specify a width. It's a bit of a hack, but the simplest I can come up with...
        if (location.href.indexOf('build.php')>0){ // If we're not on a building page, don't bother with the expensive evaluation
            try {
                x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class)]/td[(@width="6%") and (position()<2)]',
                                      document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
                if (x.snapshotLength == 1){
                    //alert("You must be on an *active* research building");
                    x = x.snapshotItem(0).parentNode;

                    // Extract the completion time
                    time = x.childNodes[7].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)');
                    debug(d_low, "Research completing at "+time);

                    // Extract the duration
                    duration = Math.floor(x.childNodes[5].textContent.match('(\\d\\d?):\\d\\d:\\d\\d')[1]/24);

                    // And parse it appropriately
                    t = parseTime(time.slice(1, 3), time[3]);
                    if (duration > 0){
                        debug(d_low, 'Duration is > 24 hours: '+duration);
                        t.setDate(t.getDate()+duration);
                    }
                    t = t.getTime();

                    // Extract the unit being upgraded
                    type = x.childNodes[3].textContent;
                    debug(d_low, "Upgrading "+type);

                    // Extract the name of the building where the upgrade is occuring
                    // y is the table above the research-in-progress table
                    y = x.parentNode.parentNode.previousSibling.previousSibling.childNodes[1];
                    building = y.childNodes[0].childNodes[1].textContent;
                    debug(d_low, "Upgrading at the "+building);

                    // Extract the level upgrading to - not for the acadamy!
                    // We can't go far into these <td>s, because Beyond changes its guts (a lot!). Messing too much around
                    // in there could create compatibility problems... so keep it remote with textContent.
                    for (var i=0; i < y.childNodes.length; i++){
                        level = y.childNodes[i].childNodes[1].textContent.match(type+' ([(][A-Z][a-z]* )(\\d\\d?)([)])');
                        if (level){
                            level[2] -= -1; // It's upgrading to one more than its current value. Don't use '+'.
                            level = level[1]+level[2]+level[3];
                            debug(d_low, "Upgrading to "+level);
                            break;
                        }
                    }

                    // And now throw all of this information into an event
                    // Don't throw in the level information if we're  researching a new unit at the acadamy... because there isn't any!
                    e = getevent(t, building+': '+type+(level ? ' '+level : ''), active_vil);

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
                    unit[i].src = "img/un/u/hero.gif"
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
                g.strokeStyle = "rgb(0,0,0)";
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
                n.setTime(d.getTime() + (tl_unwarp(e.pageY)) *60*1000);
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

    function ev_main(){
        res = document.evaluate( "//div[@id='lright1']/table/tbody", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
    
        function newcell(innerhtml) {
            cell = document.createElement("td");
            cell.innerHTML = innerhtml;
            cell.className = "nbr";
            return cell;
        }
    
        if (tab = res.singleNodeValue) {
            for (i = 0; i < VILLAGES.length; i++) {
                x = VILLAGES[i];
                row = document.createElement("tr");
                row.appendChild(newcell("<span>• </span> "+x[0]));
                row.appendChild(newcell("<table cellspacing=\"0\" cellpadding=\"0\" class=\"dtbl\">\n<tbody><tr>\n<td class=\"right dlist1\">("+x[1]+"</td>\n<td class=\"center dlist2\">|</td>\n<td class=\"left dlist3\">"+x[2]+")</td>\n</tr>\n</tbody></table>"));
                tab.appendChild(row);
            }
        }
    } /* USE_EXTRA_VILLAGE */

    script_duration = 0;

}catch(e){alert(e);}

Feature.forall('init',true);

function main(){
    storeInfo();
    if (Market.show_production) res_main();
    if (Market.enabled) mkt_main();
    if (Lines.update_allies) al_main();
    if (Timeline.enabled) tl_main();
    if (USE_EXTRA_VILLAGE) ev_main();
    Feature.forall('run',true);
}

window.addEventListener('load', main, false); // Run everything after the DOM loads!
//main();
