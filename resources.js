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
 * RESOURCES
 ****************************************/
    
Feature.create("Resources", new Error(21));

Resources.s.enabled.description="Turn on resource and resource rate collection.";
Resources.init=function(){
    Resources.setting("display", true,  Settings.type.bool, undefined, "Turn the resource/minute display on the resource bar on/off");
    Resources.setting("market",     {}, Settings.type.object, undefined, "An array of length 4 containing the amount of resources currently available for sale on the marketplace. Might often be inaccurate.");
    Resources.setting("production", {}, Settings.type.object, undefined, "An array of length 4 containing the production rates of resp. wood, clay, iron and grain. (amount produced per hour)");
    Resources.setting("storage",    {}, Settings.type.object, undefined, "An array of length 7 containing the stored values of wood, clay, iron and grain, the size of the warehouse, the size of the granary, and then a timestamp indicating when this was taken.");
    Resources.setting("troops",     {}, Settings.type.object, "A village-id indexed array with the amount of troops that are currently in that village.");
};

Resources.show=function() {
    var head = document.getElementById("res");
    if (head!=null) {
        head.style.top="90px";
        head = head.childNodes[1].childNodes[1];
    
        var mkt = Resources.market [Settings.village_id];
        var prod = Resources.production[Settings.village_id];
        mkt = (mkt ==undefined)?[0,0,0,0]:mkt;
        prod = (prod==undefined)?['?','?','?','?']:prod;
    
        cur = head.textContent.split("\n").filter(function(x) {return x[0]>='0' && x[0]<='9'; });

        var a="";
        for (var i=0; i < 4; i++) {
            var c=(mkt[i]>0)?("+"+mkt[i]+" "):("");
            var p=(prod[i]=='?')?'?':((prod[i]>0?"+":"")+Math.round(prod[i]/6)/10.0);
            a+="<td></td><td style=\"color: gray; font-size: 80%; text-align: center;\">"+c+p+"/m</td>";
        }
        a+="<td></td><td></td>";
    
        var tr = document.createElement("tr");
        head.appendChild(tr);
        tr.innerHTML = a;
    } else {
        this.warning("Could not find resources bar.");
    }
};
Resources.update=function() {
    // Store info about resources put on the market if availbale
    var x = document.getElementById("market_sell");
    if (x!=null) {
        x=x.childNodes[3].childNodes;
        var mkt = new Array(0,0,0,0);
        for ( var i=1 ; i < x.length; i++ ){
            var c = x[i].childNodes[5].textContent - 0;
            var t = x[i].childNodes[3].firstChild.src.match("\\d") - 1;
            mkt[t] += c;
        }
        this.info("This is on the market: "+mkt);
        Resources.market[Settings.village_id]=mkt;
        Resources.s.market.write();
    } else {
        this.debug("No marketplace info found");
    }

    // Capture these from the title of the resource bar
    Resources.res_names = [];

    // Store the warehouse and production values - always available in the header bar!
    Resources.storage[Settings.village_id] = [];
    Resources.production[Settings.village_id] = [];
    for (var i=0; i < 4; i++){
        // These are indexed in reverse order from what we're using, and offset by one...
        var e = document.getElementById('l'+(4-i));

        // Capture current warehouse values
        Resources.storage[Settings.village_id][i] = parseInt(e.textContent.split('/')[0]);
        // Capture current production rates
        Resources.production[Settings.village_id][i] = parseInt(e.title);

        // The translations of the resources in the server's native language
        Resources.res_names[i] = e.previousSibling.previousSibling.childNodes[0].title;

        // Capture storage sizes
        if (i >= 2) Resources.storage[Settings.village_id][i+2] = parseInt(e.textContent.split('/')[1]);
    }
    this.info("Found the following resources storage: "+Resources.storage[Settings.village_id].join(" - "));
    this.info("Found the following resources production: "+Resources.production[Settings.village_id].join(" - "));
    
    // Timestamp. We don't need to worry about time offset because it's only used to compare with itself.
    Resources.storage[Settings.village_id][6] = new Date().getTime();

    // Get troops - either from main page, or from rally point(TBD)
    if (location.href.indexOf('dorf1.php') >= 0){
        // We're going to overwrite whatever was there in the first place
        Resources.troops[Settings.village_id] = {};

        // Grab the troop table. Two goddamn ways to do this now, stupid Travian update...
        var x = document.evaluate('//div[@id="troop_village"]/table/tbody/tr', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        if (x.snapshotLength > 0){
            if (x.snapshotItem(0).childNodes.length > 1){
                // We can identify the troops based on their class
                for (var i = 0; i < x.snapshotLength; i++){
                    var row = x.snapshotItem(i);
                    var type;
                    if (row.childNodes[1].innerHTML.indexOf('unit uhero') >= 0) type = 'hero';
                    else type = row.childNodes[1].childNodes[0].childNodes[0].className.match('u(\\d\\d?)$')[1];
                    var amount = row.childNodes[3].textContent;

                    Resources.troops[Settings.village_id][type] = parseInt(amount);
                }
            }
        }
        else {
            x = document.getElementById("troops").childNodes[2].childNodes;

            // We can identify the troops based on their class
            for (var i = 0; i < x.length; i++){
                var row = x[i];
                // Only continue if there are troops present on this row
                if (row.childNodes.length>1) {
                    var type;
                    if (row.childNodes[1].innerHTML.indexOf('unit uhero') >= 0) type = 'hero';
                    else type = row.childNodes[1].childNodes[0].childNodes[0].className.match('u(\\d\\d?)$')[1];
                    var amount = row.childNodes[3].textContent;

                    Resources.troops[Settings.village_id][type] = parseInt(amount);
                }
            }
            this.info("Found the following troops: "+uneval(Resources.troops[Settings.village_id]));
        }
    }
    // Save the values
    Resources.s.storage.write();
    Resources.s.production.write();
    Resources.s.troops.write();
};

// This calculates what the resource values will be for a given village at a given time
Resources.at_time = function(time, did){
    if (did == undefined) did = Settings.village_id;

    // Input...
    var store = Resources.storage[did];
    var prod = Resources.production[did];
    var diff = (time - store[6])/3600000; // In hours

    // Output...
    var out = [0, 0, 0, 0, store[4], store[5]];

    // If we're predicting merchants, look for all incoming that will arive between 'now' and 'time'
    var arriving = [0, 0, 0, 0];
    if (Events.predict_merchants){
        for (var i in Events.events[did]){
            var e = Events.events[did][i];
            if (e[2].indexOf(Events.merchant_receive) < 0) continue;
            if (e[1] < store[6] || e[1] > time) continue;
            for (var j in e[4]) arriving[j] -= e[4][j];
        }
    }

    for (var i = 0; i < 4; i++){
        // Calculate the output
        out[i] = Math.round(store[i] - (-diff * prod[i]) - arriving[i]);

        // Crop it...
        var cap = store[i < 3 ? 4 : 5];
        if (out[i] < 0) out[i] = 0;
        else if (out[i] > cap) out[i] = cap;
    }

    return out;
};

Resources.run=function(){
    Resources.update();
    if (Resources.display) Resources.show();
};

Resources.call('init', true);
$(function(){Resources.call('run',true);});
