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

#include "json_helpers.h"
#include "gateway_messages.h"

#include "external/json/json.hpp"

namespace nlohmann {
void to_json(json& j, const ResponseMessage& msg) {
  j = json{
      { "type", msg.type },
      { "status", msg.status },
      { "status_code", msg.status_code },
  };
}

void from_json(const json& j, ResponseMessage& msg) {
  if (j.count("type") > 0)
    j.at("type").get_to(msg.type);
  if (j.count("status") > 0)
    j.at("status").get_to(msg.status);
  if (j.count("status_code") > 0)
    j.at("status_code").get_to(msg.status_code);
}

void to_json(json& j, const SessionResponseMessage& msg) {
  j["metadata"] = json{
      { "id", msg.id },
      { "url", msg.url },
  };
}

void from_json(const json& j, SessionResponseMessage& msg) {
  if (j.count("metadata") > 0) {
    const auto metadata = j.at("metadata");
    if (metadata.count("id") > 0)
      metadata.at("id").get_to(msg.id);
    if (metadata.count("url") > 0)
      metadata.at("url").get_to(msg.url);
    if (metadata.count("region") > 0)
      metadata.at("region").get_to(msg.region);
    if (metadata.count("stun_servers") > 0) {
      auto stun_servers = metadata.at("stun_servers");
      for (auto& stun_server : stun_servers) {
        StunServer s;
        if (StunServer::from_string(stun_server.dump(), s))
          msg.stun_servers.push_back(s);
      }
    }
  }
}

void to_json(json& j, const StunServer& server) {
  j = json{
      { "urls", server.urls },
      { "username", server.username },
      { "password", server.password },
  };
}

void from_json(const json& j, StunServer& stun_server) {
  if (j.count("urls") > 0) {
    auto urls = j.at("urls");
    for (const auto& u : urls) {
      std::string url;
      u.get_to(url);
      stun_server.urls.push_back(url);
    }
  }
  if (j.count("username") > 0)
    j.at("username").get_to(stun_server.username);
  if (j.count("password") > 0)
    j.at("password").get_to(stun_server.password);
}
} // namespace nlohman

bool ResponseMessage::from_string(const std::string& data, ResponseMessage& m) {
  return parse_message_from_string<ResponseMessage>(data, m);
}

bool SessionResponseMessage::from_string(const std::string& data, SessionResponseMessage& m) {
  return parse_message_from_string<SessionResponseMessage>(data, m);
}

bool StunServer::from_string(const std::string &data, StunServer& s) {
  return parse_message_from_string<StunServer>(data, s);
}
