// ==UserScript==
// @name           Travian Time Line
// @namespace      TravianTL
// @version        0.33
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
// - If you have the 'Travian Task Queue'-script, you can click on the timeline to
// automatically enter the schedule time.
// - If you have the 'Travian Beyond'-script, additional villages will also get an
// attack and a merchant link button. (Currently you have to add these additional
// villages in the scripts source code.)
/*****************************************************************************/
 
/****************************************
 * JAVASCRIPT ENHANCEMENTS
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
};

// Add spaces (or s) to make the string have a length of at least n
// s must have length 1.
String.prototype.pad = function(n,s,rev) {
    if (s==undefined) s=" ";
    n = n-this.length;
    if (n<=0) return this;
    if (rev)
        return s.repeat(n)+this;
    else
        return this+s.repeat(n);
};

function pad2(x) {
    if (x<10)
        return "0"+x;
    return x;
}

// Functions missing in Math
Math.sinh     = function(x) { return .5*(Math.exp(x)-Math.exp(-x)); };
Math.cosh     = function(x) { return .5*(Math.exp(x)+Math.exp(-x)); };
Math.arsinh   = function(x) { return Math.log(x+Math.sqrt(x*x+1)); };
Math.arcosh   = function(x) { return Math.log(x+Math.sqrt(x*x-1)); };
 
function tl_date(){
    this.date = new Date();
    this.date.setTime(this.date.getTime());
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
 
        Debug.debug('time is: '+this.date);

        return this.date.getTime();
    }
 
    this.set_day = function(day){
        // day is [day, month, year (optional)]. Month is 1-12.
        Debug.debug('Setting the day: '+day);
 
        this.date.setFullYear(day[2] == undefined ? this.date.getFullYear() : '20'+day[2], day[1] - 1, day[0]);
 
        Debug.debug('time is: '+this.date);
 
        return this.date.getTime();
    }
 
    this.adjust_day = function(duration){
        // The idea with this is to compare a duration value with the current day/time, and adjust the day for every 24 hours in duration.
        // duration is of type [string, hours, ....].
        Debug.debug('Adjusting the day by: '+duration);
 
        this.date.setDate(this.date.getDate() + Math.floor(duration[1]/24));
 
        // Cover the wrap-around cases. If an event has a duration, then it must be in the future. Hence, if the time we've set for it
        // is in the past, we've done something wrong and it's probably a midnight error.
        // This check needs to be done carefully, or some events will get pushed 24 hours father into the future than they should be.
        if (this.date.getTime() < this.start_time-600000) this.date.setDate(this.date.getDate() + 1);
 
        Debug.debug('time is: '+this.date);
 
        return this.date.getTime();
    }

    this.set_seconds = function(duration){
        // This will change the time such that it approximates the completion time better. 
        // Note that this approximation is not consistent between pageloads.
        // duration is of type [string, hours, minutes, seconds].
        Debug.debug('Setting seconds with: '+duration);
 
        var date2=new Date();
        date2.setHours(date2.getHours()- -duration[1]);
        date2.setMinutes(date2.getMinutes()- -duration[2]);
        date2.setSeconds(date2.getSeconds()- -duration[3]);
        
        // Check wheter the new value isn't screwed up somehow.
        Debug.debug('new time would be: '+date2);
        if (Math.abs(date2.getTime()-this.date.getTime())<60000) {
            this.date=date2;
        }
  
        Debug.debug('time is: '+this.date);
 
        return this.date.getTime();
    }
}
 
function nothing(){}
 
/****************************************
 * FEATURE
 ****************************************/
 
