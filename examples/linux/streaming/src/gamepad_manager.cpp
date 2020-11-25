// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#include "gamepad_manager.h"

#include <iostream>

GamepadManager::GamepadManager() {
  SDL_EventState(SDL_LASTEVENT, SDL_DISABLE);
  SDL_JoystickEventState(SDL_ENABLE);

  const auto nums = SDL_NumJoysticks();
  for(int index = 0; index < nums; index++)
    add_controller(index);
}

void GamepadManager::add_controller(int device_id) {
  if (game_controllers_.find(device_id) == game_controllers_.end() &&
      SDL_IsGameController(device_id)) {
    SDL_GameController *game_controller = SDL_GameControllerOpen(device_id);
    if(game_controller) {
      std::cout << "Game controller " << SDL_JoystickNameForIndex(device_id)
                << " is found" <<  std::endl;
      auto controller = std::shared_ptr<SDL_GameController>(
              game_controller, SDL_GameControllerClose);
      game_controllers_.emplace(device_id, controller);
    }
  }
}

void GamepadManager::remove_controller(int device_id) {
  if (SDL_IsGameController(device_id) && game_controllers_.count(device_id) > 0)
      game_controllers_.erase(device_id);
}
