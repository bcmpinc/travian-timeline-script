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

Market.s.enabled.description="Enable market buy page enhancements";

Market.init=function() {
  Market.setting("add_ratio", false, Settings.type.bool,undefined, "Add a column with the exchange ratio");
  Market.setting("use_colors", false, Settings.type.bool,undefined, "Color the market offers to quickly determine their value");
  Market.setting("remove_unavailable", false, Settings.type.bool,undefined, "Remove lines that have a 'not enough resources' button");
  Market.setting("append_pages", false, Settings.type.bool,undefined, "Instead of reloading the page, add the offers from the next page to the current one.");
  Market.setting("repeat_header", false, Settings.type.bool,undefined, "When appending new offers, also append the header");
};
Market.append=function() {
  var url=Market.append_url+"/page/"+Market.current++;
  Market.info("Appending "+url);
  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: Market.append_loaded
  });
};
Market.append_loaded=function(contents) {
  contents=$(contents.responseText);
  var newbuy=contents.find(".buyMarket>.extraTable table");
  Market.update(newbuy);
  var rows=newbuy.find("tr");
  var body=Market.buy.find("tbody");
  rows.each(function(i) {
    if (i>0 || Market.repeat_header) // skip the header if requested.
      body.append(this);
  });
  Market.update();
};
Market.update=function(container) {
  if (Market.add_ratio) {
    var cols=container.find("col");
    if (cols.length==5) {
      var ths=container.find("th");
      $(cols.get(4)).before($.new("col").css({width: "35px"}));
      $(ths.get(4)).before($.new("th").text("Ratio"));
    }
  }
  
  var rows=container.find("tr");
  var remove=false;
  rows.each(function() {
    $this=$(this);
    var cells=$this.find(".p13");
    if (cells.length != 2) {
      if (remove) $this.remove();
      if (Market.add_ratio) $this.find("td").attr({colspan: 6});
      return;
    }
    if (Market.remove_unavailable && $this.find(".buttonError").length>0) {
      $this.remove();
      remove=true;
    } else {
      remove=false;
    }
    var a=cells.get(0).textContent.replace(",","")-0;
    var b=cells.get(1).textContent.replace(",","")-0;
    r = a/b;
    var red=Math.round(255*((r<1)?1:1/r));
    var green=Math.round(255*((r>1)?1:r));
    if (Market.add_ratio) 
      $($this.find("td").get(4)).before(
        $.new("td").text(Math.round(r*100)+"%").css({"text-align": "right", "font-size": "85%", "font-weight": "bold", color: "rgb("+red+","+green+",0)"}));
    if (Market.use_colors)
      this.style.backgroundColor = "rgba("+red+","+green+",0,0.3)";
  });
};
Market.run=function(){
  Market.buy=$(".buyMarket>.extraTable table");
  if (Market.buy.length>0) {
    Market.update(Market.buy);
    if (Market.append_pages) {
      Market.next=$(".buyMarket>.buttonNext");
      var href=Market.next.attr("href");
      var page=href.match(/\/page\/(\d+)/);
      Market.current=page?page[1]:0;
      Market.append_url="http://u1.imperion.org"+href.replace(/\/page\/\d+/,"");
      Market.next.attr({href: "javascript:"});
      Market.next.click(Market.append);
      Market.info("Append enabled, page="+Market.current+", url="+Market.append_url);
    }
  }
};

Market.call('init', true);
$(function(){Market.call('run',true);});
