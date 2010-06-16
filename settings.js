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
 * <http://www.gnu.org.licenses/>
 *****************************************************************************/

/****************************************
 * SETTINGS
 ****************************************/

Feature.create("Settings", new Error(21));
Settings.type = {none: 0, string: 1, integer: 2, enumeration: 3, object: 4, bool: 5};

// The server value is needed very early in the script. Luckily it does not rely on DOM.
// It is required to load settings.
Settings.server = function(){
    // If this is a travian page determine the server id.
    // Otherwise return 'extern', which means the current page is not an in-game page.
    if (location.href.match(/.*\.travian.*\.[a-z]*\/.*\.php.*/) &&
        !location.href.match(/(?:(forum)|(board)|(shop)|(help))\.travian/) &&
        !location.href.match(/travian.*\..*\/((manual)|(login)|(logout))\.php.*/)) {

        // This should give the server id as used by travian analyzer.
        var url = location.href.match("//([a-zA-Z]+)([0-9]*)\\.travian(?:\\.com?)?\\.(\\w+)/");
        if (!url) return "unknown";
        var a=url[2];
        if (url[1]=='speed') a='x';
        if (url[1]=='speed2') a='y';
        return url[3]+a;
    } else {
        return 'extern';
    }
}();
Settings.get_username=function(){
    // A helper function that trys to extract the UID from the page, and returns an empty string if it fails.
    var extract_uid=function(){
        var uid = document.evaluate("id('side_navi')//a[contains(@href, 'spieler.php')]/@href", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (uid == undefined) return '';
        // If we successfully extracted the uid
        uid = uid.textContent.match(/uid=(\d+)/)[1];
        // Save it at *both* the local and global scope, and return it
        GM_setValue('last_uid', uid);
        GM_setValue(Settings.server+'.last_uid', uid);
        return uid;
    }

    if (Settings.server != 'extern'){
        // Try extracting the uid
        var uid = extract_uid();
        if (uid) return uid;

        // If we run into an error, use the stored (local) version. As this runs before the DOM loads, this has the potential of not being loaded yet.
        // However, we cannot just wait for the DOM because everything depends on this, so delaying this would delay the entire script.
        uid = GM_getValue(Settings.server+'.last_uid', '');
        if (uid) return uid;

        // If we have no stored version, this is likely because it was deleted when we last visited the login page.
        // Set a timer to extract it *after* the DOM loads (when it *should* be ready), and reload the page
        $(document).ready(function(){ if (extract_uid()) location.reload(); });

        // We failed to get the UID on this pass.
        GM_log("Have no record of any UID.");
        throw "Could not find any previous UID";
    }

    // *If* we're on the login page, clear the latest value in server.last_uid (don't clear the global one).
    // This is so that we don't get cross-talk between users, as the first time we load with a new user
    // we might depend on the saved uid. In these cases, we want to save the *true* uid after the DOM loads,
    // and reload. We also want to be careful to not screw up other unnatural pages (hence the global version).
    if (location.href.match(/travian.*\..*\/login\.php/)){
        GM_setValue(Settings.server+'.last_uid', '');
    }

    // Careful - here we're running on unnatural pages, and should therefore use the *global* last_uid not the server-local one
    var uid = GM_getValue('last_uid', '')
    if (uid) return uid;

    // It should never come to this, but just in case...
    GM_log("Have no record of any UID.");
    throw "Could not find any previous UID";
};
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
// @param param, the first scope that will be used.
Settings.read=function(scope) {
    try {
        if (this.type==Settings.type.none) {
            return; // intentionally no warning.
        }
        var x;
        param = scope || 0;
        for (param; param<this.scopes.length; param++) {
            x = GM_getValue(this.scopes[param]+'.'+this.fullname);
            if (x!==undefined && x!=="") {
                this.scope = param;
                break;
            }
        }
        if (!(param<this.scopes.length)) {
            x=this.def_val;
            this.scope = this.scopes.length;
        }
        
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
        if (scope!==undefined) {
            return x;
        } else {
            this.set(x);
        }
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.read("+this.name+")", e);
        else
            GM_log("FATAL:"+e);
    }
};

// Stores the value in the GM persistent storage database aka about:config
// Scope is used to store this setting at a higher scope.
Settings.write=function(scope) {
    try {
        scope=scope||0;
        if (scope>=this.scopes.length) {
            this.warning("This setting ("+this.fullname+") can't be stored in the default scope!");
            return;
        }
        var param=this.scopes[scope]+'.'+this.fullname;
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
        this.scope=scope;
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.write("+this.name+")", e);
        else
            GM_log("FATAL:"+e);
    }
};

// Removed the value from the GM persistent storage database aka about:config
// Scope is used to remove this setting from a higher scope.
// Use either read() or write() after a call to this function.
Settings.remove=function(scope) {
    try {
        scope=scope||0;
        if (scope>=this.scopes.length) {
            this.warning("The default setting of ("+this.fullname+") can't be changed!");
            return;
        }
        var param=this.scopes[scope]+'.'+this.fullname;
        GM_deleteValue(param);
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
        var s  = document.createElement("span"); // the setting config thing
        var sc = document.createElement("span"); // the scope
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
        
        sc.style.marginRight="8px";
        if (this.scope<this.scopes.length) {
            sc.innerHTML = this.scope;
            var sv=GM_getValue(this.scopes[setting.scope+1]+'.'+this.fullname);
            if (sv===undefined) sv = this.def_val;
            sc.title=sv;
        
            if (this.scope<this.scopes.length-1) {
                sc.addEventListener("click",function (e) {
                        setting.remove(setting.scope);
                        setting.write(setting.scope+1);
                        Settings.fill();
                    },false);
                sc.style.cursor="pointer";
                sc.style.color="red";
            }
        } else {
             sc.innerHTML = 'd' 
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
                td.appendChild(sc);
                td.appendChild(s);
                tr.appendChild(td);
                setting.parent_el.el.appendChild(tr);
            } else {
                setting.parent_el.el.appendChild(sc);
                setting.parent_el.el.appendChild(s);
            }
        } else {
            // Default if we have no given parent
            parent_element.appendChild(sc);
            parent_element.appendChild(s); 
        }
    } catch (e) {
        GM_log(e);
    }
};

