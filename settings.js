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
 * SETTINGS
 ****************************************/

Feature.create("Settings");
Settings.type = {none: 0, string: 1, integer: 2, enumeration: 3, object: 4, bool: 5};

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
        if (this.type==Settings.type.none) {
            return; // intentionally no warning.
        }
        var x = GM_getValue(this.fullname, this.def_val);
        switch (this.type) {
            case Settings.type.string:
            break;

            case Settings.type.integer:
            case Settings.type.enumeration:
            x=x-0;
            break;

            case Settings.type.object:
            x=eval(x);
            break;

            case Settings.type.bool:
            x=x==true;
            break;
        }
        this.set(x);
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.read("+this.name+")", e);
        else
            GM_log("FATAL:"+e);
    }
};

// Stores the value in the GM persistent storage database aka about:config
Settings.write=function() {
    try {
        var param=this.fullname;
        switch (this.type) {
            case Settings.type.none:
            this.warning("This setting ("+this.fullname+") has no type and can't be stored!");
            break;

            case Settings.type.string:
            case Settings.type.integer:
            case Settings.type.enumeration:
            case Settings.type.bool:
            GM_setValue(param, this.get());
            break;

            case Settings.type.object:
            GM_setValue(param, uneval(this.get()));
            break;
        }
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.write("+this.name+")", e);
        else
            GM_log("FATAL:"+e);
    }
};

// Removed the value from the GM persistent storage database aka about:config
Settings.remove=function() {
    try {
        var param=this.fullname;
        GM_deleteValue(param);
        this.set(this.def_val);
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.remove("+this.name+")", e);
        else
            GM_log("FATAL:"+e);
    }
};

// Appends a DOM element to parent_element that can be used to modify this setting.
Settings.config=function(parent_element) {
    try {
        var s  = $.new("span"); // the setting config thing
        s.append(this.name.replace(/_/g," ").pad(22)+": ");
        var setting=this
        
        // Create the input element.
        switch (this.type) {
        case Settings.type.none: {
            s.append(this.get());
            break;
        }

        case Settings.type.string:
        case Settings.type.integer: {
            var input = $.new("input");
            input.attr({value: this.get});
            s.append(input);
            input.change(function (e) {
                    var val=e.target.value;
                    if (setting.type==Settings.type.integer) {
                        if (val=="") val = setting.def_val;
                        else val-=0;
                    }
                    input.attr({value: val});
                    setting.set(val);
                    setting.write();
                });
            break;
        }

        case Settings.type.enumeration: {
            var select=$.new("select");
            var j = this.get();
            for (var i in this.typedata) {
                option=$.new("option");
                option.attr({value: i});
                option.html(this.typedata[i]);
                if (i==j) option.attr({selected: "selected"});
                select.append(option);
            }
            s.append(select);
            select.change(function (e) {
                    var val=e.target.value-0;
                    setting.set(val);
                    setting.write();
                });
            break;
        }
        
        case Settings.type.object: {
            // TODO: have some more info for this object in some special cases.
            s.append("(Object)");
            break;
        }
        
        case Settings.type.bool: {
            s.css({cursor: "pointer", 
                   color: (this.get()?'green':'red')});
            u=$.new("u");
            u.html(""+this.get());
            s.append(u);
            s.click(function (e) {
                    var val=!setting.get();
                    s.css({color: (val?'green':'red')});
                    u.html(""+val);
                    setting.set(val);
                    setting.write();
                });
            break;
        }
        }

        // Add tooltip with a description (if available)
        if (this.description) {
            s.attr({title: this.description});
            var h = this.description.match("\\(([-a-zA-Z0-9.,_ ]+)\\)$");
            if (h)
                s.append(" "+h[1]);
        }
        s.append("\n");

        // Default if we have no given parent
        $(parent_element).append(s); 
    } catch (e) {
        GM_log(e);
    }
};

