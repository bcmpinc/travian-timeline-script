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
 * MARKET
 ****************************************/

Feature.create("Market");

Market.s.enabled.description="Color the market offers to quickly determine their value.";
Market.update_colors=true; // tells whether the next call to colorify should recolor the table.

Market.colorify=function() {
    // Run this function twice each second.
    setTimeout(Market.colorify,500);
    // But don't do an update when it's not necessary.
    if (!Market.update_colors) return;
    Market.update_colors=false;

    var res = document.getElementById("market_buy").childNodes[2].childNodes
    for ( var i=1 ; i < res.length; i++ ) {
        x = res[i];
        if (x.childNodes[6]!=undefined && x.childNodes[6].textContent>0) {
            a = x.childNodes[2].textContent-0;
            b = x.childNodes[6].textContent-0;
            r = a/b;
            if (r>1.5)
                color="#ddffdd";
            else if (r>1.001)
                color = "#eeffdd";
            else if (r>0.999)
                color = "#ffffdd";
            else if (r>0.501)
                color = "#ffeedd";
            else
                color = "#ffdddd";

            x.style.backgroundColor = color;
        }
    }
};
Market.attribute_changed=function(e) {
    // Tell that something changed and that an update might be necessary
    // The TravianBeyound script used to preload some more pages and merged them into this list,
    // causing the colors to be removed. Als changing filters removed colors.
    // This event tells that colors need updating.
    Market.update_colors=true;
};
Market.run=function(){
    x = document.getElementById("market_buy");
    if (x!=null) {
        Market.colorify();
        document.addEventListener('DOMAttrModified',Market.attribute_changed,false);
    }
};

Market.call('init', true);
$(function(){Market.call('run',true);});
