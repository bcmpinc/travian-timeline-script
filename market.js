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
 * MARKET
 ****************************************/

Feature.create("Market", new Error(21));

Market.s.enabled.description="Enable market buy page enhancements";

Market.init=function() {
    Market.setting("add_ratio", true, Settings.type.bool,undefined, "Add a column with the exchange ratio");
    Market.setting("use_colors", true, Settings.type.bool,undefined, "Color the market offers to quickly determine their value");
    Market.setting("remove_unavailable", false, Settings.type.bool,undefined, "Remove lines that have a 'not enough resources' button");
    if (imperion) {
        Market.setting("append_pages", true, Settings.type.bool,undefined, "Instead of reloading the page, add the offers from the next page to the current one.");
        Market.setting("repeat_header", true, Settings.type.bool,undefined, "When appending new offers, also append the header");
        Market.setting("initial_appends", 0, Settings.type.integer,undefined, "When loading a page, immediately append this many additional pages ((requires append pages))");
    }
};

if (imperion) {
    Market.append=function() {
        if (Market.out_of_data) return;
        var url=Market.append_url+"/page/"+Market.current++;
        Market.info("Appending "+url);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: Market.append_loaded
        });
    };
    Market.out_of_data=false;
    Market.append_loaded=function(contents) {
        contents=$(contents.responseText);
        var newbuy=contents.find(".buyMarket>.extraTable table");
        if (newbuy.find("tr").length<3) {
            // we are out of data
            Market.next.attr({class: Market.next.attr("class").replace("buttonNext","buttonNextDisabled")});
            Market.next.unbind("click",Market.append);
            Market.out_of_data=true;
            return;
        }
        Market.update(newbuy);
        var rows=newbuy.find("tr");
        var body=Market.buy.find("tbody");
        rows.each(function(i) {
            if (i>0 || Market.repeat_header) // skip the header if requested.
                body.append(this);
        });
        Market.check_initial_appends();
    };
    Market.check_initial_appends=function() {
        if (Market.initial_appends>0) {
            Market.initial_appends--;
            setTimeout(Market.append,1000);
        }
    };
}

Market.update=function(container) {
    if (Market.add_ratio) {
        if (imperion) {
            var cols=container.find("col");
            if (cols.length==5) {
                var ths=container.find("th");
                $(cols.get(4)).before($.new("col").css({width: "35px"}));
                $(ths.get(4)).before($.new("th").text("Ratio"));
            }
        }
        if (travian) {
            var tds=container.find("thead tr+tr td");
            if (tds.length==5) {
                $(tds.get(4)).before($.new("td").text("Ratio"));
            }
        }
    }
    container.find("[colspan='5']").attr("colspan", 6);

    var rows=container.find("tr");
    var remove=false;
    rows.each(function() {
        $this=$(this);
        var cells=$this.find((imperion?".p13":".val"));
        if (cells.length != 2) {
            if (remove) $this.remove();
            return;
        }
        if (Market.remove_unavailable && $this.find((imperion?".buttonError":".act.none")).length>0) {
            $this.remove();
            remove=true;
            return;
        } else {
            remove=false;
        }
        var a=cells.eq(0).text().replace(/[.,]/g,"")-0;
        var b=cells.eq(1).text().replace(/[.,]/g,"")-0;
        r = a/b;
        var red   = Math.round(255*((r<1)?1:1/r));
        var green = Math.round(255*((r>1)?1:r));
        if (Market.add_ratio) 
            $this.find("td").eq(4).before(
                $.new("td").text(Math.round(r*100)+"%").css({"text-align": "right", "font-size": "85%", "font-weight": "bold", color: "rgb("+red+","+green+",0)"}));
        if (Market.use_colors)
            $this.find("td").css("backgroundColor", "rgba("+red+","+green+",0,0.3)");
    });
};

Market.run=function(){
    Market.buy=$((imperion?".buyMarket>.extraTable table":"#build.gid17 #range"));

    if (Market.buy.length>0) {
        if (travian) {
            GM_addStyle("#range tr {background-color: white;} #range .none {font-size: 75%; color: #C66;}");
        }
        Market.update(Market.buy);
        if (imperion) {
            if (Market.append_pages) {
                Market.next=$(".buyMarket .buttonNext");
                var href=Market.next.attr("href");
                var page=href.match(/\/page\/(\d+)/);
                Market.current=page?page[1]:0;
                Market.append_url="http://u1.imperion.org"+href.replace(/\/page\/\d+/,"");
                Market.next.attr({href: "javascript:"});
                Market.next.click(Market.append);
                Market.info("Append enabled, page="+Market.current+", url="+Market.append_url);
                Market.check_initial_appends();
            }
        }
    }
};

Market.call('init', true);
$(function(){Market.call('run',true);});
