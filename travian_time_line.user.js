// Travian Time Line Main file
var metadata = <><![CDATA[
// ==UserScript==
// @name           Travian Time Line
// @namespace      TravianTL
// @version        0.39
// @description    Adds a time line on the right of each page to show events that have happened or will happen soon. Also adds a few other minor functions. Like: custom sidebar; resources per minute; ally lines; add to the villages list; colored marketplace.
 
// @include        http://*.travian*.*/*.php*
// @exclude        http://forum.travian*.*
// @exclude        http://board.travian*.*
// @exclude        http://shop.travian*.*
// @exclude        http://help.travian*.*
// @exclude        http://*.travian*.*/manual.php*
// @exclude        http://*.travian*.*/logout.php*
 
// @copyright      2008, 2009, 2010 Bauke Conijn, Adriaan Tichler (http://github.com/bcmpinc/travian-timeline-script)
// @author         bcmpinc
// @author         arandia
// @license        GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html

// @require        jquery-latest.js
// @require        patch.js
// @require        date.js
// @require        feature.js
// @require        settings.js
// @require        images.js
// @require        map.js
// @require        navbar.js
// @require        resources.js
// @require        market.js
// @require        events.js
// @require        timeline.js
// @require        tooltip.js
// ==/UserScript==
]]></>+"";

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
  
// This script improves the information provided by Travian. For example: by adding
// a timeline that shows different events like completion of build tasks and the
// arrival of armies. It does this by modify the html of the page.
//
// This script is completely passive, so it does not click links automatically or
// send http requests. This means that for certain data to be collected you have to
// read your reports and watch your ally page and allies profiles.
//
// This script can be combined with other scripts:
// - If you have the 'Travian Task Queue'-script, you can click on the timeline to
// automatically enter the schedule time.
// - If you have the 'Travian Beyond'-script, additional villages will also get an
// attack and a merchant link button. (Currently you have to add these additional
// villages in the scripts source code.)
/*****************************************************************************/   

var travian = true;
var imperion = false;
