#!/usr/bin/python

"""Growl Network Transport Protocol -> DBUS Glue"""
__author__ = "Rui Carmo (http://the.taoofmac.com), Bauke Conijn"
__copyright__ = "(C) 2006 Rui Carmo, 2010 Bauke Conijn. Code under BSD License."

# Originally developed by Rui Carmo,
# Modified by Bauke Conijn

import dbus
import struct
from SocketServer import *
import urllib
import tempfile

GROWL_GNTP_PORT = 23053

bus = dbus.SessionBus()
bus.get_object("org.freedesktop.DBus","/org/freedesktop/DBus")
notify_service = bus.get_object('org.freedesktop.Notifications', '/org/freedesktop/Notifications')
interface = dbus.Interface(notify_service, 'org.freedesktop.Notifications')

class GrowlListener(TCPServer):
    """Growl Notification Listener"""
    allow_reuse_address = True

    def __init__(self):
        TCPServer.__init__(self,('localhost', GROWL_GNTP_PORT),RequestHandler)
        pass

appbucket={}

class RequestHandler(BaseRequestHandler):
    def handle(self):
        # self.request is the TCP socket connected to the client
        (length,) = struct.unpack("!i",self.request.recv(4))
        data = self.request.recv(length).split("\r\n")

        # determine the action REGISTER/NOTIFY
        prop = {"action": data[0].split(" ")[1],
                "notifications": {}}
        for i in xrange(1,len(data)):
            if len(data[i]) == 0: continue
            v = data[i].split(":", 1)
            key = v[0].strip().lower()
            value = v[1].strip()
            if key=="application-name":
                prop["application"]=value
            elif key=="application-icon":
                prop["icon"]=value
            elif key=="notifications-count":
                prop["count"]=value
            elif key=="notification-name":
                prop["id"] = value
                prop["notifications"][prop["id"]] = {"id": value}
            elif key=="notification-display-name":
                prop["notifications"][prop["id"]]["name"] = value
            elif key=="notification-enabled":
                prop["notifications"][prop["id"]]["enabled"] = value.lower()=="true"
            elif key=="notification-title":
                prop["title"] = value
            elif key=="notification-text":
                prop["text"] = value
            else:
                print "Unknown key-value pair: '%s'" % data[i]
                
        # Do appropriate action
        if prop["action"] == "REGISTER":
            print prop
            if prop["icon"].startswith("http://"):
                if not prop["application"] in appbucket or appbucket[prop["application"]]["icon"] != prop["icon"]:
                    prop["iconfile"]=tempfile.mktemp(prefix='gntp_')
                    urllib.urlretrieve(prop["icon"], prop["iconfile"])
                    print "Downloaded image %s" % prop["icon"]
                else:
                    prop["iconfile"] = appbucket[prop["application"]]["iconfile"]
            else:
                prop["iconfile"] = prop["icon"].replace("\\","/")
                    
            appbucket[prop["application"]]=prop
            print "Registered %s" % prop["application"]
            pass
        elif prop["action"] == "NOTIFY":
            appprof=appbucket[prop["application"]]
            interface.Notify(prop["application"],0,appprof["iconfile"],prop["title"],prop["text"],[],{},-1)
            pass
        else:
            print "Unknown action: %s" % prop["action"]
            
        # just send nothing back
        self.request.send('')

if __name__ == "__main__":
    # Start server
    r = GrowlListener() 
    try:
        r.serve_forever()
    except KeyboardInterrupt:
        r.server_close()
