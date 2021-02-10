// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_H_
#define ANBOX_STREAM_SDK_H_

#include <stddef.h>
#include <stdint.h>
#include <unistd.h>

#ifndef ANBOX_EXPORT
#define ANBOX_EXPORT __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Status code encodes the status of a method call.
 *
 * A status code is returned by most methods of the Anbox Stream SDK.
 */
typedef enum {
    ANBOX_STATUS_OK = 0,

    ANBOX_STATUS_FAILED = -1000,
    ANBOX_STATUS_INVALID_ARGUMENT = -1001,
    ANBOX_STATUS_ALREADY_INITIALIZED = -1002,
    ANBOX_STATUS_NOT_ENOUGH_MEMORY = -1003,
    ANBOX_STATUS_RENDER_FRAME_TIMEOUT = -1004,
    ANBOX_STATUS_SIGNALING_FAILED = -1005,
    ANBOX_STATUS_ABORTED = -1006,
    ANBOX_STATUS_NOT_READY = -1007,
    ANBOX_STATUS_NOT_IMPLEMENTED = -1008,
    ANBOX_STATUS_SIGNALING_TIMEOUT = -1009,
} AnboxStatus;

/**
 * @brief Level of a log message
 */
typedef enum {
  ANBOX_LOG_LEVEL_DEBUG = 0,
  ANBOX_LOG_LEVEL_INFO = 1,
  ANBOX_LOG_LEVEL_WARNING = 2,
  ANBOX_LOG_LEVEL_ERROR = 3,
} AnboxLogLevel;

/**
 * @brief Type of a control message passed to the Anbox Stream
 *
 * Currently only input control messages are supported but additional
 * ones will be added in the future to support e.g. GPS or different
 * sensors.
 */
typedef enum {
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_UNKNOWN = 0,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_START = 1,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_END = 2,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_CANCEL = 3,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_TOUCH_MOVE = 4,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_MOVE = 5,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_BUTTON = 6,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_MOUSE_WHEEL = 7,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_KEYBOARD = 8,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_GAMEPAD_BUTTON = 9,
  ANBOX_STREAM_CONTROL_MESSAGE_TYPE_GAMEPAD_AXIS = 10,
} AnboxStreamControlMessageType;

/**
 * @brief Mouse button type
 */
typedef enum {
  ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_LEFT = 1,
  ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_RIGHT = 2,
  ANBOX_STREAM_CONTROL_MOUSE_BUTTON_TYPE_MIDDLE = 3,
} AnboxStreamControlMouseButtonType;

/**
 * @brief Key code type
 */
typedef enum {
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_UNKNOWN = 0,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_A = 4,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_B = 5,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_C = 6,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_D = 7,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_E = 8,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F = 9,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_G = 10,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_H = 11,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_I = 12,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_J = 13,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_K = 14,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_L = 15,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_M = 16,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_N = 17,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_O = 18,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_P = 19,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_Q = 20,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_R = 21,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_S = 22,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_T = 23,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_U = 24,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_V = 25,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_W = 26,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_X = 27,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_Y = 28,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_Z = 29,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_1 = 30,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_2 = 31,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_3 = 32,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_4 = 33,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_5 = 34,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_6 = 35,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_7 = 36,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_8 = 37,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_9 = 37,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_0 = 39,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_ENTER = 40,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_ESC = 41,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_BACKSPACE = 42,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_TAB = 43,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_SPACE = 44,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_MINUS = 45,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_EQUAL = 46,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTBRACE = 47,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_RIGHTBRACE = 48,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_BACKSLASH = 49,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_SEMICOLON = 51,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_COMMA = 54,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_DOT = 55,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_SLASH = 56,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_CAPSLOCK = 57,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F1 = 58,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F2 = 59,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F3 = 60,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F4 = 61,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F5 = 62,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F6 = 63,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F7 = 64,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F8 = 65,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F9 = 66,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F10 = 67,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F11 = 68,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_F12 = 69,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_PRINT = 70,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_SCROLLLOCK = 71,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_PAUSE = 72,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_INSERT = 73,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_HOME = 74,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_PAGEUP = 75,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_DELETE = 76,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_END = 77,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_PAGEDOWN = 78,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_RIGHT = 79,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFT = 80,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_DOWN = 81,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_UP = 82,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTCTRL = 83,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTSHIFT = 84,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTALT = 85,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_LEFTMETA = 86,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_RIGHTALT = 87,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_NUMLOCK = 88,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_VOLUMEDOWN = 89,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_VOLUMEUP = 90,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_POWER = 91,
  ANBOX_STREAM_CONTROL_KEY_CODE_TYPE_BACK = 92,
} AnboxStreamControlKeycodeType;

/**
 * @brief Gamepad button code type
 */
