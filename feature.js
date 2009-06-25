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
 * FEATURE
 ****************************************/
  
Feature=new Object();
Feature.list=[];
Feature.init=nothing;
Feature.run =nothing;
// This is a generalization for all settings. *Not* to be called directly.
// Note that 'parent_el' is being depreciated in favour of Settings.type.table
Feature._setting=function(name, def_val, type, typedata, description, hidden){
    if (type==undefined) type=Settings.type.none;
    if (hidden==undefined || typeof(hidden) != 'string') hidden = 'false';

    var s = new Object();
    s.__proto__   = Settings;
    s.parent      = this;
    s.name        = name;
    s.def_val     = def_val;
    s.type        = type;
    s.typedata    = typedata;
    s.description = description;
    s.hidden      = hidden;

    this[name]    = def_val;
    return s;
};
// This is used to create a basic setting
Feature.setting=function(name, def_val, type, typedata, description, hidden, parent_el) {
    var s = this._setting(name, def_val, type, typedata, description, hidden);

    s.fullname = Settings.server+'.'+Settings.username+'.'+this.name+'.'+name;
    if (parent_el != undefined) s.parent_el = parent_el; // To be removed...

    if (this.s==undefined) this.s=new Object();
    this.s[name] = s;

    s.read();
    return s;
};
// This is a setting at arbitrary scope
Feature.external=function(server, username, name, def_val, type, typedata, description, hidden){
    var n = (server?server+'_':'')+(username?username+'_':'')+name; // Use '_' rather than '.' to seperate here...
    var s = this._setting(n, def_val, type, typedata, description, hidden);
    s.fullname = (server?server+'.':'')+(username?username+'.':'')+this.name+'.'+name;

    // Don't store this in this.s, because those get displayed in Settings. Also, we don't want to overwrite them...
    if (this.e==undefined) this.e=new Object();
    this.e[n] = s;

    s.read(); // Load the value - must be done *after* the fullname parameter has been set.
    return s;
};
// This guy is just like a setting, except it is never visible to the user in the 'settings' menu
// Therefore we don't need things like 'type' (which we deduce from 'def_value'), 'typedata', or 'description'
Feature.persist=function(name, def_value){
    var s = new Object();
    s.__proto__ = Settings;
    s.fullname  = Settings.server+'.'+Settings.username+'.'+this.name+'.'+name;
    s.parent    = this;
    s.name      = name;
    this[name]  = def_value;
    s.def_val   = def_value;
    s.hidden    = 'true';

    switch (typeof(def_value)){
    default:        s.type = Settings.type.none;    break;
    case 'boolean': s.type = Settings.type.bool;    break;
    case 'number':  s.type = Settings.type.integer; break;
    case 'string':  s.type = Settings.type.string;  break;
    case 'object':  s.type = Settings.type.object;  break;
    }

    s.read();
    this.s[name] = s;
    return s;
};
// This adds a given element directly
Feature.direct=function(type, hidden){
    var s = new Object();
    s.__proto__ = Settings;
    s.el = document.createElement(type);
    if (hidden==undefined || typeof(hidden) != 'string') hidden='false';
    s.hidden = hidden;
    
    // Create a new, unique index for it to be stored in
    s.type = type;
    for (var i=0; this.s[s.type+i] != undefined; i++);
    var name = s.type + i;

    // Overwrite the normal functions... we want different behaviour for this guy...
    s.config = function(parent_element){
        while (s.el.childNodes.length > 0) s.el.removeChild(s.el.childNodes[0]);
        parent_element.appendChild(s.el);
    };
    s.read = nothing;
    s.write = nothing;

    this.s[name] = s;
    return s;
};
Feature.create=function(name){
    var x=new Object();
    x.__proto__=Feature;
    x.name = name;
    x.s=new Object();
    Feature.list[name]=x;
    global[name]=x;
    return x;
};
// Executes the function specified by fn_name
// wrapped by a try..catch block and stores
// the start and endtime of execution.
// If (once), this function can't be called
// anymore in the future.
Feature.call=function(fn_name, once) {
    if (once==undefined) once=false;
    if (!this.start) this.start=new Object();
    this.start[fn_name] = new Date().getTime();
    try {
        this[fn_name]();
    } catch (e) {
        Debug.exception("call "+this.name+'.'+fn_name, e);
    }
    if (once) this[fn_name]=nothing;
    if (!this.end) this.end=new Object();
    this.end[fn_name] = new Date().getTime();
    // TODO: make this timing info visible somewhere.
};
// Executes (using Feature.call) the function specified by fn_name for all _enabled_
// Features created with Feature.create() in the order they have been created.
// A feature is enabled if it doesn't have an enabled field or its enabled field is not
// exactly equal to false.
Feature.forall=function(fn_name, once) {
    for (var n in this.list) {
        if (this.list[n].enabled!==false)
            this.list[n].call(fn_name, once);
    }
};

}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}