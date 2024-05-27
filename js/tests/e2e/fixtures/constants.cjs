/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2024 Canonical Ltd.
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

const APP_NAME = "streaming-sdk-e2e-tests";
const IMAGE_NAME = "jammy:android13:amd64";
const SERVER_PORT = 2999;
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;

exports.APP_NAME = APP_NAME;
exports.IMAGE_NAME = IMAGE_NAME;
exports.SERVER_PORT = SERVER_PORT;
exports.BASE_URL = BASE_URL;
