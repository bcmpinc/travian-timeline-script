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
 * TIMELINE
 ****************************************/

Feature.create("Timeline",new Error(21));

Timeline.s.enabled.description = "Enable the timeline (make sure that the events feature is also enabled).";
    
Timeline.init=function(){
    Timeline.setting("collapse", true, Settings.type.bool, undefined, "Make the timeline very small by default and expand it when the mouse hovers above it.");
    Timeline.setting("keep_updated", true, Settings.type.bool, undefined, "Update the timeline every 'Timeline.update_interval' msec.");
    Timeline.setting("report_info", true, Settings.type.bool, undefined, "Show the size of the army, the losses and the amount of resources stolen");

    Timeline.setting("color", (imperion?"rgba(0, 0, 32, 0.7)":"rgba(255, 255, 204, 0.7)"), Settings.type.string, Settings.previews.color, "Background color of the timeline");
    Timeline.setting("width", 400, Settings.type.integer, undefined, "Width of the timeline (in pixels)");
    Timeline.setting("duration", 300, Settings.type.integer, undefined, "The total time displayed by the timeline (in minutes)");
    Timeline.setting("marker_seperation", 10, Settings.type.integer, undefined, "Mean distance between markers (in pixels)");
    Timeline.setting("collapse_width", 65, Settings.type.integer, undefined, "Width of the timeline when collapsed (in pixels)");
    Timeline.setting("collapse_delay", 200, Settings.type.integer, undefined, "The time it takes to unfold/collapse the timeline (in milliseconds)");
    Timeline.setting("update_interval", 30000, Settings.type.integer, undefined, "Interval between timeline updates. (in milliseconds)");
    if (imperion) {
        Timeline.setting("move_page_left", true, Settings.type.bool, undefined, "Move the page to the left side of the screen.");
    }

    Timeline.setting("scale_warp", 0, Settings.type.integer, undefined, "Amount of timeline scale deformation. 0 = Linear, 4 = Normal, 8 = Max.");

    Timeline.setting("visible", true, Settings.type.bool, undefined, "Is the timeline visible on pageload. This setting can also be changed with the timeline-button.");

    Timeline.scroll_offset=0; // the current 'center' of the timeline.

    if (Timeline.scale_warp==0) {
        Timeline.warp = function(x) { return (((x-Timeline.now-Timeline.scroll_offset)/Timeline.duration/60000)+1)/2*Timeline.height; };
        Timeline.unwarp = function(y) { return (2*y/Timeline.height-1)*Timeline.duration*60000+Timeline.now+Timeline.scroll_offset; };
    } else {
        Timeline.warp = function(x) { return (Math.arsinh(
                                                          ((x-Timeline.now-Timeline.scroll_offset)/Timeline.duration/60000)*(2*Math.sinh(Timeline.scale_warp/2))
                                                          )/Timeline.scale_warp +1)/2*Timeline.height; };
        Timeline.unwarp = function(y) { return Math.sinh(
                                                         (2*y/Timeline.height-1)*Timeline.scale_warp
                                                         )/(2*Math.sinh(Timeline.scale_warp/2))*Timeline.duration*60000+Timeline.now+Timeline.scroll_offset; };
    }
};

Timeline.delayed_draw=function() {
    // Schedule update
    if (Timeline.delayed_draw_timeout) clearTimeout(Timeline.delayed_draw_timeout);
    Timeline.delayed_draw_timeout = setTimeout(Timeline.draw, 100);
}

