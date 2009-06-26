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

try{

/****************************************
 * EVENTS
 ****************************************/

Feature.create("Events");
Events.init=function(){
    Events.setting("enabled", true, Settings.type.bool, undefined, "Enable the event data collector");
    Events.direct('br');
    Events.setting("history", 1440, Settings.type.integer, undefined, "The time that events will be retained after happening, before being removed (in minutes)");
    Events.setting("type", {/* <tag> : [<color> <visible>] */
            building: ['rgb(0,0,0)', true],
                attack : ['rgb(255,0,0)', true],
                market : ['rgb(0,128,0)', true],
                research: ['rgb(0,0,255)', true],
                party : ['rgb(255,128,128)', true],
                demolish : ['rgb(128,128,128)', true],
                overflow : ['rgb(150,0,150)', true]
                }, Settings.type.object, undefined, "List of event types", 'true');
    Events.setting("events", {}, Settings.type.object, undefined, "The list of collected events.", 'true');

    Events.direct('br');
    Events.setting("predict_merchants",             false, Settings.type.bool,   undefined, "Use the sending of a merchant to predict when it will return back, and for internal trade add an event to the recieving village too");
    var ev_1 = Events.direct('table');
    ev_1.el.style.marginLeft = '10px';
    Events.setting("merchant_send",        'Transport to', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on outgoing merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants', ev_1);
    Events.setting("merchant_receive",   'Transport from', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on incoming merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants', ev_1);
    Events.setting("merchant_return",       'Return from', Settings.type.string, undefined, "This is the translation of the string that comes just before the village name on returning merchants. It must be identical (with no trailing whitespace) or it won't work.", '! Events.predict_merchants', ev_1);

    Events.direct('br');
    display_options = ['Timeline & Tooltip', 'Timeline', 'Tooltip', 'Neither'];
    Events.setting('building',   0, Settings.type.enumeration, display_options, 'Keep track of what you build [from village center and overview]');
    Events.setting('attack',     0, Settings.type.enumeration, display_options, 'Keep track of all incoming and outgoing troops [from the rally point]');
    Events.setting('market',     0, Settings.type.enumeration, display_options, "Keep track of incoming and outgoing merchants, and what they're carrying [from the market]");
    Events.setting('research',   0, Settings.type.enumeration, display_options, 'Keep track of what is being researched [from the Acadamy, Blacksmith and Armoury]');
    Events.setting('party',      0, Settings.type.enumeration, display_options, 'Keep track of parties [from the town hall]');
    Events.setting('demolish',   0, Settings.type.enumeration, display_options, 'Keep track of demolished buildings [from the main building]');
    Events.setting('overflow',   1, Settings.type.enumeration, display_options, 'Keep track of resource overflows [from every page]');

    Events.persist('send_twice',  false);
};
// There is no report type, because there are different types of reports, which can also be divided over the currently
// available types.

/* A event-data-packet torn apart:
   Example: { 129390: {'b9930712':["building",1225753710000,"01. Someville","Granary (level 6)",undefined,undefined]} }
   129390: #### ~ The village id
   'b9930712': #### ~ Some identifier that is both unqiue and consistent between page loads.
   ["building", 0 ~ Type of event
   1225753710000, 1 ~ Estimated time at which this event occure(s|d).
   "Granary (level 6)", 2 ~ Event message.
   3 ~ For events that might include armies (can be 'undefined')
   [0, 3. 0 ~ Amount of farm-men involved
   0, 3. 1 ~ Amount of defense-men involved
   0, 3. 2 ~ Amount of attack-men involved
   0, 3. 3 ~ Amount of scouts involved
   0, 3. 4 ~ Amount of defense-horses involved
   0, 3. 5 ~ Amount of attack-horses involved
   0, 3. 6 ~ Amount of rams involved
   0, 3. 7 ~ Amount of trebuchets involved
   0, 3. 8 ~ Amount of leaders involved
   0, 3. 9 ~ Amount of settlers involved
   0], 3.10 ~ Amount of heros involved
   4 ~ For events that might include resources (can be 'undefined')
   [0, 4. 0 ~ Amount of wood involved
   0, 4. 1 ~ Amount of clay involved
   0, 4. 2 ~ Amount of iron involved
   0]] 4. 3 ~ Amount of grain involved
   Instead of a number, the fields in field 4 and 5 are also allowed to be a tuple (list).
   In this case the first field is the original amount and the second field is the amount by which the amount has decreased.
*/

Events.test_event=function(village, id){
    if (Events.events[village] == undefined) return false;
    if (Events.events[village][id] == undefined) return false;
    return true;
}

// village = id of the village.
// id = The consistent unique event identifier.
// overwrite = optionally overwrite any matching events
Events.get_event=function(village, id, overwrite) {
    var e = Events.events[village];
    if (e == undefined) {
        e = {};
        Events.events[village]=e;
        Debug.debug("Added village: "+village);
    }
    e = Events.events[village][id];
    if (e == undefined || overwrite === true) {
        e = [];
        Events.events[village][id]=e;
        Debug.debug("Created element: "+id);
    }
    return e;
};

Events.update_data=function() {
    Events.s.events.read(); // Make sure the variable data is up to date.
    // Collect new stuff
    if (Settings.natural_run){
        for (var c in Events.collector) {
            try {
                Events.collector[c]();
            } catch (e) {
                Debug.exception("Events.collector."+c,e);
            }
        }
    }

    // Remove old stuff
    // TODO: use tl_date()? Do something with server time?
    Events.pageload = new Date().getTime();
    Events.old = Events.pageload-Events.history*60000;
    for (var v in Events.events) {
        for (var e in Events.events[v]) {
            if (Events.events[v][e][1]<Events.old) {
                delete Events.events[v][e];
            }
            // room for updates: (for migration to new versions of this script)
        }
    }
    Events.s.events.write();
};

Events.run=function() {
    Events.update_data();
};


// Collectors
// ----------

Events.collector={};
Events.collector.building=function(){
    // Checking if data is available
    if (location.href.indexOf("dorf")<=0) return;
    var build = document.evaluate('//div[starts-with(@id, "building_contract")]/table/tbody/tr', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (build == undefined){
        var buildlist=document.getElementById("building_contract");
        Debug.debug(buildlist.textContent);
        build = document.evaluate('./tbody/tr', buildlist, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        if (build == undefined) {
            Debug.debug("No build tasks found.");
            return;
        }
    }

    var center = location.href.indexOf('dorf2.php') >= 0;

    // Collecting
    Debug.debug("Collecting "+build.snapshotLength+" build tasks.");
    for (var nn = 0; nn < build.snapshotLength; nn++){
        var x = build.snapshotItem(nn);
        var id = 'b'+x.childNodes[center ? 1 : 0].childNodes[0].href.match('\\?d=(\\d+)&')[1];
        var e = Events.get_event(Settings.village_id, id);

        e[0]="building";
    
        // TODO: get timing more accurate.
        var d = new tl_date();
        d.set_time(x.childNodes[center ? 7 : 3].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
        var duration = x.childNodes[center ? 5 : 2].textContent.match('(\\d\\d?):(\\d\\d):(\\d\\d)');
        d.adjust_day(duration);
        e[1] = d.set_seconds(duration);
        e[2] = x.childNodes[center ? 3 : 1].textContent;

        Debug.debug("Time set to "+e[1]);
    }
};

// Travelling armies (rally point)
Events.collector.attack=function(){
    if (location.href.indexOf('build.php') < 0) return;
    // These are both constant, and the only ways of reaching the rally point...
    if (location.href.indexOf('gid=16') < 0 && location.href.indexOf('id=39') < 0) return;

    var euro_server = false;
    var res = document.evaluate('//table[@class="std troop_details"]//th[@colspan]/a[starts-with(@href, "karte.php")]', document,
                                null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (res.snapshotLength == 0){
        euro_server = true;
        res = document.evaluate('//table[@class="troop_details"]', 
                                    document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    }
    var last_event_time=0;
    var event_count=0;

    for ( var i=0 ; i < res.snapshotLength; i++ ) {
        // The top of the table
        x = res.snapshotItem(i);
        if (!euro_server) x = x.parentNode.parentNode.parentNode.parentNode;
        // Instead of checking if this is the correct line, just act as if it's correct
        // If it isn't this will certainly fail.
        var d = new tl_date();
        if (x.childNodes.length == 5){
            var z = x.childNodes[4];
            var r = x.childNodes[3].childNodes[0].childNodes[1].textContent.split(' |');
            Debug.debug(x.childNodes[3].childNodes[0].childNodes[1].textContent);
        } else {
            var z = x.childNodes[3];
            var r = [];
        }
        var zs=z.textContent.split('\n');
        d.set_time(zs[euro_server ? 1 : 3].match('(\\d\\d?)\\:(\\d\\d)\\:(\\d\\d) ?([a-z]*)'));
        var duration = zs[euro_server ? 1 : 2].match('(\\d\\d?):\\d\\d:\\d\\d');
        var t = d.adjust_day(duration);

        var y = res.snapshotItem(i).parentNode;
        var dest = y.previousSibling.textContent;
        var attacking = false;
        for (var j in Settings.village_names) if (dest.indexOf(Settings.village_names[j]) >= 0){ attacking = true; break;}
        var msg = y.textContent;
        if (!attacking) msg = dest+' : '+msg;

        // Using the time as unique id. If there are multiple with the same time increase event_count.
        // It's the best I could do.
        if (last_event_time==t) event_count++;
        else last_event_time=t;
        var e = Events.get_event(Settings.village_id, "a"+t+"_"+event_count);
        e[0] = "attack";
        e[1] = d.set_seconds(duration);
        e[2] = msg;
        e[3] = [];
        for (var j = 0; j<11; j++) {
            var y = x.childNodes[2].childNodes[1].childNodes[j+1];
            if (y!=undefined)
                e[3][j] = y.textContent - 0;
        }
        if (r != undefined){
            e[4] = [];
            for (var j=0; j < 4; j++) if (r[j] > 0) e[4][j] = r[j];
        }
    }
};

// Market Deliveries
Events.collector.market=function(){
    // Make sure we're on an individual building page
    if (location.href.indexOf('build.php')<=0) return;
    // If there is an OK button
    if (document.getElementById('btn_ok') == undefined) return;
    // Then this must be the market! (in a language-insensitive manner :D)

    var last_event_time=0;
    var event_count=0;
    var now = new Date().getTime();

    /* GENERAL MARKET PREDICTION THEORY
    ==========================================================
    # Category                         || !Predict | Predict
    ==========================================================
    1) Sending   | Internal | Pushing  || A        | A, B, C
    2)           | External | Pushing  || A        | A, B
                 |          | Buying   || A        | A, B
                 |          | Selling  || A        | A, B
    3) Receiving | Internal | Pushing  || A        | 
    4)           | External | Pushing  || A        | A
                 |          | Buying   || A        | A
                 |          | Selling  || A        | A
    ==========================================================
    # Actions
    ==========================================================
    A) Local Event
    B) Local Return
    C) Destination Event
    ==========================================================
    # Detection
    ==========================================================
    * Sending vs Receiving - use language dependencies
    * Internal vs External - look for the village name in Settings.
    * Pushing vs Buying vs Selling - haven't figured this out yet, but
      not too critical - would be nice to make "2) Selling" be A only
    */
    // Local Event - basic, everything
    var type_A = function(){
        var e = Events.get_event(Settings.village_id, "a"+t+"_"+event_count);
        e[0] = "market";
        e[1] = ts;
        e[2] = msg; // Extract the action type
    
        // Add resource pictures and amounts (if sending)
        if (!ret) e[4] = res;
    }

    // Local Return - sending only
    var type_B = function(){
        var rtn_t = 2*t - now;
        var rtn_ts = 2*ts - now;

        var e = Events.get_event(Settings.village_id, 'a'+rtn_t+'_'+event_count);
        e[0] = 'market';
        e[1] = rtn_ts;
        e[2] = Events.merchant_return + msg.split(Events.merchant_send)[1];
    }

    // Destination Event - internal sending only
    var type_C = function(did){
        var e = Events.get_event(did, 'a'+t+'_'+event_count);
        e[0] = 'market';
        e[1] = ts;
        e[2] = Events.merchant_receive + ' ' + Settings.village_names[Settings.village_id];
        e[4] = res;
    }

    var predict = function(){
        // Don't catch returning events in this mode...
        if (ret) return;

        // Categorize the event
        var send = msg.indexOf(Events.merchant_send) >= 0;

        var internal = false;
        if (x.childNodes[0].childNodes[1].childNodes[0].href.match(/uid=(\d+)/)[1] == Settings.username){
            for (var did in Settings.village_names) if (msg.indexOf(Settings.village_names[did]) >= 0){ internal = true; break;}
        }

        Debug.debug(msg + ' | send='+send+' internal='+internal);

        // Ensure an event of this type doesn't already exists at this time
        if (Events.test_event(Settings.village_id, 'a'+t+'_'+event_count)) return;

        if (send || !internal) type_A();
        if (send)              type_B();
        if (send && internal)  type_C(did);

        if (send && Events.send_twice){
            var then = now;
            now = 2*t - now;
            t = 3*t - 2*(then); // Move forward to the return time
            type_A();
            type_B();
            if (internal) type_C(did);
            Events.send_twice = false; // Eat the 'go twice' signal
            Events.s.send_twice.write();
        }
    }

    var shipment = document.evaluate('//table[@class="tbg"]/tbody', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i=0; i < shipment.snapshotLength; i++){
        var x = shipment.snapshotItem(i);
        var d = new tl_date();

        // Extract the arrival time, and adjust by duration of the shipment
        d.set_time(x.childNodes[2].childNodes[2].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
        var duration = x.childNodes[2].childNodes[1].textContent.match('(\\d\\d?):(\\d\\d):(\\d\\d)');
        var t = d.adjust_day(duration);
        var ts = d.set_seconds(duration);

        // Using the time as unique id. If there are multiple with the same time increase event_count.
        // It's the best I could do.
        if (last_event_time==t) event_count++;
        else last_event_time=t;

        // Extract the value of the shipment
        var res = x.childNodes[4].childNodes[1].textContent.split(' | ');
        Debug.debug("Merchant carrying "+res);

        // Extract the transit message
        var msg = x.childNodes[0].childNodes[3].textContent;

        // Check if merchant is returning
        var ret = x.childNodes[4].childNodes[1].childNodes[0].className[0]=='c';
        if (ret) Debug.debug("Merchant is returning");

        if (Events.predict_merchants) predict();
        else type_A(); // by default
    }

    if (Events.predict_merchants){
        var x2 = document.getElementsByName('x2')[0];
        if (x2 != undefined){
            // If the 'go twice' button is checked the first time, doesn't mean it's meaningful the second; wait again.
            // Because of this, this has to run *after* the rest of the merchant collector
            Events.send_twice = false;
            Events.s.send_twice.write();

            // Wait for the click on the 'ok' button
            x2.parentNode.nextSibling.childNodes[0].addEventListener('click', function(){
                    if (x2.checked){
                        Events.send_twice = true;
                        Events.s.send_twice.write();
                    }
                }, false);
        }
    }
};

Events.collector.research = function(){
    // Make sure we're on a building page
    if (location.href.indexOf('build.php') < 0) return;

    // For now, assume that if we have two tables of class "std building_details", it means we're on a research building
    var x = document.evaluate('//table[@class="std build_details"]/tbody', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    // They have goddamn different formats for the acadamy than for the blacksmith/armoury now!! :(
    if (x.snapshotLength < 2){
        x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class)]/td[(@width="6%") and (position()<2)]',
                                  document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        if (x.snapshotLength != 1) return;
        x = x.snapshotItem(0).parentNode;

        var d = new tl_date();

        d.set_time(x.childNodes[7].textContent.match(/(\d\d?):(\d\d) ?([a-z]*)/));
        var duration = x.childNodes[5].textContent.match(/(\d\d?):\d\d:\d\d/);
        var t = d.adjust_day(duration);

        var type = x.childNodes[3].textContent;

        // Extract the name of the building where the upgrade is occuring - the acadamy in local language
        var building = x.parentNode.parentNode.previousSibling.previousSibling.childNodes[1].childNodes[0].childNodes[1].textContent;
    }
    else {
        var tr = x.snapshotItem(1).childNodes[1];
        var d = new tl_date();
 
        d.set_time(tr.childNodes[5].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)'));
        var duration = tr.childNodes[3].textContent.match('(\\d\\d?):\\d\\d:\\d\\d');
        var t = d.adjust_day(duration);
 
        // Extract the unit being upgraded
        var type = tr.childNodes[1].childNodes[3].textContent;
        Debug.debug("Upgrading "+type);
 
        // Extract the name of the building where the upgrade is occuring
        var building = x.snapshotItem(0).previousSibling.previousSibling.childNodes[1].childNodes[1].textContent;
        Debug.debug("Upgrading at the "+building);

        // Extract the level upgrading to - not for the acadamy!
        // We can't go far into these <td>s, because Beyond changes its guts (a lot!). Messing too much around
        // in there could create compatibility problems... so keep it remote with textContent.
        for (var i in x.snapshotItem(0).childNodes){
            var y = x.snapshotItem(0).childNodes[i];
            if (y.childNodes.length == 0) continue;

            var level = y.childNodes[1].textContent.match(type+' (\\([A-Z][a-z]* )(\\d\\d?)(\\))');
            if (level){
                level[2] -= -1; // It's upgrading to one more than its current value. Don't use '+'.
                level = level[1]+level[2]+level[3];
                Debug.debug("Upgrading to "+level);
                break;
            }
        }
    }

    // And now throw all of this information into an event
    // Don't throw in the level information if we're researching a new unit at the acadamy... because there isn't any!
    // Hash the event by the building name, because we can only have one research event per building per village
    var e = Events.get_event(Settings.village_id, t+building);
    e[0] = 'research';
    e[1] = d.set_seconds(duration);
    e[2] = building + ': '+type+(level==undefined ? '' : ' '+level);
};

Events.collector.party = function(){
    // Make sure we're on a building page
    if (location.href.indexOf('build.php') < 0) return;
    // The theory here is "look for a table who's second td has an explicit width of 25% and is not a header".
    // This should be exclusive for Town Halls, hence parties.
    var x = document.evaluate('//table[@class="tbg"]/tbody/tr[not(@class="cbg1")]/td[(position()=2) and (@width="25%")]',
                              document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (x.snapshotLength != 1) return;
    x = x.snapshotItem(0).parentNode;

    Debug.info('Found a party event!');

    var d = new tl_date();
    d.set_time(x.childNodes[5].textContent.match('(\\d\\d?):(\\d\\d) ([a-z]*)'));
    var duration = x.childNodes[3].textContent.match('(\\d\\d?):\\d\\d:\\d\\d');
    d.adjust_day(duration);
    var t = d.set_seconds(duration);

    var msg = x.childNodes[1].textContent;
    Debug.info('Party type = '+msg);

    // We can only have one party per village max; overwrite any pre-existing party records
    // (how the hell could we ever get pre-existing parties??? You can't cancel the damn things...)
    // BUG: So the event entry of parties that finished already will be removed when a new party is detected. 
    var e = Events.get_event(Settings.village_id, 'party', true);
    e[0] = 'party';
    e[1] = t;
    e[2] = msg;
};

Events.collector.demolish = function(){
    // Are we on the main building page?
    if (location.href.indexOf('build.php') < 0) return;
    // Look for a 'cancel' image, as is used to cancel the demolishion
    // BUG: following check does cause false positives
    var x = document.evaluate('//img[@class="del"]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
    if (x == undefined) return;

    x = x.parentNode.parentNode.parentNode;
    var d = new tl_date();

    event_time = x.childNodes[3].textContent.match('(\\d\\d?):(\\d\\d) ?([a-z]*)')
    event_duration = x.childNodes[2].textContent.match('(\\d\\d?):\\d\\d:\\d\\d')
    // If one regex didn't match, we probably had a false positive
    if (event_time==null || event_duration==null) {
        Debug.debug("Got demolish event false positive.");
        return;
    }
    
    d.set_time(event_time);
    var t = d.adjust_day(event_duration);

    // The target getting demolished
    var msg = x.childNodes[1].textContent;

    // Put in a message prefix...
    var msg = x.parentNode.parentNode.previousSibling.previousSibling.previousSibling.previousSibling.previousSibling.textContent + ' ' + msg;

    // We can just index this by the time - only one thing can be demoed at any given time
    var e = Events.get_event("d"+Settings.village_id, t);
    e[0] = 'demolish';
    e[1] = d.set_seconds(event_duration);
    e[2] = msg;
};

Events.collector.overflow = function(){
    // These events are *not* indexed by the time of their occurence, unlike all the other ones...
    if (Resources.enabled == false) return; // This depends on resources being collected

    var stor = Resources.storage[Settings.village_id];
    var prod = Resources.production[Settings.village_id];

    // Calculate the overflow/empty time
    for (var i=0; i < 4; i++){
        var s = stor[i];
        var p = prod[i];
        var size = i==3 ? stor[5] : stor[4];

        var t; // This starts off in 'hours from now'
        // Deal with special cases
        if (p>0) t = (size - s)/p;
        else if (p==0) t = -1;
        else t = s/(-p);

        // Convert 'hours from now' to the absolute time
        var time = Math.round(new Date().getTime() + t*3600000);

        // Create the event
        var e = Events.get_event(Settings.village_id, 'overflow'+i, true);
        e[0] = 'overflow';
        e[1] = time;
        e[2] = Resources.res_names[i];
    }
};

Events.call('init', true);
$(function(){Events.call('run',true);});

}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}