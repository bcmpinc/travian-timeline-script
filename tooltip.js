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
 * Village Tool Tip
 ****************************************/
Feature.create("Tooltip");
Tooltip.init=function(){
    Tooltip.setting("enabled",               true, Settings.type.bool,    undefined, "Enable the Village Tooltip (ensure the event collection feature is also enabled).");
    Tooltip.setting('relative_time',         true, Settings.type.bool,    undefined, "Show times relative to the present, as opposed to the time of day.");

    Tooltip.direct('br', '! Events.enabled');
    Tooltip.setting("show_info",             true, Settings.type.bool,    undefined, "Show additional info about units and resources involved with the events.", '! Events.enabled');
    var ttp_1 = Tooltip.direct('table');
    ttp_1.el.style.marginLeft = '10px';
    Tooltip.setting('seperate_values',      false, Settings.type.bool,    undefined, "Seperate the event values from each other with |'s. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);
    Tooltip.setting('merchant_kilo_values',  true, Settings.type.bool,    undefined, "Show merchant trading values in 1000's, rather than 1's. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);
    Tooltip.setting('army_kilo_values',      true, Settings.type.bool,    undefined, "Show army movement values in 1000's, rather than 1's. Show info must be true.", '! (Tooltip.show_info && Events.enabled)', ttp_1);

    Tooltip.direct('br', '! Resources.enabled');
    Tooltip.setting('show_warehouse_store',  true, Settings.type.bool,    undefined, "Display the estimated warehouse stores at the top of each tooltip. Resource collection must be on.", '! Resources.enabled');
    var ttp_2 = Tooltip.direct('table');
    ttp_2.el.style.marginLeft = '10px';
    Tooltip.setting('cycle_warehouse_info',  true, Settings.type.bool,    undefined, "Only show one piece of warehouse info. Change the type by clicking on the info.", '! (Tooltip.show_warehouse_store && Resources.enabled)', ttp_2);
    Tooltip.setting('resource_kilo_values',  true, Settings.type.bool,    undefined, "Show resource storage values in 1000's, rather than 1's. Show warehouse store must be true.", '! (Tooltip.show_warehouse_store && Resources.enabled)', ttp_2);

    Tooltip.direct('br', '! Resources.enabled');
    Tooltip.setting('show_troops',           true, Settings.type.bool,    undefined, "Show stored values for troops in the header.", '! Resources.enabled');
    Tooltip.setting('refresh_data',          true, Settings.type.bool,    undefined, "Refresh data for ancient tooltips");
    Tooltip.setting('refresh_threshold',       12, Settings.type.integer, undefined, "The time threshold that must be passed before the script will fetch the latest data for you (in hours)");

    Tooltip.direct('br');
    Tooltip.setting("mouseover_delay",        500, Settings.type.integer, undefined, "The delay length before the tool tip appears (in milliseconds)");
    Tooltip.setting("mouseout_delay",         300, Settings.type.integer, undefined, "The delay length before the tool tip disappears (in milliseconds)");

    // These are invisable variables to the user
    Tooltip.persist('header_rotation', [0, 0]);
    Tooltip.persist("summary_rotation_type", 0);
    Tooltip.persist("summary_rotation",    [0, 0]);

    Tooltip.header_mapping   = [['wheat', 'percent', 'clock', 'eaten'], ['troops']]; // These are the types of display that the header will rotate through
    Tooltip.summary_mapping  = [['wheat', 'percent', 'clock', 'eaten'], ['hammer', 'nohammer']]; // And this is the same thing for the summary
};
// This adds a mouseover to the dorf3.php link, and fills it with a summary of all tooltip information
Tooltip.overview = function(){
    if (!Tooltip.show_warehouse_store) return;

    var anchor = document.getElementById('vlist');
    if (anchor == undefined) return; // Short out on single-village accounts
    anchor = anchor.childNodes[0];

    var div = Tooltip.make_tip(anchor, function(){
            var type = Tooltip.summary_rotation_type;
            var rota = Tooltip.summary_rotation[type];
            var txt = '<table class="f10" width="100%" style="font-size:11px; border-bottom: solid black 1px; cursor:pointer"><tbody><tr>';
            for (var i in Tooltip.summary_mapping){
                txt += '<td width="20px">';
                txt += Images[Tooltip.summary_mapping[i][Tooltip.summary_rotation[i]]];
            }
            txt += '<td>';
            txt += '</tbody></table><table class="f10" style="font-size:11px;"><tbody>';
            div.innerHTML = txt+Tooltip.sumarize(Tooltip.summary_mapping[type][rota])+'</tbody></table>';

            var sel = div.childNodes[0].childNodes[0].childNodes[0].childNodes;
            var disp = div.childNodes[1].childNodes[0];
            var on_click = function(e, type){
                if (Tooltip.summary_rotation_type == type){ // Increase the type only if we're already on this type
                    Tooltip.summary_rotation[type] = (Tooltip.summary_rotation[type]+1)%Tooltip.summary_mapping[type].length;
                    Tooltip.s.summary_rotation.write();
                } else { // We need to save it
                    Tooltip.summary_rotation_type = type;
                    Tooltip.s.summary_rotation_type.write();
                }
                var result = Tooltip.summary_mapping[type][Tooltip.summary_rotation[type]];
                e.target.parentNode.innerHTML = Images[result];
                disp.innerHTML = Tooltip.sumarize(result);
            }
            sel[0].addEventListener('click', function(e){on_click(e, 0)}, false);
            sel[1].addEventListener('click', function(e){on_click(e, 1)}, false);
        });
}

Tooltip.sumarize = function(rota){
    var rtn = '';
    var total = [0, 0, 0, 0]; // Wood, Clay, Iron, Wheat...
    var totalable = rota == 'wheat' || rota == 'eaten';
    var d = new Date().getTime();

    // Cycle through all of the villages
    var vils = []; // Push the html into here for alphabetizing...
    for (var did in Resources.storage){
        var name = Settings.village_names[did];
        var a = Tooltip.make_header(rota, d, did);
        if (a == -1) continue;

        vils.push([name, '<tr><td><a href="?newdid='+did+Tooltip.href_postfix+'">'+name+':</a>'+a[0]]);
        if (totalable) for (var i in total) total[i] += a[1][i];
    }

    vils.sort();
    for (var i in vils) rtn += vils[i][1];

    if (totalable){
        rtn += '<tr><td colspan="9" style="border-top: solid black 1px;"><tr><td>Total:';
        for (var i=0; i < 4; i++){
            rtn += '<td>'+Images.html(Images.res(i))+'<td>';
            if (Tooltip.resource_kilo_values){
                rtn += Math.round_sig(Math.abs(total[i]), 3);
            }
            else rtn += total[i];
        }
    }
    return rtn;
}

// This extracts and parses all the data from an event in a useful fashion
Tooltip.parse_event = function(e, time){
    var e_time = new Date();
    e_time.setTime(e[1]);
    var rtn = '<td vAlign="bottom">';
    if (Tooltip.relative_time){
        var diff = e[1] - time;
        rtn += Math.floor(diff/3600000)+':'+pad2(Math.floor((diff%3600000)/60000)) + '</td>';
    } else rtn += e_time.getHours()+':'+pad2(e_time.getMinutes())+'</td>';

    if (Tooltip.show_info && (e[3] || e[4])) {
        rtn += '<td vAlign="bottom" style="color:'+Events.type[e[0]][0]+'">'+e[2]+"</td><td>";
        if (e[4]) for (var j=0; j< 4; j++) rtn+=Tooltip.convert_info(4,j,e[4][j]);
        if (e[3]) for (var j=0; j<11; j++) rtn+=Tooltip.convert_info(3,j,e[3][j]);
        rtn += '</td>';
    } else rtn += '<td vAlign="bottom" colspan="2" style="color:'+Events.type[e[0]][0]+'">'+e[2]+"</td>";
    return rtn;
}

Tooltip.village_tip = function(anchor, did){
    // This holds all of the village-specific tooltip information
    var fill = function(){
        // 'events' contains time/text pairs; the time in the first index for sorting, the text for display
        // The text is actually html consisting of table cells wrapped in <td> tags.
        // Clear before starting
        var events = [];
        var d = new Date();
        // Run through the tasks for each village
        for (var j in Events.events[did]){
            var e = Events.events[did][j];
            if (e[1] < d.getTime()) continue; // Skip if the event is in the past...
            if (Events[e[0]]%2 != 0) continue; // Skip it if its display setting is off

            events.push([e[1], Tooltip.parse_event(e, d.getTime())]);
        }

        events.sort();

        var txt = '';
        var time = new Date().getTime();
        var age = (time - store[6])/3600000; // In hours
        var colour = age < 1 ? '#000' : (age < 2 ? '#444' : (age < 4 ? '#777' : age < 8 ? '#aaa' : age < 12 ? '#ddd' : '#000'));
        if (age < 12){
            var show_res = Tooltip.show_warehouse_store && store != undefined && prod != undefined;
            var show_troops = Tooltip.show_troops && Resources.troops[did] != undefined;
            var temp = false;
            if (show_troops){
                for (var i in Resources.troops[did]){temp=true; break;}
                show_troops = temp;
            }
            if (show_res || show_troops) txt += '<table width="100%" style="border-bottom: 1px solid '+colour+';"><tbody>';
            if (show_res){
                txt += '<tr><td><table style="font-size:11px; cursor:pointer;"><tbody><tr>';
                var header_txt = Tooltip.make_header(Tooltip.header_mapping[0][Tooltip.header_rotation[0]], time, did)[0];
                txt += header_txt; // This var is needed later...
                txt += '</tr></tbody></table>';
            }
            if (show_troops){
                txt += '<tr><td><table style="font-size:11px;"><tbody><tr>';
                var troop_txt = Tooltip.make_header(Tooltip.header_mapping[1][Tooltip.header_rotation[1]], time, did)[0];
                txt += troop_txt; // If we ever want to modify troops on mouseover, we'll need this var too...
                txt += '<td></tr></tbody></table>';
            }
            if (show_res || show_troops) txt += '</tbody></table>';
        }
        if (Tooltip.refresh_data && age > Tooltip.refresh_threshold){
            // First, create a hidden iframe to load the data (much simpler than having to reparse everything seprate)
            //Settings.is_iframe = true;
            //Settings.s.is_iframe.write();
            var iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframe.src = 'dorf1.php?newdid='+did;
            document.body.appendChild(iframe);
            // Can't figure out how to set an onload, unfortunately - but three seconds should be enough time
            window.setTimeout(function(){
                    // Remove the iframe after it has loaded; no point keeping it running in the background...
                    document.body.removeChild(iframe);

                    // We need to refresh the local copies of our data
                    Events.s.events.read();
                    Resources.s.storage.read();
                    Resources.s.production.read();
                    Resources.s.troops.read();
                    store = Resources.storage[did];
                    prod = Resources.production[did];

                    // Then, send an xmlhttprequest to set the village back to the current one
                    var request = new XMLHttpRequest();
                    request.open('GET', 'dorf1.php?newdid='+Settings.village_id, true);
                    request.send(null);

                    // Redraw the tooltip
                    Debug.debug('hi');
                    div = fill();
                    Debug.debug('bye');
                }, 3000);
        }

        if (events.length > 0){
            txt += '<table class="f10" style="font-size:11px;width:auto;"><tbody>';
            for (var i in events) txt += '<tr>'+events[i][1]+'</tr>';
            txt += '</tbody></table>';
        }
        else txt += 'IDLE!';
        div.innerHTML = txt;
        div.style.borderColor = colour;

        if (age < 12 && show_res){
            // Add the click listener to the header of each tooltip
            var header = div.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0];
            div.childNodes[0].childNodes[0].childNodes[0].addEventListener('click', function(e){
                    // Increment and roll over the rota
                    Tooltip.header_rotation[0] = (Tooltip.header_rotation[0] + 1) % Tooltip.header_mapping[0].length;

                    // Save the value...
                    Tooltip.s.header_rotation.write();

                    // Redraw the text in the <tr>
                    header_txt = Tooltip.make_header(Tooltip.header_mapping[0][Tooltip.header_rotation[0]],
                                                     new Date().getTime(), did)[0];
                    header.innerHTML = header_txt;
                }, false);

            // Add the mouseover listener to the events in each tooltip, but only if it's needed
            if (events.length == 0) return;
            var x = div.childNodes[1].childNodes[0].childNodes;
            for (var i in x){
                // If mousing over, change the header to what the value will be at this time
                // Well, this is slightly better than before; using the local variables of the anon function
                (function (i){
                    x[i].addEventListener('mouseover', function(e){
                            header.innerHTML = Tooltip.make_header(Tooltip.header_mapping[0][Tooltip.header_rotation[0]],
                                                                   events[i][0], did)[0];
                        }, false);
                })(i);
                // Reset on mouseout
                x[i].addEventListener('mouseout', function(){header.innerHTML = header_txt;}, false);
            }
        }
    }
    var store = Resources.storage[did];
    var prod = Resources.production[did];
    var div = Tooltip.make_tip(anchor, fill);
}

Tooltip.make_header = function(rota, time, did){
    var prod = Resources.production[did];
    if (rota == 'wheat' || rota == 'clock' || rota == 'percent') var store = Resources.at_time(time, did);

    var rtn = '';
    var values = [];
    switch (rota){
    default:
        for (var i=0; i < 4; i++){
            rtn += '<td>'+Images.html(Images.res(i))+'</td>';

            switch (rota){
            default: break;
            case 'wheat': // Stored resources
                var r = store[i];
                var s = store[i < 3 ? 4 : 5];

                // Turn red if value is decreasing or overflowing, or orange if within two hours of overflowing
                rtn += '<td style="color:'+(prod[i] < 0 || s==r ? 'red' : (s-r)/prod[i] < 2 ? 'orange' : 'green')+'">';
                if (Tooltip.resource_kilo_values) rtn += Math.round_sig(r)+'/'+Math.round_sig(s);
                else rtn += Math.round(r) + '/' + s;
                rtn += '</td>';
                values.push(r);
                break;
            case 'clock': // Time to overflow
                // First we need to find the space remaining
                var p = prod[i];
                var c = store[i];
                var r = store[(i < 3 ? 4 : 5)] - c;
                if ((r > 0 && p > 0) || (c > 0 && p < 0)){
                    if (p == 0){
                        rtn += '<td>inf.</td>';
                        values.push(-1);
                    }
                    else {
                        if (p > 0) time = Math.floor((r / p) * 3600); // In seconds
                        else time = Math.floor((c / (-1*p)) * 3600);
                        
                        // Turn red if value is decreasing or overflowing, or orange if within two hours of overflowing
                        rtn += '<td style="color:'+(p < 0 ? 'red' : time < 7200 ? 'orange' : 'green')+'">';
                        if (time >= 86400) rtn += Math.floor(time/86400)+'d '; // Possibly include days
                        rtn += Math.floor((time%86400)/3600)+':'+pad2(Math.floor((time%3600)/60))+'</td>';
                        values.push(time);
                    }
                } else {
                    rtn += '<td style="color:red">0:00</td>';
                    values.push(0);
                }
                break;
            case 'eaten': // Resource production
                rtn += '<td>' + prod[i] + '</td>';
                values.push(prod[i]);
                break;
            case 'percent': // % full
                var r = store[i];
                var s = store[(i < 3 ? 4 : 5)];
                var f = Math.round((r / s) * 100);
                
                // Turn red if value is decreasing or overflowing, or orange if within two hours of overflowing
                rtn += '<td style="color:'+ (prod[i] < 0 || r == s ? 'red' : (s-r)/prod[i] < 2 ? 'orange' : 'green')+'">';

                rtn += f + '%</td>';
                values.push(f);
                break;
            };
        }
        break;
    case 'hammer': // Building
    case 'nohammer': // Non-building
        // There should only be one building in the future... get it!
        for (var i in Events.events[did]){
            var e = Events.events[did][i];
            if (e[1] < time) continue; // Ignore past events
            if (e[0] == "building"){
                // Pass back an error code if we're looking for only non-building vils
                if (rota == 'nohammer') return -1;
                rtn += Tooltip.parse_event(e, time);
                break;
            }
        }
        if (rtn == ''){
            rtn += '<td colspan="2">IDLE!</td>';
        }
        break;
    case 'troops': // Troops! Not distinguishing between which vil owns what...
        for (var i in Resources.troops[did]){
            rtn += '<td width="16px">'+Images.html(Images.troops(i))+'</td>';
            rtn += '<td>'+Resources.troops[did][i]+' </td>';
        }
        break;
    };

    return [rtn, values]; // Return both the string and the numeric values - for the summary's "total" calculation
}

// This function creates the tooltip listeners etc.
// The basic theory here is that when you mouse over 'anchor', a div gets created and filled by the callback and displayed
// It also adds listeners to prevent the div from disappearing while being moused over
Tooltip.make_tip = function(anchor, callback, param){
    var timer;
    var div = document.createElement('div');

    // This is the intrinsic tooltip-related mouseovers
    var display = function(e){
        div.setAttribute('style', 'position:absolute; top:'+(e.pageY+2)+'px; left:'+(e.pageX+4)+'px; padding:2px; z-index:200; border:solid 1px black; background-color:#fff;');
        document.body.appendChild(div);

        // If we can mouseover the tooltip, we can add buttons and more functionality to it.
        // Clear the timeout if we mouse over the div
        div.addEventListener('mouseover', function(e){
                if (timer != undefined) window.clearTimeout(timer);
            }, false);
        div.addEventListener('mouseout', function(e){
                if (timer != undefined) window.clearTimeout(timer);
                timer = window.setTimeout(function(){
                        div.parentNode.removeChild(div);
                    }, Tooltip.mouseout_delay);
            }, false);
    }

    // Add the listeners to the original village links
    anchor.addEventListener('mouseover', function(e){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    display(e);
                    callback(param);
                }, Tooltip.mouseover_delay);
        }, false);
    anchor.addEventListener('mouseout', function(){
            if (timer != undefined) window.clearTimeout(timer);
            timer = window.setTimeout(function(){
                    if (div.parentNode != undefined) div.parentNode.removeChild(div);
                }, Tooltip.mouseout_delay);
        }, false);

    return div;
}

