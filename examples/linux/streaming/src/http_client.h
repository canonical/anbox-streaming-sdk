// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_HTTP_CLIENT_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_HTTP_CLIENT_H_

#include <memory>
#include <unordered_map>
#include <string>

#include <libsoup/soup.h>

class HttpClient {
 public:
  using Headers = std::unordered_map<std::string, std::string>;

  struct Options {
    Headers headers;
    bool insecure_tls = false;
  };

  struct Response {
    uint32_t status = 0;
    std::string data;
  };

  static std::shared_ptr<HttpClient> create(const Options& options);

  ~HttpClient();

  bool send_post(const std::string& url, const std::string& content_type, const std::string& data, Response& r);
  bool send_delete(const std::string& url);

 private:
  HttpClient();
  bool initialize(const Options& options);

  Options options_;
  std::unique_ptr<SoupSession, void(*)(void*)> session_;
};

#endif