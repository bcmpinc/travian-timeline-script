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
 * FEATURE
 ****************************************/
  
Feature=new Object();
Feature.list=[];
Feature.init=nothing;
Feature.run =nothing;

// These categories are in order from extremely severe to extremely verbose and
// are converted to functions in the Feature namespace using the specified name.
// Example: this.warning("This shouldn't have happend!");
// has the same effect as the previous example.
// 'none' and 'all' are not converted to functions.
Feature.debug_categories=["none","fatal","error","warning","info","debug","all"];

Feature.init_debug=function(){
    if (global.Settings==undefined) {
        level=2;
    } else {
        this.setting("debug_level", Settings.global_debug_level || 0, Settings.type.enumeration, Feature.debug_categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
        level=this.debug_level;
    }
    var fns=[console.error,console.error,console.error,console.warn,console.info,console.debug,console.debug];
    for (var i=1; i<Feature.debug_categories.length-1; i++) {
        var cat = Feature.debug_categories[i];
        if (i <= level) {
            var fn = fns[i];
            var tag=this.name + " - " + Feature.debug_categories[i] +": ";
            this[cat]=function(text){fn(tag+text);};
        } else {
            this[cat]=nothing;
        }
    }
    this.debug("Debug enabled.");
};

Feature.exception=function(fn_name, e) {
    var msg = fn_name+' ('+(e.lineNumber)+'): '+e;
    this.error(msg);
};

// This is used to create a basic setting
Feature.setting=function(name, def_val, type, typedata, description, hidden) {
    if (type==undefined) type=Settings.type.none;
    var s = new Object();
    s.__proto__   = Settings;
    s.parent      = this;
    s.name        = name;
    s.def_val     = def_val;
    s.type        = type;
    s.typedata    = typedata;
    s.description = description;
    s.hidden      = hidden;

    s.fullname    = Settings.server+'.'+Settings.username+'.'+this.name+'.'+name;

    if (this.s==undefined) this.s=new Object();
    this.s[name] = s;
    this[name]   = def_val;

    s.read();
    return s;
};

Feature.create=function(name){
    var x=new Object();
    x.__proto__=Feature;
    x.name = name;
    x.s=new Object();
    Feature.list[name]=x;
    x.init_debug();
    if (global.Settings) x.setting("enabled", true, Settings.type.bool, undefined, "Is '"+name+"' enabled?");
    global[name]=x;
    return x;
};
// Executes the function specified by fn_name wrapped by a try..catch block if
// the feature is enabled and stores the start and endtime of execution.
// If (once), this function can't be called anymore in the future.
// A feature is enabled if it doesn't have an enabled field or its enabled 
// field is not exactly equal to false.
Feature.call=function(fn_name, once) {
    if (this.enabled===false) return;
    if (once==undefined) once=false;
    if (!this.start) this.start=new Object();
    this.start[fn_name] = new Date().getTime();
    try {
        this[fn_name]();
    } catch (e) {
        this.exception("call "+this.name+'.'+fn_name, e);
    }
    if (once) this[fn_name]=nothing;
    if (!this.end) this.end=new Object();
    this.end[fn_name] = new Date().getTime();
    // TODO: make this timing info visible somewhere.
};
