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