Timeline.create_canvas=function() {

    // Create timeline canvas + container
    Timeline.canvas  = $.new("canvas");
    Timeline.element = $.new("div");
    $(window).resize(Timeline.delayed_draw);
    
    Timeline.canvas.attr({
        width: Timeline.width,
    }).css({
        position: "absolute",
        right: "0px"
    });

    Timeline.element.css({
        position: "fixed",
        top: "0px",
        right: "0px",
        width: (Timeline.collapse?Timeline.collapse_width:Timeline.width) + "px",
        zIndex: "20000",
        backgroundColor: Timeline.color,
        visibility: Timeline.visible?'visible':'hidden',
        overflow: "hidden",
        outline: "1px solid #333"
    }).append(Timeline.canvas);
    
    $(document.body).append(Timeline.element);

    // Code for expanding/collapsing the timeline.
    if (Timeline.collapse) {
        Timeline.element.mouseenter(function() {
            if (Timeline.visible)
                Timeline.element.stop().animate({width: Timeline.width},Timeline.collapse_delay);
        });
        Timeline.element.mouseleave(function() {
            if (Timeline.visible)
                Timeline.element.stop().animate({width: Timeline.collapse_width},Timeline.collapse_delay);
        });
    }

    // Could scroll backwards and forwards on the timeline
    Timeline.element.bind('DOMMouseScroll', Timeline.mouse_wheel);

    // The click event listener for the link with the 'travian task queue'-script.
    /*
    function setAt(e) {
        var at = document.getElementById("at");
        if (at) {
            var n = new Date();
            n.setTime(Timeline.unwarp(e.pageY));
            var s=(n.getFullYear())+"/"+(n.getMonth()+1)+"/"+n.getDate()+" "+n.getHours()+":"+n.getMinutes().pad2()+":"+n.getSeconds().pad2();
            at.value=s;
        }
    }
    Timeline.element.bind("click",setAt);
    */

    Timeline.context=Timeline.canvas.get(0).getContext("2d");
    Timeline.context.mozTextStyle = "8pt Monospace";
};

Timeline.mouse_wheel=function(e) {
    Timeline.scroll_offset += e.detail * Timeline.duration*1200; // Timeline.scroll_offset is in milliseconds
    e.stopPropagation(); // Kill the event to the standard window...
    e.preventDefault(); // Prevent the mouse scrolling from propegating
    Timeline.delayed_draw();
};

Timeline.toggle=function() {
    Timeline.visible=!Timeline.visible;
    Timeline.element.css({visibility: Timeline.visible?'visible':'hidden'});
    Timeline.s.visible.write();
    if (Timeline.visible)
        Timeline.delayed_draw();
};

Timeline.create_button=function() {
    button = $.new("div");
    button.css({
      position: "fixed",
      backgroundColor: (imperion?"rgba(64,64,64,0.5)":"rgba(0,0,128,0.5)"),
      right: "0px",
      top: "-2px",
      width: "65px",
      height: "17px",
      zIndex: 40000,
      textAlign: "center",
      color: (imperion?"#ccc":"#fff"),
      fontWeight: "bold",
      fontSize: "12px",
      MozBorderRadiusBottomleft: "6px",
      cursor: "pointer"
    });
    button.click(Timeline.toggle);
    button.text("time line");
    $(document.body).append(button);
};

Timeline.draw_scale=function() {
    var g=Timeline.context;
    
    // Draw bar
    g.translate(Timeline.width - 9.5, 0);
    g.strokeStyle = (imperion?"rgb(128,192,255)":"rgb(0,0,0)");
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, Timeline.height);
    g.stroke();
    
    // Text color
    g.fillStyle = (imperion?"rgb(204,204,255)":"black");
    
    // draw scale lines
    var lastmark = 0;
    for (var i=Timeline.marker_seperation/2; i<Timeline.height; i+=Timeline.marker_seperation) {
    
        // determine local scale
        var z = Timeline.unwarp(i+Timeline.marker_seperation/2) - Timeline.unwarp(i-Timeline.marker_seperation/2);
        /**/ if (z<    1000) z=    1000; //  1 sec.
        else if (z<    5000) z=    5000; //  5 sec.
        else if (z<   15000) z=   15000; // 15 sec.
        else if (z<   60000) z=   60000; //  1 min.
        else if (z<  300000) z=  300000; //  5 min.
        else if (z<  900000) z=  900000; // 15 min.
        else if (z< 3600000) z= 3600000; //  1 hr.
        else if (z<21600000) z=21600000; //  6 hr.
        else if (z<86400000) z=86400000; //  1 day.
        else continue; // Too little pixels for too much time.

        // determine the time and location
        var x = Timeline.unwarp(i);
        x = Math.round(x/z)*z;
        var y = Timeline.warp(x);
        if (x<=lastmark) continue;
        lastmark=x;
    
        // Determine the marker label and length
        var a=-8;
        var b= 0;
        var m="";
        var d = new Date();
        d.setTime(x);
        var t=d.getHours()+":"+d.getMinutes().pad2();
    
        // Determine the size of the tick marks
        /**/ if ((x% 3600000)==0 && d.getHours()==0) { b=8;m=
                             ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+d.getDate()+" "+
                             ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" - 0:00";} // 1 day.
        else if ((x% 3600000)==0 && d.getHours()%6==0) { b=8; if (z<21600000) m=t;} // 6 hr.
        else if ((x% 3600000)==0) { b=4; if (z< 3600000) m=t;} //  1 hr.
        else if ((x%  900000)==0) {a=-6; if (z<  900000) m=t;} // 15 min.
        else if ((x%  300000)==0) {a=-4; if (z<  300000) m=t;} //  5 min.
        else if ((x%   60000)==0) {a=-2; if (z<   60000) m=t;} //  1 min.
        else if ((x%   15000)==0) {a=-1;                     } // 15 sec.
        else if ((x%    5000)==0) {a= 0; b=1;                } //  5 sec.
        else if ((x%    1000)==0) {a= 0; b=2;                } //  1 sec.
    
        // Draw everything
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
};