Settings.init=function(){
    Settings.setting("race",           0,          Settings.type.enumeration, ["Romans","Teutons","Gauls"]);
    Settings.setting("time_format",    0,          Settings.type.enumeration, ['Euro (dd.mm.yy 24h)', 'US (mm/dd/yy 12h)', 'UK (dd/mm/yy 12h', 'ISO (yy/mm/dd 24h)']);
    Settings.setting("village_names",  {},         Settings.type.object,      undefined, "The names of the villages.");
    Settings.setting("current_tab",    "Settings", Settings.type.string,      undefined, "The tab that's currently selected in the settings menu. ");

    var s = Settings.server;
    var u = Settings.username;

    /* NOTE: shell-code
    if (location.href.match(/about:cache\?device=timeline&/)) {
        var params=location.href.split("&");
        Settings.special={};
        for (var i=1; i<params.length; i++) {
            var z=params[i].split("=");
            Settings.special[z[0]]=z[1];
            GM_log("Param:"+params[i]);
        }
    }
    */
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
        this.info("The active village is "+Settings.village_id+": "+Settings.village_name);
        Settings.village_names[Settings.village_id]=Settings.village_name;
        Settings.s.village_names.write();
    } catch (e) {
        Settings.info("Failed to get the vlist table - assuming there's only one village!");
        // Used solely for timeline. In a single village all events are from the same village. Hence this information is useless.
        // TODO: find a way to properly support the transition to multiple villages
        Settings.village_name = ""; 
        Settings.village_id = 0;
    }
    
    /* NOTE: shell-code
    if (Settings.special && Settings.special.page=="settings") {
        Settings.show();
    }
    */
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

            txt += '<tr align="right"><td style="padding: 5px 2px; text-align: right; border: none; background: none;">'+
                '<a href="#" style="-moz-border-radius-topleft:8px; -moz-border-radius-bottomleft:8px;'+
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
        tabbar.style.background= "none";
        
        Settings.fill();
        
        var notice = add_el('pre'); // Add the copyright
        notice.innerHTML="Copyright (C) 2008, 2009, 2010 Bauke Conijn, Adriaan Tichler\n"+
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

// Tested: this is *not* the cause of the pageload errors. Errors still occur without it running.
Settings.username = Settings.get_username(); 

// Correctly init debug now that it's possible
Settings.setting("global_debug_level", 0, Settings.type.enumeration, Feature.debug_categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Settings.init_debug();

// Settings is a required feature. 
// Hence Settings.init will always run
Settings.call('init', true);
$(function(){Settings.call('run',true);});
