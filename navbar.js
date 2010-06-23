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

unsafeWindow.S=$;
Navbar.init=function(){
  Navbar.setting("remove_plus_color", false, Settings.type.bool, undefined, "De-colors the Plus link");

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
};
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
  Navbar.bar.empty();
  Navbar.fill();
};
Navbar.fill=function() {
  for (i in Navbar.links) {
    Navbar.bar.append($.new("a").attr({href: Navbar.links[i]}).text(i).css({border: "1px solid #333", margin: "2px"}));
  }
};
Navbar.run=function() {
  if (Navbar.remove_plus_color)
    $("a[href='/plus/index']").attr({class: ""});

  Navbar.bar=$($("#contentASDF>div").get(0));
  Navbar.bar.css({height: "auto", "padding-bottom": "4px"});
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
  Navbar.fill();
  if (Navbar.enable_reordering)
    Navbar.bar.bind("dragend",Navbar.drop);
};

Navbar.call('init', true);
$(function(){Navbar.call('run',true);});
