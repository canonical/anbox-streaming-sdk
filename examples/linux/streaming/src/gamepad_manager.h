// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_GAMEPAD_MANAGER_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_GATEWAY_MANAGER_H_

#include <unordered_map>
#include <memory>

#include <SDL2/SDL.h>

class GamepadManager {
 public:
  GamepadManager();
  ~GamepadManager() = default;

  void add_controller(int device_id);
  void remove_controller(int device_id);

 private:
  std::unordered_map<int, std::shared_ptr<SDL_GameController>> game_controllers_;
};

#endif
