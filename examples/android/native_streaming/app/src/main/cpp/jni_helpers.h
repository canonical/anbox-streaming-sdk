// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

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
