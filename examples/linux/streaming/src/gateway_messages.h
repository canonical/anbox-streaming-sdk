// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

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
