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
 * JAVASCRIPT ENHANCEMENTS
 ****************************************/

// Make the global variable global, such that global variables can be created
// at local scope and the use of global variables at local scope can be made
// explicit.
var global = this;

// Remove a DOM element
function remove(el) {
    el.parentNode.removeChild(el);
}

// Concatenates the original string n times.
String.prototype.repeat = function(n) {
    var s = "";
    while (--n >= 0) {
        s += this;
    }
    return s;
};

// Add spaces (or s) to make the string have a length of at least n
// s must have length 1.
String.prototype.pad = function(n,s,rev) {
    if (s==undefined) s=" ";
    n = n-this.length;
    if (n<=0) return this;
    if (rev)
        return s.repeat(n)+this;
    else
        return this+s.repeat(n);
};

// Makes sure that the number 
Number.prototype.pad2 = function() {
    if (this<10)
        return "0"+this;
    return this;
};

function isempty(ob) {
    for(var i in ob) {if(ob.hasOwnProperty(i)){return false;}}
    return true;
}

if (travian) {
    // Turn x/y coords into the hash value that goes on the karte page
    function xy_id(x, y) {
        return 1 + (parseInt(x)+400) + (801*Math.abs(parseInt(y) - 400));
    }

    // The inverse function of xy_id, id_xy(xy_id(x, y)) == [x, y]
    function id_xy(id) {
        x = id%801 ? (id%801 - 401) : 400;
        y = 400 - (id - x - 401)/801;
        return [x, y];
    }

    // This is a shortcut to the document.evaluate function, because typing the damn thing in
    // all of the time is damn annoying
    function xpath(match, reference, type){
        // These are the three we use the most often...
        // The XPathResult variables all *do* have numerical equivalents, but those are hard to
        // remember. Accept strings as well, for ease of comprehension
        if (type == undefined || type == 'unordered') type = XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE;
        else if (type == 'ordered')                   type = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
        else if (type == 'any')                       type = XPathResult.ANY_UNORDERED_NODE_TYPE;

        // Again, the most often used is probably the general document
        if (!reference) reference = document;

        return document.evaluate(match, reference, null, type, null);
    }
}

// Functions missing in Math
Math.sinh     = function(x) { return .5*(Math.exp(x)-Math.exp(-x)); };
Math.cosh     = function(x) { return .5*(Math.exp(x)+Math.exp(-x)); };
Math.arsinh   = function(x) { return Math.log(x+Math.sqrt(x*x+1)); };
Math.arcosh   = function(x) { return Math.log(x+Math.sqrt(x*x-1)); };
// This rounds and trims values
Math.round_sig= function(amount, sigfig){
    if (sigfig == undefined) sigfig = 2;
    if (typeof(amount)=='string') try {amount -= 0;} catch (e){ return amount;}
    var power = Math.floor(Math.log(amount)/Math.LN10);
    amount = Math.round(amount/Math.pow(10, 1+power-sigfig))/Math.pow(10, sigfig-1-power);
    if (power >=6) return amount/1000000 + 'M';
    if (power >=3) return amount/1000 + 'k';
    return amount;
};

nothing = function(){};

$.new=function(type) {
    return $(document.createElement(type));
};

// function for getting the postdata of a form
post_data = function(form) {
  var els = form.elements;
  var data = [];
  for (var i=0; i<els.length; i++) {
    var e = els[i];
    if (e.name && e.value && (e.checked || e.type!='radio'))
      data.push(els[i].name+"="+els[i].value);
  }
  return data.join("&");
};
