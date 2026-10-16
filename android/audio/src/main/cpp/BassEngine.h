#pragma once

#include <oboe/Oboe.h>

#include <array>
#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <vector>

/**
 * The app's sound: a sampler playing the recorded bass (each note from the nearest
 * recording, pitch-shifted) and a metronome click, both started on an exact audio frame.
 *
 * Kotlin schedules sounds ahead of time (like Tone.js on the web) by frame position on
 * this engine's own clock, which keeps counting across stream restarts. Commands travel
 * to the audio callback through a lock-free queue, so the callback never blocks.
 */
class BassEngine : public oboe::AudioStreamDataCallback, public oboe::AudioStreamErrorCallback {
public:
    bool start();
    void stop();

    /** A recording of `midi` at concert pitch, mono, at `rate` Hz. Call before start(). */
    void loadSample(int midi, std::vector<float> data, int rate);

    void note(double frequency, float velocity, int64_t startFrame, int64_t durationFrames);
    void click(double frequency, float velocity, int64_t startFrame);
    /** Cancels everything scheduled and fades out what's sounding. */
    void stopAll();

    int64_t framePosition() const { return frames_.load(std::memory_order_acquire); }
    int32_t sampleRate() const { return sampleRate_.load(std::memory_order_acquire); }
    /** Frames between a frame being rendered and it reaching the speaker (estimate). */
    int64_t latencyFrames();

    oboe::DataCallbackResult onAudioReady(oboe::AudioStream *stream, void *audio, int32_t frames) override;
    void onErrorAfterClose(oboe::AudioStream *stream, oboe::Result error) override;

private:
    struct Sample {
        int midi;
        double frequency;
        int rate;
        std::vector<float> data;
    };

    enum class Kind : uint8_t { Note, Click, StopAll };

    struct Event {
        Kind kind;
        int64_t start;
        int64_t duration;
        double frequency;
        float velocity;
    };

    struct Voice {
        bool active = false;
        bool click = false;
        const Sample *sample = nullptr;
        double position = 0;  // in sample frames
        double step = 0;      // sample frames per output frame
        float gain = 0;
        float envelope = 1;
        float release = 1;    // per-frame multiplier once released
        int64_t start = 0;
        int64_t releaseAt = INT64_MAX;
        double phase = 0;     // click oscillator, 0–1
        int64_t age = 0;
    };

    static constexpr int kQueueSize = 1024;
    static constexpr int kVoices = 24;
    static constexpr int kPending = 256;

    bool openStream();
    void push(const Event &event);
    void startVoice(const Event &event);
    const Sample *nearestSample(double frequency) const;
    float releaseMultiplier(double seconds) const;

    std::shared_ptr<oboe::AudioStream> stream_;
    std::mutex streamLock_;
    std::vector<Sample> samples_;

    // Single-producer queue: producers serialize on pushLock_, the callback is the only consumer.
    std::array<Event, kQueueSize> queue_{};
    std::atomic<int> head_{0};
    std::atomic<int> tail_{0};
    std::mutex pushLock_;

    // Owned by the audio callback.
    std::array<Event, kPending> pending_{};
    int pendingCount_ = 0;
    std::array<Voice, kVoices> voices_{};

    std::atomic<int64_t> frames_{0};
    std::atomic<int32_t> sampleRate_{48000};
};