Timeline.draw=Timeline.guard("draw", function() {
    if (!Timeline.visible) return;
    if (Timeline.delayed_draw_timeout) clearTimeout(Timeline.delayed_draw_timeout);

    // Check if the height has changed
    if (Timeline.height != window.innerHeight) {
        // Determine the height
        Timeline.height = window.innerHeight;

        // Apply the new height (which cleares the canvas)
        Timeline.element.css("height", Timeline.height + "px");
        Timeline.canvas.attr("height", Timeline.height);
    }
    
    // Determine current time
    Timeline.now=new Date().getTime();

    // Get context
    var g = Timeline.context;
    g.clearRect(0,0,Timeline.width,Timeline.height);
    g.save();

    // Calculate position of 'now'
    var y = Timeline.warp(Timeline.now);

    // Highlight the 'elapsed time since last refresh'
    var y2 = Timeline.warp(Events.pageload);
    g.fillStyle = (imperion?"rgba(204,255,128,0.2)":"rgba(0,128,255,0.1)");
    g.fillRect(0, y,Timeline.width, y2-y);

    // Gray-out forgotten history
    var y3 = Timeline.warp(Events.old);
    g.fillStyle = "rgba(64,64,64,0.5)";
    if (y3>0)
        g.fillRect(0, 0,Timeline.width, y3);

    // Draw the scale (applies a coordinate trasformation)
    Timeline.draw_scale();

    // Draw current time
    g.strokeStyle = "rgb(0,0,255)";
    g.beginPath();
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
    var m=d.getHours()+":"+d.getMinutes().pad2();
    g.save();
    g.translate(-g.mozMeasureText(m)-10, 4+y);
    g.mozDrawText(m);
    g.restore();

    function left(q) {
        if (q.constructor == Array)
            return q[0]-q[1];
        else
            return q-0;
    }

    // We want to (re)load all of the events here, rather than in the init, because otherwise new events won't
    // show up until the *next* pageload. This is also important for when running on pages that use AJAX
    // heavilly (such as gmail) because these pages will seldom reload, meaning the data displayed on them
    // will quickly outdate.
    Events.s.events.read();
    Settings.s.outpost_names.read();
    if (travian) {Settings.s.race.read();} // TODO: add in imperion?
    var events = Events.events;
    for (v in events) {
        try {
			var outpost = "";
            if (v>0) {
                outpost = Settings.outpost_names[v];
                if (!outpost) outpost="["+v+"]";
			}
            for (e in events[v]) {
                Timeline.draw_event(outpost,events[v][e]);
            }
        } catch (e) {
            Timeline.exception("Timeline.draw",e);
        }
    }
    g.restore();
});

