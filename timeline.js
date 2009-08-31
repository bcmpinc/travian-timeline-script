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
 * TIMELINE
 ****************************************/

Feature.create("Timeline");

Timeline.s.enabled.description = "Enable the timeline (make sure that the events feature is also enabled).";
    
Timeline.init=function(){
    Timeline.setting("collapse", true, Settings.type.bool, undefined, "Make the timeline very small by default and expand it when the mouse hovers above it.");
    Timeline.setting("keep_updated", true, Settings.type.bool, undefined, "Update the timeline every 'Timeline.update_interval' msec.");
    Timeline.setting("report_info", true, Settings.type.bool, undefined, "Show the size of the army, the losses and the amount of resources stolen");
    Timeline.setting("position_fixed", false, Settings.type.bool, undefined, "Keep timeline on the same position when scrolling the page.");

    Timeline.setting("color", "rgba(255, 255, 204, 0.7)", Settings.type.string, undefined, "Background color of the timeline");
    Timeline.setting("width", 400, Settings.type.integer, undefined, "Width of the timeline (in pixels)");
    Timeline.setting("height", 800, Settings.type.integer, undefined, "Height of the timeline (in pixels)");
    Timeline.setting("duration", 300, Settings.type.integer, undefined, "The total time displayed by the timeline (in minutes)");
    Timeline.setting("marker_seperation", 10, Settings.type.integer, undefined, "Mean distance between markers (in pixels)");
    Timeline.setting("collapse_width", 60, Settings.type.integer, undefined, "Width of the timeline when collapsed (in pixels)");
    Timeline.setting("collapse_speed", 1500, Settings.type.integer, undefined, "Collapse fade speed (in pixels per second)");
    Timeline.setting("collapse_rate", 50, Settings.type.integer, undefined, "Update rate of the collapse fading (per second)");
    Timeline.setting("update_interval", 30000, Settings.type.integer, undefined, "Interval between timeline updates. (in milliseconds)");

    Timeline.setting("scale_warp", 0, Settings.type.integer, undefined, "Amount of timeline scale deformation. 0 = Linear, 4 = Normal, 8 = Max.");

    Timeline.setting("visible", true, Settings.type.bool, undefined, "Is the timeline visible on pageload. This setting can also be changed with the timeline-button.");

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
};

Timeline.create_canvas=function() {
    // Create timeline canvas + container
    var tl = document.createElement("canvas");
    var tlc = document.createElement("div");
    tlc.style.position = (Timeline.position_fixed?"fixed":"absolute");
    tlc.style.top = "0px";
    tlc.style.right = "0px";
    tlc.style.width = (Timeline.collapse?Timeline.collapse_width:Timeline.width) + "px";
    tlc.style.height = Timeline.height + "px";
    tlc.style.zIndex = "20000";
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

    // Add the doubleclick listener to change scopes
    tlc.addEventListener('dblclick', Timeline.change_scope, false);

    Timeline.element=tlc;
    Timeline.context=tl.getContext("2d");
    Timeline.context.mozTextStyle = "8pt Monospace";
};

Timeline.change_scope=function(){
    if (Timeline.scope_changer != undefined){
        document.body.removeChild(Timeline.scope_changer);
        delete Timeline.scope_changer;
        return;
    }
    Timeline.scope_changer = document.createElement('div');
    var div = Timeline.scope_changer;
    div.style.position = 'fixed';
    div.style.zIndex   = '1000';
    div.style.left     = '150px';
    div.style.top      = '150px';
    div.style.border   = '3px solid black';
    div.style.background = 'rgb(255, 255, 255)';
    div.style.MozBorderRadius = '6px';
    var txt = '<table><thead><tr><th colspan="2" style="border-bottom: 1px solid black; text-align: center"><img style="cursor:pointer" src="'+Images.cross;
    txt += '"/></th></tr></thead><tbody><tr><td style="border-right: 1px solid black">';
    var i=0;
    var s;
    for (var a in Settings.users){
        if (i==0) s = a;
        txt += '<input type="radio" name="'+a+'" value="'+i+'"'+(i==0?' checked=""':'')+'>'+a+'&nbsp;<br>';
        i++;
    }
    txt += '<td></tbody></table>';
    div.innerHTML = txt;
    div.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].addEventListener('click', Timeline.change_scope, false);
    var servers = div.childNodes[0].childNodes[1].childNodes[0].childNodes[0];
    var users = servers.nextSibling;
    var check_user=function(e){
        var u = e.target.name;
        if (Settings.natural_run){
            Settings.user_display[s][u] = e.target.checked==true;
            Settings.s.user_display.write();
        } else {
            Settings.g_user_display[s][u] = e.target.checked==true;
            Settings.s.g_user_display.write();
        }
        // The events to display just changed - so update
        Timeline.draw(true);
    };
    var fill_users=function(){
        var txt = '';
        for (var u in Settings.users[s]){
            var checked = Settings.natural_run ? Settings.user_display[s][u] : Settings.g_user_display[s][u];
            var uname = Settings.users[s][u];
            txt += '<input type="checkbox" name="'+u+'" '+(checked?'checked=""':'')+'>'+uname+'&nbsp;<br>';
        }
        users.innerHTML = txt;
        for (var i in users.childNodes)
            users.childNodes[i].addEventListener('change', check_user, false);
    };
    var switch_server=function(e){
        // Clear every checkbox
        for (var i in servers.childNodes) servers.childNodes[i].checked = false;
        // But reset the one you just clicked on to true
        e.target.checked = true;

        s = e.target.name;
        fill_users();
    };
    fill_users();
    for (var i in servers.childNodes)
        servers.childNodes[i].addEventListener('change', switch_server, false);
    document.body.appendChild(div);
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
    button.style.fontSize = '12px';
    button.style.MozBorderRadiusBottomleft = "6px";
    button.style.cursor = "pointer";
    button.addEventListener('click',Timeline.toggle,false);
    button.innerHTML = "timeline";
    document.body.appendChild(button);
};

