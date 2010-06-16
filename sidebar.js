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
 * SIDEBAR
 ****************************************/

Feature.create("Sidebar", new Error(21));

Sidebar.s.enabled.description="Cutomize the sidebar";

Sidebar.init=function(){
    Sidebar.setting("use_hr", true, Settings.type.bool, undefined, "Use <hr> to seperate sidebar sections instead of <p>");
    Sidebar.setting("remove_plus_button", true, Settings.type.bool, undefined, "Removes the Plus button");
    Sidebar.setting("remove_plus_color", true, Settings.type.bool, undefined, "De-colors the Plus link");
    Sidebar.setting("extern_in_new_window", true, Settings.type.bool, undefined, "Causes the sidebar links that point to a non-in-game page to open in a new window/tab.");
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
                     ["FAQ", "http://help.travian.nl"],
                     ["Travian Forum", "http://forum.travian.nl"],
                     ["Wiki","http://travian.wikia.com"],
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
                     ],Settings.type.object,undefined,"The links of the sidebar.");
};
    
Sidebar.run=function() {
    if (Sidebar.remove_plus_button) {
        if ($("#plus").css("visibility", "hidden").length==0) {
            this.info("Couldn't find the plus button.");
        }
    }

    var navi = $("#side_navi");
    if (navi.length==0) {
        this.warning("Couldn't find sidebar.");        
        return;
    }
    
    var logo = navi.find("#logo");
    if (Sidebar.remove_home_link)
        logo.attr("href",location.href);
        
    // Make copy of links
    var oldnavi = navi.find("p>a");
    
    // Remove all links
    oldnavi.detach();
    navi.find("p").remove();
    
    // Create a link container (p);
    var newnavi = $.create("p");
    
    // Add new links
    for (var i = 0; i < Sidebar.links.length; i++) {
        var x = Sidebar.links[i];
        if (x.constructor == Array) {
            var el=$.create("a").text(x[0]).attr("href",x[1]);
            if (Sidebar.extern_in_new_window && x[1].match("^https?://"))
                el.attr("target", "_blank");
            newnavi.append(el);
        } else if (x.constructor == String) {
            newnavi.append($.create("b").text(x));
        } else if (x<0) {
            if (Sidebar.use_hr) {
                newnavi.append($.create("hr"));
            } else {
                newnavi.append($.create("br"));
            }
        } else {
            var el = oldnavi.eq(x);
            if (Sidebar.remove_plus_color)
                el.text(el.text()); // Remove color from Plus link.
            newnavi.append(el);
        }
    }

    // Insert new links.
    logo.after(newnavi);
};

Sidebar.call('init', true);
$(function(){Sidebar.call('run',true);});