Timeline.draw_event=Timeline.guard("draw_event",function(outpost, event){
    // Draw data
    var color = Events.type[event[0]];
    var y = Timeline.warp(event[1]);

    // Check if this type of event is visible
    if (isNaN(y)) return;
    if (!Events[event[0]][1]) return;

    var g = Timeline.context;

    // If we're differentiating merchant types, don't show the message being sent
    if (Events.predict_merchants && event[0] == 'market' && event[2].indexOf(Events.merchant_send) >= 0) return;
        
    // Draw the line
    g.strokeStyle = color;
    g.beginPath();
    g.moveTo(-10, y);
    g.lineTo(-50, y);
    g.stroke();

    // Draw the planet/village's name if available.
    g.fillStyle = (imperion?"rgb(0,64,255)":"rgb(0,0,128)");
    g.save();
    g.translate(20 - Timeline.width, y-5);
    g.mozDrawText(outpost);
    g.restore();

    // Draw the event text
    g.fillStyle = (imperion?"rgb(64,255,64)":"rgb(0,128,0)");
    // TODO: prepend an * when an attack has 100% efficiency.
    //var cap = 60*left(p[1])+40*left(p[2])+110*left(p[5]) - ((p[13]-0)+(p[14]-0)+(p[15]-0)+(p[16]-0));
    //cap = (cap<=0)?"*":"";
    g.save();
    //g.translate(20 - Timeline.width - g.mozMeasureText(cap), y+4);
    //g.mozDrawText(cap + p[2]);
    g.translate(20 - Timeline.width, y+4);
    g.mozDrawText(event[2]);
    g.restore();

    // Draw the resources info.
    if (Timeline.report_info) {
        g.save();
        g.translate(-45, y+4+12); // Move this below the message.
        if (event[4]) {
            g.fillStyle = (imperion?"rgb(192,64,0)":"rgb(64,192,64)");
            for (var i=3; i>=0; i--) {
                Timeline.draw_info(Timeline.resources,event[4][i],i,16,(travian?9:15));
            }
        }
        if (event[3]) {
            g.fillStyle = (travian?"rgb(0,0,255)":"rgb(192,64,255)");
            var img = Timeline.units[event[3][0]-1];
            for (var i=12; i>=0; i--) {
                if (travian) {
                    if (i == 10) Timeline.draw_info(Timeline.hero, event[3][i+1], 0, 16, 16);
                }
                Timeline.draw_info(img, event[3][i+1], i, (travian?16:26), 16);
            }
        }
        g.restore();
    }
});

Timeline.draw_info=function(img, nrs, pos, width, height) {
    if (!nrs) return;
    var g = Timeline.context;
    try {
        if (img.constructor == Array) {
            img = img[pos]; 
            pos = 0;
        }
        g.translate(-width, 0);
        g.drawImage(img, img.creator.width*pos, 0, img.creator.width, img.creator.height,   -3.5, -height/2-4, width, height);
    } catch (e) {
        // This might fail if the image is not yet or can't be loaded.
        // Ignoring this exception prevents the script from terminating to early.
        var fs = g.fillStyle;
        g.fillStyle = "rgb(128,128,128)";
        g.translate(-24,0);
        g.mozDrawText("??");
        g.fillStyle = fs;
        Timeline.exception("Timeline.draw_info",e);
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
};

Timeline.run=function() {
    Timeline.create_canvas();
    Timeline.create_button();
    if (travian) {
        Timeline.resources = Images.resources.stamp();
        Timeline.units = [Images.romans.stamp(), Images.teutons.stamp(), Images.gauls.stamp(), Images.nature.stamp(), Images.natars.stamp(), Images.monsters.stamp()];
        Timeline.hero = Images.hero.stamp();
    }
    if (imperion) {
        Timeline.resources = [Images.metal.stamp(), Images.crystal.stamp(), Images.hydrogen.stamp(),Images.energy.stamp()];
        Timeline.units = [Images.terrans.stamp(), Images.titans.stamp(), Images.xen.stamp()];
        if (Timeline.move_page_left)
            GM_addStyle("div#head, div#page {left: 0 !important; margin-left: 0 !important;}\n");
    }
    if (Timeline.keep_updated)
        window.setInterval(Timeline.draw, Timeline.update_interval);
    Timeline.draw();
};

Timeline.call('init', true);
$(function(){Timeline.call('run',true);});

