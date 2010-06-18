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
    Images.wheat    = Images.create('<img class="r4" src="img/x.gif">';
    Images.eaten    = Images.create('<img class="r5" src="img/x.gif">';
    Images.clock    = Images.create("data:image/bmp;base64,Qk3WAgAAAAAAADYAAAAoAAAAEgAAAAwAAAABABgAAAAAAKACAAATCwAAEwsAAAAAAAAAAAAA/////////////v7+/v7+rq6uTExMREREPDw8PDw8PDw8QEBAi4uL/////v7+////////////AAD////////////9/f2pqalDQ0N+fn75+fn////x8fHc3NyCgoI7OzuKior///////////////8AAP///////////6SkpEhISJubm/39/f39/f39/f////7+/v7+/o2NjURERKGhof///////////wAA////////////SkpKjY2N7e3t/////v7+/f39/v7+////9/f3WlpaU1NTSUlJ////////////AAD///////////9BQUHc3Nz7+/v+/v7+/v79/f3///9SUlJbW1vx8fG+vr47Ozv///////////8AAP///////////zw8PNnZ2f////39/f7+/v///ysrK+vr6/z8/P7+/vn5+TMzM////////////wAA////////////QUFB/////////f39/f39////Li4u/////f39/v7+/Pz8ODg4////////////AAD///////////83NzePj4/39/f+/v79/f3///9QUFD////+/v7+/v67u7s7Ozv///////////8AAP///////////2BgYERERJeXl/////7+/v///1JSUv////7+/v///1tbW0FBQf///////////wAA////////////////T09PVlZW9fX1+fn5////T09P////+/v7W1tbOzs7l5eX////////////AAD////////////9/f339/dPT09UVFSBgYH///9LS0vc3NxSUlI8PDyBgYH+/v7///////////8AAP////////////7+/v39/f///25ubkpKSklJSUNDQ0pKSjs7O2hoaP39/f7+/v///////////wAA");
    Images.percent  = Images.create("data:image/bmp;base64,Qk3WAgAAAAAAADYAAAAoAAAAEgAAAAwAAAABABgAAAAAAKACAAATCwAAEwsAAAAAAAAAAAAA////////////////////////////////////////////////////////////////////////AAD////////////////////Y2NhNTU23t7f////m5uZbW1s/Pz9QUFCCgoL39/f///////////8AAP///////////////////////7W1tUpKSuPj49LS0ioqKq2trZaWlkJCQvHx8f///////////wAA////////////////////////+Pj4SEhIkpKS1NTUMjIytbW1nZ2dNzc38fHx////////////AAD////////////////Ozs6YmJijo6POzs5MTEy+vr5xcXFFRUU/Pz+Ghob7+/v///////////8AAP///////////+Xl5VtbW1BQUD4+Po+Pj6GhoUVFRd7e3tPT09vb2/7+/v///////////////wAA////////////0tLSKioqwsLCh4eHQkJC5OTkUlJSjIyM/v7+////////////////////////AAD////////////V1dUyMjK0tLSQkJBQUFDx8fHa2tpeXl7Y2Nj///////////////////////8AAP////////////Ly8oCAgEREREBAQJeXl/v7+/7+/p6enlZWVtvb2////////////////////wAA////////////////8fHx0tLS29vb////////////+Pj42NjY////////////////////////AAD///////////////////////////////////////////////////////////////////////8AAP///////////////////////////////////////////////////////////////////////wAA");
    Images.hammer   = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAMCAYAAABvEu28AAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kEEhY1JQfrF6AAAAFYSURBVCjPlZI7a8IAFEY/K1UCBn+AiwZpwVVwCMFNguJQHOvgUIQ4FEQoUjNVCiIFN6GbU0CdujWrdNPBdggOoqGgHZSCQRE1hdvZt571Xg738YF2oGkaSZJE2WyWTuUCGyyXS8iyDJ7n0e120e/3cQpbolgsBlEUwbIsjOkUHMedLzIMA1arFT6fD2/lMl4KBZzKmkgURQiCAIfTievxGO/pNNRaDX/niHRdh2mamM/nSCaT+HW74bDZoJVKUPJ5fI9GmAyHx0UejwfFYhGqquIukcBNLoemaWJqscDWaqGaSuGz3d4/0uYbG40GrVYrIiL66nToKZOhqMtFSjhMz8EgVSuVne/HsXxMZjN6UxS6YllSolEqh0L0GI9v9VmIiI4dkgDogwFuAwFIfj8uAfwwDB7q9f2rHWKxWJDAcfQaiRDv9R5O9iHsdjs+ej00GQb3srxW+wd+q1O9w+tuqQAAAABJRU5ErkJggg==");
    Images.nohammer = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAMCAYAAABvEu28AAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGQEIJZ4LRFoAAAFXSURBVCjPjZKxa8JAGMVfSiE6hHYVoUOQ/gsHoQ4FQRBFcAo4dAq4tIOLlEzd6m6hm5PgWHDo4FDEyWKLi5OoFCe3lIiogb4OadRogz74hu+497t33x34j/r9PguFAkulEo/VCQBAktwCsFwuYZomNE3DYDDAaDRCoLZ8Loh0S5Igh0JIJpNQFAXftg1VVYMBns9lbGRZFjOZDAnwJpHgZ7e7fwe/ZbO83QghWC6X+dHreWfxtV6n4wECICR56qUdj8dwHAfz+RyGYeA6m8WFbeNO1wFdx9d0ijPHwXnQvLapzWaTQgg+VSpsdzrMx+PrJI+5HN8ajcBEe1lbrRZXq9Ua8FAsMh2Nrvt6tXocaHeg1mzGl1qNl4rCWjpNArzP5w+AAgb6Q3I4mVBEIqz+wXb3gUe8iKfFYsErVeVzKkUtFvP5/B/ygGRZRns4xHs4jFvT9Pl+AbHZF5zaQ2LdAAAAAElFTkSuQmCC");
    Images.hero     = Images.create("data:image/gif;base64,R0lGODlhDwAQAMIDAPCzB//RAP/ogf///////////////////yH5BAEKAAQALAAAAAAPABAAAAM5OLoj/M9BKASY0eJV7d1d8HFdKZYOEKBrJS5qIAuyOCoxbd+wDvwYF8ATtNF4igpQiTxyXhGeRpEAADs=");
    Images.cross    = Images.create("data:image/gif;base64,R0lGODlhEAAQAPcAAAAAAJoIBZQ2LZ8xKZw+NqMDAa0NCaEVDqkfGbwFArsKB7oPCrIVC7IUDbgSDrcYEqslGq8iHb8kFrgkHKYvJKc1LLU+Lb4/MLBFM5hKQZVWT55gWaRMQqpZSaNjWrpgUqxyZqlyaqV9d8IHBcwEA80GBM8KBcMVDc8bD8YbEdQOD9MSCdURD9YREdUSEdYYEtQeFNkWE9oYEtgeFdkfFtwcFMElGtAjFd0gFt4jF90mFd4rHcIyIOAjF+ElGOEnGeIoGeIpGuIrG+AtG+MvG+QpGuQrGuUsGuYvGuYuG+MwHOcwGuc0HugxHOgyHek1Huo2H+w5H+Q1Iuk7I+w4IO46Ie89IfA/IshHKc9LK8JJOsVNO8tONsxIMdJCKeBHJelFJO1BI+9FJO5JMfBAIvFBI/FCI/NEJPFFJvRHJfdNJ/hNKPpSKfpTK8JcTclcRsxcSM1pVsN9dtB+cK6Jg7aQiM+ZktSViNWjmcOrp8S2s8W9u8i4tNanodqxqNqxqtqxrOC+udPFw9nS0NjT0t/c2+TKxebQyujSzuPd2+Pe3enV0O3e2+vj4ezl4+ro5+7o5+zr6+/t7fHk4fDs6/bt6vTt7PXu7fPy8fXy8fX19Pf29/n08vr29fr6+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAQABAAAAjcAP8JHEjw3585dw4J9AMnDh5OBPucmNImyyVLXcagEfNmksBAC1asYYMFEiULUq6UMcNlEaIHJs6o+VJHIB8KOqpYueJlAokoacCA2DRwEAEUUKhUWYKETJgOkgo+2sBAyZOkVTAoKigwk4AAQ5o4YfKBq0A5BQwEMXIkCRE3lQraSTACR48bKYAUEaKF0UBACkjIqAHDg4YGOXz8uCDQkI0SLGK84CAJk4gDM3BIaNRpyw4WLVxUSDRQTwYIIf454kFDhYoIggpqKiTQE50BDhDkMVsw0h5CvAcGBAA7");
    Images.unit     = new Array(31);
    Images.unit[0]  = Images.hero;
    for (i=1; i<=30; i++) {
        Images.unit[i] = Images.create("img/un/u/"+(i)+".gif");
    }
    Images.resource = new Array(6);
    for (i=0; i<5; i++) {
        Images.resource[i] = Images.create("img/un/r/"+(i+1)+".gif");
    }
    Images.wheat    = Images.resource[3];
    Images.eaten    = Images.resource[4];
};

Images.call('init', true);
$(function(){Images.call('run',true);});

