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
 * SETTINGS
 ****************************************/

Feature.create("Settings", new Error(21));
Settings.type = {none: 0, string: 1, integer: 2, enumeration: 3, object: 4, bool: 5, set: 6};

// Determine server
// The server value is needed very early in the script. Luckily it does not rely on DOM.
// It is required to load settings.
Settings.server = location.href.match(/^(.*?\w)\//)[1];
if (imperion) {
    Settings.server_id = Settings.server.replace(/http:\/\/(\w+)\.imperion\.(\w+)/,"$2_$1");
    Settings.user=function(){
        // Tries to extract the user name from the page.
        return $("#head a[href*='userProfile']").text();
    }();
    Settings.outpost_text="planet";
}
if (travian) {
    Settings.server_id = function(){
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
    Settings.user=function(){
        // Tries to extract the UID from the page, and returns an empty string if it fails.
        var uid = $("#side_navi a[href*='spieler.php']");
        if (uid.length==0) return '';
        // If we successfully extracted the uid
        uid = uid.attr('href').match(/uid=(\d+)/)[1];
        return uid;
    }();
    Settings.outpost_text="village";
}

// Get the value of this setting.
// Note that (for example)
// "var u = Settings.user;" and "var u = Settings.s.user.get();" have the same effect.
Settings.get=function() {
    return this.parent[this.name];
}

// Set the value of this setting.
// Note that (for example)
// "Settings.user = u;" and "Settings.s.user.set(u);" have the same effect.
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

            case Settings.type.set:
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

            case Settings.type.set:
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

// Removes the value from the GM persistent storage database aka about:config
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

// Returns a jQuery object that can be used to modify this setting.
Settings.config=function() {
    try {
        var s = $.new("span"); // the setting config thing
        var sc = $.new("span"); // the scope
        s.append(sc);
        s.append(this.name.replace(/_/g," ").pad(22)+": ");
        var setting=this;
        
        sc.css("marginRight", "8px");
        if (this.scope<this.scopes.length) {
            sc.html(this.scope);
            var sv=GM_getValue(this.scopes[setting.scope+1]+'.'+this.fullname);
            if (sv===undefined) sv = this.def_val;
            sc.title=sv;
        
            if (this.scope<this.scopes.length-1) {
                sc.bind("click",function (e) {
                        setting.remove(setting.scope);
                        setting.write(setting.scope+1);
                        Settings.fill();
                    },false);
                sc.css({cursor: "pointer", color: "red"});
            }
        } else {
             sc.html('d');
        }


        // Create the input element.
        switch (this.type) {
        case Settings.type.none: {
            s.append(this.get());
            break;
        }

        case Settings.type.string:
        case Settings.type.integer: {
            var input = $.new("input");
            input.val(this.get());
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
                option=$.new("option").attr({value: i}).html(this.typedata[i]);
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
            var u=$.new("u").html(""+this.get());
            s.append(u);
            s.css({cursor: "pointer", 
                   color: (this.get()?'green':'red')});
            s.click(function (e) {
                    setting.set(!setting.get());
                    setting.write();
                    s.replaceWith(setting.config());
                });
            break;
        }
        
        case Settings.type.set: {
            for (var i in this.typedata) {
                var u=$.new("u").html(this.typedata[i]);
                u.css({cursor: "pointer", 
                      color: (this.get()[i]?'green':'red')});
                u.attr("id",this.name+"."+i);
                u.click(function (e) {
                        setting.get()[e.target.id.match(/\.(\d+)/)[1]-0]^=true;
                        setting.write();
                        s.replaceWith(setting.config());
                    });
                s.append("[").append(u).append("]");
            }
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

        return s;
    } catch (e) {
        Settings.debug(e);
    }
};

Settings.init=function(){
    if (travian) {
        Settings.setting("race",           0,          Settings.type.enumeration, ["Romans","Teutons","Gauls"]);
    }
    if (imperion) {
        Settings.setting("race",           0,          Settings.type.enumeration, ["Terrans","Titans","Xen"]);
    }
    Settings.setting("time_format",    0,          Settings.type.enumeration, ['Euro (dd.mm.yy 24h)', 'US (mm/dd/yy 12h)', 'UK (dd/mm/yy 12h', 'ISO (yy/mm/dd 24h)']);
    Settings.setting("outpost_names",  {},         Settings.type.object,      undefined, "The names of your "+Settings.outpost_text+"s");
    Settings.setting("current_tab",    "Settings", Settings.type.string,      undefined, "The tab that's currently selected in the settings menu. ");
    
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
    // Determine the current/active outpost
    if (imperion) {
        Settings.outpost_name = $("#planetList").text();
        Settings.outpost_id   = $(".planet a.icon").attr("href").replace("/planet/buildings/","")-0;
    }
    if (travian) {
        try {
            var tr = $("#vlist td[class='dot hl']").next();
            Settings.outpost_name  = tr.text();
            Settings.outpost_id    = tr.find('a').attr('href').match(/newdid=(\d+)/)[1] - 0;
            var coord = tr.next().text().match(/\((-?\d{1,3})|(-?\d{1,3})\)/);
            Settings.outpost_coord = [coord[1]-0, coord[2]-0];
        } catch (e) {
            Settings.exception("get outpost", e);
            Settings.info("Failed to get the vlist table - assuming there's only one village!");
            // Used solely for timeline. In a single village all events are from the same village. Hence this information is useless.
            // TODO: find a way to properly support the transition to multiple villages
            Settings.outpost_name = ""; 
            Settings.outpost_id = 0;
        }
    }
    Settings.outpost_names[Settings.outpost_id]=Settings.outpost_name;
    Settings.s.outpost_names.write();
    this.info("The active "+Settings.outpost_text+" is "+Settings.outpost_id+": "+Settings.outpost_name);

    // Create link for opening the settings menu.
    var link = $.new("a").attr({href: "javascript:"}).text("Time Line Settings");
    link.click(Settings.show);
    if (travian) {
        var right = Timeline.width;
        if (Timeline.collapse) right = Timeline.collapse_width;
        if (!Timeline.enabled) right = 0;
        right+=5;
        link.css({
            position: "absolute",
            zIndex: "2",
            right: right+"px",
            top: "-5px",
            MozBorderRadius: "6px",
            padding: "3px",
            border: "1px solid #999",
            background: "#ccc",
            color: "blue", 
            fontSize: "12px"
        });
        $(document.body).append(link);
    }
    if (imperion) {
        var links = $("#head>.floatRight");
        links.prepend($.new("li").text("|").attr({class: "colorLightGrey"}));
        links.prepend($.new("li").append(link));
    }
    
    /* NOTE: shell-code
    if (Settings.special && Settings.special.page=="settings") {
        Settings.show();
    }
    */
};

Settings.show=function() {
    var w = $.new("div");
    w.css({position:   "fixed",
           zIndex:     "30000", // imperion developers like to exagerate
           left:       "0px",
           top:        "0px",
           right:      "0px",
           bottom:     "0px",
           background: "rgba(192,192,192,0.8)"});
    w.html('<a style="position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; cursor: pointer;">'+
           '<span style="position: absolute; right: 30px; top: 20px;">[x] Close</span></a>'+
           '<div style="position: absolute; left: 50%; top: 50%;">'+
           '<pre style="position: absolute; left: -300px; top: -250px; width: 600px; height: 400px;'+
           ' border: 3px solid #000; background: #fff; overflow: auto; padding: 8px;'+
           ' -moz-border-radius-topleft:12px; -moz-border-radius-topright:12px;" id="settings_container">'+
           '</pre></div>');
    w.find("a").click(Settings.close);
    Settings.window = w;
    try {
        var p = w.find("div");

        // First we need to create the tabs...
        var tablebody = $.new('tbody');
        for (var n in Feature.list){
            var f = Feature.list[n];
            
            // Skip features without settings
            if (f.s == undefined || isempty(f.s)) continue;

            tablebody.append('<tr align="right"><td style="padding: 5px 2px; text-align: right; border: none; background: none;">'+
                '<a href="javascript:" style="-moz-border-radius-topleft:8px; -moz-border-radius-bottomleft:8px;'+
                'padding:1px 11px 2px; border: 2px solid #000; '+
                (n==Settings.current_tab?'background: #fff; border-right: none;':'background: #ddd; border-right: 3px solid black;')+
                ' color:black; outline: none; cursor:pointer;">'+
                f.name + '</a></td></tr>');
        }

        // Then we need to create the tab bar, to switch between tabs
        var tabbar = $.new('table');        
        tabbar.append(tablebody);
        tabbar.css({position: "absolute",
                    width:    "150px",
                    left:     "-445px",
                    top:      "-200px",
                    border:   "none",
                    borderCollapse: "collapse",
                    background: "none"});
        p.append(tabbar);
        
        var notice = $.new('pre'); // Add the copyright
        notice.text("Copyright (C) 2008, 2009, 2010 Bauke Conijn, Adriaan Tichler\n"+
            "GNU General Public License as published by the Free Software Foundation;\n"+
            "either version 3 of the License, or (at your option) any later version.\n"+
            "This program comes with ABSOLUTELY NO WARRANTY!");
        notice.css({color: "#666",
                    fontStyle: "italic",
                    fontSize: "75%",
                    textAlign: "center",
                    position: "absolute",
                    left: "-300px",
                    top: "180px",
                    width: "600px",
                    padding: "1px 8px",
                    border: "3px solid #000",
                    background: "#fff",
                    MozBorderRadiusBottomleft : "12px",
                    MozBorderRadiusBottomright: "12px"});
        p.append(notice);

        // Add click listeners to all of the tab buttons
        var tabs=tabbar.find("a");
        tabs.click(function(e){
            var el = $(e.target);
            var f = Feature.list[el.text()];
            Settings.current_tab=el.text();
            Settings.s.current_tab.write();

            // Reset the background colours of *all* tab buttons
            tabs.css({background: "#ddd",
                      borderRight: "3px solid black"});

            el.css({background: "#fff", // Turn the colour of the clicked element white
                    borderRight: "none"}); // Simulate that the tab is connected to the settings page
            Settings.fill();
        });
        Settings.fill();
    } catch (e) {
        if (this&&this.exception)
            this.exception("Settings.show", e);
        else
            GM_log("FATAL:"+e);
    }
    $("body").append(w);
};

// This fills/refreshes the display portion of the settings table
Settings.fill=function(){
    var disp = Settings.window.find("#settings_container");
    var f = Feature.list[Settings.current_tab];
    if (f){
        disp.empty();
        for (var i in f.s){ // And refill it
            f.s[i].read();
            disp.append(f.s[i].config());
        }
    }
}

Settings.close=function(){
    Settings.window.remove();
};

// Correctly init debug now that it's possible
Settings.setting("global_debug_level", 0, Settings.type.enumeration, Feature.debug_categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Settings.init_debug();

// Settings is a required feature. 
// Hence Settings.init will always run
Settings.call('init', true);
$(function(){Settings.call('run',true);});
