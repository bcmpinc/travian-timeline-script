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
 * IMAGES (ours and Travians)
 ****************************************/

Feature.create("Images",new Error().lineNumber-21);
delete Images.s.enabled; // It does not care what the value is.
Images.get = function(){
  return $.new("img").attr({src: this.src});
};
Images.create = function(name, src) {
  var im = new Object();
  im.__proto__  = Images;
  if (src[0]=="/")
    src=Settings.server+src;
  im.src = src;
  im.queue=[];
  im.isLoaded=false;
  this[name]=im;
};
Images.stamp = function() {
  if (!this._stamp) {
    this._stamp=new Image();
    this._stamp.src=this.src;
  }
  return this._stamp;
};
Images.init=function() {
  Images.create("metal",   "/img/interface/informations/metal.jpg");
  Images.create("crystal", "/img/interface/informations/crystal.jpg");
  Images.create("hydrogen","/img/interface/informations/deuterium.jpg"); // Yes, that's the same as deuterium and tritium.
  Images.create("energy",  "/img/interface/icon/energy1.png");
};

Images.call('init', true);
$(function(){Images.call('run',true);});

