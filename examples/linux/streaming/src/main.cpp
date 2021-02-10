// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#include <atomic>
#include <iostream>

#include <linux/input-event-codes.h>

#include "anbox-stream.h"
#include "gamepad_manager.h"

#include "session.h"

#include "args.hpp"

#include <chrono>
#include <mutex>
#include <thread>
#include <iomanip>
#include <condition_variable>

#include <glib.h>
#include <GLES2/gl2.h>
#include <SDL2/SDL.h>

#define AUDIO_FORMAT_UNKNOWN (0xFF)

#define EXIT_ON_FAILURE(op)                                    \
  do {                                                         \
    AnboxStatus err = (op);                                    \
    if (err != ANBOX_STATUS_OK) {                              \
      std::cerr << "Function: " << #op << " failed: " << err;  \
      return EXIT_FAILURE;                                     \
    }                                                          \
  } while (0)

namespace {
class AudioBufferQueue {
 public:
  AudioBufferQueue() = default;
  ~AudioBufferQueue() = default;

  void pop(uint8_t* data, size_t len) {
    constexpr const std::chrono::milliseconds max_wait_duration{100};
    std::unique_lock<std::mutex> l(mutex_);
    const auto ret = cond_.wait_for(l, max_wait_duration, [this, len](){
      return audio_buffer_.size() > len;
    });

    if (ret) {
      ::memcpy(reinterpret_cast<void*>(data), &audio_buffer_[0], len);
      audio_buffer_.erase(audio_buffer_.begin(), audio_buffer_.begin() + len);
    } else {
      // Silence audio output when timeout occurs
      ::memset(reinterpret_cast<void*>(data), 0, len);
    }
  }

  void append(const uint8_t* data, size_t len) {
    std::unique_lock<std::mutex> l(mutex_);
    audio_buffer_.insert(audio_buffer_.end(), data, data + len);
    cond_.notify_one();
  }
 private:
  std::vector<std::uint8_t> audio_buffer_;
  std::mutex mutex_;
  std::condition_variable cond_;
};

class GLibIntegrator {
 public:
  GLibIntegrator() {
    mainloop_ = g_main_loop_new(g_main_context_default(), false);
    worker_thread_ = std::thread([&]() {
      g_main_loop_run(mainloop_);
    });
  }

  ~GLibIntegrator() {
    g_main_loop_quit(mainloop_);
    if (worker_thread_.joinable())
      worker_thread_.join();
  }

 private:
  GMainLoop* mainloop_;
  std::thread worker_thread_;
};

struct Context {
  SDL_Thread* render_thread{nullptr};
  std::atomic_bool active{false};
  std::shared_ptr<SDL_Window> window;
  SDL_GLContext gl_context{nullptr};
  AnboxStream* stream{nullptr};
  AudioBufferQueue audio_buffer;
  std::chrono::steady_clock::time_point start_time;
  std::unique_ptr<GamepadManager> gamepad_manager_{nullptr};
  int audio_device_id;
};

int32_t run_render_thread(void* user_data) {
  auto ctx = reinterpret_cast<Context*>(user_data);

  SDL_GL_MakeCurrent(ctx->window.get(), ctx->gl_context);

  bool received_first_frame = false;

  while (ctx->active) {
    int width = 0, height = 0;
    SDL_GetWindowSize(ctx->window.get(), &width, &height);

    auto status = anbox_stream_set_viewport_size(ctx->stream, width, height);
    if (status != ANBOX_STATUS_OK)
      std::cerr << "Set viewport size failed" << std::endl;

    glViewport(0, 0, width, height);
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    status = anbox_stream_render_frame(ctx->stream, 100);
    if (status != ANBOX_STATUS_OK && status != ANBOX_STATUS_RENDER_FRAME_TIMEOUT)
      std::cerr << "Render frame failed" << std::endl;

    SDL_GL_SwapWindow(ctx->window.get());

    if (!received_first_frame) {
      auto now = std::chrono::steady_clock::now();
      std::cout << "It took "
                << std::chrono::duration_cast<std::chrono::seconds>(now - ctx->start_time).count() << "s "
                << "to receive the first frame"
                << std::endl;
      received_first_frame = true;
    }
  }

  return 0;
}

void audio_output_callback(void *user_data, Uint8 *stream, int len) {
  auto ctx = reinterpret_cast<Context*>(user_data);
  ctx->audio_buffer.pop(stream, len);
}

AnboxStreamControlKeycodeType convert_sdl_scancode(SDL_Scancode scancode) {
  // The values of the scan code match for a specific range with the values
  // of the Anbox Stream SDK
  if (scancode >= SDL_SCANCODE_A && scancode <= SDL_SCANCODE_UP)
    return static_cast<AnboxStreamControlKeycodeType>(scancode);

  // For the rest we have to do a manual conversion
  switch (scancode) {
  case SDL_SCANCODE_LCTRL:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTCTRL;
  case SDL_SCANCODE_LSHIFT:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTSHIFT;
  case SDL_SCANCODE_LALT:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTALT;
  case SDL_SCANCODE_LGUI:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTMETA;
  case SDL_SCANCODE_NUMLOCKCLEAR:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_NUMLOCK;
  case SDL_SCANCODE_VOLUMEDOWN:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_VOLUMEDOWN;
  case SDL_SCANCODE_VOLUMEUP:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_VOLUMEUP;
  case SDL_SCANCODE_POWER:
    return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_POWER;
  default:
    break;
  }
  return ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_UNKNOWN;
}

SDL_AudioFormat convert_anbox_audio_format(AnboxStreamAudioFormat audio_format) {
  switch(audio_format) {
  case ANBOX_STREAM_AUDIO_FORMAT_PCM_8_BIT:
    return AUDIO_S8;
  case ANBOX_STREAM_AUDIO_FORMAT_PCM_16_BIT:
    return AUDIO_S16;
  case ANBOX_STREAM_AUDIO_FORMAT_PCM_32_BIT:
    return AUDIO_S32;
  default:
    break;
  };

  // There is no unknown audio format for SDL_AudioFormat
  // so we use the custom defined AUDIO_FORMAT_UNKNOWN.
  return AUDIO_FORMAT_UNKNOWN;
}
} // namespace