typedef enum {
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_A = 0,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_B = 1,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_X = 2,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_Y = 3,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_TL = 4,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_TR = 5,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_ABS_RY = 6,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_ABS_RZ = 7,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_SELECT = 8,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_TL2 = 9,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_TR2 = 10,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_MODE = 11,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_KEY_UP = 12,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_KEY_DOWN = 13,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_KEY_LEFT = 14,
  ANBOX_STREAM_CONTROL_GAMEPAD_BUTTON_TYPE_KEY_RIGHT = 15,
} AnboxStreamControlGamepadButtonType;

/**
 * @brief Gamepad axis code type
 */
typedef enum {
  ANBOX_STREAM_CONTROL_GAMEPAD_AXIS_ABS_X = 0,
  ANBOX_STREAM_CONTROL_GAMEPAD_AXIS_ABS_Y = 1,
  ANBOX_STREAM_CONTROL_GAMEPAD_AXIS_ABS_Z = 2,
  ANBOX_STREAM_CONTROL_GAMEPAD_AXIS_ABS_RX = 3,
} AnboxStreamControlGamepadAxisType;

/**
 * @brief Audio format
 */
typedef enum {
  ANBOX_STREAM_AUDIO_FORMAT_UNKNOWN = 0,
  ANBOX_STREAM_AUDIO_FORMAT_PCM_8_BIT = 1,
  ANBOX_STREAM_AUDIO_FORMAT_PCM_16_BIT = 2,
  ANBOX_STREAM_AUDIO_FORMAT_PCM_32_BIT = 3,
} AnboxStreamAudioFormat;

/**
 * @brief Audio stream type
 */
typedef enum {
  ANBOX_STREAM_AUDIO_STREAM_TYPE_OUTPUT = 0,
  ANBOX_STREAM_AUDIO_STREAM_TYPE_INPUT = 1,
} AnboxStreamAudioStreamType;

/**
 * @brief Control message to be sent when a touch is started
 */
typedef struct {
  uint32_t id;
  uint32_t x;
  uint32_t y;
} AnboxStreamControlTouchStartMessage;

/**
 * @brief Control message to be sent when a touch is done
 */
typedef struct {
  uint32_t id;
} AnboxStreamControlTouchEndMessage;

/**
 * @brief Control message to be sent when a touch was cancelled
 */
typedef struct {
  uint32_t id;
} AnboxStreamControlTouchCancelMessage;

/**
 * @brief Control message to be sent when a touch was moved
 */
typedef struct {
  uint32_t id;
  uint32_t x;
  uint32_t y;
} AnboxStreamControlTouchMoveMessage;

/**
 * @brief Control message to be sent when the mouse was moved
 */
typedef struct {
  uint32_t x;
  uint32_t y;
  uint32_t rx;
  uint32_t ry;
} AnboxStreamControlMouseMoveMessage;

/**
 * @brief Control message to be sent when a mouse button was pressed
 */
typedef struct {
  uint8_t button;
  bool pressed;
} AnboxStreamControlMouseButtonMessage;

/**
 * @brief Control message to be sent when the mouse wheel was triggered.
 */
typedef struct {
  uint32_t x;
  uint32_t y;
} AnboxStreamControlMouseWheelMessage;

/**
 * @brief Control message to be sent when keyboard event occurs
 */
typedef struct {
  AnboxStreamControlKeycodeType code;
  bool pressed;
} AnboxStreamControlKeyboardMessage;

/**
 * @brief Control message to be sent when gamepad button event occurs
 */
typedef struct {
  AnboxStreamControlGamepadButtonType code;
  uint32_t id;
  bool pressed;
} AnboxStreamControlGamepadButtonMessage;

/**
 * @brief Control message to be sent when gamepad axis event occurs
 */
typedef struct {
  AnboxStreamControlGamepadAxisType code;
  uint32_t id;
  double value;
} AnboxStreamControlGamepadAxisMessage;

/**
 * @brief Message object combining all message types
 */
typedef struct {
  AnboxStreamControlMessageType type;
  union {
    AnboxStreamControlTouchStartMessage touch_start;
    AnboxStreamControlTouchEndMessage touch_end;
    AnboxStreamControlTouchCancelMessage touch_cancel;
    AnboxStreamControlTouchMoveMessage touch_move;
    AnboxStreamControlMouseMoveMessage mouse_move;
    AnboxStreamControlMouseButtonMessage mouse_button;
    AnboxStreamControlMouseWheelMessage mouse_wheel;
    AnboxStreamControlKeyboardMessage keyboard;
    AnboxStreamControlGamepadButtonMessage gamepad_button;
    AnboxStreamControlGamepadAxisMessage gamepad_axis;
  };
} AnboxStreamControlMessage;

/**
 * @brief Specification for audio input/output stream.
 */
