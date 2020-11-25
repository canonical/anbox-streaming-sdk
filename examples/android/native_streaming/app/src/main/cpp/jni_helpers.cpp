// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#include "jni_helpers.h"

bool jni_get_string(JNIEnv* env, jobject obj, const char* name, std::string& str) {
  jclass cls = env->GetObjectClass(obj);
  if (!cls)
    return false;

  jfieldID field_id = env->GetFieldID(cls, name, "Ljava/lang/String;");
  if (!field_id)
    return false;

  auto str_obj = (jstring) env->GetObjectField(obj, field_id);
  if (!str_obj)
    return false;

  const char *raw_str = env->GetStringUTFChars(str_obj, 0);
  if (!raw_str)
    return false;

  str = raw_str;
  env->ReleaseStringUTFChars(str_obj, raw_str);

  return true;
}

bool jni_get_string_vector(JNIEnv* env, jobject obj, const char* name, std::vector<std::string>& strs) {
  jclass cls = env->GetObjectClass(obj);
  if (!cls)
    return false;

  jfieldID array_id = env->GetFieldID(cls, name, "[Ljava/lang/String;");
  if (!array_id)
    return false;

  jobjectArray array_obj = reinterpret_cast<jobjectArray>(env->GetObjectField(obj, array_id));
  if (!array_obj)
    return false;

  for (int n = 0; n < env->GetArrayLength(array_obj); n++) {
    jstring str_obj = (jstring) env->GetObjectArrayElement(array_obj, n);
    if (!str_obj)
      return false;

    const char *raw_str = env->GetStringUTFChars(str_obj, 0);
    if (!raw_str)
      return false;

    strs.push_back(std::string(raw_str));
    env->ReleaseStringUTFChars(str_obj, raw_str);
  }

  return true;
}

void *jni_get_pointer(JNIEnv *env, jobject instance, const char *name) {
  jclass cls = env->GetObjectClass(instance);
  if (!cls)
    return nullptr;

  jfieldID id = env->GetFieldID(cls, name, "J");
  if (!id)
    return nullptr;

  return (void *) env->GetLongField(instance, id);
}

bool jni_set_pointer(JNIEnv *env, jobject instance, const char *name, void *ptr) {
  jclass cls = env->GetObjectClass(instance);
  if (!cls)
    return false;

  jfieldID id = env->GetFieldID(cls, name, "J");
  if (!id)
    return false;

  env->SetLongField(instance, id, (long) ptr);
  return true;
}