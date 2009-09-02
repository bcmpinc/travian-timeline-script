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
 * SIDEBAR
 ****************************************/

Feature.create("Navbar");

Navbar.s.enabled.description="Cutomize the sidebar";

Navbar.init=function(){
    Navbar.setting("use_hr", true, Settings.type.bool, undefined, "Use <hr> to seperate sidebar sections instead of <br>");
    Navbar.setting("remove_plus_button", true, Settings.type.bool, undefined, "Removes the Plus button");
    Navbar.setting("remove_plus_color", true, Settings.type.bool, undefined, "De-colors the Plus link");
    //Servse no purpose: (though is an idea to add to other links)
    //Navbar.setting("remove_target_blank", true, Settings.type.bool, undefined, "Removes target=\"_blank\", such that all sidebar links open in the same window.");
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
                     ],Settings.type.object,undefined,"The links of the sidebar.");
};
    
Navbar.add=function(text, target) {
    var el;
    if (target=="") {
        el=document.createElement("b"); // Create a bold header
    } else {
        el=document.createElement("a"); // Create a normal link
        el.href=target;
    }
    el.innerHTML = text;
    Navbar.navi.appendChild(el);
};
Navbar.add_break=function() {
    if (Navbar.use_hr) {
        Navbar.navi.appendChild(document.createElement("hr"));
    } else {
        Navbar.navi.appendChild(document.createElement("br"));
        Navbar.navi.appendChild(document.createElement("br"));
    }
};
Navbar.run=function() {
    if (Navbar.remove_plus_button) {
        var plus = document.getElementById("plus");
        if (plus) {
            plus.style.visibility="hidden";
        } else {
            this.info("Couldn't find the plus button.");
        }
    }

    Navbar.navi = document.getElementById("sleft");
    if (!Navbar.navi) {
        this.warning("Couldn't find sidebar.");        
        return;
    }
    
    if (Navbar.remove_home_link)
        Navbar.navi.childNodes[1].href=location.href;
        
    // Make copy of links
    Navbar.oldnavi = [];
    for (var i = 2; i < Navbar.navi.childNodes.length; i++) {
        var ch=Navbar.navi.childNodes[i];
        for (var ii = 0; ii < ch.childNodes.length; ii++) {
            var ch2=ch.childNodes[ii];
            if (ch2.tagName=="A") {
                Navbar.oldnavi.push(ch2);
            }
        }
    }
    
    // Remove all links
    for (var i = Navbar.navi.childNodes.length - 1; i>=2; i--)
        Navbar.navi.removeChild(Navbar.navi.childNodes[i]);
    
    // Create a link container (p);
    var p=document.createElement("p");
    Navbar.navi.appendChild(p);
    Navbar.navi=p;
    
    // Add new links
    for (var i = 0; i < Navbar.links.length; i++) {
        var x = Navbar.links[i];
        if (x.constructor == Array) {
            Navbar.add(x[0], x[1]);
        } else if (x.constructor == String) {
            Navbar.add(x, "");
        } else if (x<0) {
            Navbar.add_break();
        } else {
            var el = Navbar.oldnavi[x];
            this.debug(el+" i="+i+" x="+x);
            //if (Navbar.remove_target_blank)
            //    el.removeAttribute("target"); // Force all links to open in the current page.
            if (Navbar.remove_plus_color)
                el.innerHTML=el.textContent; // Remove color from Plus link.
            Navbar.navi.appendChild(el);
        }
    }
};

if (Settings.natural_run){
    Navbar.call('init', true);
    $(function(){Navbar.call('run',true);});
}
