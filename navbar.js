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
 * NAVIGATION BAR
 ****************************************/

Feature.create("Navbar", new Error(21));

Navbar.s.enabled.description="Cutomize the sidebar";

Navbar.init=function(){
    Navbar.setting("remove_plus_color", true, Settings.type.bool, undefined, "De-colors the Plus link");
    if (travian) {
        Navbar.setting("use_hr", true, Settings.type.bool, undefined, "Use <hr> to seperate sidebar sections instead of <p>");
        Navbar.setting("remove_plus_button", true, Settings.type.bool, undefined, "Removes the Plus button");
        Navbar.setting("extern_in_new_window", true, Settings.type.bool, undefined, "Causes the sidebar links that point to a non-in-game page to open in a new window/tab.");
        Navbar.setting("remove_home_link", true, Settings.type.bool, undefined, "Redirects travian image to current page instead of travian homepage.");

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
        // Navbar.links = [0,1,2,3,-1,4,5,-1,6,7];
        // TODO: make configureable?
        Navbar.setting("links",
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
    }
    if (imperion) {
        Navbar.setting("links",{},Settings.type.object,undefined,"The (detected) links of the sidebar")
        Navbar.setting("auto_detect", false, Settings.type.bool, undefined, "Automagically detect the targets of the links (turning this on might decrease performance) ");
        Navbar.setting("enable_reordering", false, Settings.type.bool, undefined, "Allow the links to be reordered by dragging");
        Navbar.detectors={
            "Market (buy)": ".buyMarket",
            "Market (sell)": ".sellMarket",
            "Research": "#researchCenter",
            "Accumulator": "#energyStorage",
            "Fleet Base": "#fleetBase",
            "Arms Factory": ".building_page_540,.building_page_1540",
            "Civilian Shipyard": ".building_page_630,.building_page_1630",
            "Military Shipyard": ".building_page_620,.building_page_1620",
            "Rocket Silo": ".building_page_2540",
            "Small Shipyard": ".building_page_2630",
            "Large Shipyard": ".building_page_2620"
        };
    }
};

if (imperion) {
    Navbar.drop=function(o) {
        var t=o.originalTarget.parentNode;
        if (t.tagName!="A") return;
        t=$(t);
        Navbar.debug("(Re)Linking "+t.text()+" to "+t.attr("href"));
        if (Navbar.links[t.text()]) {
            delete Navbar.links[t.text()];
        }
        Navbar.links[t.text()]=t.attr("href");
        Navbar.s.links.write();
        Navbar.fill();
    };
}
Navbar.fill=function() {
    // Remove any old links
    Navbar.bar.empty();
    // Add new links
    for (var i in Navbar.links) {
        var el;
        if (imperion) {
            el = $.new("a").attr({href: Navbar.links[i]}).text(i).css({border: "1px solid #333", margin: "2px"});
        }
        if (travian) {
            var x = Navbar.links[i];
            if (x.constructor == Array) {
                var el=$.new("a").text(x[0]).attr("href",x[1]);
                if (Navbar.extern_in_new_window && x[1].match("^https?://"))
                    el.attr("target", "_blank");
            } else if (x.constructor == String) {
                el = $.new("b").text(x);
            } else if (x<0) {
                if (Navbar.use_hr) {
                    el = $.new("hr");
                } else {
                    el = $.new("br");
                }
            } else {
                el = Navbar.oldnavi.eq(x);
                if (Navbar.remove_plus_color)
                    el.text(el.text()); // Remove color from Plus link.
            }
        }
        Navbar.bar.append(el);
    }
};
Navbar.run=function() {
    if (imperion) {
        if (Navbar.remove_plus_color) {
            $("a[href='/plus/index']").attr({class: ""});
        }

        var changed=false;
        if (Navbar.auto_detect) {
            for (i in Navbar.detectors) {
                if ($(Navbar.detectors[i]).length>0) {
                    Navbar.links[i]=location.href;
                    changed=true;
                    Navbar.info("Linked "+i+" to "+location.href);
                }
            }
            if (changed)
                Navbar.s.links.write();
        }
        Navbar.bar=$("#contentASDF>div").eq(0);
        Navbar.bar.css({height: "auto", "padding-bottom": "4px"});
        if (Navbar.enable_reordering)
            Navbar.bar.bind("dragend",Navbar.drop);
    }
    if (travian) {
        if (Navbar.remove_plus_button) {
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
        if (Navbar.remove_home_link)
            logo.attr("href",location.href);
            
        // Make copy of links
        Navbar.oldnavi = navi.find("p>a");
        
        // Remove all links
        Navbar.oldnavi.detach();
        navi.find("p").remove();
        
        // Create a link container (p);
        Navbar.bar = $.new("p");

        // Insert new links bar.
        logo.after(Navbar.bar);
    }

    Navbar.fill();
};

Navbar.call('init', true);
$(function(){Navbar.call('run',true);});
