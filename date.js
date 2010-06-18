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

function tl_date(parent){
    this.date = new Date();
    this.parent = parent; // Used for debugging...
    this.date.setMilliseconds(0);

    this.set_time = function(time){
        // This takes time as [string, hours, minutes, seconds (optional), 'am' or 'pm' or '' (optional)].
        this.parent.info('Setting the time: '+time);
 
        // Can't understand why people use am/pm, it's so confusing..??
        if (time[time.length - 1] == 'am' || time[time.length - 1] == 'pm')
            if (time[1]==12) time[1]=0;
        if (time[time.length - 1] == 'pm') time[1] -= -12;
        
        this.date.setHours(time[1], time[2], (time[3] != undefined && time[3].match('\\d')) ? time[3] : 0);
 
        this.parent.info('time is: '+this.date);

        return this.date.getTime();
    }
 
    this.set_day = function(day){
        // day is [day, month, year (optional)]. Month is 1-12.
        this.parent.info('Setting the day: '+day);
 
        this.date.setFullYear(day[2] == undefined ? this.date.getFullYear() : '20'+day[2], day[1] - 1, day[0]);
 
        this.parent.info('time is: '+this.date);
 
        return this.date.getTime();
    }
 
    this.adjust_day = function(duration){
        // The idea with this is to compare a duration value with the current day/time, and adjust the day for every 24 hours in duration.
        // duration is of type [string, hours, ....].
        this.parent.debug('Adjusting the day by: '+duration);
 
        this.date.setDate(this.date.getDate() + Math.floor(duration[1]/24));
 
        // We also want to deal with am/pm here... :(
        if (Settings.time_format == 1 || Settings.time_format == 2){
            var d = new Date();
            var hours = (d.getHours() - (-duration[1]))%24;
            if (duration[2] != undefined) hours += Math.floor((d.getMinutes() - (-duration[2]))/60);
            this.parent.debug('Using 12-hour time; event is in pm');
            if (hours%24 >= 12 && this.date.getHours() < 12){
                this.date.setHours(this.date.getHours() - (-12));
            }
        }
 
        // Cover the wrap-around cases. If an event has a duration, then it must be in the future. Hence, if the time we've set for it
        // is in the past, we've done something wrong and it's probably a midnight error.
        // This check needs to be done carefully, or some events will get pushed 24 hours further into the future than they should be.
        if (this.date.getTime() < this.start_time-600000) this.date.setDate(this.date.getDate() + 1);

        this.parent.info('time is: '+this.date);
 
        return this.date.getTime();
    }

    this.set_seconds = function(duration,allow_jump){
        // This will change the time such that it approximates the completion time better. 
        // Note that this approximation is not consistent between pageloads.
        // duration is of type [string, hours, minutes, seconds].
        this.parent.info('Setting seconds with: '+duration);
 
        var date2=new Date();
        date2.setHours(date2.getHours()- -duration[1]);
        date2.setMinutes(date2.getMinutes()- -duration[2]);
        date2.setSeconds(date2.getSeconds()- -duration[3]);
        
        // Check whether the new value isn't screwed up somehow.
        if (allow_jump || Math.abs(date2.getTime()-this.date.getTime())<60000) {
            this.date=date2;
        }
  
        this.parent.debug('time is: '+this.date);
 
        return this.date.getTime();
    }
    
    this.get_time = function() {
        return this.date.getTime();
    }
}
