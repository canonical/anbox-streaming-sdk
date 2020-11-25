// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#include "http_client.h"

#include <iostream>

namespace {
constexpr unsigned int http_status_ok{200};
constexpr unsigned int http_status_bad_request{400};
} // namespace

using SoupSessionPtr = std::unique_ptr<SoupSession, void(*)(void*)>;
using SoupMessagePtr = std::unique_ptr<SoupMessage, void(*)(void*)>;

std::shared_ptr<HttpClient> HttpClient::create(const Options& options) {
  std::shared_ptr<HttpClient> client(new HttpClient);
  if (!client->initialize(options))
    return nullptr;

  return client;
}
HttpClient::HttpClient()
  : session_{nullptr, g_object_unref} {}

HttpClient::~HttpClient() {}

bool HttpClient::initialize(const Options& options) {
  SoupSessionPtr session(soup_session_new(), g_object_unref);
  if (!session)
    return false;

  if (options.insecure_tls)
    g_object_set(G_OBJECT(session.get()), SOUP_SESSION_SSL_STRICT, false, nullptr);

  session_ = std::move(session);
  options_ = options;

  return true;
}

bool HttpClient::send_post(const std::string& url, const std::string& content_type, const std::string& data, Response& r) {
  SoupMessagePtr msg(soup_message_new("POST", url.c_str()), g_object_unref);
  if (!msg)
    return false;

  if (!options_.headers.empty()) {
    for (const auto& hdr : options_.headers)
      soup_message_headers_append(msg->request_headers, hdr.first.c_str(), hdr.second.c_str());
  }

  soup_message_set_request(msg.get(), content_type.c_str(),
    SOUP_MEMORY_TEMPORARY, data.c_str(), data.size());

  const auto status = soup_session_send_message(session_.get(), msg.get());
  if (status < http_status_ok || status >= http_status_bad_request)
    return false;

  r.status = status;
  if (msg->response_body && msg->response_body->length > 0)
    r.data = std::string(msg->response_body->data, msg->response_body->length);

  return true;
}

bool HttpClient::send_delete(const std::string& url) {
  SoupMessagePtr msg(soup_message_new("DELETE", url.c_str()), g_object_unref);
  if (!msg)
    return false;

  if (!options_.headers.empty()) {
    for (const auto& hdr : options_.headers)
      soup_message_headers_append(msg->request_headers, hdr.first.c_str(), hdr.second.c_str());
  }

  const auto status = soup_session_send_message(session_.get(), msg.get());
  if (status < http_status_ok || status >= http_status_bad_request)
    return false;

  return true;
}