// This creates the resource info html.
Tooltip.convert_info=function(type, index, amount) {
    if (!amount || amount == '0') return "";
    var img = '';
    if (type==3)      img = Images.html(Images.troops(index, true));
    else if (type==4) img = Images.html(Images.res(index));

    if ((type==4 && Tooltip.merchant_kilo_values) ||
        (type==3 && Tooltip.army_kilo_values)){
        amount = Math.round_sig(amount);
    }

    return (Tooltip.seperate_values ? ' | ' : ' ')+img+amount;
};

Tooltip.run = function(){
    // The events are now sorted by village, so that simplifies our task here somewhat
    var x = document.evaluate('//table[@class="vlist"]/tbody/tr/td[@class="text"]/a', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    Tooltip.href_postfix = '';
    // Run through our villages
    for (var i=0; i < x.snapshotLength; i++){
        var vil = x.snapshotItem(i);
        var did = vil.href.split('newdid=')[1];
        if (did==undefined) continue;
        if (did.indexOf('&') >= 0){
            if (i == 0) Tooltip.href_postfix = did.match('&.*'); // This is the same for all - take from the first for simplicity
            did = did.split('&')[0];
        }

        Tooltip.village_tip(vil, did);
    }

    Tooltip.overview();
};

if (Settings.natural_run){
    Tooltip.call('init', true);
    $(function(){Tooltip.call('run',true);});
}

}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}