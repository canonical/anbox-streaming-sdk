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

#ifndef ANBOX_STREAMING_NATIVE_EXAMPLE_JNI_HELPERS_H
#define ANBOX_STREAMING_NATIVE_EXAMPLE_JNI_HELPERS_H

#include <string>
#include <vector>

#include <jni.h>

bool jni_get_string(JNIEnv* env, jobject obj, const char* name, std::string& str);
bool jni_get_string_vector(JNIEnv* env, jobject obj, const char* name, std::vector<std::string>& strs);
void *jni_get_pointer(JNIEnv *env, jobject instance, const char *name);
bool jni_set_pointer(JNIEnv *env, jobject instance, const char *name, void *ptr);

#endif //ANBOX_STREAMING_NATIVE_EXAMPLE_JNI_HELPERS_H
