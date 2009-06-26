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
 * DEBUG
 ****************************************/

Feature.create("Debug");

// These categories are in order from extremely severe to extremely verbose and
// are converted to functions in the Debug namespace using the specified name.
// Example: Debug.warning("This shouldn't have happend!");
// Using the index is also allowed: Debug[1]("This shouldn't have happend!");
// has the same effect as the previous example.
Debug.categories=["none","fatal","error","warning","info","debug","all"];
Debug.methods=["console","firebug"];

Debug.setting("level", 0, Settings.type.enumeration, Debug.categories, "Which categories of messages should be sent to the console. (Listed in descending order of severity).");
Debug.setting("output", 0, Settings.type.enumeration, Debug.methods, "Where should the debug output be send to.");

Debug.print =GM_log;
Debug.lineshift = function(){ // __LINESHIFT__ (nice search string)
    try { p.p.p=p.p.p; } catch (e) { return e.lineNumber-38; } // Keep the number in this line equal to it's line number. Don't modify anything else on this line.
}();
Debug.exception=function(fn_name, e) {
    // The lineshift is to correct the linenumber shift caused by greasemonkey.
    var msg = fn_name+' ('+(e.lineNumber-Debug.lineshift)+'): '+e;
    try {
        Debug.error(msg);
    } catch (ee) {
        GM_log(msg);
    }
};
Debug.init =function() {
    switch (Debug.output) {
    case 0:
        for (var i in Debug.categories) {
            Debug[i]=Debug[Debug.categories[i]]=(i <= this.level)?this.print:nothing;
        }
        break;
    case 1:
        if (!console) {
            Debug.print("Firebug not found! Using console for this page!");
            Debug.output=0;
            Debug.init();
            return;
        }
        var fns=[console.error,console.error,console.error,console.warn,console.info,console.debug,console.debug];
        for (var i in Debug.categories) {
            Debug[i]=Debug[Debug.categories[i]]=(i <= this.level)?fns[i]:nothing;
        }
        break;
    }
    Debug.debug("Source code line numbers are offset by: "+Debug.lineshift);

    if (Settings.server==undefined) {
        Debug.error("Running on unknown server!");
    } else {
        Debug.info("Running on server: "+Settings.server);
    }

};

Debug.call("init",true); // Runs init once.
// $(function(){Debug.call('run',true);}); // there is no run.

}catch(e){
    try{Debug.exception(e);}
    catch(ee) {
        alert(e.lineNumber+":"+e);
    }
}