// ==UserScript==
// @name           Travian Time Line
// @namespace      TravianTL
// @version        0.12
// @description    Adds a time line on the right of each page to show events that have happened or will happen soon. Also adds a few other minor functions. Like: custom sidebar; resources per minute; ally lines; add to the villages list; colored marketplace.

// @include        http://*.travian*.*/*.php*
// @exclude        http://forum.travian*.*
// @exclude        http://board.travian*.*
// @exclude        http://shop.travian*.*
// @exclude        http://help.travian*.*
// @exclude        http://*.travian*.*/manual.php*

// @author         bcmpinc
// ==/UserScript==

// This script improves the information provided by Travian. For example: by adding 
// a timeline that shows different events like completion of build tasks and the 
// arrival of armies. It does this by modify the html of the page.
//
// This script is completely passive, so it does not click links automatically or 
// send http requests. This means that for certain data to be collected you have to 
// read your reports and watch your ally page and allies profiles.
// 
// This script can be combined with other scripts:
//  - If you have the 'Travian Task Queue'-script, you can click on the timeline to 
//    automatically enter the schedule time.
//  - If you have the 'Travian Beyond'-script, additional villages will also get an 
//    attack and a merchant link button. (Currently you have to add these additional 
//    villages in the scripts source code.)

try {

//////////////////////////////////////////
//  SCRIPT CONFIG  ( DEFAULT SETTINGS ) //
// You can modify them whatever you like//
//   however, they will be overwritten  //
//        by any in-game settings       //
//////////////////////////////////////////

USERNAME = "someone";               // your username
RACE = 1;                           // Your race (0=Romans, 1=Teutons, 2=Gauls)

USE_TIMELINE = true;                // enable the timeline.
USE_ALLY_LINES = true;              // Draw lines on the area map to allies.
USE_CUSTOM_SIDEBAR = true;          // Modify the links in the sidebar.
USE_MARKET_COLORS = true;           // Color the market offers to quickly determine their value.
USE_ENHANCED_RESOURCE_INFO = true;  // Add resource/minute and resources on market to the resource bar.
USE_EXTRA_VILLAGE = true;           // Add additional vilages to the vilage list.
USE_SETTINGS = true;                // Enable settings menu and use settinge stored by GM_setValue.

USE_SERVER_TIME = false;            // Use the server time instead of the local clock. Requires a 24 hours clock.
USE_DEBUG_MODE = false;             // Makes the script throw an alert when something bad happened.
SHOW_TIMELINE_REPORT_INFO = true;   // Show the size of the army, the losses and the amount of resources stolen.

REMOVE_PLUS_BUTTON = true;  // Removes the Plus button
REMOVE_PLUS_COLOR = true;   // De-colors the Plus link (needs USE_CUSTOM_SIDEBAR)
REMOVE_TARGET_BLANK = true; // Removes target="_blank", such that all sidebar links open in the same window.
REMOVE_HOME_LINK = true;    // Redirects travian image to current page instead of travian homepage.

FIX_TIMELINE = false;       // Keep timeline on the same position when scrolling the window.

TIMELINE_SIZES_HISTORY =  90; // minutes +/- 15 min, for aligning
TIMELINE_SIZES_FUTURE  =  90; // minutes
TIMELINE_SIZES_HEIGHT  =   5; // pixel height of one minute.
TIMELINE_SIZES_WIDTH   = 430; // width of the timeline

TIME_DIFFERENCE = 0; // server time - local time

SIDEBAR_HR = true;      // Use <hr> to seperate sidebar sections instead of <br>

// Numbers for original sidebar links
//-1: -- break --
// 0: Home
// 1: Instructions
// 2: Profile
// 3: Log out
// 4: Forum
// 5: Chat
// 6: Travian Plus
// 7: Support

// Original sidebar links
// SIDEBAR_LINKS = [0,1,2,3,-1,4,5,-1,6,7];

SIDEBAR_LINKS = [ 1,["FAQ", "http://help.travian.nl/"],
                    ["Travian Forum", "http://forum.travian.nl"],
                    ["Wiki","http://wiki.travianteam.com/mediawiki/index.php/"],
                    -1,
                    2,
                    ["Alliantie Forum", "/allianz.php?s=2"],
                    //["Alliantie Forum", "http://www.external-travian-forum.com/"],
                    ["Alliantie Overzicht", "allianz.php"],
                    -1,
                    ["Barakken", "/build.php?gid=19"],
                    ["Stal", "/build.php?gid=20"],
                    ["Werkplaats", "/build.php?gid=21"],
                    ["Marktplaats", "/build.php?gid=17"],
                    ["Verzamelplaats", "/build.php?gid=16"],
                    -1,
                    6,
                    7 
                ];//*/

SPECIAL_LOCATIONS = []; // Draws lines to these locations on the map.
// SPECIAL_LOCATIONS = [[-85,149],[-80,146],[-300,-292],[-301,-292]]; 

DEBUG_SIDEBAR = false;       // Append original sidebar links, with index numbers

// These villages are added to the villages list 
// (without link, but travian beyond will recognize them and add attack and merchant links)
VILLAGES = [];  
// VILLAGES = [["WW 1", 25, -155],
//            ["WW 2", -170, 158]];

//////////////////////////////////////////
//  LOAD IN-GAME SETTINGS               //
//////////////////////////////////////////

var url = location.href.match("//(\\w+)\\.travian.(\\w+)/");
var gm_prefix = url[1]+'.'+url[2]+'.';
var travian_world_analyzer_server_code = url[2]+(url[1]=='speed'?'x':url[1].substr(1));
function prefix(s) {
  return gm_prefix+s;
}


if (USE_SETTINGS) {
  x = GM_getValue(prefix("USERNAME")); 
  if (x) USERNAME = x;

  x = GM_getValue(prefix("RACE")); 
  if (x) RACE = x;

  var saved_settings=["SPECIAL_LOCATIONS","VILLAGES","USE_TIMELINE","USE_ALLY_LINES",
                      "USE_CUSTOM_SIDEBAR","USE_MARKET_COLORS","USE_ENHANCED_RESOURCE_INFO",
                      "USE_EXTRA_VILLAGE","USE_SERVER_TIME","USE_DEBUG_MODE", 
                      "SHOW_TIMELINE_REPORT_INFO",
                      
                      "TIMELINE_SIZES_HISTORY","TIMELINE_SIZES_FUTURE","TIMELINE_SIZES_HEIGHT",
                      "TIMELINE_SIZES_WIDTH", "TIME_DIFFERENCE"
                      ];

  for (i in saved_settings) {
    var v = saved_settings[i];
    x = GM_getValue(prefix(v));    
    if (x!=undefined) {
      if (x=="") x=0;
      eval(v+"="+x);
    }
  }
} /* USE_SETTINGS */

//////////////////////////////////////////
//  SCRIPT CODE                         //
//////////////////////////////////////////

//////////////////////////////////////////
//  JAVASCRIPT ENHANCEMENTS             //
//////////////////////////////////////////

// Get relative position of a dom element
// Modified to work in the used situation.USE_SERVER_TIME
function getPos(obj) {
  var curleft = curtop = 0;
  var w = obj.offsetWidth;
  var h = obj.offsetHeight;
  var l = obj.offsetLeft;
  var t = obj.offsetTop;
  return [l,t,w,h];
}

// Remove a DOM element
function remove(el) {
    el.parentNode.removeChild(el);
}

// Create a repeat-string-N-times method for all String objects
String.prototype.repeat = function(n) {
   var s = "";
   while (--n >= 0) {
     s += this;
   }
   return s;
}

String.prototype.pad = function(n) {
   n = n-this.length;
   if (n<=0) return this;
   return this+" ".repeat(n);
}

//////////////////////////////////////////
//  OPTIONS SCREEN                      //
//////////////////////////////////////////

if (USE_SETTINGS) {
  var div = document.createElement("div");
  div.style.position = "absolute";
  div.style.zIndex = "2";
  div.style.left = "5px";
  div.style.top = "38px";
  div.innerHTML = "<a href=\"#\" style=\"color: blue; font-size: 12px;\">Travian Time Line Settings</a>";
  document.body.appendChild(div);
  
  function settings() {
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.zIndex = "250";
    div.style.left = "0px";
    div.style.top = "0px";
    div.style.right = "0px";
    div.style.bottom = "0px";
    div.style.background = "rgba(192,192,192,0.8)";
    div.innerHTML = '<div style="position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; cursor: pointer;"></div>'+
                    '<div style="position: absolute; left: 50%; top: 50%;">'+
                    '<pre style="position: absolute; left: -300px; top: -200px; width: 600px; height: 400px;'+
                    ' border: 3px solid #000; background: #fff; overflow: auto; padding: 8px;">'+
                    '</pre></div>';
    document.body.appendChild(div);
    
    var box = div.childNodes[1].firstChild;
    
    var uses = "";
    function using(n, v) {
      uses+='[<span style="cursor: pointer; color: '+(eval(v)?'green':'red')+'" id="TL_'+v+'">'+n+"</span>]";
    }
    using("timeline", "USE_TIMELINE");
    using("ally lines", "USE_ALLY_LINES");
    using("custom sidebar", "USE_CUSTOM_SIDEBAR");
    using("market colors", "USE_MARKET_COLORS");
    uses+='==\n==';
    using("enhanced resource info", "USE_ENHANCED_RESOURCE_INFO");
    using("extra village", "USE_EXTRA_VILLAGE");
    using("debug mode", "USE_DEBUG_MODE");
    uses+='==\n==';
    using("timeline extended info", "SHOW_TIMELINE_REPORT_INFO");
    uses+='==\n==';
    using("use server time", "USE_SERVER_TIME");
    uses+="(use a 24 hours clock)";
    
    var race='<select id="tl_RACE">';
    for (var i=0; i<3; i++) {
      race+='<option value="'+i+'"';
      if (i==RACE) race+='selected="" ';
      race+='>'+['Romans', 'Teutons', 'Gauls'][i]+'</option>';
    }
    race+='</select>';
    
    var sizeoptions='';
    function tlo(n, v) {
      nn="TIMELINE_SIZES_"+n;
      sizeoptions += "    "+n.pad(8)+' = <input id="TL_'+nn+'" value="'+eval(nn)+'"/> '+v+'\n';
    }
    tlo("WIDTH","px");
    tlo("HEIGHT","px/min");
    tlo("HISTORY","min");
    tlo("FUTURE","min");
    
    box.innerHTML = '<div style="text-align: center;">=='+uses+'==</div><hr/>'+
                    'USERNAME = <input id="TL_USERNAME" value="'+USERNAME+'"/>\n'+
                    'RACE     = '+race+'\n'+
                    'TIMELINE_SIZES:\n'+sizeoptions+'\n'+
                    'TIME_DIFFERENCE = <input id="TL_TIME_DIFFERENCE" value="'+TIME_DIFFERENCE+'"/> hours (server time - local time)\n'+
                    'SPECIAL_LOCATIONS='+uneval(SPECIAL_LOCATIONS)+'\n'+
                    'VILLAGES='+uneval(VILLAGES)+'\n'+
                    '';
    
    var list = box.childNodes[0].childNodes;
    for (i in list) {    
      var el = list[i];
      function toggle(e) {
        var el = e.target;
        var id = el.id.substr(3);
        var b = !eval(id);
        eval(id+"="+b);
        GM_setValue(prefix(id),b);
        el.style.color = b?'green':'red';        
      }
      el.addEventListener("click",toggle,false);
    }
    
    var list = box.childNodes;
    for (i in list) {
      var el = list[i];
      function opt_change(e) {
        var el = e.target;
        var id = el.id.substr(3);
        GM_setValue(prefix(id),eval(id+"='"+e.target.value+"'"));
      }
      el.addEventListener("change",opt_change,false);
    }
        
    function remove_settings_dialog() {
      remove(div);
    }    
    div.firstChild.addEventListener("click",remove_settings_dialog,false);
  }
  
  var link = div.firstChild;
  link.addEventListener("click",settings,false);
  
} /* USE_SETTINGS */

//////////////////////////////////////////
//  COLLECT SOME INFO                   //
//////////////////////////////////////////

// Meaning of GM Values: (Some of the variable names are in dutch, to stay compatible with older scripts) 
//
// DORP (dutch for village): 
//      id of the current active village. It's 0 when only 1 village is available and does not always accurate.
// 
// MARKT (dutch for market):
//      an array of length 4 containing the amount of resources currently available for sale on the marketplace. (might often be inaccurate)
//
// PRODUCTIE (dutch for production):
//      an array of length 4 containing the production rates of resp. wood, clay, iron and grain. (amount produced per hour)
//
// ALLIANCE:
//      dictionary (map) mapping the names of your ally's members to a list of it's villages. 

none = "0,0,0,0";

// Keep track of current city id
x = location.href.match("newdid=(\\d+)");
if (x!=null) {
    dorp_id=x[1]-0;
    GM_setValue(prefix("DORP"),dorp_id);
} else {
    dorp_id=GM_getValue(prefix("DORP"),0);
}

// Store info about resources put on the market if availbale
x = document.getElementById("lmid2");
if (x!=null && x.innerHTML.indexOf("\"dname\"")>0) {
    var res = document.evaluate( "//table[@class='f10']/tbody/tr[@bgcolor='#ffffff']/td[2]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
    
    var cnt = new Array(0,0,0,0);
    
    for ( var i=0 ; i < res.snapshotLength; i++ )
    {
        c = res.snapshotItem(i).textContent - 0;
        t = res.snapshotItem(i).firstChild.src.match("\\d") - 1;
        cnt[t] += c;
    }
    markt = eval(GM_getValue(prefix("MARKT"), "{}"));
    if (markt==undefined) markt={};
    markt[dorp_id]=cnt;
    GM_setValue(prefix("MARKT"), uneval(markt));
}

// Store info about production rate if available
if (location.href.indexOf("dorf1")>0) {
    var res = document.evaluate( "//div[@id='lrpr']/table/tbody/tr", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
    var prod = new Array(0,0,0,0);
    
    for ( var i=0 ; i < res.snapshotLength; i++ )
    {
        c = res.snapshotItem(i).childNodes[4].firstChild.textContent.match("-?\\d+") - 0;
        t = res.snapshotItem(i).childNodes[1].innerHTML.match("\\d")[0] - 1;
        prod[t] += c;
    }
    productie = eval(GM_getValue(prefix("PRODUCTIE"), "{}"));
    if (productie==undefined) productie={};
    productie[dorp_id]=prod;
    GM_setValue(prefix("PRODUCTIE"), uneval(productie));
}

// Load ally data
try {
    ally = eval(GM_getValue(prefix("ALLIANCE"), "{}"));
    if (ally==undefined) ally = {};
} catch (e) {
    alert(e);
    ally = { };
}    
if (ally==undefined) ally2={};

// Store list of your alliance members.
if (location.href.indexOf("allianz")>0 && location.href.indexOf("s=")<0) {
    var res = document.evaluate( "//td[@class='s7']/a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
    if (res.snapshotLength>0) {
        ally2= ally;
        ally = {}
        for ( var i=0 ; i < res.snapshotLength; i++ )
        {
            x    = res.snapshotItem(i);
            name = x.textContent;
            id   = x.href.match("\\d+")[0];
            cnt  = x.parentNode.parentNode.childNodes[5].textContent;
            if (ally2[name] != undefined) {
                y = ally2[name];
                y[0] = id;
                y[1] = cnt;
                ally[name] = y
            } else {
                // [id, pop, {city1: [city1,x,y],city2: [city2,x,y],...} ]
                ally[name] = [id, cnt, {}];
            }
        }
        GM_setValue(prefix("ALLIANCE"), uneval(ally));
    }
} 

// Get alliance member data
if (location.href.indexOf("spieler")>0) {
    who = document.body.innerHTML.match("<td class=\"rbg\" colspan=\"3\">[A-Z][a-z]+ ([^<]+)</td>");
    if (who) {
        who = who[1];
        if (ally[who] != undefined || who == USERNAME) {
            var res = document.evaluate( "//td[@class='s7']/a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
            cities = {};
            for ( var i=0 ; i < res.snapshotLength; i++ )
            {
                x    = res.snapshotItem(i);
                name = x.textContent;
                y    = x.parentNode.parentNode.childNodes[4].textContent.match("\\((-?\\d+)\\|(-?\\d+)\\)");
                y[0] = name;none = "0,0,0,0";

                y[1] -= 0;
                y[2] -= 0;
                cities[name] = y;
            }
            if (ally[who]==undefined) ally[who]=[0,0,{}];
            ally[who][2] = cities;
            GM_setValue(prefix("ALLIANCE"), uneval(ally));
        }
    }
}

//////////////////////////////////////////
//  ENHANCED RESOURCE INFO              //
//////////////////////////////////////////

// Enhance resource info
if (USE_ENHANCED_RESOURCE_INFO) {
    head = document.getElementById("lres0");
    if (head!=null) {
        a="";
        head = head.childNodes[1].childNodes[0];
        
        cnt  = eval(GM_getValue(prefix("MARKT"),     "{}"))
        prod = eval(GM_getValue(prefix("PRODUCTIE"), "{}"));
        if (cnt !=undefined) cnt  = cnt [dorp_id];
        if (prod!=undefined) prod = prod[dorp_id];
        if (cnt ==undefined) cnt =[0,0,0,0];
        if (prod==undefined) prod=[0,0,0,0];
        
        cur = head.textContent.split("\n").filter(function(x) {return x[0]>='0' && x[0]<='9'; });
        
        for ( var i=0 ; i < 4; i++ )
        {
            if (cnt[i]>0)
                c = "+" + cnt[i] + " ";
            else
                c = ""
            p = (prod[i]>0?"+":"") + Math.round(prod[i]/6)/10.0;
            a+="<td></td><td>"+c+p+"/m</td>";
            cur[i] = cur[i].split("/")[0];
        }
        a+="<td></td><td></td>";
        
        head.innerHTML += "\n<tr>"+a+"</tr>\n";

    }
}

//////////////////////////////////////////
//  MARKET COLORS                       //
//////////////////////////////////////////

if (USE_MARKET_COLORS) {
    function colorify() { 
        x = document.getElementById("lmid2");
        if (x!=null && x.innerHTML.indexOf("</tr><tr class=\"cbg1\">")>0) {
            var res = document.evaluate( "//table[@class='tbg']/tbody/tr[not(@class) and not(@bgcolor)]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
            
            for ( var i=0 ; i < res.snapshotLength; i++ )
            {
                x = res.snapshotItem(i);
                if (x.childNodes[6]!=undefined && x.childNodes[6].textContent>0) {
                    a = x.childNodes[2].textContent-0;
                    b = x.childNodes[6].textContent-0;
                    r = a/b;
                    if (r>1.5)
                        color="#ddffdd";
                    else if (r>1.001)
                        color = "#eeffdd";
                    else if (r>0.999)
                        color = "#ffffdd";
                    else if (r>0.501)
                        color = "#ffeedd";
                    else
                        color = "#ffdddd";

                    x.style.backgroundColor = color;
                }
            }
        }
    }
    for (i=1; i<=10; i++) 
        setTimeout(colorify,i*1000);
    colorify();
} 

//////////////////////////////////////////
//  ALLY LINES                          //
//////////////////////////////////////////

// Show lines to allies and yourself
if (USE_ALLY_LINES) {
    // <canvas width=200 height=200 style="position: absolute; left: 80px; top: 100px; z-index: 15;"/>
    var res = document.evaluate( "//img[@usemap='#karte']", document, null, XPathResult. ANY_UNORDERED_NODE_TYPE, null );
    x = res.singleNodeValue;
    if (x != null) {
        pos = getPos(x);
        canvas=document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.left = pos[0]+"px";
        canvas.style.top  = pos[1]+"px";
        canvas.style.zIndex = 14;
        canvas.width  = pos[2];
        canvas.height = pos[3];
        
        rdiv=document.createElement("div");
        rdiv.style.position = "absolute";
        rdiv.style.left = "315px";
        rdiv.style.top  = "500px";
        rdiv.style.border = "solid 1px #000";
        rdiv.style.background = "#ffc";
        rdiv.style.zIndex = 16;
        rdiv.style.padding = "3px";
        rdiv.style.MozBorderRadius = "6px";

        x.parentNode.insertBefore(canvas, x.nextSibling);
        document.body.appendChild(rdiv);
        
        var rx = document.evaluate( "//input[@name='xp']", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );   
        var ry = document.evaluate( "//input[@name='yp']", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );   

        posx = rx.singleNodeValue.value - 0;
        posy = ry.singleNodeValue.value - 0;

        function update() {
            var g = canvas.getContext("2d");
            g.clearRect(0,0,pos[2],pos[3]);
            g.save()
            g.translate(pos[2]/2-1,pos[3]/2 + 5.5);
                        
            function touch(x, y) {
                x -= posx;
                y -= posy;
                if (x<-400) x+=800;
                if (x> 400) x-=800;
                if (y<-400) y+=800;
                if (y> 400) y-=800;
                g.beginPath();
                px = 1.83*(x+y);
                py = 1.00*(x-y);
                px += py/50;
                px2 = px * 20;
                py2 = py * 20;
                g.moveTo(px,py);
                g.lineTo(px2,py2);
                if (x!=0 || y!=0) 
                    g.fillRect(px-2,py-2,4,4);
                g.stroke();

                if (x>=-3 && x<=3 && y>=-3 && y<=3) {
                    if (x==0 && y==0) 
                        g.lineWidth = 2.5;
                    g.beginPath();
                    g.moveTo(px2+20,py2);
                    g.arc(px2,py2,20,0,Math.PI*2,true);
                    g.stroke();
                    if (x==0 && y==0) 
                        g.lineWidth = 1;
                }
            }
            
            g.fillStyle   = "rgba(128,128,128,0.8)";
            for (a in ally) {
                b = ally[a][2];
                if (a == USERNAME) {
                    g.strokeStyle = "rgba(128,64,0,1.0)";
                } else {
                    g.strokeStyle = "rgba(0,128,255,0.4)";
                }
                
                for (c in b) {
                    touch(b[c][1],b[c][2]);
                }
            }

            g.strokeStyle = "rgba(255,0,128,0.8)";
            for (i=0; i<SPECIAL_LOCATIONS.length; i++) {
                p=SPECIAL_LOCATIONS[i];
                touch(p[0],p[1]);
            }                
            g.restore();
            
            wasc = travian_world_analyzer_server_code;
            rdiv.innerHTML = "<b>Analyze neighbourhood:</b><br/>Radius: " +
                "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",5\" > 5</a>, "+
                "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",10\">10</a>, "+
                "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",15\">15</a>, "+
                "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",20\">20</a>, "+
                "<a href=\"http://travian.ws/analyser.pl?s="+wasc+"&q="+posx+","+posy+",25\">25</a>";
        }
        
        update();
        
        function upd() {
            setTimeout(upd2,50);
        }
        
        function upd2(){
            z = unsafeWindow.m_c.z;
            try {
                if (z != null) {
                    if (posx != z.x || posy != z.y) {
                        posx  = z.x - 0;
                        posy  = z.y - 0;
                        update();
                    }
                }
            } catch (e) {
                alert(e);
            }
        }            
        
        document.addEventListener('click',upd,true);
        document.addEventListener('keydown',upd,true);
        document.addEventListener('keyup',upd,true);
    }
    
    // add a "this location is special!" button to the map's village view.
    if (location.href.indexOf("karte.php?d=")>0) {
        res = document.evaluate( "//div[@id='lmid2']//h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
        x = res.singleNodeValue;
        if (x) {
            l = x.textContent.match("^(.*) \\((-?\\d+)\\|(-?\\d+)\\)$");
            insl = false;
            for (v in SPECIAL_LOCATIONS) {
                if (SPECIAL_LOCATIONS[v][0]==l[2] &&
                    SPECIAL_LOCATIONS[v][1]==l[3]) {
                    insl=true;
                    break;
                }
            }
            addspecial = document.createElement("a");
            addspecial.innerHTML = "s";
            addspecial.title = "[timeline] Toggle ("+l[2]+"|"+l[3]+") as special location.";
            addspecial.href="#";
            addspecial.style.color = insl?"#0f0":"#f00";
            addspecial.className=l[2]+","+l[3]+","+(insl?1:0);
            function addsl(e){
                var el = e.target;
                var l = el.className.split(",");
                if (l[2]>0) {
                    last = SPECIAL_LOCATIONS.pop();
                    for (v in SPECIAL_LOCATIONS) {
                        if (SPECIAL_LOCATIONS[v][0]==l[2] &&
                            SPECIAL_LOCATIONS[v][1]==l[3]) {
                            SPECIAL_LOCATIONS[v]=last;
                            break;
                        }
                    }
                } else {
                    SPECIAL_LOCATIONS.push([l[0]-0,l[1]-0]);
                }
                GM_setValue(prefix("SPECIAL_LOCATIONS"), uneval(SPECIAL_LOCATIONS));
                el.style.color = l[2]<1?"#0f0":"#f00";
                el.className=l[0]+","+l[1]+","+(1-l[2]);
            }
            addspecial.addEventListener('click',addsl,true);
            x.appendChild(addspecial); 
        }
    }
}

//////////////////////////////////////////
//  REMOVE PLUS BUTTON                  //
//////////////////////////////////////////

if (REMOVE_PLUS_BUTTON) {
    plus = document.getElementById("lplus1");
    if (plus) {
        plus.parentNode.style.visibility="hidden";
    }
}

//////////////////////////////////////////
//  CUSTOM SIDEBAR                      //
//////////////////////////////////////////

// Modifies Navigation menu (sidebar)
if (USE_CUSTOM_SIDEBAR) {
    navi = document.getElementById("navi_table");
    if (navi) {
        if (REMOVE_HOME_LINK)
            navi.parentNode.childNodes[1].href="?";
            
        navi=navi.childNodes[1].childNodes[0].childNodes[1];
        
        function add(text, target) {
            if (target=="") {
                el=document.createElement("b");
            } else {
                el=document.createElement("a");
                el.href=target;
            }
            el.innerHTML = text;
            navi.appendChild(el);
        }

        function add_break(nr) {
            if (SIDEBAR_HR) {
                hr=document.createElement("hr");
                if (nr<navi.childNodes.length) {
                    navi.insertBefore(hr,navi.childNodes[nr]);
                } else {
                    navi.appendChild(hr);
                }
            } else {
                br1=document.createElement("br");
                br2=document.createElement("br");
                if (nr<navi.childNodes.length) {
                    navi.insertBefore(br1,navi.childNodes[nr]);
                    navi.insertBefore(br2,navi.childNodes[nr]);
                } else {
                    navi.appendChild(br1);
                    navi.appendChild(br2);
                }
            }
        }
        
        // Make copy of links
        oldnavi = [];
        for (i = 0; i < navi.childNodes.length; i++)
            if (navi.childNodes[i].tagName=="A")
                oldnavi.push(navi.childNodes[i]);

        // Remove all links
        for (i = navi.childNodes.length - 1; i>=0; i--) 
            navi.removeChild(navi.childNodes[i]);
        
        // Add new links
        for (i = 0; i < SIDEBAR_LINKS.length; i++) {
            x = SIDEBAR_LINKS[i];
            if (x.constructor == Array) {
                add(x[0], x[1]);
            } else if (x.constructor == String) {
                add(x, "");
            } else if (x<0) {
                add_break();
            } else {
                el = oldnavi[x];
                if (REMOVE_TARGET_BLANK) {
                    el.removeAttribute("target");
                }
                // Remove color from Plus link
                if (REMOVE_PLUS_COLOR)
                    el.innerHTML=el.textContent;
                navi.appendChild(el);
            }
        }

        // debugging code
        if (DEBUG_SIDEBAR) {
            for (var j=0; j<oldnavi.length; j++) {
                add(j+": ","")
                navi.appendChild(oldnavi[j]);
            }
        }
    }
}

//////////////////////////////////////////
//  TIMELINE                            //
//////////////////////////////////////////

tp1 = document.getElementById("tp1");
if (USE_TIMELINE && tp1) {
    /*  A timeline-data-packet torn apart:
        Example: {'1225753710000':[0, 0, 0, 0, 189, 0, 0, 0, 0, 0, 0, 0, "Keert terug van 2. Nador", 0, 0, 0, 0]}
        
        '1225753710000':       ## ~ The time at which this event occure(s|d).      
        [0,                     0 ~ Unused (used to be the type of event)
        0,                      1 ~ Amount of farm-men involved 
        0,                      2 ~ Amount of defense-men involved
        0,                      3 ~ Amount of attack-men involved 
        189,                    4 ~ Amount of scouts  involved 
        0,                      5 ~ Amount of defense-horses involved 
        0,                      6 ~ Amount of attack-horses involved 
        0,                      7 ~ Amount of rams involved 
        0,                      8 ~ Amount of trebuchets involved 
        0,                      9 ~ Amount of leaders involved 
        0,                     10 ~ Amount of settlers involved 
        0,                     11 ~ Amount of heros involved 
        "Keert terug van 2. ", 12 ~ Event message.
        0,                     13 ~ Amount of wood involved
        0,                     14 ~ Amount of clay involved
        0,                     15 ~ Amount of iron involved
        0,                     16 ~ Amount of grain involved
        "1."]                  17 ~ Issuing city
             
    */

    // Data collection:
    try {
        events = eval(GM_getValue(prefix("TIMELINE"),"{}"));
        if (events==undefined) events = {};
    } catch (e) {
        alert(e);
        events = { };
    }    
    
    function getevent(t, msg) {
        e = events[t];
        if (e == undefined) {
            e = [0,0,0,0,0,0,0,0,0,0,0,0,msg,0,0,0,0,""];
            events[t]=e;
        }
        return e;
    }
    
    // Travelling armies
    x = document.getElementById("lmid2");
    if (x!=null && x.innerHTML.indexOf("warsim.php")>0) {
    
        var res = document.evaluate( "//table[@class='tbg']/tbody", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
        
        for ( var i=0 ; i < res.snapshotLength; i++ )
        {
            x = res.snapshotItem(i);
            // TODO
            what = x.childNodes[3].childNodes[0].innerHTML;
            if (what == "Aankomst") {
                time = x.childNodes[3].childNodes[1].childNodes[0].childNodes[1].childNodes[0].childNodes[3].textContent.match("(\\d\\d?)\\:(\\d\\d)\\:(\\d\\d)");
                where = x.childNodes[0].childNodes[2].textContent;
                q = new Date();
                q.setTime(q.getTime()+TIME_DIFFERENCE*360000);  // Adjust local time to server time.
                t = q.getTime();
                q.setHours(time[1]);
                q.setMinutes(time[2]);
                q.setSeconds(time[3]);
                q.setMilliseconds(0);
                if (q.getTime()<t-60000)
                    q.setDate(q.getDate()+1);
                t = q.getTime();
                
                e = getevent(t,where);
                for (var j = 1; j<12; j++) {
                  y = x.childNodes[2].childNodes[j];
                  if (y!=undefined)
                      e[j] = y.textContent - 0;
                }
            }
        }
    }
    
    // Reports 
    if (location.href.indexOf("berichte.php?id")>0) {
    
        res = document.evaluate( "//table[@class='tbg']/tbody", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
        x = res.singleNodeValue;
        if (x != undefined) {
            if (x.innerHTML.indexOf("\n<tbody><tr class=\"cbg1\">\n")>0) {
                time = x.childNodes[2].childNodes[3].textContent.match("(\\d\\d?).(\\d\\d).(\\d\\d) [ a-zA-Z]+ (\\d\\d?):(\\d\\d):(\\d\\d)");
                where = x.childNodes[0].childNodes[3].innerHTML;
                q = new Date(); 
                q.setTime(q.getTime()+TIME_DIFFERENCE*3600000);  // Adjust local time to server time.
                t = q.getTime();
                q.setYear("20"+time[3]);
                q.setMonth(time[2] - 1);
                q.setDate(time[1]);
                q.setHours(time[4]);
                q.setMinutes(time[5]);
                q.setSeconds(time[6]);
                q.setMilliseconds(0);
                t = q.getTime();
                e = getevent(t,where);
                e[12] = where;
                
                // army composition + losses
                x = x.childNodes[6].childNodes[1];
                dualrow=false;
                if (x.childNodes[2]==undefined) {
                    x = x.childNodes[1].childNodes[1]; 
                } else {
                    x = x.childNodes[2].childNodes[1]; 
                    dualrow=true;
                }

                for (var j = 1; j<12; j++) {
                    y1 = x.childNodes[3].childNodes[j];
                    if (dualrow) y2 = x.childNodes[4].childNodes[j];
                    if (y1!=undefined) {
                        if (dualrow && y2.textContent>0)
                            e[j] = [y1.textContent - 0, y2.textContent - 0];
                        else
                            e[j] = y1.textContent - 0;
                    }
                }
                
                // profit
                if (dualrow) {
                    if (x.childNodes[5].childNodes[3] != undefined) {
                        y = x.childNodes[5].childNodes[3].textContent.split(" ");                
                        for (var j = 1; j<5; j++) {
                            e[j + 12] = y[j - 1] - 0;
                        }
                    }
                } else {
                    if (x.childNodes[4].childNodes[3] != undefined) {
                        y = x.childNodes[4].childNodes[3].textContent.split(" ");                
                        e[16] = 0-y[0];
                    }                
                }
            }
        }
    }

    // building build task:
    if (location.href.indexOf("dorf")>0) {
        bouw = document.getElementById("lbau1");
        if (bouw == undefined)
            bouw = document.getElementById("lbau2");
        if (bouw != undefined) {
            y = bouw.childNodes[1].childNodes[0];
            for (nn in y.childNodes) {
                x = y.childNodes[nn];
                time = x.childNodes[3].textContent; 
                time = time.match("(\\d\\d?):(\\d\\d) ?([a-z]*)");
                where = x.childNodes[1].textContent;
                if (time[3]=="pm") 
                    time[1]-=-12;
                
                q = new Date();
                q.setTime(q.getTime()+TIME_DIFFERENCE*3600000);  // Adjust local time to server time.
                t = q.getTime();
                q.setHours(time[1]);
                q.setMinutes(time[2]);
                q.setSeconds(0);
                q.setMilliseconds(1);
                if (q.getTime()<t-60000)
                    q.setDate(q.getDate()+1);
                t = q.getTime();
                            
                res = document.evaluate( "//div[@class='dname']/h1", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
                x = res.singleNodeValue.textContent;
                var h = 0;
                for(var i = 0; i < x.length; i ++) {
                    h*=13;
                    h+=i;
                    h%=127;
                }
                t+=h*2;
                
                e = getevent(t,where);
                e[17] = x;
            }
        }
    }

    TIMELINE_SIZES_FULL_HEIGHT  = (TIMELINE_SIZES_HISTORY+TIMELINE_SIZES_FUTURE)*TIMELINE_SIZES_HEIGHT; // pixels

    // Create timeline canvas
    tl = document.createElement("canvas");
    if (FIX_TIMELINE)
        tl.style.position = "fixed";
    else
        tl.style.position = "absolute";
    tl.style.top      = "0px";
    tl.style.right    = "0px";
    tl.style.width    = TIMELINE_SIZES_WIDTH  + "px";
    tl.style.height   = TIMELINE_SIZES_FULL_HEIGHT + "px";
    tl.style.zIndex   = "20";
    tl.style.backgroundColor="rgba(255,255,204,0.5)";
    tl.style.visibility = GM_getValue(prefix("TL_VISIBLE"), "visible");
    tl.id = "tl";
    tl.width  = TIMELINE_SIZES_WIDTH;
    tl.height = TIMELINE_SIZES_FULL_HEIGHT;
    document.body.appendChild(tl);
    
    function toggle_tl(e) {
        e=document.getElementById('tl');
        e.style.visibility=e.style.visibility!='hidden'?'hidden':'visible';
        GM_setValue(prefix("TL_VISIBLE"), e.style.visibility);
    }
    
    button = document.createElement("div");
    button.style.position = tl.style.position;
    button.style.backgroundColor = "rgba(0,0,128,0.5)";
    button.style.right = "0px";
    button.style.top = "-2px";
    button.style.width  = "60px";
    button.style.height = "21px";
    button.style.zIndex = "20";
    button.style.textAlUSE_SETTINGSign = "center";
    button.style.color = "#fff";
    button.style.fontWeight = "bold";
    button.style.MozBorderRadiusBottomleft = "6px";    
    button.style.cursor = "pointer";
    button.addEventListener('click',toggle_tl,true);
    button.innerHTML = "timeline";
    document.body.appendChild(button);
    
    // Get context
    var g = tl.getContext("2d");

    // get server time
    server_time = tp1.textContent.split(":");
        
    // determine 'now'
    d = new Date();
    d.setTime(d.getTime()+TIME_DIFFERENCE*3600000); // Adjust local time to server time.
    if (USE_SERVER_TIME) {
        t = d.getTime();
        d.setHours(server_time[0]);
        d.setMinutes(server_time[1]);
        d.setSeconds(server_time[2]);
        d.setMilliseconds(0);
        if (d.getTime()<t-60000)
            d.setDate(d.getDate()+1);
    }

    n = new Date();
    n.setTime(d.getTime());
    
    d.setMilliseconds(0);
    d.setSeconds(0);
    if (d.getMinutes()<15) {
        d.setMinutes(0);
    } else if (d.getMinutes()<45) {
        d.setMinutes(30);
    } else {
        d.setMinutes(60);    
    }
    
    // Clean old events:
    list = { };
    old = d.getTime()-TIMELINE_SIZES_HISTORY*60000;
    for (e in events) {
        if (e>old) {
            list[e] = events[e];            
            // room for updates:
        }
    }
    events=list;
    GM_setValue(prefix("TIMELINE"),uneval(events));
    
    // Draw bar
    g.translate(TIMELINE_SIZES_WIDTH - 9.5, TIMELINE_SIZES_HISTORY * TIMELINE_SIZES_HEIGHT + .5);
    
    g.strokeStyle = "rgb(0,0,0)";
    g.beginPath();
    g.moveTo(0,-TIMELINE_SIZES_HISTORY * TIMELINE_SIZES_HEIGHT);
    g.lineTo(0, TIMELINE_SIZES_FUTURE  * TIMELINE_SIZES_HEIGHT);
    g.stroke();
    for (var i=-TIMELINE_SIZES_HISTORY; i<=TIMELINE_SIZES_FUTURE; i+=1) {
        g.beginPath();
        l = -2;
        ll = 0;
        if (i%5 == 0) l-=2;
        if (i%15 == 0) l-=2;
        if ((i + d.getMinutes())%60 == 0) ll+=8;        
        g.moveTo(l, i*TIMELINE_SIZES_HEIGHT);
        g.lineTo(ll,  i*TIMELINE_SIZES_HEIGHT);    
        g.stroke();
    }

    // Draw times
    g.mozTextStyle = "8pt Monospace";
    function drawtime(i, t) {
        h = t.getHours()+"";
        m = t.getMinutes()+"";
        if (m.length==1) m = "0" + m;
        x = h+":"+m;

        g.save();
        g.translate(-g.mozMeasureText(x) - 10, 4 + i * TIMELINE_SIZES_HEIGHT);
        g.mozDrawText(x);    
        g.restore();    
    }
    for (var i=-TIMELINE_SIZES_HISTORY; i<=TIMELINE_SIZES_FUTURE; i+=15) {
        t = new Date(d);
        t.setMinutes(t.getMinutes() + i);
        drawtime(i, t);
    }

    // Draw current time
    g.strokeStyle = "rgb(0,0,255)";
    g.beginPath();
    diff = (n.getTime() - d.getTime()) / 1000 / 60;
    y = diff * TIMELINE_SIZES_HEIGHT;
    g.moveTo(-8, y);
    g.lineTo( 4, y);    
    g.lineTo( 6, y-2);    
    g.lineTo( 8, y);    
    g.lineTo( 6, y+2);    
    g.lineTo( 4, y);    
    g.stroke();

    g.fillStyle = "rgb(0,0,255)";
    drawtime(diff, n);

    unit = new Array(17);
    for (i=1; i<12; i++) {
        unit[i] = new Image();
        if (i==11)
            unit[i].src = "img/un/u/hero.gif"
        else
            unit[i].src = "img/un/u/"+(RACE*10+i)+".gif";
    }

    for (i=13; i<17; i++) {
        unit[i] = new Image();
        unit[i].src = "img/un/r/"+(i-12)+".gif";
    }


    function left(q) {
        if (q.constructor == Array)
            return q[0]-q[1];
        else
            return q-0;
    }

    // Draw data
    for (e in events) {
        p = events[e];
        diff = (e - d.getTime()) / 1000 / 60;
        y = diff * TIMELINE_SIZES_HEIGHT;
        y = Math.round(y);
        g.strokeStyle = "rgb(0,0,0)";
        g.beginPath();
        g.moveTo(-10, y);
        g.lineTo(-50, y);    
        g.stroke();
        
        g.fillStyle = "rgb(0,128,0)";
        var cap = 60*left(p[1])+40*left(p[2])+110*left(p[5]) - ((p[13]-0)+(p[14]-0)+(p[15]-0)+(p[16]-0));
        cap = (cap<=0)?"*":"";
        g.save();
        g.translate(20 - TIMELINE_SIZES_WIDTH - g.mozMeasureText(cap), y+4);
        g.mozDrawText(cap + p[12]);
        g.restore();

        if (p[17]) {
            g.fillStyle = "rgb(0,0,128)";
            g.save();
            g.translate(20 - TIMELINE_SIZES_WIDTH, y-5);
            g.mozDrawText(p[17]);
            g.restore();
        }

        if (SHOW_TIMELINE_REPORT_INFO) {
            g.fillStyle = "rgb(64,192,64)";
            g.save();
            g.translate(-40, y+4);
            for (i = 16; i>0; i--) {
                if (i==12)
                    g.fillStyle = "rgb(0,0,255)";
                else if (p[i]) {
                    g.translate(-unit[i].width - 8, 0);
                    g.drawImage(unit[i], -0.5, Math.round(-unit[i].height*0.7) -0.5);
                    if (p[i].constructor == Array) {
                        g.fillStyle = "rgb(192,0,0)";
                        g.translate(-g.mozMeasureText(-p[i][1]) - 2, 0);
                        g.mozDrawText(-p[i][1]);
                        g.fillStyle = "rgb(0,0,255)";
                        g.translate(-g.mozMeasureText(p[i][0]), 0);
                        g.mozDrawText(p[i][0]);
                    } else {
                        g.translate(-g.mozMeasureText(p[i]) - 2, 0);
                        g.mozDrawText(p[i]);
                    }
                }
            }
        }
        g.restore();
    }
    
    function pad2(x) {
        if (x<10) return "0"+x;
        else return x;
    }
    
    function setAt(e) {
        var at = document.getElementById("at");
        if (at) {
            // d = 'top of the timeline time'        
            var n = new Date();
            n.setTime(d.getTime() + (e.pageY/TIMELINE_SIZES_HEIGHT-TIMELINE_SIZES_HISTORY) *60*1000);
            s=(n.getFullYear())+"/"+(n.getMonth()+1)+"/"+n.getDate()+" "+n.getHours()+":"+pad2(n.getMinutes())+":"+pad2(n.getSeconds());
            at.value=s;
        }
    }
    
    tl.addEventListener("click",setAt,false);
    
} /* USE_TIMELINE */

if (USE_EXTRA_VILLAGE) {
    res = document.evaluate( "//div[@id='lright1']/table/tbody", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null );
    
    function newcell(innerhtml) {
        cell = document.createElement("td");
        cell.innerHTML = innerhtml;
        cell.className = "nbr";
        return cell;
    }
    
    if (tab = res.singleNodeValue) {
        for (i = 0; i < VILLAGES.length; i++) {
            x = VILLAGES[i];
            row = document.createElement("tr");
            row.appendChild(newcell("<span>• </span> "+x[0]));
            row.appendChild(newcell("<table cellspacing=\"0\" cellpadding=\"0\" class=\"dtbl\">\n<tbody><tr>\n<td class=\"right dlist1\">("+x[1]+"</td>\n<td class=\"center dlist2\">|</td>\n<td class=\"left dlist3\">"+x[2]+")</td>\n</tr>\n</tbody></table>"));
            tab.appendChild(row);
        }
    }
} /* USE_EXTRA_VILLAGE */

} catch (e) {
    if (USE_DEBUG_MODE) 
        alert("Timeline caught an error: \n"+
              e.name+" at line "+e.lineNumber+"\n"+
              "Message:"+e.message+"\n"+
              "Stack trace:\n"+e.stack);
    throw e;
}