try{
 
Feature=new Object();
Feature.list=[];
Feature.init=nothing;
Feature.run =nothing;
// This is used to create a basic setting
Feature.setting=function(name, def_val, type, typedata, description, hidden, parent_el) {
    var s = new Object();
    if (type==undefined) type=Settings.type.none;
    if (hidden==undefined || typeof(hidden) != 'string') hidden='false';
    s.__proto__ = Settings;
    s.fullname = Settings.server+'.'+Settings.username+'.'+this.name+'.'+name;
    s.parent = this;
    s.name = name;
    this[name] = def_val;
    s.type = type;
    s.typedata = typedata;
    s.description = description;
    s.hidden = hidden;
    if (parent_el != undefined) s.parent_el = parent_el;
    s.def_val = def_val;
    s.read();
    this.s[name] = s;
    return s;
};
// This adds a given element directly
Feature.direct=function(type, hidden){
    var s = new Object();
    s.__proto__ = Settings;
    s.el = document.createElement(type);
    if (hidden==undefined || typeof(hidden) != 'string') hidden='false';
    s.hidden = hidden;
    
    // Create a new, unique index for it to be stored in
    s.type = type;
    for (var i=0; this.s[s.type+i] != undefined; i++);
    var name = s.type + i;

    // Overwrite the normal functions... we want different behaviour for this guy...
    s.config = function(parent_element){
        while (s.el.childNodes.length > 0) s.el.removeChild(s.el.childNodes[0]);
        parent_element.appendChild(s.el);
    };
    s.read = nothing;
    s.write = nothing;

    this.s[name] = s;
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
// A feature is enabled if it doesn't have an enabled field or its enabled field is not
// exactly equal to false.
Feature.forall=function(fn_name, once) {
    for (var n in this.list) {
        if (this.list[n].enabled!==false)
            this.list[n].call(fn_name, once);
    }
};

/****************************************
 * SETTINGS
 ****************************************/

Feature.create("Settings");
Settings.type = {none: 0, string: 1, integer: 2, enumeration: 3, object: 4, bool: 5};
Settings.server=function(){
    // This should give the server id as used by travian analyzer.
    var url = location.href.match("//([a-zA-Z]+)([0-9]*)\\.travian(?:\\.com?)?\\.(\\w+)/");
    if (!url) return "unknown";
    var a=url[2];
    if (url[1]=='speed') a='x';
    if (url[1]=='speed2') a='y';
    return url[3]+a;
}();
// This has to come after we know what Settings.server is
Settings.username=function(){
    return GM_getValue(Settings.server+'.Settings.username');
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
                    if (setting.type==Settings.type.integer) {
                        if (val=="") val = setting.def_val;
                        else val-=0;
                    }
                    setting.set(val);
                    setting.write();
                    Settings.fill(); // Redraw everything, in case a eval condition has changed
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
                    Settings.fill(); // Redraw everything
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
            s.style.color = this.get()?'green':'red';
            s.innerHTML = settingsname+": <u>"+this.get()+"</u>"+hint+"\n";
            s.addEventListener("click",function (e) {
                    var val=!setting.get();
                    s.style.color = val?'green':'red';
                    s.childNodes[1].innerHTML = val;
                    setting.set(val);
                    setting.write();
                    Settings.fill(); // Redraw everything
                },false);
            break;
        }
        }
        // Insert the element.
        if (setting.parent_el){ // If we have an expressed parent element
            if (setting.parent_el.type == 'table'){ // create the tr's and td's
                var tr = document.createElement('tr');
                var td = document.createElement('td');
                td.appendChild(s);
                tr.appendChild(td);
                setting.parent_el.el.appendChild(tr);
            } else setting.parent_el.el.appendChild(s);
        } else parent_element.appendChild(s); // Default if we have no given parent
    } catch (e) {
        GM_log(e);
    }
};
Settings.setting("race",         0,         Settings.type.enumeration, ["Romans","Teutons","Gauls"]);
Settings.setting("village_names",{},        Settings.type.object,      undefined,"The names of the villages.");
Settings.setting("current_tab",  "Settings",Settings.type.string,      undefined, '', 'true');
Settings.run=function() {
    // First, test to see if this is the login page. If it is, extract the login name and prefix it to all variables
    if (location.href.indexOf('/login.php') > 0){
        var login = document.evaluate('//input[(@class="fm fm110") and (@type="text")]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
        var name = login.value;
        if (name == undefined) name = 'someone';
        GM_setValue(Settings.server+'.Settings.username', name);
        login.addEventListener('change', function(e){
                var name = e.target.value.toLowerCase();
                if (name == undefined) return;
                // We have to do this the manual way, because we can't figure out the namespace to extract username from until we know the username...
                GM_setValue(Settings.server+'.Settings.username', name);
            }, false);
        return;
    }
    // Create link for opening the settings menu.
    var div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex   = "2";
    var right = Timeline.width;
    if (Timeline.collapse) right = Timeline.collapse_width;
    if (!Timeline.enabled) right = 0;
    right+=5;
    div.style.right           = right+"px";
    div.style.top             = "-5px";
    div.style.MozBorderRadius = "6px";
    div.style.padding         = "3px";
    div.style.border          = "1px solid #999";
    div.style.background      = "#ccc";
    div.innerHTML = "<a href=\"#\" style=\"color: blue; font-size: 12px;\">Travian Time Line Settings</a>";
    document.body.appendChild(div);
    var link = div.firstChild;
    link.style.cursor="pointer";
    link.addEventListener("click",Settings.show,false);

    // Extract the active village
    // These values below are sufficient to keep things working when only 1 village exists.
    Settings.village_name = "";
    Settings.village_id = 0;
    try {
        var village_link = document.evaluate('//a[@class="active_vl"]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
        Settings.village_name = village_link.textContent;
        Settings.village_id=village_link.href.match("newdid=(\\d+)")[1]-0;
    } catch (e) {
        // If this fails, there probably is only 1 village.
        // Having the name in the timeline isn't really usefull then.
    }
    Debug.debug("The active village is "+Settings.village_id+": "+Settings.village_name);
    Settings.village_names[Settings.village_id]=Settings.village_name;
    Settings.s.village_names.write();
};
Settings.show=function() {
    var w = document.createElement("div");
    w.style.position = "fixed";
    w.style.zIndex   = "250";
    w.style.left     = "0px";
    w.style.top      = "0px";
    w.style.right    = "0px";
    w.style.bottom   = "0px";
    w.style.background = "rgba(192,192,192,0.8)";
    w.innerHTML = '<div style="position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; cursor: pointer;"></div>'+
                  '<div style="position: absolute; left: 50%; top: 50%;">'+
                  '<pre style="position: absolute; left: -300px; top: -250px; width: 600px; height: 400px;'+
                  ' border: 3px solid #000; background: #fff; overflow: auto; padding: 8px;'+
                  ' -moz-border-radius-topleft:12px; -moz-border-radius-topright:12px;">'+
                  '</pre></div>';
    document.body.appendChild(w);
    Settings.window = w;
    try {
        var p = w.childNodes[1];
        function add_el(type) {
            var el=document.createElement(type);
            p.appendChild(el);
            return el;
        }

        // First we need to create the tabs...
        var txt = '<tbody>';
        for (var n in Feature.list){
            var f = Feature.list[n];
            if (f.s == undefined) continue;

            txt += '<tr align="right"><td style="padding: 5px 0px;"><a href="#" style="-moz-border-radius-topleft:8px; -moz-border-radius-bottomleft:8px;'+
                'padding:2px 11px 3px; border: 2px solid #000; '+
                (n==Settings.current_tab?'background: #fff; border-right: none;':'background: #ddd; border-right: 3px solid black;')+
                ' color:black; outline: none;">'+
                f.name + '</a></td></tr>';
        }
        txt += '</tbody>';

        // Then we need to create the tab bar, to switch between tabs
        var tabbar = add_el('table');
        tabbar.innerHTML = txt;
        tabbar.style.position="absolute";
        tabbar.style.width = "150px";
        tabbar.style.left  = "-445px";
        tabbar.style.top   = "-200px";

        Settings.fill();
        
        var notice = add_el('pre'); // Add the copyright
        notice.innerHTML="Copyright (C) 2008, 2009 Bauke Conijn, Adriaan Tichler\n"+
            "GNU General Public License as published by the Free Software Foundation;\n"+
            "either version 3 of the License, or (at your option) any later version.\n"+
            "This program comes with ABSOLUTELY NO WARRANTY!";
        notice.style.color="#666";
        notice.style.fontStyle="italic";
        notice.style.fontSize="75%";
        notice.style.textAlign="center";
        notice.style.position="absolute";
        notice.style.left="-300px";
        notice.style.top="180px";
        notice.style.width="600px";
        notice.style.padding="1px 8px";
        notice.style.border="3px solid #000";
        notice.style.background="#fff";
        notice.style.MozBorderRadiusBottomleft ="12px";
        notice.style.MozBorderRadiusBottomright="12px";

        // Add click listeners to all of the tab buttons
        var tabs=tabbar.childNodes[0].childNodes;
        for (var n in tabs){
            var a = tabs[n].childNodes[0].childNodes[0];
            a.addEventListener('click', function(e){
                var el = e.target;
                var f = Feature.list[el.textContent];
                Settings.current_tab=el.textContent;
                Settings.s.current_tab.write();

                // Reset the background colours of *all* tab buttons
                for (var i in tabs){
                    tabs[i].childNodes[0].childNodes[0].style.background = "#ddd";
                    tabs[i].childNodes[0].childNodes[0].style.borderRight = "3px solid black";
                }

                el.style.background = "#fff"; // Turn the colour of the clicked element white
                el.style.borderRight = "none"; // Simulate that the tab is connected to the settings page

                Settings.fill();
            }, false);
        }
    } catch (e) {
        Debug.exception("Settings.show", e);
    }
    w.firstChild.addEventListener("click",Settings.close,false);
};

// This fills/refreshes the display portion of the settings table
Settings.fill=function(){
    var disp = Settings.window.childNodes[1].childNodes[0];
    var f = Feature.list[Settings.current_tab];
    if (f){
        disp.innerHTML = '';
        for (var i in f.s){ // And refill it
            if (eval(f.s[i].hidden)) continue; // Ignore hidden elements
            f.s[i].read();
            f.s[i].config(disp);
        }
    }
}

Settings.close=function(){
    remove(Settings.window);
};

// TODO: remove following BWC (backwards compatability code)
function prefix(s) {
    return "speed.nl."+s;
}



/****************************************
 * DEBUG
 ****************************************/

Feature.create("Debug");
// These categories are in order from extremely severe to extremely verbose and
// are converted to functions in the Debug namespace using the specified name.
// Example: Debug.warning("This shouldn't have happend!");
// Using the index is also allowed: Debug[1]("This shouldn't have happend!");
// has the same effect as the previous example.
Debug.categories=["none","fatal","error","warning","info","debug","all"];
Debug.methods=["console","firebug"];
Debug.setting("level", 0, Settings.type.enumeration, Debug.categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Debug.setting("output", 0, Settings.type.enumeration, Debug.methods, "Where should the debug output be send to.");
Debug.print =GM_log;
Debug.lineshift = function(){
    try { p.p.p=p.p.p; } catch (e) { return e.lineNumber-577; } // Keep the number in this line equal to it's line number. Don't modify anything else.
}();
Debug.exception=function(fn_name, e) {
    // The lineshift is to correct the linenumber shift caused by greasemonkey.
    var msg = fn_name+' ('+(e.lineNumber-Debug.lineshift)+'): '+e;
    try {
        Debug.error(msg);
    } catch (ee) {
        GM_log(msg);
    }
};
Debug.init =function() {
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
 * LINES (and circles)
 ****************************************/

Feature.create("Lines");
Lines.setting("enabled", true, Settings.type.bool, undefined, "Enable the map lines");
Lines.setting("update_owned", true, Settings.type.bool, undefined, "Automatically create and remove lines to your villages.");
Lines.setting("update_ally", true, Settings.type.bool, undefined, "Automatically create and remove lines to ally members.");
Lines.setting("update_allies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of allied alliances.");
Lines.setting("update_naps", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of nap-alliances.");
Lines.setting("update_enemies", true, Settings.type.bool, undefined, "Automatically create and remove lines to members of alliances, with which your ally is at war.");
Lines.setting("update_crop", true, Settings.type.bool, undefined, "Automatically create and remove lines to 9- and 15-croppers.");
Lines.setting("list_extra_villages", true, Settings.type.bool, undefined, "Append villages in the 'extra' category to the villages list.");
Lines.setting("analyze_neighbourhood", true, Settings.type.bool, undefined, "Add links to travian analyzer on the map page, for analyzing the neighbourhood.");
Lines.setting("scale", .05, Settings.type.integer,undefined, "The square at the start of a line will be at (this_value*location's_distance_from_center) from the center.");
Lines.setting("categories", { /* <tag>: [ <color> , <drawline> ], */
        none: ["",false], // ie. remove from 'locations'.
            owned: ["rgba(192,128,0,1.0)", true],
            ally: ["rgba(0,0,255,0.5)", true],
            allies: ["rgba(0,255,0,0.5)", true],
            naps: ["rgba(0,255,255,0.5)", false],
            enemies: ["rgba(255,0,0,0.5)", true],
            crop9: ["rgba(255,128,0.5)", true],
            crop15: ["rgba(255,128,1.0)", true],
            extra: ["rgba(128,128,128,0.5)", true],
            farms: ["rgba(255,255,255,0.5)", true],
            ban: ["rgba(0,0,0,0.5)", false],
            natar: ["rgba(128,64,0,0.5)", false],
            other: ["rgba(255,0,255,0.5)", true]
            }, Settings.type.object, undefined, "The different types of categories. The order of this list defines the order in which they are listed and drawn.");
Lines.setting("locations", {}, Settings.type.object, undefined, "List of special locations.");
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
            row.appendChild(newcell("<span>%Gâ¢%@ </span> "+location[3]));
            row.appendChild(newcell("<table cellspacing=\"0\" cellpadding=\"0\" class=\"dtbl\">\n<tbody><tr>\n<td class=\"right dlist1\">("+location[0]+"</td>\n<td class=\"center dlist2\">|</td>\n<td class=\"left dlist3\">"+location[1]+")</td>\n</tr>\n</tbody></table>"));
            tab.appendChild(row);
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
        document.addEventListener('click', Lines.delayed_update,true);
        document.addEventListener('keydown',Lines.delayed_update,true);
        document.addEventListener('keyup', Lines.delayed_update,true);
    }

    Lines.tag_tool();
};


/****************************************
 * SIDEBAR
 ****************************************/

Feature.create("Sidebar");
Sidebar.setting("enabled", true, Settings.type.bool, undefined, "Cutomize the sidebar");
Sidebar.setting("use_hr", true, Settings.type.bool, undefined, "Use <hr> to seperate sidebar sections instead of <br>");
Sidebar.setting("remove_plus_button", true, Settings.type.bool, undefined, "Removes the Plus button");
Sidebar.setting("remove_plus_color", true, Settings.type.bool, undefined, "De-colors the Plus link");
Sidebar.setting("remove_target_blank", true, Settings.type.bool, undefined, "Removes target=\"_blank\", such that all sidebar links open in the same window.");
Sidebar.setting("remove_home_link", true, Settings.type.bool, undefined, "Redirects travian image to current page instead of travian homepage.");


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
        el=document.createElement("b"); // Create a bold header
    } else {
        el=document.createElement("a"); // Create a normal link
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
    for (var i = 0; i < Sidebar.links.length; i++) {'rgb(0,0,0)'
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
                el.innerHTML=el.textContent; // Remove color from Plus link.
            Sidebar.navi.appendChild(el);
        }
    }
};
    

/****************************************
 * RESOURCES
 ****************************************/
    
Feature.create("Resources");
Resources.setting("enabled", true, Settings.type.bool, undefined, "Turn on resource and resource rate collection.");
Resources.setting("display", true, Settings.type.bool, undefined, "Turn the resource/minute display on the resource bar on/off. Collection must be on for this to work.");
Resources.setting("market", {}, Settings.type.object, undefined, "An array of length 4 containing the amount of resources currently available for sale on the marketplace. Might often be inaccurate.");
Resources.setting("production", {}, Settings.type.object, undefined, "An array of length 4 containing the production rates of resp. wood, clay, iron and grain. (amount produced per hour)");
Resources.setting("storage", {}, Settings.type.object, undefined, "An array of length 7 containing the stored values of wood, clay, iron and grain, the size of the warehouse, the size of the granary, and then a timestamp indicating when this was taken.");

Resources.show=function() {
    var head = document.getElementById("lres0");
    if (head!=null) {
        head = head.childNodes[1].childNodes[0];
    
        var mkt = Resources.market [Settings.village_id];
        var prod = Resources.production[Settings.village_id];
        mkt = (mkt ==undefined)?[0,0,0,0]:mkt;
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
    if (x!=null && x.innerHTML.indexOf("name=\"t\" value=\"2\"")>0) {
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

    // Store the warehouse and production values - always available in the header bar!
    Resources.storage[Settings.village_id] = [];
    Resources.production[Settings.village_id] = [];
    for (var i=0; i < 4; i++){
        // These are indexed in reverse order from what we're using, and offset by one...
        var e = document.getElementById('l'+(4-i));

        // Capture current warehouse values
        Resources.storage[Settings.village_id][i] = parseInt(e.textContent.split('/')[0]);
        // Capture current production rates
        Resources.production[Settings.village_id][i] = parseInt(e.title);

        // Capture storage sizes
        if (i >= 2) Resources.storage[Settings.village_id][i+2] = parseInt(e.textContent.split('/')[1]);
    }
    // Timestamp. We don't need to worry about time offset because it's only used to compare with itself.
    Resources.storage[Settings.village_id][6] = new Date().getTime();
    // Save the values
    Resources.s.storage.write();
    Resources.s.production.write();
};


Resources.run=function(){
    Resources.update();
    if (Resources.display) Resources.show();
};


/****************************************
 * MARKET
 ****************************************/

Feature.create("Market");
Market.setting("enabled", true, Settings.type.bool, undefined, "Color the market offers to quickly determine their value.");

Market.update_colors=true; // tells whether the next call to colorify should recolor the table.

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
 * EVENTS
 ****************************************/

Feature.create("Events");
Events.setting("enabled", true, Settings.type.bool, undefined, "Enable the event data collector");
Events.setting("history", 1440, Settings.type.integer, undefined, "The time that events will be retained after happening, before being removed (in minutes)");
Events.setting("type", {/* <tag> : [<color> <visible>] */
        building: ['rgb(0,0,0)', true],
            attack : ['rgb(255,0,0)', true],
            market : ['rgb(0,128,0)', true],
            research: ['rgb(0,0,255)', true],
            party : ['rgb(255,128,128)', true],
            recruit : ['rgb(128,128,128)', true]
            }, Settings.type.object, undefined, "List of event types");
Events.setting("events", {}, Settings.type.object, undefined, "The list of collected events.");

Events.setting("predict_merchants",             false, Settings.type.bool,   undefined, "Use the sending of a merchant to predict when it will return back, and for internal trade add an event to the recieving village too");
Events.setting("merchant_send_trans",  'Transport to', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on outgoing merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants');
Events.setting("merchant_rcv_trans", 'Transport from', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on incoming merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants');
Events.setting("merchant_rtn_trans",    'Return from', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on returning merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants');


// There is no report type, because there are different types of reports, which can also be divided over the currently
// available types.

/* A event-data-packet torn apart:
   Example: { 129390: {'b9930712':["building",1225753710000,"01. Someville","Granary (level 6)",undefined,undefined]} }
   129390: #### ~ The village id
   'b9930712': #### ~ Some identifier that is both unqiue and consistent between page loads.
   ["building", 0 ~ Type of event
   1225753710000, 1 ~ Estimated time at which this event occure(s|d).
   "Granary (level 6)", 2 ~ Event message.
   3 ~ For events that might include armies (can be 'undefined')
   [0, 3. 0 ~ Amount of farm-men involved
   0, 3. 1 ~ Amount of defense-men involved
   0, 3. 2 ~ Amount of attack-men involved
   0, 3. 3 ~ Amount of scouts involved
   0, 3. 4 ~ Amount of defense-horses involved
   0, 3. 5 ~ Amount of attack-horses involved
   0, 3. 6 ~ Amount of rams involved
   0, 3. 7 ~ Amount of trebuchets involved
   0, 3. 8 ~ Amount of leaders involved
   0, 3. 9 ~ Amount of settlers involved
   0], 3.10 ~ Amount of heros involved
   4 ~ For events that might include resources (can be 'undefined')
   [0, 4. 0 ~ Amount of wood involved
   0, 4. 1 ~ Amount of clay involved
   0, 4. 2 ~ Amount of iron involved
   0]] 4. 3 ~ Amount of grain involved
   Instead of a number, the fields in field 4 and 5 are also allowed to be a tuple (list).
   In this case the first field is the original amount and the second field is the amount by which the amount has decreased.
*/

// village = id of the village.
// id = The consistent unique event identifier.
// overwrite = optionally overwrite any matching events
Events.get_event=function(village, id, overwrite) {
    var e = Events.events[village];
    if (e == undefined) {
        e = {};
        Events.events[village]=e;
        Debug.debug("Added village: "+village);
    }
    e = Events.events[village][id];
    if (e == undefined || overwrite === true) {
        e = [];
        Events.events[village][id]=e;
        Debug.debug("Created element: "+id);
    }
    return e;
};

Events.update_data=function() {
    Events.s.events.read(); // Make sure the variable data is up to date.
    // Collect new stuff
    for (var c in Events.collector) {
        try {
            Events.collector[c]();
        } catch (e) {
            Debug.exception("Events.collector."+c,e);
        }
    }

    // Remove old stuff
    // TODO: use tl_date()? Do something with server time?
    Events.pageload = new Date().getTime();
    Events.old = Events.pageload-Events.history*60000;
    for (var v in Events.events) {
        for (var e in Events.events[v]) {
            if (Events.events[v][e][1]<Events.old) {
                delete Events.events[v][e];
            }
            // room for updates: (for migration to new versions of this script)
        }
    }
    Events.s.events.write();
};

Events.run=function() {
    Events.update_data();
};


// Collectors
// ----------

Events.collector={};
Events.collector.building=function(){
    // Checking if data is available
    if (location.href.indexOf("dorf")<=0) return;
    var build = document.getElementById("lbau1");
    if (build == undefined)
        build = document.getElementById("lbau2");
    if (build == undefined) return;

    // Collecting
    build = build.childNodes[1].childNodes[0];
    for (var nn in build.childNodes) {
        var x = build.childNodes[nn];
        var id = 'b'+x.childNodes[0].childNodes[0].href.match('\\?d=(\\d+)&')[1];
        var e = Events.get_event(Settings.village_id, id);
        //if (e[0]) continue;
        e[0]="building";
    
        // TODO: get timing more accurate.
        var d = new tl_date();
        d.set_time(x.childNodes[3].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
        var duration = x.childNodes[2].textContent.match('(\\d\\d?):(\\d\\d):(\\d\\d)');
        d.adjust_day(duration);
        e[1] = d.set_seconds(duration);
        e[2] = x.childNodes[1].textContent;

        Debug.debug("Time set to "+e[1]);
    }
};

// Travelling armies (rally point)
Events.collector.attack=function(){
    var x = document.getElementById("lmid2");
    if (x==null) return;
    if (x.innerHTML.indexOf("warsim.php")<=0) return;
    var res = document.evaluate( "//table[@class='tbg']/tbody", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
    var last_event_time=0;
    var event_count=0;

    for ( var i=0 ; i < res.snapshotLength; i++ ) {
        x = res.snapshotItem(i);
        // var what = x.childNodes[3].childNodes[0].innerHTML;
        // if (what == "Aankomst") {
        // Instead of checking if this is the correct line, just act as if it's correct
        // If it isn't this will certainly fail.
        try {
            var d = new tl_date();
            d.set_time(x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[3].textContent.match("(\\d\\d?)\\:(\\d\\d)\\:(\\d\\d) ?([a-z]*)"));
            var t = d.adjust_day(x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[1].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));

            // Using the time as unique id. If there are multiple with the same time increase event_count.
            // It's the best I could do.
            if (last_event_time==t) event_count++;
            else last_event_time=t;
            var e = Events.get_event(Settings.village_id, "a"+t+"_"+event_count);
            e[0] = "attack";
            e[1] = t;
            e[2] = x.childNodes[0].childNodes[2].textContent;
            e[3] = [];
            for (var j = 0; j<11; j++) {
                var y = x.childNodes[2].childNodes[j+1];
                if (y!=undefined)
                    e[3][j] = y.textContent - 0;
            }

        } catch (e) {
            // So it probably wasn't the correct line.
        }
    }
}

// Market Deliveries
Events.collector.market=function(){
    // Make sure we're on an individual building page
    if (location.href.indexOf('build.php')<=0) return;
    if (document.forms[0] == undefined) return;
    // And there is an OK button
    if (document.forms[0].innerHTML.indexOf('/b/ok1.gif" onmousedown="btm1(')<=0) return;
    // Then this must be the market! (in a language-insensitive manner :D)

    var last_event_time=0;
    var event_count=0;

    var shipment = document.evaluate('//table[@class="tbg"]/tbody', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i=0; i < shipment.snapshotLength; i++){
        var x = shipment.snapshotItem(i);
        var d = new tl_date();

        // Extract the arrival time
        d.set_time(x.childNodes[2].childNodes[2].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));

        // Extract and adjust by the duration of the shipment
        var t = d.adjust_day(x.childNodes[2].childNodes[1].textContent.match('(\\d\\d?):(\\d\\d):(\\d\\d)'));

        // Extract the value of the shipment
        var res = x.childNodes[4].childNodes[1].textContent.split(' | ');
        Debug.debug("Merchant carrying "+res);

        // Check if merchant is returning
        var ret = x.childNodes[4].childNodes[1].childNodes[0].className[0]=='c';
        if (ret) Debug.debug("Merchant is returning");

        // Extract the transit message
        var msg = x.childNodes[0].childNodes[3].textContent;

        // Skip returning merchants if we're doing predictions - it should have already been caught
        if (! Events.predict_merchants || ! ret){
            // Using the time as unique id. If there are multiple with the same time increase event_count.
            // It's the best I could do.
            if (last_event_time==t) event_count++;
            else last_event_time=t;
            var e = Events.get_event(Settings.village_id, "a"+t+"_"+event_count);

            e[0] = "market";
            e[1] = t;
            // Extract the action type
            e[2] = msg;
    
            // Add resource pictures and amounts (if sending)
            if (!ret) e[4] = res;
        }

        // Do event prediction if needed - only done on sending merchants
        if (Events.predict_merchants && msg.indexOf(Events.merchant_send_trans) >= 0){
            var vil_name = msg.split(Events.merchant_send_trans+' ')[1];

            // First, deal with the returning merchants, as that is the easiest
            // What time will the merchants be returning? It takes the same amount of time to return as to go
            var rtn_time = 2*t - new Date().getTime();

            // Event count doesn't need to be changed here - assuming that every merchant arriving at a given time is of the same type.
            // If not, no real loss... we'll just get an overly-large event_count.
            var e_rtn = Events.get_event(Settings.village_id, 'a'+rtn_time+'_'+event_count);
            e_rtn[0] = 'market';
            e_rtn[1] = rtn_time;
            e_rtn[2] = Events.merchant_rtn_trans + ' ' + vil_name;

            // Next, let's deal with the reception village. This is more tricky...
            // We have to figure out the 'did' of the reception village, given only its name.
            // This will clearly screw up if you have multiple villages with the same name...
            /* Screw this, I'll do this later! Goddamn challenging... gah!
            var vils = document.evaluate('//table[@class="f10"]/tbody/tr/td[@class="nbr"]/a',
                                         document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            for (var j=0; j < vils.snapshotLength; j++){
                if (vils.snapshotItem(j).textContent.indexOf(vil_name) >= 0){
                    var did = vils.snapshotItem(j).href.split('newdid=')[1];
                    if (did.indexOf('&') >= 0) did = did.split('&')[0];
                    break;
                }
            }
            // We might not be sending to ourselves...
            if (did != undefined){
                // Ok, this is tricky. Recieving villages have to get indexed by the *sender's id* as well...
                // This is because if we *do* view the incoming merchants from the other side, we don't want double-reporting...
                var e_rcv = Events.get_event(did, 'a'+t+'_'+event_count2+'_'+Settings.village_id);
            }
            */
        }
    }
}

Events.collector.research = function(){
    // Make sure we're on a building page
    if (location.href.indexOf('build.php') < 0) return;
    var x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class)]/td[(@width="6%") and (position()<2)]',
                              document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    // If we have a research in progress...
    if (x.snapshotLength != 1) return;

    x = x.snapshotItem(0).parentNode;
    var d = new tl_date();
 
    d.set_time(x.childNodes[7].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
    var t = d.adjust_day(x.childNodes[5].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));
 
    // Extract the unit being upgraded
    var type = x.childNodes[3].textContent;
    Debug.debug("Upgrading "+type);
 
    // Extract the name of the building where the upgrade is occuring
    // y is the table above the research-in-progress table
    var y = x.parentNode.parentNode.previousSibling.previousSibling.childNodes[1];
    var building = y.childNodes[0].childNodes[1].textContent;
    Debug.debug("Upgrading at the "+building);
 
    // Extract the level upgrading to - not for the acadamy!
    // We can't go far into these <td>s, because Beyond changes its guts (a lot!). Messing too much around
    // in there could create compatibility problems... so keep it remote with textContent.
    for (var i=0; i < y.childNodes.length; i++){
        var level = y.childNodes[i].childNodes[1].textContent.match(type+' ([(][A-Z][a-z]* )(\\d\\d?)([)])');
        if (level){
            level[2] -= -1; // It's upgrading to one more than its current value. Don't use '+'.
            level = level[1]+level[2]+level[3];
            Debug.debug("Upgrading to "+level);
            break;
        }
    }

    // And now throw all of this information into an event
    // Don't throw in the level information if we're researching a new unit at the acadamy... because there isn't any!
    // Hash the event by the building name, because we can only have one research event per building per village
    var e = Events.get_event(Settings.village_id, t+building);
    e[0] = 'research';
    e[1] = t;
    e[2] = building + ': '+type+(level ? ' '+level : '');
}

Events.collector.party = function(){
    // Make sure we're on a building page
    if (location.href.indexOf('build.php') < 0) return;
    // The theory here is "look for a table who's second td has an explicit width of 25% and is not a header".
    // This should be exclusive for Town Halls, hence parties.
    var x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class="cbg1")]/td[(position()=2) and (@width="25%")]',
                              document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (x.snapshotLength != 1) return;
    x = x.snapshotItem(0).parentNode;

    Debug.info('Found a party event!');

    var d = new tl_date();
    d.set_time(x.childNodes[5].textContent.match('(\\d\\d?):(\\d\\d) ([a-z]*)'));
    var t = d.adjust_day(x.childNodes[3].textContent.match('(\\d\\d?):\\d\\d:\\d\\d'));

    var msg = x.childNodes[1].textContent;
    Debug.info('Party type = '+msg);

    // We can only have one party per village max; overwrite any pre-existing party records
    // (how the hell could we ever get pre-existing parties??? You can't cancel the damn things...)
    var e = Events.get_event(Settings.village_id, 'party', true);
    e[0] = 'party';
    e[1] = t;
    e[2] = msg;
}

/****************************************
 * TIMELINE
 ****************************************/

// WIP

Feature.create("Timeline");
Timeline.setting("enabled", true, Settings.type.bool, undefined, "Enable the timeline (make sure that the events feature is also enabled).");
Timeline.setting("visible", true, Settings.type.bool, undefined, "Is the timeline visible on pageload. This setting can also be changed with the timeline-button.");
Timeline.setting("collapse", false, Settings.type.bool, undefined, "Make the timeline very small by default and expand it when the mouse hovers above it.");
Timeline.setting("report_info", true, Settings.type.bool, undefined, "Show the size of the army, the losses and the amount of resources stolen");
Timeline.setting("position_fixed", false, Settings.type.bool, undefined, "Keep timeline on the same position when scrolling the page.");
Timeline.setting("keep_updated", true, Settings.type.bool, undefined, "Update the timeline every 'Timeline.update_interval' msec.");

Timeline.setting("color", "rgba(255, 255, 204, 0.5)", Settings.type.string, undefined, "Background color of the timeline");

Timeline.setting("width", 400, Settings.type.integer, undefined, "Width of the timeline (in pixels)");
Timeline.setting("height", 800, Settings.type.integer, undefined, "Height of the timeline (in pixels)");
Timeline.setting("duration", 300, Settings.type.integer, undefined, "The total time displayed by the timeline (in minutes)");
Timeline.setting("marker_seperation", 10, Settings.type.integer, undefined, "Mean distance between markers (in pixels)");
Timeline.setting("collapse_width", 60, Settings.type.integer, undefined, "Width of the timeline when collapsed (in pixels)");
Timeline.setting("collapse_speed", 1500, Settings.type.integer, undefined, "Collapse fade speed (in pixels per second)");
Timeline.setting("collapse_rate", 50, Settings.type.integer, undefined, "Update rate of the collapse fading (per second)");
Timeline.setting("update_interval", 30000, Settings.type.integer, undefined, "Interval between timeline updates. (in milliseconds)");

//Timeline.setting("use_server_time", false, Settings.type.bool, undefined, "Use the server time instead of the local clock. Requires a 24 hours clock.");
//Timeline.setting("time_difference", 0, Settings.type.integer, undefined, "If you didn't configure your timezone correctly. (server time - local time) (in hours)");

Timeline.setting("scale_warp", 0, Settings.type.integer, undefined, "Amount of timeline scale deformation. 0 = Linear, 4 = Normal, 8 = Max.");

Timeline.scroll_offset=0; // the current 'center' of the timeline.

if (Timeline.scale_warp==0) {
    Timeline.warp = function(x) { return (((x-Timeline.now-Timeline.scroll_offset)/Timeline.duration/60000)+1)/2*Timeline.height; };
    Timeline.unwarp = function(y) { return (2*y/Timeline.height-1)*Timeline.duration*60000+Timeline.now+Timeline.scroll_offset; };
} else {
    Timeline.equalize = 2*Math.sinh(Timeline.scale_warp/2);
    Timeline.warp = function(x) { return (Math.arsinh(
                                                      ((x-Timeline.now-Timeline.scroll_offset)/Timeline.duration/60000)*Timeline.equalize
                                                      )/Timeline.scale_warp +1)/2*Timeline.height; };
    Timeline.unwarp = function(y) { return Math.sinh(
                                                     (2*y/Timeline.height-1)*Timeline.scale_warp
                                                     )/Timeline.equalize*Timeline.duration*60000+Timeline.now+Timeline.scroll_offset; };
}

Timeline.create_canvas=function() {
    // Create timeline canvas + container
    var tl = document.createElement("canvas");
    var tlc = document.createElement("div");
    tlc.style.position = (Timeline.position_fixed?"fixed":"absolute");
    tlc.style.top = "0px";
    tlc.style.right = "0px";
    tlc.style.width = (Timeline.collapse?Timeline.collapse_width:Timeline.width) + "px";
    tlc.style.height = Timeline.height + "px";
    tlc.style.zIndex = "20";
    tlc.style.backgroundColor=Timeline.color;
    tlc.style.visibility = Timeline.visible?'visible':'hidden';
    tlc.style.overflow = "hidden";

    tl.id = "tl";
    tl.width = Timeline.width;
    tl.height = Timeline.height;
    tl.style.position = "relative";
    tl.style.left = (Timeline.collapse?Timeline.collapse_width-Timeline.width:0)+"px";
    tlc.appendChild(tl);
    document.body.appendChild(tlc);

    // Code for expanding/collapsing the timeline.
    // TODO: Move to seperate function(s)?
    if (Timeline.collapse) {
        var tl_col_cur = Timeline.collapse_width;
        var tl_col_tar = Timeline.collapse_width;
        var tl_col_run = false;
        var tl_col_prev = 0;
        function tlc_fade() {
            var tl_col_next = new Date().getTime();
            var diff = (tl_col_next - tl_col_prev) / 1000.0;
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

    // Mouse Scroll Wheel
    function tl_mouse_wheel(e){
        Timeline.scroll_offset += e.detail * Timeline.duration*1200; // Timeline.scroll_offset is in milliseconds

        e.stopPropagation(); // Kill the event to the standard window...
        e.preventDefault();
        Timeline.draw(true);
    }

    // Could scroll backwards and forwards on the timeline
    // We also probably want to stop the mouse scrolling from propegating in this case...
    tlc.addEventListener('DOMMouseScroll', tl_mouse_wheel, false);

    // The click event listener for the link with the 'travian task queue'-script.
    function setAt(e) {
        var at = document.getElementById("at");
        if (at) {
            var n = new Date();
            n.setTime(Timeline.unwarp(e.pageY));
            var s=(n.getFullYear())+"/"+(n.getMonth()+1)+"/"+n.getDate()+" "+n.getHours()+":"+pad2(n.getMinutes())+":"+pad2(n.getSeconds());
            at.value=s;
        }
    }
    tlc.addEventListener("click",setAt,false);

    Timeline.element=tlc;
    Timeline.context=tl.getContext("2d");
    Timeline.context.mozTextStyle = "8pt Monospace";
};

Timeline.toggle=function() {
    Timeline.visible=!Timeline.visible;
    Timeline.element.style.visibility=Timeline.visible?'visible':'hidden';
    Timeline.s.visible.write();
};

Timeline.create_button=function() {
    button = document.createElement("div");
    button.style.position = Timeline.element.style.position;
    button.style.backgroundColor = "rgba(0,0,128,0.5)";
    button.style.right = "0px";
    button.style.top = "-2px";
    button.style.width = "60px";
    button.style.height = "21px";
    button.style.zIndex = "20";
    button.style.textAlign = "center";
    button.style.color = "#fff";
    button.style.fontWeight = "bold";
    button.style.MozBorderRadiusBottomleft = "6px";
    button.style.cursor = "pointer";
    button.addEventListener('click',Timeline.toggle,false);
    button.innerHTML = "timeline";
    document.body.appendChild(button);
};

Timeline.load_images=function() {
    // TODO: A special images feature?
    Timeline.img_unit = new Array(11);
    for (i=0; i<10; i++) {
        Timeline.img_unit[i] = new Image();
        Timeline.img_unit[i].src = "img/un/u/"+(Settings.race*10+i+1)+".gif";
    }
    Timeline.img_unit[10] = new Image();
    Timeline.img_unit[10].src = "img/un/u/hero.gif";

    Timeline.img_res = new Array(4);
    for (i=0; i<4; i++) {
        Timeline.img_res[i] = new Image();
        Timeline.img_res[i].src = "img/un/r/"+(i+1)+".gif";
    }
};

Timeline.draw_info=function(img,nrs) {
    if (!nrs) return;
    var g = Timeline.context;
    try {
        g.translate(-img.width - 8, 0);
        g.drawImage(img, -0.5, Math.round(-img.height*0.7) -0.5);
    } catch (e) {
        // This might fail if the image is not yet or can't be loaded.
        // Ignoring this exception prevents the script from terminating to early.
        var fs = g.fillStyle;
        g.fillStyle = "rgb(128,128,128)";
        g.translate(-24,0);
        g.mozDrawText("??");
        g.fillStyle = fs;
    }
    if (nrs.constructor == Array) {
        g.fillStyle = "rgb(192,0,0)";
        g.translate(-g.mozMeasureText(-nrs[1]) - 2, 0);
        g.mozDrawText(-nrs[1]);
        g.fillStyle = "rgb(0,0,255)";
        g.translate(-g.mozMeasureText(nrs[0]), 0);
        g.mozDrawText(nrs[0]);
    } else {
        g.translate(-g.mozMeasureText(nrs) - 2, 0);
        g.mozDrawText(nrs);
    }
}

Timeline.draw=function() {
    // Update the event data
    Events.s.events.read();
    Timeline.now=new Date().getTime();

    // Get context
    var g = Timeline.context;
    g.clearRect(0,0,Timeline.width,Timeline.height);
    g.save();
    
    // Draw bar
    g.translate(Timeline.width - 9.5, 0);

    g.strokeStyle = "rgb(0,0,0)";
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, Timeline.height);
    g.stroke();

    // draw scale lines
    var lastmark = 0;
    for (var i=Timeline.marker_seperation/2; i<Timeline.height; i+=Timeline.marker_seperation) {
    
        // determine local scale
        var z = Timeline.unwarp(i+Timeline.marker_seperation/2) - Timeline.unwarp(i-Timeline.marker_seperation/2);
        /**/ if (z< 1000) z= 1000; // 1 sec.
        else if (z< 5000) z= 5000; // 5 sec.
        else if (z< 15000) z= 15000; // 15 sec.
        else if (z< 60000) z= 60000; // 1 min.
        else if (z< 300000) z= 300000; // 5 min.
        else if (z< 900000) z= 900000; // 15 min.
        else if (z< 3600000) z= 3600000; // 1 hr.
        else if (z<21600000) z=21600000; // 6 hr.
        else if (z<86400000) z=86400000; // 1 day.
        else continue;

        // determine the time and location
        var x = Timeline.unwarp(i);
        x = Math.round(x/z)*z;
        var y = Timeline.warp(x);
        if (x<=lastmark) continue;
        lastmark=x;
    
        var a=-8;
        var b= 0;
        var m="";
        var d = new Date();
        d.setTime(x);
        var t=d.getHours()+":"+pad2(d.getMinutes());
    
        /**/ if ((x% 3600000)==0 && d.getHours()==0
                 ) { b=8;m=
                             ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+
                             d.getDate()+" "+
                             ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" - 0:00";} // 1 day.
        else if ((x% 3600000)==0 && d.getHours()%6==0
                 ) { b=8; if (z<21600000) m=t;} // 6 hr.
        else if ((x% 3600000)==0) { b=4; if (z< 3600000) m=t;} // 1 hr.
        else if ((x% 900000)==0) {a=-6; if (z< 900000) m=t;} // 15 min.
        else if ((x% 300000)==0) {a=-4; if (z< 300000) m=t;} // 5 min.
        else if ((x% 60000)==0) {a=-2; if (z< 60000) m=t;} // 1 min.
        else if ((x% 15000)==0) {a=-1; } // 15 sec.
        else if ((x% 5000)==0) {a= 0; b=1; } // 5 sec.
        else if ((x% 1000)==0) {a= 0; b=2; } // 1 sec.
    
        g.beginPath();
        g.moveTo(a, y);
        g.lineTo(b, y);
        g.stroke();
        if (m) {
            g.save();
            g.translate(-g.mozMeasureText(m)-10, 4+y);
            g.mozDrawText(m);
            g.restore();
        }
    }

    // Draw current time
    g.strokeStyle = "rgb(0,0,255)";
    g.beginPath();
    var y = Timeline.warp(Timeline.now);
    g.moveTo(-8, y);
    g.lineTo( 4, y);
    g.lineTo( 6, y-2);
    g.lineTo( 8, y);
    g.lineTo( 6, y+2);
    g.lineTo( 4, y);
    g.stroke();

    g.fillStyle = "rgb(0,0,255)";
    var d=new Date();
    d.setTime(Timeline.now);
    var m=d.getHours()+":"+pad2(d.getMinutes());
    g.save();
    g.translate(-g.mozMeasureText(m)-10, 4+y);
    g.mozDrawText(m);
    g.restore();

    // Highlight the 'elapsed time since last refresh'
    var y2 = Timeline.warp(Events.pageload);
    g.fillStyle = "rgba(0,128,255,0.1)";
    g.fillRect(9-Timeline.width, y,Timeline.width+1, y2-y);

    // Darken forgotten history
    var y3 = Timeline.warp(Events.old);
    g.fillStyle = "rgba(0,0,0,0.5)";
    if (y3>0)
        g.fillRect(9-Timeline.width, 0,Timeline.width+1, y3);

    function left(q) {
        if (q.constructor == Array)
            return q[0]-q[1];
        else
            return q-0;
    }

    // Draw data
    for (v in Events.events) {
        for (e in Events.events[v]) {
            var p = Events.events[v][e];
            var t = Events.type[p[0]];
            var y = Timeline.warp(p[1]);
        
            // Check if this type of event is visible
            if (!(t[1])) continue;
            if (isNaN(y)) continue;
        
            // Draw the line
            g.strokeStyle = t[0];
            g.beginPath();
            g.moveTo(-10, y);
            g.lineTo(-50, y);
            g.stroke();
    
            // Draw the village id. (if village number is known, otherwise there's only one village)
            if (v>0) {
                // TODO: convert to human readable village name.
                var v_name = Settings.village_names[v];
                if (!v_name) v_name="["+v+"]";
                g.fillStyle = "rgb(0,0,128)";
                g.save();
                g.translate(20 - Timeline.width, y-5);
                g.mozDrawText(v_name);
                g.restore();
            }

            // Draw the event text
            g.fillStyle = "rgb(0,128,0)";
            // TODO: prepend an * when an attack has 100% efficiency.
            //var cap = 60*left(p[1])+40*left(p[2])+110*left(p[5]) - ((p[13]-0)+(p[14]-0)+(p[15]-0)+(p[16]-0));
            //cap = (cap<=0)?"*":"";
            g.save();
            //g.translate(20 - Timeline.width - g.mozMeasureText(cap), y+4);
            //g.mozDrawText(cap + p[2]);
            g.translate(20 - Timeline.width, y+4);
            g.mozDrawText(p[2]);
            g.restore();

            // Draw the resources info.
            if (Timeline.report_info) {
                g.save();
                g.translate(-40, y+4+12); // Move this below the message.
                if (p[4]) {
                    g.fillStyle = "rgb(64,192,64)";
                    for (var i=3; i>=0; i--) {
                        Timeline.draw_info(Timeline.img_res[i],p[4][i]);
                    }
                }
                if (p[3]) {
                    g.fillStyle = "rgb(0,0,255)";
                    for (var i=10; i>=0; i--) {
                        Timeline.draw_info(Timeline.img_unit[i],p[3][i]);
                    }
                }
                g.restore();
            }
        }
    }
    g.restore();

};

Timeline.run=function() {
    tp1 = document.getElementById("tp1");
    if (!tp1) return;

    Timeline.create_canvas();
    Timeline.create_button();
    Timeline.load_images();
    Timeline.draw();
};

/****************************************
 * Village Tool Tip
 ****************************************/
Feature.create("Tooltip");
Tooltip.setting("enabled",               true, Settings.type.bool,    undefined, "Enable the Village Tooltip (ensure the event collection feature is also enabled).");
Tooltip.setting('relative_time',        false, Settings.type.bool,    undefined, "Show times relative to the present, as opposed to the time of day.");

Tooltip.direct('br', '! Events.enabled');
Tooltip.setting("show_info",             true, Settings.type.bool,    undefined, "Show additional info about units and resources involved with the events.", '! Events.enabled');
var ttp_1 = Tooltip.direct('table');
ttp_1.el.style.borderStyle = 'none';
ttp_1.el.style.paddingLeft = '10px';
Tooltip.setting('seperate_values',       true, Settings.type.bool,    undefined, "Seperate the event values from each other with |'s. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);
Tooltip.setting('merchant_kilo_values', false, Settings.type.bool,    undefined, "Show merchant trading values in 1000's, rather than 1's. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);
Tooltip.setting('army_kilo_values',     false, Settings.type.bool,    undefined, "Show army movement values in 1000's, rather than 1's. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);

Tooltip.direct('br', '! Resources.enabled');
Tooltip.setting('show_warehouse_store',  true, Settings.type.bool,    undefined, "Display the estimated warehouse stores at the top of each tooltip. Resource collection must be on.", '! Resources.enabled');
var ttp_2 = Tooltip.direct('table');
ttp_2.el.style.borderStyle = 'none';
ttp_2.el.style.paddingLeft = '10px';
Tooltip.setting('cycle_warehouse_info',  true, Settings.type.bool,    undefined, "Only show one piece of warehouse info. Change the type by clicking on the info.", '! (Tooltip.show_warehouse_store && Resources.enabled)', ttp_2);
Tooltip.setting('resource_kilo_values', false, Settings.type.bool,    undefined, "Show resource storage values in 1000's, rather than 1's. Show warehouse store must be true.", '! (Tooltip.show_warehouse_store && Resources.enabled)', ttp_2);

Tooltip.direct('br');
Tooltip.setting("mouseover_delay",       1000, Settings.type.integer, undefined, "The delay length before the tool tip appears (in milliseconds)");
Tooltip.setting("mouseout_delay",         500, Settings.type.integer, undefined, "The delay length before the tool tip disappears (in milliseconds)");

// These are invisable variables to the user
Tooltip.setting("header_rotation",          0, Settings.type.integer, undefined, '', 'true');
Tooltip.setting("summary_rotation_type",    0, Settings.type.integer, undefined, '', 'true');
Tooltip.setting("summary_rotation",    [0, 0], Settings.type.object,  undefined, '', 'true');

Tooltip.header_mapping   = [0, 3, 1, 2]; // These are the types of display that the header will rotate through
Tooltip.summary_mapping  = [[0, 3, 1, 2], [4]]; // And this is the same thing for the summary

// This adds a mouseover to the dorf3.php link, and fills it with a summary of all tooltip information
Tooltip.overview = function(){
    if (!Tooltip.show_warehouse_store) return;

    var anchor = document.getElementById('lright1').childNodes[0];

    var div = Tooltip.make_tip(anchor, function(){
            var txt = '<table class="f10" width="100%" style="font-size:11px; border-bottom: solid black 1px; cursor:pointer"><tbody><tr>';
            txt += '<td width="15px"><img src="img/un/r/5.gif">';
            txt += '<td width="15px"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAANCAYAAACdKY9CAAAABGdBTUEAALGPC/xhBQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFBSURBVChTY/wPBAxAcO3aNYZHjx4xXLp0iaGsrAwkhB2ANIBAVlbW/8+fP/8PDw//f+fOHZgwBs0AEmloaPi/e/dusKSWlhZOxWDXgIiwsLD/f/7+/Z8cFfX//uvX+DWATN60aRNYUZOh4f8cU9P/n/BoYZg2bdr/379//88qKvrfam39f396+v9oEZH/jz98wKqNwdjY+P/Pnz//29vb/y8sK/sfrqT0/zSQThUU/L8V6i9knQwgxcDw+3/r1i2weEph4X8Paen/Z6qr/1dISf2fN2kSik1gT3///h1FcOXmzf9VWFj+n66q+t+qrv6/FWgIDIA1YAOPXrwA23wgP///XAeH/wlmZmBlODWAJH/++/dfSkzs/0JgZO6Iiflf5eeHXwPMZglFxf9Tvbz+G6iqEqcBpDE0Nvb/qjVr/gMACNfxY8xFq7QAAAAASUVORK5CYII=">';
            txt += '<td>';
            txt += '</tbody></table><table class="f10" style="font-size:11px;"><tbody>';
            var type = Tooltip.summary_rotation_type;
            var rota = Tooltip.summary_rotation[type];
            div.innerHTML = txt+Tooltip.sumarize(Tooltip.summary_mapping[type][rota])+'</tbody></table>';

            var sel = div.childNodes[0].childNodes[0].childNodes[0].childNodes;
            var disp = div.childNodes[1].childNodes[0];
            var on_click = function(type){
                if (Tooltip.summary_rotation_type == type){ // Increase the type only if we're already on this type
                    Tooltip.summary_rotation[type] = (Tooltip.summary_rotation[type]+1)%Tooltip.summary_mapping[type].length;
                    Tooltip.s.summary_rotation.write();
                } else { // We need to save it
                    Tooltip.summary_rotation_type = type;
                    Tooltip.s.summary_rotation_type.write();
                }

                disp.innerHTML = Tooltip.sumarize(Tooltip.summary_mapping[type][Tooltip.summary_rotation[type]]);
            }
            sel[0].addEventListener('click', function(){on_click(0)}, false);
            sel[1].addEventListener('click', function(){on_click(1)}, false);
        });
}

Tooltip.sumarize = function(rota){
    var rtn = '';
    var total = [0, 0, 0, 0]; // Wood, Clay, Iron, Wheat...
    var d = new Date().getTime();

    // Cycle through all of the villages
    var vils = []; // Push the html into here for alphabetizing...
    for (var did in Resources.storage){
        var s = Resources.storage[did];
        var name = Settings.village_names[did];

        var a = Tooltip.make_header(rota, d, did);
        vils.push([name, '<tr><td><a href="?newdid='+did+Tooltip.href_postfix+'">'+name+':</a>'+a[0]]);
        if (Tooltip.header_rotation != 1) for (var i in total) total[i] += a[1][i];
    }

    vils.sort();
    for (var i in vils) rtn += vils[i][1];

    if (rota != 1 && rota != 3 && rota != 4){
        rtn += '<tr><td colspan="9" style="border-top: solid black 1px;"><tr><td>Total:';
        for (var i=0; i < 4; i++){
            rtn += '<td><img src="img/un/r/'+(i+1)+'.gif"><td>';
            if (Tooltip.resource_kilo_values){
                if (total[i] > 1000000) rtn += Math.round(total[i]/100000)/10+'M';
                else if (total[i] > 10000) rtn += Math.round(total[i]/1000)+'k';
                else if (total[i] > 1000) rtn += Math.round(total[i]/100)/10+'k';
            }
            else rtn += total[i];
        }
    }
    return rtn;
}

// This extracts and parses all the data from an event in a useful fashion
Tooltip.parse_event = function(e, time){
    var e_time = new Date();
    e_time.setTime(e[1]);
    var rtn = '<td vAlign="bottom">';
    if (Tooltip.relative_time){
        var diff = e[1] - time;
        rtn += Math.floor(diff/3600000)+':'+pad2(Math.floor((diff%3600000)/60000)) + '</td>';
    } else rtn += e_time.getHours()+':'+pad2(e_time.getMinutes())+'</td>';

    if (Tooltip.show_info && (e[3] || e[4])) {
        rtn += '<td vAlign="bottom" style="color:'+Events.type[e[0]][0]+'">'+e[2]+"</td><td>";
        if (e[4]) for (var j=0; j< 4; j++) rtn+=Tooltip.convert_info(4,j,e[4][j]);
        if (e[3]) for (var j=0; j<11; j++) rtn+=Tooltip.convert_info(3,j,e[3][j]);
        rtn += '</td>';
    } else rtn += '<td vAlign="bottom" colspan="2" style="color:'+Events.type[e[0]][0]+'">'+e[2]+"</td>";
    return rtn;
}

Tooltip.village_tip = function(anchor, did){
    // This holds all of the village-specific tooltip information
    var fill = function(){
        // 'events' contains time/text pairs; the time in the first index for sorting, the text for display
        // The text is actually html consisting of table cells wrapped in <td> tags.
        // Clear before starting
        var events = [];
        var d = new Date();
        // Run through the tasks for each village
        for (var j in Events.events[did]){
            var e = Events.events[did][j];
            if (e[1] < d.getTime()) continue; // Skip if the event is in the past...

            events.push([e[1], Tooltip.parse_event(e, d.getTime())]);
        }

        events.sort();

        var txt = '';

        if (Tooltip.show_warehouse_store && store != undefined && prod != undefined){
            var time = new Date().getTime();
            var age = (time - store[6])/3600000; // In hours
            var colour = age < 1 ? '#000' : (age < 2 ? '#444' : (age < 4 ? '#777' : age < 8 ? '#aaa' : '#ddd'));
            if (age < 12){ // Don't show the header at all for really out-of-date data
                txt += '<table class="f10" width="100%" style="font-size:11px; cursor:pointer; border-bottom: 1px solid '+colour+'"><tbody><tr>';
                var header_txt = Tooltip.make_header(Tooltip.header_mapping[Tooltip.header_rotation],
                                                     time, did)[0]; // This is needed later...
                txt += header_txt;
                txt += '</tr></tbody></table>';
            }
        } else var colour = '#000';

        if (events.length > 0){
            txt += '<table class="f10" style="font-size:11px"><tbody>';
            for (var i in events) txt += '<tr>'+events[i][1]+'</tr>';
            txt += '</tbody></table>';
        }
        else txt += 'IDLE!';
        div.innerHTML = txt;
        div.style.borderColor = colour;

        // Add the click listener to the header of each tooltip
        var header = div.childNodes[0].childNodes[0].childNodes[0];
        div.childNodes[0].addEventListener('click', function(e){
                // Increment and roll over the rota
                Tooltip.header_rotation = (Tooltip.header_rotation + 1) % Tooltip.header_mapping.length;

                // Save the value...
                Tooltip.s.header_rotation.write();

                // Redraw the text in the <tr>
                header_txt = Tooltip.make_header(Tooltip.header_mapping[Tooltip.header_rotation],
                                                 new Date().getTime(), did)[0];
                header.innerHTML = header_txt;
            }, false);

        if (Tooltip.show_warehouse_store && store != undefined && prod != undefined &&
            events.length > 0 && age < 12){
            // Add the mouseover listener to the events in each tooltip, but only if it's needed
            var x = div.childNodes[1].childNodes[0].childNodes;
            for (var i in x){
                // If mousing over, change the header to what the value will be at this time
                // Well, this is slightly better than before; using the local variables of the anon function
                (function (i){
                    x[i].addEventListener('mouseover', function(e){
                            header.innerHTML = Tooltip.make_header(Tooltip.header_mapping[Tooltip.header_rotation],
                                                                   events[i][0], did)[0];
                        }, false);
                })(i);
                // Reset on mouseout
                x[i].addEventListener('mouseout', function(){header.innerHTML = header_txt;}, false);
            }
        }
    }
    var store = Resources.storage[did];
    var prod = Resources.production[did];
    var div = Tooltip.make_tip(anchor, fill);
}

Tooltip.make_header = function(rota, time, did){
    // First, find how much time has elapsed since the recorded value
    var store = Resources.storage[did];
    var prod = Resources.production[did];
    var diff = (time - store[6])/3600000; // In hours
    var rtn = '';
    var values = [];
    switch (rota){
    default:
        for (var i=0; i < 4; i++){
            rtn += '<td><img src="img/un/r/'+(i+1)+'.gif"/></td>';

            switch (rota){
            default: break;
            case 0: // Stored resources
                var r = parseInt(store[i] - (-diff * prod[i]));
                var s = store[(i < 3 ? 4 : 5)];
                // If the value has overflowed or underflowed, be sure to trim it...
                if (r > s) r = s;
                if (r < 0) r = 0;

                // Turn red if value is decreasing or within two hours of overflowing
                rtn += '<td style="color:'+ (prod[i] > 0 && (s-r)/prod[i] > 2 ? 'green' : 'red')+'">';
                if (Tooltip.resource_kilo_values){
                    rtn += r > 10000 ? Math.round(r/1000)+'k/' : (r > 1000 ? Math.round(r/100)/10+'k/' : Math.round(r)+'/');
                    rtn += s > 10000 ? Math.round(s/1000)+'k' : (s > 1000 ? Math.round(s/100)/10+'k' : s);
                }
                else rtn += Math.round(r) + '/' + s;
                rtn += '</td>';
                values.push(r);
                break;
            case 1: // Time to overflow
                // First we need to find the space remaining
                var p = prod[i];
                var c = parseInt(store[i] - (-diff * p));
                var r = store[(i < 3 ? 4 : 5)] - c;
                if ((r > 0 && p > 0) || (c > 0 && p < 0)){
                    if (p == 0){
                        rtn += '<td>inf.</td>';
                        values.push(-1);
                    }
                    else {
                        if (p > 0) time = Math.floor((r / p) * 3600); // In seconds
                        else time = Math.floor((c / (-1*p)) * 3600);
                        
                        rtn += '<td style="color:'+(time>7200 && p > 0 ? 'green' : 'red')+'">';
                        if (time >= 86400) rtn += Math.floor(time/86400)+'d '; // Possibly include days
                        rtn += Math.floor((time%86400)/3600)+':'+pad2(Math.floor((time%3600)/60))+'</td>';
                        values.push(time);
                    }
                } else {
                    rtn += '<td style="color:red">0:00</td>';
                    values.push(0);
                }
                break;
            case 2: // Resource production
                rtn += '<td>' + prod[i] + '</td>';
                values.push(prod[i]);
                break;
            case 3: // % full
                var r = parseInt(store[i] - (-diff * prod[i]));
                var s = store[(i < 3 ? 4 : 5)];
                var f = Math.round((r / s) * 100);
                // If the value has overflowed or underflowed, be sure to trim it...
                if (f > 100) f = 100;
                if (f < 0) f = 0;
                
                // Turn red if value is decreasing or within two hours of overflowing
                rtn += '<td style="color:'+ (prod[i] > 0 && (s-r)/prod[i] > 2 ? 'green' : 'red')+'">';

                rtn += f + '%</td>';
                values.push(f);
                break;
            };
        }
        break;
    case 4: // Building
        // There should only be one building in the future... get it!
        for (var i in Events.events[did]){
            var e = Events.events[did][i];
            if (e[1] < time) continue; // Ignore past events
            if (e[0] == "building"){
                rtn += Tooltip.parse_event(e, time);
                break;
            }
        }
        if (rtn == ''){
            rtn += '<td colspan="2">IDLE!</td>';
        }
        break;
    };

    return [rtn, values]; // Return both the string and the numeric values - for the summary's "total" calculation
}

// This function creates the tooltip listeners etc.
// The basic theory here is that when you mouse over 'anchor', a div gets created and filled by the callback and displayed
// It also adds listeners to prevent the div from disappearing while being moused over
Tooltip.make_tip = function(anchor, callback, param){
    var timer;
    var div = document.createElement('div');

    // This is the intrinsic tooltip-related mouseovers
    var display = function(e){
        div.setAttribute('style', 'position:absolute; top:'+(e.pageY+2)+'px; left:'+(e.pageX+4)+'px; padding:2px; z-index:200; border:solid 1px black; background-color:#fff;');
        document.getElementById('ltop1').parentNode.appendChild(div);

        // If we can mouseover the tooltip, we can add buttons and more functionality to it.
        // Clear the timeout if we mouse over the div
        div.addEventListener('mouseover', function(e){
                if (timer != undefined) window.clearTimeout(timer);
            }, false);
        div.addEventListener('mouseout', function(e){
                if (timer != undefined) window.clearTimeout(timer);
                timer = window.setTimeout(function(){
                        div.parentNode.removeChild(div);
                    }, Tooltip.mouseout_delay);
            }, false);
    }

    // Add the listeners to the original village links
    anchor.addEventListener('mouseover', function(e){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    display(e);
                    callback(param);
                }, Tooltip.mouseover_delay);
        }, false);
    anchor.addEventListener('mouseout', function(){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    if (div.parentNode != undefined) div.parentNode.removeChild(div);
                }, Tooltip.mouseout_delay);
        }, false);

    return div;
}

// This creates the resource info html.
Tooltip.convert_info=function(type, index, amount) {
    if (!amount || amount == '0') return "";
    var img = "";
    if (type==3) {
        if (index==10) img="img/un/u/hero.gif";
        else img="img/un/u/"+(Settings.race*10+index+1)+".gif";
    } else if (type==4) {
        img="img/un/r/"+(index+1)+".gif"
    }
    if (amount.constructor == Array) 
        amount=amount[0]+" (-"+amount[1]+")";
    var seperator = Tooltip.seperate_values ? ' | '  : ' ';
    if (((type==4 && Tooltip.merchant_kilo_values) ||
         (type==3 && Tooltip.army_kilo_values)) && amount > 1000)
        return seperator + '<img src="'+img+'"/>' +
            (amount > 10000 ? Math.round(amount/1000) + 'k' : Math.round(amount/100)/10 + 'k');
    return seperator + '<img src="'+img+'"/>' + amount;
};

Tooltip.run = function(){
    // The events are now sorted by village, so that simplifies our task here somewhat
    var x = document.evaluate('//div[@id="lright1"]/table[@class="f10"]/tbody/tr', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    Tooltip.href_postfix = '';
    // Run through our villages
    for (var i=0; i < x.snapshotLength; i++){
        var vil = x.snapshotItem(i);
        var did = vil.childNodes[0].childNodes[2].href.split('newdid=')[1];
        if (did.indexOf('&') >= 0){
            if (i == 0) Tooltip.href_postfix = did.match('&.*'); // This is the same for all - take from the first for simplicity
            did = did.split('&')[0];
        }

        Tooltip.village_tip(vil, did);
    }

    Tooltip.overview();
}


/****************************************
 * CURRENT END OF REDESING ATTEMPT
 ****************************************/


//////////////////////////////////////////
// TIMELINE //
//////////////////////////////////////////

function tl_main(){

    // Get the active village
    // TODO: replace in code.
    var active_vil = Settings.village_name;

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
    } else if (location.href.indexOf('build.php')>0){ // If we're on an individual building page
    
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
                // Don't throw in the level information if we're researching a new unit at the acadamy... because there isn't any!
                e = tl_get_event(t, building+': '+type+(level ? ' '+level : ''), active_vil);
                e[0] = TYPE_RESEARCH;

            } else if (x.snapshotLength > 1) alert ("Something's wrong. Found "+x.snapshotLength+" matches for xpath search");
        } catch (er){
            if (er != "ERR_EVENT_OVERWRITE") throw er;
        }
    }

} /* Timeline.enabled */


