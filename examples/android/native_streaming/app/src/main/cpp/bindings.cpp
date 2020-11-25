// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#include "jni_helpers.h"

#include "anbox-stream.h"

#include <memory>
#include <string>
#include <thread>
#include <vector>

#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>

#include <jni.h>

#include <EGL/egl.h>
#include <GLES/gl.h>

#include <SLES/OpenSLES_Android.h>

#define RETURN_ON_ERROR(op, ...)                          \
  do {                                                    \
    SLresult err = (op);                                  \
    if (err != SL_RESULT_SUCCESS) {                       \
      __android_log_print(ANDROID_LOG_ERROR, "AnboxStream", "%s failed: %d", #op, err);     \
      return __VA_ARGS__;                                 \
    }                                                     \
  } while (0)

namespace {
class AudioBufferQueue {
  public:
   AudioBufferQueue() = default;
   ~AudioBufferQueue() = default;

   void pop(uint8_t *data, size_t len) {
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

   void append(const uint8_t *data, size_t len) {
     std::unique_lock<std::mutex> l(mutex_);
     audio_buffer_.insert(audio_buffer_.end(), data, data + len);
     cond_.notify_one();
   }

  private:
   std::vector<std::uint8_t> audio_buffer_;
   std::mutex mutex_;
   std::condition_variable cond_;
};

class AudioPlayer {
  public:
   static constexpr const SLuint32 NumOfOpenSLESBuffers = 1;

   AudioPlayer() = default;
   ~AudioPlayer() {
     terminate();
   }

   bool initialize(AnboxStreamAudioSpec spec) {
     if (!create_pcm_format(spec)) {
       __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Invalid audio specification");
       return false;
     }

     if (!create_engine()) {
       __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to create SL engine");
       return false;
     }

     if (!create_output_mix()) {
       __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to create SL output mix");
       return false;
     }

     if (!create_player()) {
       __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to create SL player");
       return false;
     }

     return true;
   }

   bool start_playout() {
     RETURN_ON_ERROR((*player_)->SetPlayState(player_, SL_PLAYSTATE_PLAYING), false);

     // After setting the player state to SL_PLAYSTATE_PLAYING, we need to active
     // callback immediately to feed the very first audio chunk manually.
     consume_audio_buffer();
     return true;
   }

   void terminate() {
     if (player_ != nullptr) {
       (*player_)->SetPlayState(player_, SL_PLAYSTATE_STOPPED);
       player_ = nullptr;
       player_object_ = nullptr;
     }

     if (simple_buffer_queue_ != nullptr) {
       (*simple_buffer_queue_)->Clear(simple_buffer_queue_);
       simple_buffer_queue_ = nullptr;
     }

     volume_ = nullptr;
     engine_object_ = nullptr;
     engine_ = nullptr;
     output_mix_object_ = nullptr;
   }

   void add_audio_buffer(const uint8_t* audio_data, size_t len) {
     audio_buffer_queue_.append(audio_data, len);
   }

   void consume_audio_buffer() {
     const auto audio_chunk_size = enqueue_audio_chunk_.size();
     ::memset(&enqueue_audio_chunk_[0], 0, audio_chunk_size);
     audio_buffer_queue_.pop(&enqueue_audio_chunk_[0], audio_chunk_size);

     // Enqueue pcm audio data for playback.
     auto ret = (*simple_buffer_queue_)->Enqueue(simple_buffer_queue_,
       &enqueue_audio_chunk_[0], audio_chunk_size);
     if (ret != SL_RESULT_SUCCESS)
       __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to enqueue audio buffer");
   }

  private:
   bool create_engine() {
     if (engine_object_ != nullptr)
       return true;

     // Create SL engine
     const SLEngineOption option[] = {{SL_ENGINEOPTION_THREADSAFE, static_cast<SLuint32>(SL_BOOLEAN_TRUE)}};
     RETURN_ON_ERROR(slCreateEngine(&engine_object_, 1, option, 0, NULL, NULL), false);
     RETURN_ON_ERROR((*engine_object_)->Realize(engine_object_, SL_BOOLEAN_FALSE), false);
     RETURN_ON_ERROR((*engine_object_)->GetInterface(engine_object_, SL_IID_ENGINE, &engine_), false);

     return true;
   }

   bool create_output_mix() {
     if (output_mix_object_ != nullptr)
       return true;

     RETURN_ON_ERROR((*engine_)->CreateOutputMix(engine_, &output_mix_object_, 0, nullptr, nullptr), false);
     RETURN_ON_ERROR((*output_mix_object_)->Realize(output_mix_object_, SL_BOOLEAN_FALSE), false);

     return true;
   }

   bool create_player() {
     if (player_object_ != nullptr)
       return true;

     SLDataLocator_AndroidSimpleBufferQueue simple_buffer_queue = {
       SL_DATALOCATOR_ANDROIDSIMPLEBUFFERQUEUE, NumOfOpenSLESBuffers};
     SLDataSource audio_source = {&simple_buffer_queue, &pcm_format_};

     SLDataLocator_OutputMix locator_output_mix = {SL_DATALOCATOR_OUTPUTMIX,
                                                   output_mix_object_};
     SLDataSink audio_sink = {&locator_output_mix, nullptr};

     const SLInterfaceID interface_ids[] = {SL_IID_ANDROIDCONFIGURATION,
                                            SL_IID_BUFFERQUEUE, SL_IID_VOLUME};
     const SLboolean interface_required[] = {SL_BOOLEAN_TRUE, SL_BOOLEAN_TRUE,
                                             SL_BOOLEAN_TRUE};

     // Create the SL audio player
     RETURN_ON_ERROR((*engine_)->CreateAudioPlayer(
       engine_, &player_object_, &audio_source, &audio_sink,
       sizeof(interface_ids)/sizeof(SLInterfaceID), interface_ids, interface_required), false);

     SLAndroidConfigurationItf player_config;
     RETURN_ON_ERROR((*player_object_)->GetInterface(
       player_object_, SL_IID_ANDROIDCONFIGURATION, &player_config), false);

     // SL_ANDROID_STREAM_MEDIA is used here over SL_ANDROID_STREAM_VOICE
     // for a better audio output with a bigger volume.
     SLint32 stream_type = SL_ANDROID_STREAM_MEDIA;
     RETURN_ON_ERROR((*player_config)->SetConfiguration(
       player_config, SL_ANDROID_KEY_STREAM_TYPE, &stream_type, sizeof(SLint32)), false);

     RETURN_ON_ERROR((*player_object_)->Realize(player_object_, SL_BOOLEAN_FALSE), false);
     RETURN_ON_ERROR((*player_object_)->GetInterface(player_object_, SL_IID_PLAY, &player_), false);

     RETURN_ON_ERROR((*player_object_)->GetInterface(
       player_object_, SL_IID_BUFFERQUEUE, &simple_buffer_queue_), false);

     // Register callback fun for pcm data playback.
     RETURN_ON_ERROR((*simple_buffer_queue_)->RegisterCallback(
       simple_buffer_queue_, audio_playback_callback, this), false);

     RETURN_ON_ERROR((*player_object_)->GetInterface(
       player_object_, SL_IID_VOLUME, &volume_), false);

     // Allocate audio chunk buffer
     // Use 10ms audio frame here to align 16-bit linear PCM audio data in
     // frames of 10 ms processed by APM in WebRTC.
     // NOTE: the unit of sample rate is in milliHertz and not Hertz.
     auto sampleRateInHz = pcm_format_.samplesPerSec / 1000;
     auto len = sampleRateInHz * 10 / 1000 * pcm_format_.numChannels * pcm_format_.bitsPerSample / 8;
     enqueue_audio_chunk_ = std::vector<uint8_t>(len);

     return true;
   }

   bool create_pcm_format(AnboxStreamAudioSpec spec) {
     switch (spec.freq) {
       case 8000:
         pcm_format_.samplesPerSec = SL_SAMPLINGRATE_8;
         break;
       case 16000:
         pcm_format_.samplesPerSec = SL_SAMPLINGRATE_16;
         break;
       case 44100:
         pcm_format_.samplesPerSec = SL_SAMPLINGRATE_44_1;
         break;
       case 48000:
         pcm_format_.samplesPerSec = SL_SAMPLINGRATE_48;
         break;
       default:
         return false;
     }

     switch (spec.format) {
       case ANBOX_STREAM_AUDIO_FORMAT_PCM_8_BIT:
         pcm_format_.bitsPerSample = SL_PCMSAMPLEFORMAT_FIXED_8;
         break;
       case ANBOX_STREAM_AUDIO_FORMAT_PCM_16_BIT:
         pcm_format_.bitsPerSample = SL_PCMSAMPLEFORMAT_FIXED_16;
         break;
       case ANBOX_STREAM_AUDIO_FORMAT_PCM_32_BIT:
         pcm_format_.bitsPerSample = SL_PCMSAMPLEFORMAT_FIXED_32;
         break;
       default:
         return false;
     }

     pcm_format_.containerSize = pcm_format_.bitsPerSample;
     pcm_format_.formatType = SL_DATAFORMAT_PCM;
     pcm_format_.endianness = SL_BYTEORDER_LITTLEENDIAN;
     pcm_format_.numChannels = static_cast<SLuint32>(spec.channels);
     switch (pcm_format_.numChannels) {
       case 1:
         pcm_format_.channelMask = SL_SPEAKER_FRONT_CENTER;
         break;
       case 2:
         pcm_format_.channelMask = SL_SPEAKER_FRONT_LEFT | SL_SPEAKER_FRONT_RIGHT;
         break;
       default :
         return false;
     }
     return true;
   }

   static void audio_playback_callback(SLAndroidSimpleBufferQueueItf bf, void *context) {
     auto *audio_player = reinterpret_cast<AudioPlayer*>(context);
     audio_player->consume_audio_buffer();
   }

   SLDataFormat_PCM pcm_format_;
   SLAndroidSimpleBufferQueueItf simple_buffer_queue_;
   SLEngineItf engine_{nullptr};
   SLPlayItf   player_{nullptr};
   SLVolumeItf volume_{nullptr};
   SLObjectItf engine_object_{nullptr};
   SLObjectItf output_mix_object_{nullptr};
   SLObjectItf player_object_{nullptr};

   AudioBufferQueue audio_buffer_queue_;
   std::vector<uint8_t> enqueue_audio_chunk_;
};

struct Context {
  Context() :
    cfg(nullptr, reinterpret_cast<void (*)(AnboxStreamConfig *)>(anbox_stream_config_release)),
    stream(nullptr, reinterpret_cast<void (*)(AnboxStream *)>(anbox_stream_release)) {}

  JavaVM* vm = nullptr;
  jobject bindings_obj = nullptr;
  std::unique_ptr<AnboxStreamConfig, void (*)(AnboxStreamConfig *)> cfg;
  std::unique_ptr<AnboxStream, void (*)(AnboxStream *)> stream;
  ANativeWindow* window = nullptr;
  std::thread render_thread;
  std::atomic_bool running{false};
  AudioPlayer audio_player;
};

struct StunServer {
  std::vector<std::string> urls;
  std::string username;
  std::string password;

  static bool createListFromObject(JNIEnv* env, jobjectArray obj, std::vector<StunServer>& stun_servers) {
    for (int n = 0; n < env->GetArrayLength(obj); n++) {
      StunServer server;
      jobject server_obj = env->GetObjectArrayElement(obj, n);
      if (!jni_get_string_vector(env, server_obj, "urls", server.urls))
        return false;
      if (!jni_get_string(env, server_obj, "username", server.username))
        return false;
      if (!jni_get_string(env, server_obj, "password", server.password))
        return false;
      stun_servers.push_back(server);
    }

    return true;
  }
};

Context *get_context(JNIEnv* env, jobject instance) {
  return reinterpret_cast<Context*>(jni_get_pointer(env, instance, "context"));
}

void run_render_thread(Context* ctx) {
  auto display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
  if (display == EGL_NO_DISPLAY)
    return;

  eglInitialize(display, nullptr, nullptr);

  EGLConfig config;
  EGLint num_configs;
  const EGLint config_attribs[] = {
    EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
    EGL_BLUE_SIZE, 8,
    EGL_GREEN_SIZE, 8,
    EGL_RED_SIZE, 8,
    EGL_NONE
  };
  eglChooseConfig(display, config_attribs, &config, 1, &num_configs);

  EGLint format;
  eglGetConfigAttrib(display, config, EGL_NATIVE_VISUAL_ID, &format);
  ANativeWindow_setBuffersGeometry(ctx->window, 0, 0, format);

  auto surface = eglCreateWindowSurface(display, config, ctx->window, 0);
  if (surface == EGL_NO_SURFACE)
    return;

  EGLint context_attribs[] = {EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE};
  auto context = eglCreateContext(display, config, 0, context_attribs);
  if (context == EGL_NO_CONTEXT)
    return;

  eglMakeCurrent(display, surface, surface, context);

  while (ctx->running) {
    anbox_stream_set_viewport_size(ctx->stream.get(),
                                   ANativeWindow_getWidth(ctx->window),
                                   ANativeWindow_getHeight(ctx->window));

    anbox_stream_render_frame(ctx->stream.get(), 100);
    eglSwapBuffers(display, surface);
  }
}

void stop_stream(Context* ctx) {
  if (ctx->running) {
    const auto status = anbox_stream_disconnect(ctx->stream.get());
    if (status != ANBOX_STATUS_OK)
      __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to disconnect stream");

    ctx->running = false;
    if (ctx->render_thread.joinable())
      ctx->render_thread.join();

    ctx->audio_player.terminate();
  }
}

void on_stream_connected(void* user_data) {
  auto ctx = reinterpret_cast<Context*>(user_data);

  __android_log_write(ANDROID_LOG_INFO, "AnboxStream", "Stream is connected, starting rendering ...");

  ctx->running = true;
  ctx->render_thread = std::thread(&run_render_thread, ctx);
  if (!ctx->audio_player.start_playout())
    __android_log_write(ANDROID_LOG_ERROR, "AnboxStream", "Failed to do audio playback");
}

void on_audio_data_ready(const uint8_t *audio_data, size_t data_size, void *user_data) {
  auto ctx = reinterpret_cast<Context *>(user_data);
  ctx->audio_player.add_audio_buffer(audio_data, data_size);
}

void on_stream_disconnected(void* user_data) {
  auto ctx = reinterpret_cast<Context*>(user_data);

  __android_log_write(ANDROID_LOG_INFO, "AnboxStream", "Stream is disconnect");

  stop_stream(ctx);

  JNIEnv* env = nullptr;
  if (ctx->vm->AttachCurrentThread(&env, nullptr) != 0)
    return;

  jclass bindings_class = env->GetObjectClass(ctx->bindings_obj);
  if (!bindings_class) {
    ctx->vm->DetachCurrentThread();
    return;
  }

  jmethodID on_stream_disconnected_method = env->GetMethodID(bindings_class, "onStreamDisconnected", "()V");
  if (!on_stream_disconnected_method) {
    ctx->vm->DetachCurrentThread();
    return;
  }

  env->CallVoidMethod(ctx->bindings_obj, on_stream_disconnected_method);
}
} // namespace

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_startStreaming(
  JNIEnv *env, jobject thiz, jstring signaling_url, jobjectArray stunServers, jobject surface, jint width, jint height, jboolean  useInsecureTLS) {
  if (!surface || width <= 0 || height <= 0)
    return false;

  auto ctx = get_context(env, thiz);
  if (ctx)
    return false;

  ctx = new Context;
  env->GetJavaVM(&ctx->vm);
  ctx->bindings_obj = env->NewGlobalRef(thiz);

  ctx->window = ANativeWindow_fromSurface(env, surface);
  if (!ctx->window)
    return false;

  AnboxStreamAudioSpec audio_output_spec{ANBOX_STREAM_AUDIO_FORMAT_PCM_16_BIT, 48000, 2};
  anbox_stream_config_set_audio_spec(
    ctx->cfg.get(), ANBOX_STREAM_AUDIO_STREAM_TYPE_OUTPUT, audio_output_spec);
  if (!ctx->audio_player.initialize(audio_output_spec))
    return false;

  anbox_set_log_callback([](AnboxLogLevel level, const char* msg, void* user_data) {
    __android_log_write(ANDROID_LOG_INFO, "AnboxStream", msg);
  }, nullptr);

  ctx->cfg.reset(anbox_stream_config_new());
  if (!ctx->cfg) {
    delete ctx;
    return false;
  }

  const char* url = env->GetStringUTFChars(signaling_url, 0);
  anbox_stream_config_set_signaling_url(ctx->cfg.get(), url);
  env->ReleaseStringUTFChars(signaling_url, url);

  anbox_stream_config_set_use_insecure_tls(ctx->cfg.get(), useInsecureTLS);

  std::vector<StunServer> stun_servers;
  if (!StunServer::createListFromObject(env, stunServers, stun_servers))
    return false;

  for (const auto& server : stun_servers) {
    // We have to convert our std::string based URLs to a list of
    // const char* typed URLs
    std::vector<const char*>  raw_urls;
    std::transform(
      server.urls.begin(),
      server.urls.end(),
      std::back_inserter(raw_urls),
      [](const std::string& s) -> const char* {
        return s.c_str();
      });

    anbox_stream_config_add_stun_server(
      ctx->cfg.get(),
      raw_urls.data(),
      server.urls.size(),
      server.username.c_str(),
      server.password.c_str());
  }

  ctx->stream.reset(anbox_stream_new(ctx->cfg.get()));
  if (!ctx->stream) {
    delete ctx;
    return false;
  }

  anbox_stream_set_connected_callback(ctx->stream.get(), on_stream_connected, ctx);
  anbox_stream_set_disconnected_callback(ctx->stream.get(), on_stream_disconnected, ctx);
  anbox_stream_set_audio_data_ready_callback(ctx->stream.get(), on_audio_data_ready, ctx);

  __android_log_write(ANDROID_LOG_INFO, "AnboxStream", "Connecting Anbox Stream ...");

  auto status = anbox_stream_connect(ctx->stream.get());
  if (status != ANBOX_STATUS_OK)
    return false;

  jni_set_pointer(env, thiz, "context", ctx);

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_stopStreaming(
  JNIEnv *env, jobject thiz) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  stop_stream(ctx);

  delete ctx;

  jni_set_pointer(env, thiz, "context", nullptr);

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendTouchMove(JNIEnv *env, jobject thiz, jint id, jint x, jint y) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_MOVE;
  msg.touch_move.id = id;
  msg.touch_move.x = x;
  msg.touch_move.y = y;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendTouchStart(
  JNIEnv *env, jobject thiz, jint id, jint x, jint y) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_START;
  msg.touch_start.id = id;
  msg.touch_start.x = x;
  msg.touch_start.y = y;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendTouchEnd(
  JNIEnv *env, jobject thiz, jint id) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_END;
  msg.touch_end.id = id;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendTouchCancel(
  JNIEnv *env, jobject thiz, jint id) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_CANCEL;
  msg.touch_end.id = id;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendMouseMove(
  JNIEnv *env, jobject thiz, jint x, jint y, jint rx, jint ry) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_MOVE;
  msg.mouse_move.x = x;
  msg.mouse_move.y = y;
  msg.mouse_move.rx = rx;
  msg.mouse_move.ry = ry;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_canonical_anbox_streaming_sdk_native_1example_NativeBindings_sendMouseButton(
  JNIEnv *env, jobject thiz, jint button, jboolean pressed) {
  auto ctx = get_context(env, thiz);
  if (!ctx)
    return false;

  AnboxStreamControlMessage msg;
  msg.type = ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_BUTTON;
  msg.mouse_button.button = button;
  msg.mouse_button.pressed = pressed;

  auto status = anbox_stream_send_message(ctx->stream.get(), &msg);
  if (status != ANBOX_STATUS_OK)
    return false;

  return true;
}
