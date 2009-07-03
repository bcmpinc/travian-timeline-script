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
  
// Create the Feature object (namespace)
Feature=new Object();

// A list containing all created features.
Feature.list=[];

// The init function, which runs before the document is fully loaded. 
// This field can be overriden by new features. (for example: 
//   Market.init = function() { /*...*/ };
// This function should not access the DOM.
Feature.init=nothing;

// Similar to init, but runs after the html document (DOM) has loaded, but 
// possibly before images and other external resources are loaded.
// This function is allowed to access and modify the DOM.
Feature.run =nothing;

// These categories are in order from extremely severe to extremely verbose and
// are converted to functions in the Feature namespace using the specified name.
// Example: this.warning("This shouldn't have happend!");
// has the same effect as the previous example.
// 'none' and 'all' are not converted to functions.
Feature.debug_categories=["none","fatal","error","warning","info","debug","all"];

// Initializes the debug functions for the specific feature.
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

// This is used to create/define a basic setting/persistent data object.
// The name of this function is a bit ill chosen, because 
// persistent data objects that clearly are *not* settings, are and should
// also be created/defined using this function.
//
// The value of the setting is available in {feature}.{setting name}.
// Functions for updating the value and storing the value are available 
// with {feature}.s.{setting name}.{method}, where method is 'read()' or 'write()'.
// {method} can also be replaced by a fieldname for accessing the setting's
// meta data. For example: {feature}.s.{setting name}.description.
//
// @param typedata: The meaning of the typedata depends on the value of type. 
Feature.setting=function(name, def_val, type, typedata, description, hidden) {
    if (type==undefined) type=Settings.type.none;
    var s = new Object();
    s.__proto__   = Settings;
    s.parent      = this;
    s.server      = Settings.server;
    s.user        = Settings.username;
    s.scopes      = [s.server+'.'+s.user, s.server, 'global'];
    s.name        = name;
    s.def_val     = def_val;
    s.type        = type;
    s.typedata    = typedata;
    s.description = description;
    s.hidden      = hidden;

    s.fullname    = this.name+'.'+name;

    if (this.s==undefined) this.s=new Object();
    this.s[name] = s;
    this[name]   = def_val;

    s.read();
    return s;
};

// This creates a new setting-like variable that resides in non-local, non-global scope
// (ie in the scope of another user). We need this because it's a pain in the ass to use
// the read/write scoping methods otherwise - if you want to write data to x users, you
// have to copy the data all out into the local variable x times and call the write
// function, and then reload the original one... awful. :(

// The value of the variable is at {feature}.{server}.{user}.{setting name}.
// The associated object, methods etc is at {feature}.{server}.{user}.s.{setting name}.
// The methods are identical to those provided to Settings.setting(), as is metadata access.

// These variables will never be displayed in on the local settings tab; however, it could
// be displayed on the internal script pages so all parameters are important.
Feature.external=function(server, user, name, def_val, type, typedata, description, hidden){
    if (type==undefined) type = Settings.type.none;
    var s = new Object();
    s.__proto__   = Settings;
    s.parent      = this;
    s.server      = server;
    s.user        = user;
    s.scopes      = [s.server+'.'+s.user, s.server, 'global'];
    s.name        = name;
    s.def_val     = def_val;
    s.type        = type;
    s.typedata    = typedata;
    s.description = description;
    s.hidden      = hidden;

    s.fullname    = this.name+'.'+name;

    // Create the storage objects...
    if (this[server] == undefined)         this[server] = {};
    if (this[server][user] == undefined)   this[server][user] = {};
    if (this[server][user].s == undefined) this[server][user].s = new Object();

    this[server][user].s[name] = s;
    this[server][user][name]   = def_val;

    s.read();
    return s;
};

// This creates a new feature.
// This new feature will be available in the global namespace.
// Override run and init for respectively 'DOM accessing and modifying code' and 
// 'initialization code that does not touch the DOM (document)'.
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
