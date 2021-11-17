/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2021 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "session.h"
#include "string_utils.h"

#include "external/json/json.hpp"

#include <iostream>

using namespace nlohmann;

std::shared_ptr<Session> Session::create() {
  std::shared_ptr<Session> session(new Session);
  return session;
}

Session::Session() {}

Session::~Session() {
  (void) release();
}

std::string Session::build_session_request(const Settings& settings) {
  json screen_settings;
  screen_settings["width"] = settings.screen.width;
  screen_settings["height"] = settings.screen.height;
  screen_settings["fps"] = settings.screen.fps;
  screen_settings["density"] = settings.screen.density;

  json request;
  request["app"] = settings.app;
  request["screen"] = screen_settings;
  request["region"] = settings.gateway.region;

  return request.dump();
}

bool Session::setup(const Settings& settings) {
  if (!id_.empty())
    return false;

  HttpClient::Options opts;
  opts.insecure_tls = settings.gateway.use_insecure_tls;
  const auto auth_header_value = string_format("Macaroon root=%s", settings.gateway.api_token.c_str());
  opts.headers.insert({"Authorization", auth_header_value});

  client_ = HttpClient::create(opts);
  if (!client_)
    return false;

  const auto request_data = build_session_request(settings);

  HttpClient::Response resp;
  auto r = client_->send_post(
    string_format("%s/1.0/sessions/", settings.gateway.url.c_str()),
    "application/json",
    request_data,
    resp);
  if (!r)
    return false;

  // We don't have to parse the response data anymore as we
  // already checked the HTTP status code
  SessionResponseMessage session;
  if (!SessionResponseMessage::from_string(resp.data, session))
    return false;

  if (session.id.empty() || session.url.empty())
    return false;

  id_ = session.id;
  url_ = session.url;
  region_ = session.region;
  for (const auto& server : session.stun_servers) {
    StunServer s;
    s.urls = server.urls;
    s.username = server.username;
    s.password = server.password;
    stun_servers_.push_back(s);
  }

  settings_ = settings;

  return true;
}

bool Session::release() {
  if (id_.empty())
    return true;

  if (!client_ || url_.empty())
    return false;

  auto url = string_format("%s/1.0/sessions/%s/", settings_.gateway.url.c_str(), id_.c_str());
  if (!client_->send_delete(url))
    return false;

  id_.clear();
  url_.clear();
  region_.clear();
  stun_servers_.clear();

  return true;
}

std::string Session::id() const {
  return id_;
}

std::string Session::url() const {
  return url_;
}

std::string Session::region() const {
  return region_;
}

std::vector<StunServer> Session::stun_servers() const {
  return stun_servers_;
}
