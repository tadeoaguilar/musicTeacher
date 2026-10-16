#include <jni.h>

#include "BassEngine.h"

// The bridge to com.perceptronics.musicteacher.audio.NativeAudio: one engine for the whole app.

namespace {
BassEngine engine;
}

extern "C" {

JNIEXPORT jboolean JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_start(JNIEnv *, jobject) {
    return engine.start();
}

JNIEXPORT void JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_stop(JNIEnv *, jobject) { engine.stop(); }

JNIEXPORT void JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_loadSample(JNIEnv *env, jobject, jint midi,
                                                                                         jfloatArray data, jint rate) {
    const jsize size = env->GetArrayLength(data);
    std::vector<float> samples(static_cast<size_t>(size));
    env->GetFloatArrayRegion(data, 0, size, samples.data());
    engine.loadSample(midi, std::move(samples), rate);
}

JNIEXPORT void JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_note(JNIEnv *, jobject, jdouble frequency,
                                                                                   jfloat velocity, jlong startFrame,
                                                                                   jlong durationFrames) {
    engine.note(frequency, velocity, startFrame, durationFrames);
}

JNIEXPORT void JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_click(JNIEnv *, jobject, jdouble frequency,
                                                                                    jfloat velocity, jlong startFrame) {
    engine.click(frequency, velocity, startFrame);
}

JNIEXPORT void JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_stopAll(JNIEnv *, jobject) {
    engine.stopAll();
}

JNIEXPORT jlong JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_framePosition(JNIEnv *, jobject) {
    return engine.framePosition();
}

JNIEXPORT jint JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_sampleRate(JNIEnv *, jobject) {
    return engine.sampleRate();
}

JNIEXPORT jlong JNICALL Java_com_perceptronics_musicteacher_audio_NativeAudio_latencyFrames(JNIEnv *, jobject) {
    return engine.latencyFrames();
}

}  // extern "C"
