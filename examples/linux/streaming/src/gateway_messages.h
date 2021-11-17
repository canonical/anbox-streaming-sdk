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

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_GATEWAY_MESSAGES_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_GATEWAY_MESSAGES_H_

#include <string>
#include <vector>

struct ResponseMessage {
  static bool from_string(const std::string& data, ResponseMessage& m);
  std::string type;
  std::string status;
  unsigned int status_code = 0;
};

struct StunServer {
  static bool from_string(const std::string& data, StunServer& m);
  std::vector<std::string> urls;
  std::string username;
  std::string password;
};

struct SessionResponseMessage {
  static bool from_string(const std::string& data, SessionResponseMessage& m);
  std::string id;
  std::string url;
  std::string region;
  std::vector<StunServer> stun_servers;
};

#endif