int main(int argc, char** argv) {
  try {
    GLibIntegrator gi;

    args::ArgumentParser parser("Anbox Stream SDK Linux Example.", "");
    args::HelpFlag help(parser, "help", "Display this help menu", {'h', "help"});
    args::CompletionFlag completion(parser, {"complete"});

    args::ValueFlag<int> screen_width(parser, "screen width",
      "Screen width in pixels", {"screen-width"}, 1280);
    args::ValueFlag<int> screen_height(parser, "screen height",
      "Screen height in pixels", {"screen-height"}, 720);
    args::ValueFlag<int> screen_fps(parser, "screen fps",
      "Frames per second the application should run at",{"screen-fps"}, 60);
    args::ValueFlag<int> screen_density(parser, "screen density",
      "Screen density", {"screen-density"}, 180);
    args::Flag gw_insecure_tls(parser, "insecure tls",
      "Skip TLS certificate verification. Use for self-signed certificates", {"insecure-tls"});

    args::Group required(parser, "Required flags", args::Group::Validators::All);
    args::ValueFlag<std::string> application(required, "application",
      "Application to stream", {"application", "app", 'a'});
    args::ValueFlag<std::string> gw_url(required, "gateway url",
      "URL or IP of the Stream Gateway", {"url"});
    args::ValueFlag<std::string> gw_api_token(required, "gateway API token",
      "API token used to authenticate with the Stream Gateway", {"api-token"});

    try {
      parser.ParseCLI(argc, argv);
    } catch (const args::Completion & e) {
      std::cout << e.what() << std::endl;
      return EXIT_SUCCESS;
    } catch (const args::Help &) {
      std::cout << parser << std::endl;
      return EXIT_SUCCESS;
    } catch (const args::Error & e) {
      std::cerr << e.what() << std::endl;
      std::cerr << parser << std::endl;
      return EXIT_FAILURE;
    }

    auto session = Session::create();
    auto settings = Session::Settings{};
    settings.gateway.url = args::get(gw_url);
    settings.gateway.api_token = args::get(gw_api_token);
    settings.gateway.use_insecure_tls = args::get(gw_insecure_tls);
    settings.app = args::get(application);
    settings.screen.width = args::get(screen_width);
    settings.screen.height = args::get(screen_height);
    settings.screen.fps = args::get(screen_fps);
    settings.screen.density = args::get(screen_density);

    if (settings.gateway.url.empty()) {
      std::cerr << "No gateway URL specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.gateway.api_token.empty()) {
      std::cerr << "No gateway API token specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.app.empty()) {
      std::cerr << "No application specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.screen.width == 0) {
      std::cerr << "Invalid screen width specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.screen.height == 0) {
      std::cerr << "Invalid screen height specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.screen.fps == 0) {
      std::cerr << "Invalid screen FPS specified" << std::endl;
      return EXIT_FAILURE;
    }
    if (settings.screen.density == 0) {
      std::cerr << "Invalid screen density specified" << std::endl;
      return EXIT_FAILURE;
    }

    if (!session->setup(settings)) {
      std::cerr << "Failed to setup streaming session" << std::endl;
      return EXIT_FAILURE;
    }

    Context ctx;

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_JOYSTICK | SDL_INIT_GAMECONTROLLER) < 0) {
      std::cerr << "Failed to initialize SDL: " << SDL_GetError() << std::endl;
      return EXIT_FAILURE;
    }

    ctx.window = std::shared_ptr<SDL_Window>(
      SDL_CreateWindow(
      "Anbox Stream SDK - SDL Example",
      SDL_WINDOWPOS_CENTERED,
      SDL_WINDOWPOS_CENTERED,
      settings.screen.width,
      settings.screen.height,
      SDL_WINDOW_OPENGL | SDL_WINDOW_ALLOW_HIGHDPI | SDL_WINDOW_RESIZABLE), SDL_DestroyWindow);
    if (!ctx.window) {
      std::cerr << "Failed to create SDL window: " << SDL_GetError() << std::endl;
      return EXIT_FAILURE;
    }

    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);

    ctx.gl_context = SDL_GL_CreateContext(ctx.window.get());
    if (!ctx.gl_context) {
      std::cerr << "Failed to create GL context: " << SDL_GetError() << std::endl;
      return EXIT_FAILURE;
    }

    SDL_GL_MakeCurrent(ctx.window.get(), nullptr);

    AnboxStreamAudioSpec audio_output_spec_{ANBOX_STREAM_AUDIO_FORMAT_PCM_16_BIT, 48000, 2};

    const auto audio_format = convert_anbox_audio_format(audio_output_spec_.format);
    if (audio_format == AUDIO_FORMAT_UNKNOWN) {
      std::cerr << "Unknow audio format" << std::endl;
      return EXIT_FAILURE;
    }

    SDL_AudioSpec spec;
    SDL_memset(&spec, 0, sizeof(spec));
    spec.freq = audio_output_spec_.freq;
    spec.format = audio_format;
    spec.channels = audio_output_spec_.channels;
    spec.callback = &audio_output_callback;
    spec.userdata = &ctx;
    spec.samples = spec.freq * 10 / 1000;
    ctx.audio_device_id = SDL_OpenAudioDevice(nullptr, SDL_FALSE, &spec, nullptr, 0);
    if (!ctx.audio_device_id) {
      std::cerr << "Failed to open audio device: " << SDL_GetError() << std::endl;
      return EXIT_FAILURE;
    }
    // Don't do audio playback until the connection is established
    SDL_PauseAudioDevice(ctx.audio_device_id, 1);

    ctx.gamepad_manager_ = std::make_unique<GamepadManager>();

    // To receive log messages from the SDK we can register a callback function
    // which will take log messages from all stream objects
    anbox_set_log_callback([](AnboxLogLevel level, const char* msg, void* user_data) {
      (void) user_data;
      char level_str = '?';
      switch (level) {
      case ANBOX_LOG_LEVEL_DEBUG:
        level_str = 'D';
        break;
      case ANBOX_LOG_LEVEL_ERROR:
        level_str = 'E';
        break;
      case ANBOX_LOG_LEVEL_INFO:
        level_str = 'I';
        break;
      case ANBOX_LOG_LEVEL_WARNING:
        level_str = 'W';
        break;
      default:
        break;
      }
      time_t now = time(nullptr) ;
      std::cout << "[" << level_str << " "
                << std::put_time(localtime(&now), "%T") << "] "
                << msg << std::endl;
    }, nullptr);

    std::unique_ptr<AnboxStreamConfig, void(*)(AnboxStreamConfig*)> cfg(
      anbox_stream_config_new(),
      [](AnboxStreamConfig* cfg) { anbox_stream_config_release(cfg); });

    // The SDK does handle the signaling process for us. All we have to do is
    // to tell it the URL of the signaling endpoint
    EXIT_ON_FAILURE(anbox_stream_config_set_signaling_url(cfg.get(), session->url().c_str()));
    EXIT_ON_FAILURE(anbox_stream_config_set_use_insecure_tls(cfg.get(), settings.gateway.use_insecure_tls));

    // We may have received STUN/TURN servers when creating the session and
    // have to tell the stream to use them
    for (const auto& server : session->stun_servers()) {
      std::vector<const char*> urls;
      for (const auto& url : server.urls)
        urls.push_back(url.c_str());

      EXIT_ON_FAILURE(anbox_stream_config_add_stun_server(
        cfg.get(), urls.data(), urls.size(),
        server.username.c_str(), server.password.c_str()));
    }

    // Set audio output spec
    EXIT_ON_FAILURE(anbox_stream_config_set_audio_spec(
        cfg.get(), ANBOX_STREAM_AUDIO_STREAM_TYPE_OUTPUT, audio_output_spec_));

    // After all configuration is done we can finally create the actual stream
    ctx.stream = anbox_stream_new(cfg.get());

    ctx.active = true;
    ctx.start_time = std::chrono::steady_clock::now();

    // Once we're connected we can start our rendering thread and wait for
    // any video frames to comes
    EXIT_ON_FAILURE(anbox_stream_set_connected_callback(ctx.stream, [](void* user_data) {
      auto ctx = reinterpret_cast<Context*>(user_data);

      if (ctx->render_thread)
        return;

      auto now = std::chrono::steady_clock::now();
      std::cout << "Connection is established after "
                << std::chrono::duration_cast<std::chrono::seconds>(now - ctx->start_time).count() << "s"
                << std::endl;

      ctx->render_thread = SDL_CreateThread(
        run_render_thread, "RenderThread", ctx);

      // Start audio playback
      SDL_PauseAudioDevice(ctx->audio_device_id, 0);
    }, &ctx));

    EXIT_ON_FAILURE(anbox_stream_set_disconnected_callback(ctx.stream, [](void* user_data) {
      std::cout << "Stream got disconnected, shutting down ..." << std::endl;
      kill(getpid(), SIGTERM);
    }, nullptr));

    EXIT_ON_FAILURE(anbox_stream_set_error_callback(ctx.stream, [](AnboxStatus status, void* user_data) {
      std::cerr << "Got error from stream (status " << status << ")" << std::endl;
      // When signaling timeout occurs, abort the client to avoid screen freeze for a long time
      if (status == ANBOX_STATUS_SIGNALING_TIMEOUT || status == ANBOX_STATUS_SIGNALING_FAILED)
        kill(getpid(), SIGTERM);
    }, nullptr));

    EXIT_ON_FAILURE(anbox_stream_set_audio_data_ready_callback(ctx.stream, [](
        const uint8_t* audio_data, size_t data_size, void *user_data){
      auto ctx = reinterpret_cast<Context*>(user_data);
      ctx->audio_buffer.append(audio_data, data_size);
    }, &ctx));

    EXIT_ON_FAILURE(anbox_stream_set_message_received_callback(ctx.stream, [](
        const char* type, size_t type_size,
        const char* data, size_t data_size, void *user_data){
      std::cout << "Received message from container of type '"<< std::string(type, type_size) << "'" << std::endl;
    }, nullptr));

    EXIT_ON_FAILURE(anbox_stream_connect(ctx.stream));

    bool running = true;
    while (running) {
      SDL_Event event;
      if (!SDL_PollEvent(&event)) {
        SDL_Delay(1);
        continue;
      }

      AnboxStreamControlMessage msg;
      memset(&msg, 0, sizeof(msg));

      switch (event.type) {
      case SDL_QUIT:
        std::cout << "Exiting ..." << std::endl;
        running = false;
        break;
      case SDL_MOUSEMOTION: {
        msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_MOVE;
        msg.mouse_move.x = event.motion.x;
        msg.mouse_move.y = event.motion.y;
        msg.mouse_move.rx = event.motion.xrel;
        msg.mouse_move.ry = event.motion.yrel;
        break;
      }
      case SDL_MOUSEBUTTONUP:
      case SDL_MOUSEBUTTONDOWN: {
        msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_BUTTON;
        switch (event.button.button) {
        case SDL_BUTTON_LEFT:
          msg.mouse_button.button = ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_LEFT;
          break;
        case SDL_BUTTON_MIDDLE:
          msg.mouse_button.button = ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_MIDDLE;
          break;
        case SDL_BUTTON_RIGHT:
          msg.mouse_button.button = ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_RIGHT;
          break;
        default:
          continue;
        }
        msg.mouse_button.pressed = (event.button.state == SDL_PRESSED);
        break;
      }
      case SDL_KEYUP:
        /* fallthrough */
      case SDL_KEYDOWN:
        msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_KEYBOARD;
        msg.keyboard.code = convert_sdl_scancode(event.key.keysym.scancode);
        msg.keyboard.pressed = (event.key.state == SDL_PRESSED);
        break;
      case SDL_CONTROLLERDEVICEADDED: {
        ctx.gamepad_manager_->add_controller(event.cdevice.which);
        continue;
      }
      case SDL_CONTROLLERDEVICEREMOVED: {
        ctx.gamepad_manager_->remove_controller(event.cdevice.which);
        continue;
      }
      case SDL_CONTROLLERAXISMOTION: {
        uint16_t code = ABS_RESERVED;
        switch (event.caxis.axis) {
        case SDL_CONTROLLER_AXIS_LEFTX:
          code = ABS_X;
          break;
        case SDL_CONTROLLER_AXIS_LEFTY:
          code = ABS_Y;
          break;
        case SDL_CONTROLLER_AXIS_RIGHTX:
          code = ABS_RX;
          break;
        case SDL_CONTROLLER_AXIS_RIGHTY:
          code = ABS_Z;
          break;
        case SDL_CONTROLLER_AXIS_TRIGGERLEFT:
          code = ABS_RY;
          break;
        case SDL_CONTROLLER_AXIS_TRIGGERRIGHT:
          code = ABS_RZ;
          break;
        default:
          break;
        }
        if (code == ABS_RESERVED)
          continue;

        msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_GAMEPAD_AXIS;
        msg.gamepad_axis.id = event.caxis.which;
        msg.gamepad_axis.code = static_cast<AnboxStreamControlGamepadAxisType>(code);
        msg.gamepad_axis.value = event.caxis.value;
        break;
      }
      case SDL_CONTROLLERBUTTONDOWN:
      case SDL_CONTROLLERBUTTONUP: {
        uint16_t code = 0;
        switch (event.cbutton.button) {
        case SDL_CONTROLLER_BUTTON_A:
          code = BTN_A;
          break;
        case SDL_CONTROLLER_BUTTON_B:
          code = BTN_B;
          break;
        case SDL_CONTROLLER_BUTTON_X:
          code = BTN_X;
          break;
        case SDL_CONTROLLER_BUTTON_Y:
          code = BTN_Y;
          break;
        case SDL_CONTROLLER_BUTTON_START:
          code = BTN_START;
          break;
        case SDL_CONTROLLER_BUTTON_GUIDE:
          code = BTN_SELECT;
          break;
        case SDL_CONTROLLER_BUTTON_BACK:
          code = BTN_BACK;
          break;
        case SDL_CONTROLLER_BUTTON_DPAD_UP:
          code = KEY_UP;
          break;
        case SDL_CONTROLLER_BUTTON_DPAD_DOWN:
          code = KEY_DOWN;
          break;
        case SDL_CONTROLLER_BUTTON_DPAD_LEFT:
          code = KEY_LEFT;
          break;
        case SDL_CONTROLLER_BUTTON_DPAD_RIGHT:
          code = KEY_RIGHT;
          break;
        case SDL_CONTROLLER_BUTTON_LEFTSHOULDER:
          code = BTN_TL;
          break;
        case SDL_CONTROLLER_BUTTON_RIGHTSHOULDER:
          code = BTN_TR;
          break;
        default:
          break;
        }
        if (code == 0)
          continue;

        msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_GAMEPAD_BUTTON;
        msg.gamepad_button.id = event.caxis.which;
        msg.gamepad_button.code = static_cast<AnboxStreamControlGamepadButtonType>(code);
        msg.gamepad_button.pressed = (event.cbutton.state == SDL_PRESSED);
        break;
      }
      default:
        break;
      }

      if (msg.type != ANBOX_STREAM_CONTROL_MESSAGE_TYPE_UNKNOWN) {
        const auto status = anbox_stream_send_message(ctx.stream, &msg);
        if (status != ANBOX_STATUS_OK && status != ANBOX_STATUS_NOT_READY)
          std::cerr << "Failed to send control message" << std::endl;
      }
    }

    ctx.active = false;

    if (ctx.render_thread != nullptr)
      SDL_WaitThread(ctx.render_thread, nullptr);

    EXIT_ON_FAILURE(anbox_stream_release(ctx.stream));

    if (!session->release())
      std::cerr << "Failed to release session" << std::endl;

    SDL_CloseAudioDevice(ctx.audio_device_id);
    SDL_Quit();
  } catch (std::exception) {
    return EXIT_FAILURE;
  }

  return 0;
}
