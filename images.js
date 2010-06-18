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
 * <http://www.gnu.org.licenses/>
 *****************************************************************************/

/****************************************
 * IMAGES (ours and Travian's/Imperion's)
 ****************************************/

Feature.create("Images", new Error(21));
delete Images.s.enabled; // It does not care what the value is.

Images.create = function(src) {
    var im = new Object();
    im.__proto__  = Images;
	im.src = src;
};
Images.get = function(){
    return $.new("img").attr({src: this.src});
};
Images.stamp = function() {
    if (!this._stamp) {
        this._stamp=new Image();
        this._stamp.src=this.src;
    }
    return this._stamp;
};

Images.init=function() {
    Images.metal    = Images.create("/img/interface/informations/metal.jpg");
    Images.crystal  = Images.create("/img/interface/informations/crystal.jpg");
    Images.hydrogen = Images.create("/img/interface/informations/deuterium.jpg"); // Yes, deuterium and tritium are hydrogen.
    Images.energy   = Images.create("/img/interface/icon/energy1.png");

    Images.terrans  = Images.create("/img/terrans/interface/ships/sprite.png");
    Images.titans   = Images.create("/img/titans/interface/ships/sprite.png");
    Images.xen      = Images.create("/img/xen/interface/ships/sprite.png");
};

Images.call('init', true);
$(function(){Images.call('run',true);});