typedef struct {
  /** The audio data format. */
  AnboxStreamAudioFormat format;
  /** The number of samples of audio per second. */
  uint32_t freq;
  /** The number of audio signal channels. */
  uint32_t channels;
} AnboxStreamAudioSpec;

/**
 * @brief Callback to get notified when the stream is fully connected
 *
 * @param user_data User specific data
 */
typedef void (*AnboxStreamConnectedCallback)(void* user_data);

/**
 * @brief Callback to get notified when the stream is disconnected
 *
 * @param user_data User specific data
 */
typedef void (*AnboxStreamDisconnectedCallback)(void* user_data);

/**
 * @brief Callback to get notified when the stream experienced an error
 *
 * @param status Status value specifying the error
 * @param user_data User specific data
 */
typedef void (*AnboxStreamErrorCallback)(AnboxStatus status, void* user_data);

/**
* @brief Callback which is called when a message from the remote peer is received
*
* @param type pointer to message type
* @param type_size length of message tyype
* @param data pointer to message data
* @param data_size length of message data
* @param user_data User specific data
*/
typedef void (*AnboxMessageReceivedCallback)(
  const char* type, size_t type_size, const char* data, size_t data_size, void *user_data);

/**
 * @brief Callback to receive log messages from an Anbox Stream object
 *
 * @param level Level of the provided log message
 * @param msg Log message
 * @param user_data User specific data
 */
typedef void (*AnboxLogCallback)(
  AnboxLogLevel level, const char* msg, void *user_data);

/**
 * @brief Callback to receive audio data from an Anbox Stream object
 *
 * @param audio_data pointer to a chunk of audio data
 * @param data_size size of audio data
 * @param user_data User specific data
 */
typedef void (*AnboxAudioDataReadyCallback)(
  const uint8_t* audio_data, size_t data_size, void *user_data);

/**
 * @brief Retrieve the API version of the stream SDK
 *
 * Can be used before making use of the actual API to check which API version
 * the linked SDK provides.
 *
 * @param major Major API version
 * @param minor Minor API version
 * @param patch Patch API version
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_get_api_version(
  unsigned int* major, unsigned int* minor, unsigned int* patch);

/**
 * @brief Set global callback for receiving log messages
 *
 * The callback will be called from multiple threads and its implementation
 * MUST be thread safe.
 *
 * @param callback Callback function to register
 * @param user_data User specific data
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_set_log_callback(
  AnboxLogCallback callback, void* user_data);

/**
 * @brief Configuration for a stream
 *
 * Provides various configuration items for a stream
 */
struct AnboxStreamConfig;

/**
 * @brief Creates a new AnboxStreamConfig object with defaults set for
 * all configuration options.
 *
 * @return New stream config object or NULL on error
 */
ANBOX_EXPORT AnboxStreamConfig* anbox_stream_config_new();

/**
 * @brief Release an existing stream config object
 *
 * @param cfg Stream configuration object to be release
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_release(AnboxStreamConfig* cfg);

/**
 * @brief Set the signaling URL for the WebRTC signaling process
 *
 * @param cfg Stream configuration object to set the URL on
 * @param url Signaling URL to use
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_set_signaling_url(
  AnboxStreamConfig* cfg, const char* url);

/**
 * @brief Set the signaling URL for the WebRTC signaling process
 *
 * @param cfg Stream configuration object to set the URL on
 * @param use_insecure_tls Wether to trust insecure TLS server certificates or not
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_set_use_insecure_tls(
  AnboxStreamConfig* cfg, bool use_insecure_tls);

/**
 * @brief Add a STUN server to the configuration
 *
 * @param cfg Stream configuration object to add the STUN server to
 * @param urls URLs of the STUN server
 * @param num_urls Number of URLs provided with the urls parameter
 * @param username NULL terminated string containing the username to use for
 *                 authentication with the STUN server
 * @param password NULL terminated string containing the password to use for
 *                 authentication with the STUN server
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_add_stun_server(
  AnboxStreamConfig* cfg,
  const char** urls,
  unsigned int num_urls,
  const char* username,
  const char* password);

/**
 * @brief Set audio stream specification.
 *
 * This will set specification for audio input/output stream.
 * The settings must be done before starting streaming. If the audio
 * specification is not set for input/output stream, 16-bit pcm, stereo
 * audio at 48kHz sample rate will be used by default.
 *
 * @param cfg Stream configuration object to set the audio specification
 * @param type Type of audio Stream
 * @param spec Specification of audio stream
 * @return ANBOX_STATUS_OK on success, error status otherwise
 * @note Only ANBOX_STREAM_AUDIO_STREAM_TYPE_OUTPUT is supported so far.
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_set_audio_spec(
  AnboxStreamConfig* cfg,
  AnboxStreamAudioStreamType type,
  AnboxStreamAudioSpec spec);

/**
 * @brief Set an activity to be displayed in the foreground
 *
 * @param cfg Stream configuration object to set the signaling message on
 * @param activity activity to be displayed in the foreground
 * @return ANBOX_STATUS_OK on success, error status otherwise
 * @note Only works with an application that has APK provided on its creation.
 */
