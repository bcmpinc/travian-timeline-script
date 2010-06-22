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

... , new Error(21)

// This is used for xmlhttprequests.
Active.absolute_server = location.href.match('http://[.a-z0-9]*')+'';

Active.get_id=function(){
    GM_xmlhttpRequest({
            method: 'GET',
            url: Settings.absolute_server + '/dorf3.php',
            onload: function(e){
                var x = e.responseText.match('newdid=(\\d+)">([^<]*)<');
                Settings.outpost_name = x[2];
                Settings.s.outpost_name.write();
                Settings.outpost_id = x[1]-0;
                Settings.s.outpost_id.write();
            }});
};

