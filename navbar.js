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
 * NAVIGATION BAR
 ****************************************/

Feature.create("Navbar");

Navbar.s.enabled.description="Cutomize the sidebar";
unsafeWindow.S=$;
Navbar.init=function(){
  Navbar.setting("remove_plus_color", false, Settings.type.bool, undefined, "De-colors the Plus link");

  Navbar.setting("links",
                  [
                    ["Market (buy)", ".buyMarket"],
                    ["Market (sell)", ".sellMarket"],
                    ["Research", ".researchCenter"],
                    ["Accumulator", ".energyStorage"],
                    ["Fleet Base", ".fleetBase"],
                    ["Arms Factory", ".building_page_540,.building_page_1540"],
                    ["Civilian Shipyard", ".building_page_630,.building_page_1630"],
                    ["Military Shipyard", ".building_page_620,.building_page_1620"],
                    ["Rocket Silo", ".building_page_2540"],
                    ["Small Shipyard", ".building_page_2630"],
                    ["Large Shipyard", ".building_page_2620"],
                  ],Settings.type.object,undefined,"The links of the sidebar.");
};
    
Navbar.run=function() {
  if (Navbar.remove_plus_color)
    $("a[href='/plus/index']").attr({class: ""});

  Navbar.bar=$($("#contentASDF>div").get(0));
  Navbar.bar.css({height: "auto", "padding-bottom": "4px"});
  var changed=false;
  for (var i = 0; i < Navbar.links.length; i++) {
    var x = Navbar.links[i];
    if ($(x[1]).length>0) {
      x[2]=location.href;
      changed=true;
      Navbar.info("Linked "+x[0]+" to "+x[2]);
    }
    if (x[2])
      Navbar.bar.append($.new("a").attr({href: x[2]}).text(x[0]).css({border: "1px solid #333", margin: "2px"}));
  }
  if (changed)
    Navbar.s.links.write();
};

Navbar.call('init', true);
$(function(){Navbar.call('run',true);});