ANBOX_EXPORT AnboxStatus anbox_stream_config_set_foreground_activity(
  AnboxStreamConfig* cfg, const char* activity);

/**
 * @brief The AnboxStream object is the central element of the API. It
 * implements the streaming logic and is used to control the active stream.
 */
struct AnboxStream;

/**
 * @brief Create a new stream object
 *
 * @param config Stream configuration to be used
 * @return New stream object or NULL on error
 */
ANBOX_EXPORT AnboxStream* anbox_stream_new(const AnboxStreamConfig* config);

/**
 * @brief Release an existing stream object
 *
 * @param stream Stream object to be released
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_release(AnboxStream* stream);

/**
 * @brief Set callback to be notified when the stream is fully connected
 *
 * @param stream Stream object to register the callback for
 * @param callback Callback function to register
 * @param user_data User specific data
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_set_connected_callback(
  AnboxStream* stream, AnboxStreamConnectedCallback callback, void* user_data);

/**
 * @brief Set callback to be notified when the stream is disconnected
 *
 * @param stream Stream object to register the callback for
 * @param callback Callback function to register
 * @param user_data User specific data
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_set_disconnected_callback(
  AnboxStream* stream, AnboxStreamDisconnectedCallback callback, void* user_data);

/**
 * @brief Set callback to be notified when the stream experienced an error
 *
 * @param stream Stream object to register the callback for
 * @param callback Callback function to register
 * @param user_data User specific data
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_set_error_callback(
  AnboxStream* stream, AnboxStreamErrorCallback callback, void* user_data);

/**
 * @brief Connect the stream
 *
 * This will start the connection process between the local peer and the remote peer
 * in the Anbox container running on an Anbox Cloud deployment. The registered signaling
 * transport functions are used to exchange any relevant signaling messages.
 *
 * As the connection process happens asynchronously the successfull connection is
 * indicated through a registered connected callback function.
 *
 * @param stream Stream object to initiate connection for.
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_connect(AnboxStream* stream);

/**
 * @brief Disconnect the stream
 *
 * This will start the disconnection process. As the disconnection process happens
 * asynchronously the successfull disconnection is indicated through a registered
 * disconnected callback function.
 *
 * @param stream Stream object to disconnect
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_disconnect(AnboxStream* stream);

/**
 * @brief Send a control message to the stream
 *
 * This will send a control message (input event, GPS update, sensor data) through the
 * stream to the remote Android instance.
 *
 * @param stream Stream object to send the control message to
 * @param msg control message object to be sent
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_send_message(
  AnboxStream* stream, const AnboxStreamControlMessage* msg);

/**
 * @brief Set the size of the viewport used for rendering video frames.
 *
 * When video frames are rendered the AnboxStream will try to fit them into the
 * dimensions of the given viewport and otherwise use letter boxing and adjust
 * the size of the rendered video frame to fit.
 *
 * @param stream Stream object to set the rendering viewport size for
 * @param width Width of the viewport
 * @param height Height of the viewport
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_set_viewport_size(
  AnboxStream* stream, unsigned int width, unsigned int height);

/**
 * @brief Render a received frame of the video stream
 *
 * This expects to be called with an EGLContext and EGLSurface made current to render
 * into. It will utilize OpenGL ES (>= 2.0) to render the video frames received via
 * WebRTC from the remote Android instance.
 *
 * If no frame is available, the implementation will wait up to specified timeout and
 * return ANBOX_STATUS_TIMEOUT if the timeout is expired and no frame received.
 *
 * @param stream Stream to render a frame for
 * @param timeout_ms Maximum time to wait for a new frame to be available for rendering
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_render_frame(
  AnboxStream* stream, uint32_t timeout_ms);

/**
 * @brief Set callback to be notified when the audio output data is ready
 *
 * @param stream Stream object to register the callback for
 * @param callback Callback function to register
 * @param user_data User specific data
 * @return ANBOX_STATUS_OK on success, error status otherwise
 */
ANBOX_EXPORT AnboxStatus anbox_stream_set_audio_data_ready_callback(
  AnboxStream* stream, AnboxAudioDataReadyCallback callback, void* user_data);

/**
* @brief Set callback to be notified when a message is received from remote peer
*
* @param stream Stream object to register the callback for
* @param callback Callback function to register
* @param user_data User specific data
* @return ANBOX_STATUS_OK on success, error status otherwise
*/
ANBOX_EXPORT AnboxStatus anbox_stream_set_message_received_callback(
 AnboxStream* stream, AnboxMessageReceivedCallback callback, void* user_data);
#ifdef __cplusplus
}
#endif

#endif