Settings.init=function(){
    Settings.setting("race",           0,          Settings.type.enumeration, ["Terrans","Titans","Xen"]);
    Settings.setting("time_format",    0,          Settings.type.enumeration, ['Euro (dd.mm.yy 24h)', 'US (mm/dd/yy 12h)', 'UK (dd/mm/yy 12h', 'ISO (yy/mm/dd 24h)']);
    Settings.setting("village_names",  {},         Settings.type.object,      undefined, "The names of the villages.");
    Settings.setting("current_tab",    "Settings", Settings.type.string,      undefined, "The tab that's currently selected in the settings menu. ");
    Settings.setting("user_display",   {},         Settings.type.object,      undefined, "This is a reference to the local set of enables/disables");
    // These are both global
    Settings.setting("users",          {},         Settings.type.object,      undefined, "This keeps track of the human-readable names of the different users. Again, this is global data; however as there is no local copy we don't need to use so many hacks to read it.");
    Settings.setting("g_user_display", {},         Settings.type.object,      undefined, "This keeps track of which users have their data displayed. This one represents the global component (for unnatural pages) only; local and external data are both accessed with external.");

    if (location.href.match(/about:cache\?device=timeline&/)) {
        var params=location.href.split("&");
        Settings.special={};
        for (var i=1; i<params.length; i++) {
            var z=params[i].split("=");
            Settings.special[z[0]]=z[1];
            GM_log("Param:"+params[i]);
        }
    }
};
Settings.run=function() {
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
    try {
        var tr = document.evaluate('//table[@id="vlist"]/tbody/tr/td[@class="dot hl"]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
        Settings.village_name  = tr.nextSibling.textContent;
        Settings.village_id    = tr.nextSibling.childNodes[0].href.match(/newdid=(\d+)/)[1] - 0;
        var coord = tr.nextSibling.nextSibling.childNodes;
        var x = coord[1].textContent.match(/\((-?\d{1,3})/)[1];
        var y = coord[5].textContent.match(/(-?\d{1,3})\)/)[1];
        Settings.village_coord = [x, y];
    } catch (e) {
        // If this fails, there probably is only 1 village.
        // We should only then try loading this data from storage
        Settings.info("Failed to get the vlist table - assuming there's only found one village!");
        Settings.setting('village_name', "", Settings.type.string,  undefined, "The name of the active village. Only stored if we're a single-village account.", "true");
        Settings.setting('village_id',    0, Settings.type.integer, undefined, "The id of the active village. Again only stored if we're a single-village account.", 'true');
        if (Settings.village_id === 0) Settings.get_id();
    }
    this.info("The active village is "+Settings.village_id+": "+Settings.village_name);
    Settings.village_names[Settings.village_id]=Settings.village_name;
    Settings.s.village_names.write();
    
    if (Settings.special && Settings.special.page=="settings") {
        Settings.show();
    }
};
Settings.show=function() {
    var w = document.createElement("div");
    w.style.position = "fixed";
    w.style.zIndex   = "750";
    w.style.left     = "0px";
    w.style.top      = "0px";
    w.style.right    = "0px";
    w.style.bottom   = "0px";
    w.style.background = "rgba(192,192,192,0.8)";
    w.innerHTML = '<a style="position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; cursor: pointer;">'+
                  '<span style="position: absolute; right: 30px; top: 20px;">[x] Close</span></a>'+
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
            if (f.s == undefined || isempty(f.s)) continue;

            txt += '<tr align="right"><td style="padding: 5px 2px; text-align: right; border: none;"><a href="#" style="-moz-border-radius-topleft:8px; -moz-border-radius-bottomleft:8px;'+
                'padding:1px 11px 2px; border: 2px solid #000; '+
                (n==Settings.current_tab?'background: #fff; border-right: none;':'background: #ddd; border-right: 3px solid black;')+
                ' color:black; outline: none; cursor:pointer;">'+
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
        tabbar.style.border= "none";
        tabbar.style.borderCollapse = "collapse";
        
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
        this.exception("Settings.show", e);
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

// Correctly init debug now that it's possible
Settings.setting("global_debug_level", 0, Settings.type.enumeration, Feature.debug_categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Settings.init_debug();

// Settings init will always run
Settings.call('init', true);
$(function(){Settings.call('run',true);});
