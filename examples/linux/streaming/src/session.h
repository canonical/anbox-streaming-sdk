// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_SESSION_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_SESSION_H_

#include "http_client.h"
#include "gateway_messages.h"

#include <memory>
#include <string>
#include <vector>

class Session {
 public:
  struct Settings {
    struct {
      std::string url;
      bool use_insecure_tls = false;
      std::string api_token;
      std::string region;
    } gateway;
    std::string app;
    struct {
      unsigned int width = 0;
      unsigned int height = 0;
      unsigned int fps = 0;
      unsigned int density = 0;
    } screen;
  };

  static std::shared_ptr<Session> create();

  ~Session();

  bool setup(const Settings& settings);
  bool release();

  std::string id() const;
  std::string url() const;
  std::string region() const;
  std::vector<StunServer> stun_servers() const;

 private:
  Session();
  std::string build_session_request(const Settings& settings);

  Settings settings_;
  std::shared_ptr<HttpClient> client_;
  std::string id_;
  std::string url_;
  std::string region_;
  std::vector<StunServer> stun_servers_;
};

#endif
