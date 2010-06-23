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
 * IMAGES (ours and Travian's/Imperion's)
 ****************************************/

Feature.create("Images", new Error(21));
delete Images.s.enabled; // It does not care what the value is.

/**
 * Creates a new image. 
 * @param width: the width of a single subimage.
 */
Images.create = function(src, width, height) {
    var im = new Object();
    im.__proto__  = Images;
    im.src = src;
    im.width = width;
    im.height = height;
    return im;
};
Images.get = function(){
    return $.new("img").attr({src: this.src});
};
Images.stamp = function() {
    if (!this._stamp) {
        this._stamp=new Image();
        this._stamp.src=this.src;
        this._stamp.creator=this;
    }
    return this._stamp;
};

Images.init=function() {
    if (travian) {
        Images.clock    = Images.create("data:image/bmp;base64,Qk3WAgAAAAAAADYAAAAoAAAAEgAAAAwAAAABABgAAAAAAKACAAATCwAAEwsAAAAAAAAAAAAA/////////////v7+/v7+rq6uTExMREREPDw8PDw8PDw8QEBAi4uL/////v7+////////////AAD////////////9/f2pqalDQ0N+fn75+fn////x8fHc3NyCgoI7OzuKior///////////////8AAP///////////6SkpEhISJubm/39/f39/f39/f////7+/v7+/o2NjURERKGhof///////////wAA////////////SkpKjY2N7e3t/////v7+/f39/v7+////9/f3WlpaU1NTSUlJ////////////AAD///////////9BQUHc3Nz7+/v+/v7+/v79/f3///9SUlJbW1vx8fG+vr47Ozv///////////8AAP///////////zw8PNnZ2f////39/f7+/v///ysrK+vr6/z8/P7+/vn5+TMzM////////////wAA////////////QUFB/////////f39/f39////Li4u/////f39/v7+/Pz8ODg4////////////AAD///////////83NzePj4/39/f+/v79/f3///9QUFD////+/v7+/v67u7s7Ozv///////////8AAP///////////2BgYERERJeXl/////7+/v///1JSUv////7+/v///1tbW0FBQf///////////wAA////////////////T09PVlZW9fX1+fn5////T09P////+/v7W1tbOzs7l5eX////////////AAD////////////9/f339/dPT09UVFSBgYH///9LS0vc3NxSUlI8PDyBgYH+/v7///////////8AAP////////////7+/v39/f///25ubkpKSklJSUNDQ0pKSjs7O2hoaP39/f7+/v///////////wAA");
        Images.percent  = Images.create("data:image/bmp;base64,Qk3WAgAAAAAAADYAAAAoAAAAEgAAAAwAAAABABgAAAAAAKACAAATCwAAEwsAAAAAAAAAAAAA////////////////////////////////////////////////////////////////////////AAD////////////////////Y2NhNTU23t7f////m5uZbW1s/Pz9QUFCCgoL39/f///////////8AAP///////////////////////7W1tUpKSuPj49LS0ioqKq2trZaWlkJCQvHx8f///////////wAA////////////////////////+Pj4SEhIkpKS1NTUMjIytbW1nZ2dNzc38fHx////////////AAD////////////////Ozs6YmJijo6POzs5MTEy+vr5xcXFFRUU/Pz+Ghob7+/v///////////8AAP///////////+Xl5VtbW1BQUD4+Po+Pj6GhoUVFRd7e3tPT09vb2/7+/v///////////////wAA////////////0tLSKioqwsLCh4eHQkJC5OTkUlJSjIyM/v7+////////////////////////AAD////////////V1dUyMjK0tLSQkJBQUFDx8fHa2tpeXl7Y2Nj///////////////////////8AAP////////////Ly8oCAgEREREBAQJeXl/v7+/7+/p6enlZWVtvb2////////////////////wAA////////////////8fHx0tLS29vb////////////+Pj42NjY////////////////////////AAD///////////////////////////////////////////////////////////////////////8AAP///////////////////////////////////////////////////////////////////////wAA");
        Images.hammer   = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAMCAYAAABvEu28AAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kEEhY1JQfrF6AAAAFYSURBVCjPlZI7a8IAFEY/K1UCBn+AiwZpwVVwCMFNguJQHOvgUIQ4FEQoUjNVCiIFN6GbU0CdujWrdNPBdggOoqGgHZSCQRE1hdvZt571Xg738YF2oGkaSZJE2WyWTuUCGyyXS8iyDJ7n0e120e/3cQpbolgsBlEUwbIsjOkUHMedLzIMA1arFT6fD2/lMl4KBZzKmkgURQiCAIfTievxGO/pNNRaDX/niHRdh2mamM/nSCaT+HW74bDZoJVKUPJ5fI9GmAyHx0UejwfFYhGqquIukcBNLoemaWJqscDWaqGaSuGz3d4/0uYbG40GrVYrIiL66nToKZOhqMtFSjhMz8EgVSuVne/HsXxMZjN6UxS6YllSolEqh0L0GI9v9VmIiI4dkgDogwFuAwFIfj8uAfwwDB7q9f2rHWKxWJDAcfQaiRDv9R5O9iHsdjs+ej00GQb3srxW+wd+q1O9w+tuqQAAAABJRU5ErkJggg==");
        Images.nohammer = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAMCAYAAABvEu28AAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGQEIJZ4LRFoAAAFXSURBVCjPjZKxa8JAGMVfSiE6hHYVoUOQ/gsHoQ4FQRBFcAo4dAq4tIOLlEzd6m6hm5PgWHDo4FDEyWKLi5OoFCe3lIiogb4OadRogz74hu+497t33x34j/r9PguFAkulEo/VCQBAktwCsFwuYZomNE3DYDDAaDRCoLZ8Loh0S5Igh0JIJpNQFAXftg1VVYMBns9lbGRZFjOZDAnwJpHgZ7e7fwe/ZbO83QghWC6X+dHreWfxtV6n4wECICR56qUdj8dwHAfz+RyGYeA6m8WFbeNO1wFdx9d0ijPHwXnQvLapzWaTQgg+VSpsdzrMx+PrJI+5HN8ajcBEe1lbrRZXq9Ua8FAsMh2Nrvt6tXocaHeg1mzGl1qNl4rCWjpNArzP5w+AAgb6Q3I4mVBEIqz+wXb3gUe8iKfFYsErVeVzKkUtFvP5/B/ygGRZRns4xHs4jFvT9Pl+AbHZF5zaQ2LdAAAAAElFTkSuQmCC");
        Images.hero     = Images.create("data:image/gif;base64,R0lGODlhDwAQAMIDAPCzB//RAP/ogf///////////////////yH5BAEKAAQALAAAAAAPABAAAAM5OLoj/M9BKASY0eJV7d1d8HFdKZYOEKBrJS5qIAuyOCoxbd+wDvwYF8ATtNF4igpQiTxyXhGeRpEAADs=");
        Images.cross    = Images.create("data:image/gif;base64,R0lGODlhEAAQAPcAAAAAAJoIBZQ2LZ8xKZw+NqMDAa0NCaEVDqkfGbwFArsKB7oPCrIVC7IUDbgSDrcYEqslGq8iHb8kFrgkHKYvJKc1LLU+Lb4/MLBFM5hKQZVWT55gWaRMQqpZSaNjWrpgUqxyZqlyaqV9d8IHBcwEA80GBM8KBcMVDc8bD8YbEdQOD9MSCdURD9YREdUSEdYYEtQeFNkWE9oYEtgeFdkfFtwcFMElGtAjFd0gFt4jF90mFd4rHcIyIOAjF+ElGOEnGeIoGeIpGuIrG+AtG+MvG+QpGuQrGuUsGuYvGuYuG+MwHOcwGuc0HugxHOgyHek1Huo2H+w5H+Q1Iuk7I+w4IO46Ie89IfA/IshHKc9LK8JJOsVNO8tONsxIMdJCKeBHJelFJO1BI+9FJO5JMfBAIvFBI/FCI/NEJPFFJvRHJfdNJ/hNKPpSKfpTK8JcTclcRsxcSM1pVsN9dtB+cK6Jg7aQiM+ZktSViNWjmcOrp8S2s8W9u8i4tNanodqxqNqxqtqxrOC+udPFw9nS0NjT0t/c2+TKxebQyujSzuPd2+Pe3enV0O3e2+vj4ezl4+ro5+7o5+zr6+/t7fHk4fDs6/bt6vTt7PXu7fPy8fXy8fX19Pf29/n08vr29fr6+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAQABAAAAjcAP8JHEjw3585dw4J9AMnDh5OBPucmNImyyVLXcagEfNmksBAC1asYYMFEiULUq6UMcNlEaIHJs6o+VJHIB8KOqpYueJlAokoacCA2DRwEAEUUKhUWYKETJgOkgo+2sBAyZOkVTAoKigwk4AAQ5o4YfKBq0A5BQwEMXIkCRE3lQraSTACR48bKYAUEaKF0UBACkjIqAHDg4YGOXz8uCDQkI0SLGK84CAJk4gDM3BIaNRpyw4WLVxUSDRQTwYIIf454kFDhYoIggpqKiTQE50BDhDkMVsw0h5CvAcGBAA7");
        Images.romans   = Images.create("/gpack/travian_0006/img/u/v1_romans2.gif", 16, 16);
        Images.teutons  = Images.create("/gpack/travian_0006/img/u/v2_teutons2.gif", 16, 16);
        Images.gauls    = Images.create("/gpack/travian_0006/img/u/v3_gauls2.gif", 16, 16);
        Images.nature   = Images.create("/gpack/travian_0006/img/u/v4_nature2.gif", 16, 16);
        Images.natars   = Images.create("/gpack/travian_0006/img/u/v5_natars2.gif", 16, 16);
        Images.monsters = Images.create("/gpack/travian_0006/img/u/v6_monsters2.gif", 16, 16);
        Images.resources= Images.create("/gpack/travian_0006/img/a/res2.gif", 20, 12);
        //Images.wheat    = Images.resource[3];
        //Images.eaten    = Images.resource[4];
    }
    if (imperion) {
        Images.metal    = Images.create("/img/interface/informations/metal.jpg", 33, 31);
        Images.crystal  = Images.create("/img/interface/informations/crystal.jpg", 33, 31);
        Images.hydrogen = Images.create("/img/interface/informations/deuterium.jpg", 33, 31); // Yes, deuterium and tritium are hydrogen.
        Images.energy   = Images.create("/img/interface/icon/energy1.png", 14, 21);
        
        Images.terrans  = Images.create("/img/terrans/interface/ships/sprite.png", 41, 25);
        Images.titans   = Images.create("/img/titans/interface/ships/sprite.png", 41, 25);
        Images.xen      = Images.create("/img/xen/interface/ships/sprite.png", 41, 25);
    }
    
/*! Copyright notice:
 *  The images below come from the "Silk icon set 1.3" by Mark James
 *  http://www.famfamfam.com/lab/icons/silk/
 *  licensed under a Creative Commons Attribution 2.5 License.
 *  http://creativecommons.org/licenses/by/2.5/
 */
    Images.scope=[]; // Images represent in order: user, server, global and built-in scope .
    Images.scope[0] = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8%2F9hAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJ3SURBVDjLpZNtSNNRFIcNKunF1rZWBMJqKaSiX9RP1dClsjldA42slW0q5oxZiuHrlqllLayoaJa2jbm1Lc3QUZpKFmmaTMsaRp%2BkMgjBheSmTL2%2F%2FkqMBJlFHx44XM7vOfdyuH4A%2FP6HFQ9zo7cpa%2FmM6RvCrVDzaVDy6C5JJKv6rwSnIhlFd0R0Up%2FGwF2KWyl01CTSkM%2FdQoQRzAurCjRCGnRUUE2FaoSL0HExiYVzsQwcj6RNrSqo4W5Gh6Yc4%2B1qDDTkIy%2BGhYK4nTgdz0H2PrrHUJzs71NQn86enPn%2BCVN9GnzruoYR63mMPbkC59gQzDl7pt7rc9f7FNyUhPY6Bx9gwt4E9zszhWWpdg6ZcS8j3O7zCTuEpnXB%2B3MNZkUUZu0NmHE8XsL91oSWwiiEc3MeseLrN6woYCWa%2FZl8ozyQ3w3Hl2lYy0SwlCUvsVi%2FGv2JwITnYPDun2Hy6jYuEzAF1jUBCVYpO6kXo%2BNuGMeBAgcgfwNkvgBOPgUqXgKvP7rBFvRhE1crp8Vq1noFYSlacVyqGk0D86gbART9BDk9BFnPCNJbCY5aCFL1Cyhtp0RWAp74MsKSrkq9guHyvfMTtmLc1togpZoyqYmyNoITzVTYRJCiXYBIQ3CwFqi83o3JDhX6C0M8XsGIMoQ4OyuRlq1DdZcLkmbgGDX1iIEKNxAcbgTEOqC4ZRaJ6Ub86K7CYFEo8Qo%2BGBQlQyXBczLZpbloaQ9k1NUz%2FkD2myBBKxRZpa5hVcQslalatoUxizxAVVrN3CW21bFj9F858Q9dnIRmDyeuybM71uxmH9BNBB1q6zybV7H9s1Ue4PM3%2Fgu%2FAEbfqfWy2twsAAAAAElFTkSuQmCC");
    Images.scope[1] = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8%2F9hAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKDSURBVDjLjdFNTNJxHAZw69CWHjp16O2AZB3S1ovOObaI8NBYuuZAhqjIQkzJoSIZBmSCpVuK%2FsE%2FWimU6N9SDM0R66IHbabie1hrg0MK3Zo5a8vwidgym8w8PKffvp89e35RAKJ2ipp7WDxvjltZ6jwCr5W2bpHHtqUnx%2B77877jsZxzlO3roAWXuw5ha1pl9MZdAW2ig8RyXyL8rnx8G6uH387AMnUMC2b6l10BJPdAfWDGhZVREuszT7D6hsTStBNDurO%2BXQEZnEypx1a28XW2F8HFPqwtOBAYJlCde9EeEZCy4sTN4ksrRA4LZB57vZCfMElUyH4E7Ap86r%2BLwIAGIy03cDr%2FlDNJGR%2FzDyBiHGc3i1ODjUIWtqbdIIexVY86kwZ3HijR%2F86GmqFqJGhPWs8oTkRvAgb%2BuZGHhVfRV3UNni41OhU8EDlstBSkwjKjhnmqAg3uUtS6y9Dzvg0ljmKkFCaRm4CJT%2B%2F5OERtG4yqZMEwdQt1biV0EyW4PVEE1dsiiMk8eMn0%2Fw9Wp%2BPCNK1CQ6iBYeommkIpH5Qhy5AF%2F6Mrf4G955tUJlXxtsHieeWQ2LJxvVuAAkoASUcmLugZPqW0qsprEQjDx3sY3ZIMhXt1%2BDNw77kdmnYKSsKKx%2BPfoTQtYX9KtzWG2Rod6aujaJwWHk8%2BuDawGITeA%2BSPA7nDQOYgwKcAYhQQajyIY9eQEYE5feLPyV4jFC8CELkAkWMDQmoDPGsQaWYgzRjEU8vL8GARAV8T099bUwqBdgzS14D4VaiBA8gZALJ%2Ft6j1Qqu4Hx4sIvChoyDFWZ1RmcyzORJLJsDSzoUyD5Z6FsxKN%2BiXn%2FmM5ZLwYJGAX0F%2FsgCQt3xBAAAAAElFTkSuQmCC");
    Images.scope[2] = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8%2F9hAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAMtSURBVDjLVZNLa1xlAIafc5szk8xkMkkm5MKY2EpT2qa2MTVCmoLS2gq6EKooimAW7iQb%2F0I2bgTRIog0oFW7KQpCS7VqrSmmJGlSQtswqWlLLmbGmcmcZM6cy%2Fedz00r6bt8eXh4N6%2BmlGJnxiZHR4APgSNAFjCBKjClInXm05Gzl3by2mPB2OSoCUwAp1%2FLHbcziSyO24gbgJAegg2urF8UUsifhZBvfvXK99v%2FC8YmRy3gt8G2%2FcMv517E8Wx8ApYcjZiyKbkRSgQkcFn3rzG9Nn1LhOLYt2%2F8UNUfLZkYaN0zfLRrkLIMCHUNIXTqIoZLjLJvU%2FASrFQtnko%2Bz2BH38HAD78DMConHh4FPn5nz6vGgqyxTp16JNj2kpR9C8eD%2FOoW1VoNO1NCS%2Bd5oW0vV27f2PX11MS8MTR6%2BJOTXUMHNCPBui5AtdMpk8xsGNQ9ndur20TxCnbPIn5TnmJUwaxIDrTm9Jn7d1tM4EiuqZs5d41iXGefsZsIwYNCgOfVSXconJbLLEWb4CuahU2%2B6HO8d4DQF%2F0m0NpgNvLAXaPgu6QadrEZpKhUItJZj%2FaMS1EewvHnsdUWW%2F%2BWKG82kEykCAPRbCqlNE1B4DsocpiW5OJfIVoiyfqSQFdNdGXrpLZGcFZDPKYJg2VQCiGEZkoRlZ3A6W41mknFn2WlaOKFFrG4Tbw9wb2%2FS3g3miHySLdbNDd2kzYKVGpVpIiqugjF7P3yQ55pyLFWmCSyVokZPqHnEoYmsWQGuyWOGdexNIkRFOnqbGN5bRngjh4G4rMLd6%2BKnmQW012lWrpOJuNjCh9LU9i6gRkEZHIrpNv%2FQK8vcijXz5lfLijgS%2BPmuYV75%2BfPDXr1Wt9znfsouy5x%2B2miuoltW1iawBJV0o0%2FwT8lBvbv5WZ%2BgaWNlasz43MfmQChH777e37uT78eHDx5%2BBiLBROjqhDaFmGkQ1KS6%2Bmlr7%2BXX2evc%2BnWVB54%2B4kznfr8pZQIxXkRyhPvDb9vIjtQqgFN12hLO2yUZ%2Fni8o8SuAa8NTM%2Bt%2FGE4HGGx4del0J%2BIGXUH8ko86iuAneAszPjc9%2Fs5P8DuO6ZcsXuRqAAAAAASUVORK5CYII%3D");
    Images.scope[3] = Images.create("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1%2BjfqAAAABGdBTUEAAK%2FINwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGSSURBVCjPVVFNSwJhEF78Ad79Cf6PvXQRsotUlzKICosuRYmR2RJR0KE6lBFFZVEbpFBSqKu2rum6llFS9HHI4iUhT153n6ZtIWMOM%2B%2FMM88z7wwH7s9Ub16SJcnbmrNcxVm2q7Z8%2FQPvEOtntpj92NkCqITLepEpjix7xQtiLOoQ2b6%2BE7YAN%2F5nfOEJ2WbKqOIOJ4bYVMEQx4LfBBQDsvFMhUcCVU1%2FCxVXmDBGA5ZETrhDCQVcYAPbyEJBhvrnBVPiSpNr6cYDNCQwo4zzU%2FySckkgDYuNuVpI42T9k4gLKGMPs%2FxPzzovQiY2hQYe0jlJfyNNhTqiWDYBq%2FwBMcSRpnyPzu1oS7WtxjVBSthU1vgVksiQ3Dn6Gp5ah2YOKQo5GiuHPA6xT1EKpxQNCNYejgIR457KKio0S56YckjSa9jo%2F%2F3mrj%2BBV0QQagqGTOo%2BY7gZIf1puP3WHoLhEb2PjTlCTCWGXtbp8DCX3hZuOdaIc9A%2BaQvWk4ihq95p67a7nP%2Bu%2BWs%2Br0dql9z%2Fzv0NCYhdCPKZ7oYAAAAASUVORK5CYII%3D");
};

Images.call('init', true);
$(function(){Images.call('run',true);});