//////////////////////////////////////////
// COLLECT SOME INFO //
//////////////////////////////////////////

function storeInfo(){
    // Meaning of GM Values: (Some of the variable names are in dutch, to stay compatible with older scripts)
    //
    // ALLIANCE:
    // dictionary (map) mapping the names of your ally's members to a list of it's villages.

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
                x = res.snapshotItem(i);
                name = x.textContent;
                id = x.href.match("\\d+")[0];
                cnt = x.parentNode.parentNode.childNodes[5].textContent;
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
                    x = res.snapshotItem(i);
                    name = x.textContent;
                    y = x.parentNode.parentNode.childNodes[4].textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
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
//  VILLAGE TOOL TIP                    //
//////////////////////////////////////////
// This could cause problems with single-village accounts at the moment...
function vtt_main(){

    // This creates a tooltip. Each element of list e is a new line
    function vtt_tooltip(e, id, contents){
        id = "TTL_TTP_"+id;
        div = document.createElement('div');
        div.setAttribute('id', id);
        
        div.setAttribute('style', 'position:absolute; top:120px; left:720px; padding:1px; z-index:200; border:solid 1px #000000; background-color:#FFFFFF; visibility:hidden;');
        div.innerHTML = contents.join('<br>');
        document.getElementById('ltop1').parentNode.appendChild(div);
        var timer;

        delay_mouseover = function (e){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    x = document.getElementById(id);
                    x.style.visibility = 'visible';
                    x.style.left = (e.pageX+1)+'px';
                    x.style.top = (e.pageY+1)+'px';
                }, 1000);
        }
        delay_mouseout = function (){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    document.getElementById(id).style.visibility = 'hidden';
                }, 500);
        }

        e.addEventListener('mouseover', delay_mouseover, false);
        e.addEventListener('mouseout', delay_mouseout, false);
    }

    // Get the village list first
    x = document.getElementById('lright1').childNodes[1].childNodes[0].childNodes;
    village_event_list = new Array(); // This holds the events still to be done in the future, for each village

    for (e in events){
        if (e < new Date().getTime() + TIME_DIFFERENCE*3600000) continue; // If this event is in the past, ignore it

        for (i in x){
            y = x[i].childNodes[0].childNodes[2];
            if (events[e][17] == y.textContent){
                d = new Date();
                d.setTime(e);
                if (village_event_list[i] == undefined) village_event_list[i] = [];
                village_event_list[i].push(d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes()+' '+events[e][12]);
            }
        }
    }

    for (i in x){
        if (village_event_list[i] != undefined) vtt_tooltip(x[i], i, village_event_list[i]);
    }
}
 
}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}
 
Feature.forall('init',true);
window.addEventListener('load', function() { Feature.forall('run',true); }, false); // Run everything after the DOM loads!
