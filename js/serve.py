#!/usr/bin/env python3
# encoding: utf-8
#
# Anbox Stream SDK
# Copyright 2020 Canonical Ltd.  All rights reserved.
#

from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super(CORSRequestHandler, self).end_headers()

httpd = HTTPServer(('', 8000), CORSRequestHandler)
httpd.serve_forever()