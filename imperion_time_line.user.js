// Imperion Time Line Main file
var metadata = <><![CDATA[
// ==UserScript==
// @name           Imperion Time Line
// @namespace      ImperionTL
// @version        I_0.04
// @description    Adds a buildqueue.
 
// @include        http://*.imperion.*/*
// @exclude        http://forum.imperion.*/*
// @exclude        http://wiki.imperion.*/*
// @exclude        http://portal.imperion.*/*
// @exclude        http://*.imperion.*/login/*
// @exclude        http://*.imperion.*/supportExternal/*
 
// @copyright      2008, 2009 Bauke Conijn, Adriaan Tichler (http://github.com/bcmpinc/travian-timeline-script)
// @author         bcmpinc
// @author         arandia
// @license        GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html

// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/jquery-latest.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/patch.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/date.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/feature.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/settings.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/images.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/map.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/navbar.js
// #@require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/resources.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/market.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/events.js
// @require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/timeline.js
// #@require        http://github.com/bcmpinc/travian-timeline-script/raw/I_0.04/tooltip.js
// ==/UserScript==
]]></>+"";

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
  
// This script improves a few things to ease playing Imperion.
/*****************************************************************************/   
