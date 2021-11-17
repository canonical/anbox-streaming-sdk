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