Timeline.load_images=function() {
    var base = GM_getValue('absolute_server', '')+'/';
    // We have to load all images, because with multiple scopes displayed the units could come from any race
    Timeline.img_unit = new Array(31);
    Timeline.img_unit[0] = Images.obj('', Images.hero);
    for (i=1; i<=30; i++) {
        // This is irritating. For this, we need an actual src, using the class method screws things up... :(
        Timeline.img_unit[i] = Images.obj('', base+"img/un/u/"+(i)+".gif");
    }

    Timeline.img_res = new Array(4);
    for (i=0; i<4; i++) {
        Timeline.img_res[i] = Images.obj('', base+'img/un/r/'+(i+1)+'.gif');
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

// If once is false, this will set a timer at the end of the function call recalling this function after the update period
Timeline.draw=function(once) {
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

    // Which scopes are enabled? (This could be changed by a seperate instance running on a seperate tab)
    Settings.s.user_display.read();

    // Update the event data for *all* enabled scopes
    var disp = Settings.natural_run ? Settings.user_display : Settings.g_user_display;
    for (var server in disp){
        for (var user in disp[server]){
            // If the scope in question is not enabled, skip it
            if (!disp[server][user]) continue;

            // Now, redraw the events
            Timeline.info("Displaying events for "+server+'.'+Settings.users[server][user]);
            Timeline.draw_events(g, server, user);
        }
    }
    g.restore();

    if (Timeline.keep_updated && once!==true) window.setTimeout(Timeline.draw, Timeline.update_interval)
};

Timeline.draw_events=function(g, server, user){
    // We want to load all of the events here, rather than in the init, because otherwise new events won't
    // show up until the *next* pageload. This is also important for when running on pages that use AJAX
    // heavilly (such as gmail) because these pages will seldom reload, meaning the data displayed on them
    // will quickly outdate.
    try {
        // If we have loaded these settings before, we can just refresh them
        // Technically speaking, it would be better to wrap each of these in their own try/catch block
        // but they'll likely either all fail or all succeed together anyways, and this looks cleaner.
        Events[server][user].s.events.read();
        Settings[server][user].s.village_names.read();
        Settings[server][user].s.race.read();
    } catch (e) {
        // If it fails, we have to create the object too
        Events.external  (server, user, 'events',        {}, Settings.type.object,  undefined, "The list of events");
        Settings.external(server, user, 'village_names', {}, Settings.type.object,  undefined, "The human-readable list of village names");
        Settings.external(server, user, 'race',           0, Settings.type.enumeration, ['Romans', 'Teutons', 'Gauls'], "The account's race");
    }

    var events = Events[server][user].events;
    // Draw data
    for (v in events) {
        for (e in events[v]) {
            var p = events[v][e];
            var t = Events.type[p[0]];
            var y = Timeline.warp(p[1]);
        
            // Check if this type of event is visible
            if (!(t[1])) continue;
            if (isNaN(y)) continue;
            if (Events[p[0]] >=2) continue;

            // If we're differentiating merchant types, don't show the message being sent
            if (Events.predict_merchants && p[0] == 'market' && p[2].indexOf(Events.merchant_send) >= 0) continue;
        
            // Draw the line
            g.strokeStyle = t[0];
            g.beginPath();
            g.moveTo(-10, y);
            g.lineTo(-50, y);
            g.stroke();
    
            // Draw the village id. (if village number is known, otherwise there's only one village)
            if (v>0) {
                // TODO: convert to human readable village name.
                var v_name = Settings[server][user].village_names[v];
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
                        // This is a serious hack, but the best we can do without tearing up the entire 'events' list...
                        if (i == 10) Timeline.draw_info(Timeline.img_unit[0], p[3][i]);
                        else Timeline.draw_info(Timeline.img_unit[Settings[server][user].race*10+1+i], p[3][i]);
                    }
                }
                g.restore();
            }
        }
    }
};

Timeline.run=function() {
    if (Settings.natural_run){
        tp1 = document.getElementById("tp1");
        if (!tp1) return;
    }

    Timeline.create_canvas();
    Timeline.create_button();
    Timeline.load_images();
    Timeline.draw();
};

Timeline.call('init', true);
$(function(){Timeline.call('run',true);});
